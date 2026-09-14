// FILE: components/CheckingScanner/FaultsModal.tsx
// "Faults" modal for the Manual Entry + QR Scanner tabs.
//
// Browse-driven flow (single source of truth = get_checking_fault_help):
//   1. Modal opens -> loadCatalog() (the "browse" call) populates `catalog`.
//   2. User types a Fault Value, taps a catalog chip -> we build the FULL
//      catalog as `d1`, with the tapped item's Remark set to the typed
//      value and every item's `isEntry` recomputed (1 if that item's
//      Remark ends up non-empty, 0 otherwise), and POST add_checking_fault.
//   3. On success we re-run loadCatalog() so `catalog` (and therefore what
//      renders) always matches the server exactly.
//   4. Tapping X on an added chip does the same thing but clears that
//      item's Remark first.
//   5. `onEntriesChange` fires after every successful refresh so the
//      parent (index.tsx) can keep `form.d2` in sync for the final Save.
import { API } from '@/common/API/dynamicAPI';
import { showError } from '@/common/utils/snackbar';
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import FaultSelector, { FaultCatalogItem } from './FaultSelector';

interface PayloadBase {
  ShfCode: string;
  ChkDate: string;
  MacGrp?: string;
  PrpCode: string;
  BeamNo: string;
  SrNo: string;
  UId: string;
  yearno: string;
  txntype: string;
}

interface FaultsModalProps {
  visible: boolean;
  token: string;
  cacheKey: string;
  fetchData: (cacheKey: string) => Promise<FaultCatalogItem[]>;
  buildPayloadBase: () => PayloadBase;
  onEntriesChange: (entries: FaultCatalogItem[]) => void;
  onClose: () => void;
  loading?: boolean;
  beamNo?: string;
  takaNo?: string;
  meter?: string;
}

const same = (a: FaultCatalogItem, b: FaultCatalogItem) => a.UId === b.UId && a.SubSr === b.SubSr;

const FaultsModal: React.FC<FaultsModalProps> = ({
  visible,
  token,
  cacheKey,
  fetchData,
  buildPayloadBase,
  onEntriesChange,
  onClose,
  loading = false,
  beamNo = '',
  takaNo = '',
  meter = '',
}) => {
  const [catalog, setCatalog] = useState<FaultCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyItemKey, setBusyItemKey] = useState<string | null>(null);

  // The "browse" call — always the source of truth for what's rendered.
  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const apiData = await fetchData(cacheKey);
      const list = apiData || [];
      setCatalog(list);
      onEntriesChange(list.filter((item) => String(item.Remark ?? '').trim() !== ''));
    } catch (error) {
      console.log('FaultsModal loadCatalog error:', error);
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, fetchData]);

  useEffect(() => {
    if (visible) loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, cacheKey]);

  const persistAndRefresh = async (targetItem: FaultCatalogItem, remarkValue: string) => {
    const d1 = catalog.map((c) => {
      const remark = same(c, targetItem) ? remarkValue : String(c.Remark ?? '');
      return {
        Faults: c.Faults,
        RDesc: c.RDesc,
        RsnCode: c.RsnCode,
        SrNo: c.SrNo,
        SubSr: c.SubSr,
        UId: c.UId,
        Remark: remark,
        // IsEntry: remark.trim() !== '' ? "1" : "0",
      };
    });

    const payload = { ...buildPayloadBase(), IsEntry: "1", d1 };
    const response = await axios.post(`${API}/api/add_checking_fault`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    return response;
  };

  const handleAddFault = async (fault: FaultCatalogItem, remarkValue: string) => {
    const key = `${fault.UId}_${fault.SubSr}`;
    setBusy(true);
    setBusyItemKey(key);
    try {
      const response = await persistAndRefresh(fault, remarkValue);
      if (response.data?.success) {
        await loadCatalog();
      } else {
        showError(response.data?.message || 'Fault save failed');
      }
    } catch (error) {
      console.log('FaultsModal handleAddFault error:', error);
      showError('Unable to save fault.');
    } finally {
      setBusy(false);
      setBusyItemKey(null);
    }
  };

  const handleRemoveFault = async (fault: FaultCatalogItem) => {
    const key = `${fault.UId}_${fault.SubSr}`;
    setBusy(true);
    setBusyItemKey(key);
    try {
      const response = await persistAndRefresh(fault, '');
      if (response.data?.success) {
        await loadCatalog();
      } else {
        showError(response.data?.message || 'Unable to remove fault');
      }
    } catch (error) {
      console.log('FaultsModal handleRemoveFault error:', error);
      showError('Unable to remove fault.');
    } finally {
      setBusy(false);
      setBusyItemKey(null);
    }
  };

  return (
    <FaultSelector
      visible={visible}
      title="Select Faults"
      catalog={catalog}
      catalogLoading={catalogLoading}
      busy={busy || loading}
      busyItemKey={busyItemKey}
      beamNo={beamNo}
      takaNo={takaNo}
      meter={meter}
      onClose={onClose}
      onAddFault={handleAddFault}
      onRemoveFault={handleRemoveFault}
    />
  );
};

export default FaultsModal;
