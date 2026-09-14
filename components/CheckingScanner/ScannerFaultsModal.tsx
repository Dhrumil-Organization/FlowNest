// FILE: components/CheckingScanner/ScannerFaultsModal.tsx
// "Faults" modal opened from a Scanner List row (already-saved checking
// record — real SrNo/UId). This is the ONLY place in the app that has the
// Faults feature.
//
// get_checking_fault_help ("browse") returns THREE arrays:
//   - data            -> full catalog, catalog's own SubSr, Remark already
//                         merged in wherever a value exists right now.
//   - default_faults  -> the SAME full catalog but always blank Remark —
//                         this is what "Select Faults" (the pickable grid)
//                         renders, so every fault always shows exactly
//                         once no matter how many times it's been added.
//   - filterdata      -> ONLY the faults that are actually saved for this
//                         row right now. Its SubSr is a running record
//                         number (1, 2, 3…) — completely independent from
//                         the catalog's own SubSr — because the same fault
//                         can be saved more than once (different Remark
//                         values), so filterdata is keyed by RsnCode, not
//                         by catalog SubSr. This is what "Added Faults"
//                         renders, each with an X to remove it.
//
// ADD flow:
//   - User taps a catalog (default_faults) chip with a Fault Value typed.
//   - We need a SubSr for the new filterdata row that can NEVER collide
//     with one already in use:
//       · If this RsnCode has no entry yet in filterdata -> use the
//         catalog item's own SubSr as a starting point.
//       · If this RsnCode already has one (or more) entries in filterdata
//         (i.e. the same fault is being added again) -> take the highest
//         SubSr among filterdata rows with that SAME RsnCode and use +1.
//       · Either way, if that candidate SubSr happens to already be used
//         by ANY other filterdata row, keep bumping it until it's unique.
//         SubSr must never repeat.
//   - POST add_checking_fault with `d1` = the full, updated filterdata
//     array (existing rows untouched + the new row appended), plus the
//     constant `IsEntry: "1"` flag the API expects.
//   - On success, re-run the browse call so `catalog`/`addedFaults` always
//     mirror exactly what the server has.
//
// REMOVE flow:
//   - `d1` = the full filterdata array, with ONLY the removed row's Remark
//     blanked out (every other row goes through untouched, same SubSr).
//   - Same `IsEntry: "1"` flag, same browse-refresh afterwards.
import { API } from '@/common/API/dynamicAPI';
import { getCurrentFinancialYear } from '@/common/commonfunction';
import { showError } from '@/common/utils/snackbar';
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import FaultSelector, { FaultCatalogItem } from './FaultSelector';

interface ScannerFaultsModalProps {
  visible: boolean;
  token: string;
  rowData: any;
  loading?: boolean;
  onClose: () => void;
  // Fired (fire-and-forget) after every successful refresh so the parent
  // can silently update the underlying Scanner List row, without closing
  // this modal.
  onSaved?: () => void;
}

const toInt = (v: any) => {
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
};

const ScannerFaultsModal: React.FC<ScannerFaultsModalProps> = ({
  visible,
  token,
  rowData,
  loading = false,
  onClose,
  onSaved,
}) => {
  const [catalog, setCatalog] = useState<FaultCatalogItem[]>([]); // default_faults
  const [addedFaults, setAddedFaults] = useState<FaultCatalogItem[]>([]); // filterdata
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyItemKey, setBusyItemKey] = useState<string | null>(null);

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  const buildPayloadBase = () => ({
    ShfCode: rowData?.ShfCode || '',
    ChkDate: rowData?.ChkDate || '',
    MacGrp: rowData?.MacGrp || '',
    PrpCode: rowData?.PrpCode || '',
    BeamNo: rowData?.BeamNo || '',
    SrNo: rowData?.SrNo || '',
    UId: rowData?.UId || '',
    yearno: getCurrentFinancialYear(),
    txntype: 'beam_checking',
  });

  // The "browse" call — always the source of truth for what's rendered.
  const loadCatalog = useCallback(async () => {
    if (!rowData) return;
    setCatalogLoading(true);
    try {
      const response = await axios.get(`${API}/api/get_checking_fault_help`, {
        headers,
        params: buildPayloadBase(),
      });
      const payload = response?.data?.response || response?.data || {};
      setCatalog(payload.default_faults || []);
      setAddedFaults(
        (payload.filterdata || []).filter((item: FaultCatalogItem) => String(item.Remark ?? '').trim() !== '')
      );
    } catch (error) {
      console.log('ScannerFaultsModal loadCatalog error:', error);
      setCatalog([]);
      setAddedFaults([]);
    } finally {
      setCatalogLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowData]);

  useEffect(() => {
    if (visible) loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, rowData]);

  const persist = async (d1: FaultCatalogItem[]) => {
    const payload = { ...buildPayloadBase(), IsEntry: '1', d1 };
    return axios.post(`${API}/api/add_checking_fault`, payload, { headers });
  };

  // SubSr for a brand-new filterdata row must NEVER collide with one
  // already in use. See the file-level comment for the exact rule.
  const nextSubSrFor = (fault: FaultCatalogItem): string => {
    const usedSubSr = new Set(addedFaults.map((e) => e.SubSr));
    const sameRsn = addedFaults.filter((e) => e.RsnCode === fault.RsnCode);

    let candidate = sameRsn.length === 0
      ? toInt(fault.SubSr)
      : Math.max(...sameRsn.map((e) => toInt(e.SubSr))) + 1;

    if (candidate <= 0) candidate = 1;
    while (usedSubSr.has(String(candidate))) candidate += 1;

    return String(candidate);
  };

  const handleAddFault = async (fault: FaultCatalogItem, remarkValue: string) => {
    const key = `${fault.UId}_${fault.SubSr}`;
    const newRow: FaultCatalogItem = {
      UId: fault.UId,
      SrNo: fault.SrNo,
      SubSr: nextSubSrFor(fault),
      RsnCode: fault.RsnCode,
      RDesc: fault.RDesc,
      Faults: fault.Faults,
      Remark: remarkValue,
    };
    const d1 = [...addedFaults, newRow];

    setBusy(true);
    setBusyItemKey(key);
    try {
      const response = await persist(d1);
      if (response.data?.success) {
        await loadCatalog();
        onSaved?.();
      } else {
        showError(response.data?.message || 'Fault save failed');
      }
    } catch (error) {
      console.log('ScannerFaultsModal handleAddFault error:', error);
      showError('Unable to save fault.');
    } finally {
      setBusy(false);
      setBusyItemKey(null);
    }
  };

  const handleRemoveFault = async (entry: FaultCatalogItem) => {
    const key = `${entry.RsnCode}_${entry.SubSr}`;
    const d1 = addedFaults.map((e) =>
      e.RsnCode === entry.RsnCode && e.SubSr === entry.SubSr ? { ...e, Remark: '' } : e
    );

    setBusy(true);
    setBusyItemKey(key);
    try {
      const response = await persist(d1);
      if (response.data?.success) {
        await loadCatalog();
        onSaved?.();
      } else {
        showError(response.data?.message || 'Unable to remove fault');
      }
    } catch (error) {
      console.log('ScannerFaultsModal handleRemoveFault error:', error);
      showError('Unable to remove fault.');
    } finally {
      setBusy(false);
      setBusyItemKey(null);
    }
  };

  return (
    <FaultSelector
      visible={visible}
      title="Scanner Faults"
      catalog={catalog}
      addedFaults={addedFaults}
      catalogLoading={catalogLoading}
      busy={busy || loading}
      busyItemKey={busyItemKey}
      beamNo={rowData?.BeamNo || ''}
      takaNo={rowData?.TakaNo || ''}
      meter={rowData?.Qty || rowData?.Meter || ''}
      onClose={onClose}
      onAddFault={handleAddFault}
      onRemoveFault={handleRemoveFault}
    />
  );
};

export default ScannerFaultsModal;
