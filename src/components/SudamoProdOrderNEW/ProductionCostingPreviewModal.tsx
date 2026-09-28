import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CostingAPI, DesignAPI } from '@/src/api/legacyClient';

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const money = (v: any) => `₹${n(v).toFixed(2)}`;
const text = (v: any) => String(v ?? '').trim();

function designYarns(design: any) {
  return [
    ...(design?.warp_yarns || []),
    ...(design?.weft_yarns || []),
    ...(design?.selvedge_yarns || []),
  ];
}

function yarnName(line: any, design: any) {
  const found = designYarns(design).find(
    (y: any) => text(y?.mi_id) === text(line?.mi_id),
  );
  return (
    text(found?.name) ||
    text(found?.yarn_name) ||
    text(found?.material_name) ||
    text(found?.mi_name) ||
    text(line?.name) ||
    text(line?.mi_id) ||
    '-'
  );
}

function basisText(line: any) {
  const basisName = text(line?.basis_name);
  const basisValue = n(line?.basis_value);
  if (basisName && basisValue) return `${basisName} ${basisValue}`;
  return '';
}

type Props = {
  visible: boolean;
  mdId: string;
  costingId: string;
  onClose: () => void;
};

export default function ProductionCostingPreviewModal({
  visible,
  mdId,
  costingId,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<any>(null);
  const [saved, setSaved] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      setDesign(null);
      setSaved(null);

      try {
        if (!mdId || !costingId) {
          throw new Error('Saved costing reference is missing.');
        }

        // Production Order is display-only. Read the exact saved costing record.
        // Do not call CostingAPI.compute() here because that would show a newly
        // calculated value instead of the costing that was actually saved.
        const [designResponse, costingResponse]: any[] = await Promise.all([
          DesignAPI.get(mdId),
          CostingAPI.get(costingId),
        ]);

        const fullDesign = designResponse?.data?.data;
        const savedCosting = costingResponse?.data?.data;

        if (!savedCosting) throw new Error('Saved costing could not be loaded.');
        if (text(savedCosting?.md_id) !== text(mdId)) {
          throw new Error('Saved costing does not belong to this design.');
        }

        if (!cancelled) {
          setDesign(fullDesign || null);
          setSaved(savedCosting);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.response?.data?.message ||
              e?.message ||
              'Unable to load saved costing.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [visible, mdId, costingId]);

  const lines = useMemo(
    () => (Array.isArray(saved?.yarn_lines) ? saved.yarn_lines : []),
    [saved],
  );

  const section = (kind: string, title: string) => {
    const rows = lines.filter(
      (line: any) => text(line?.yarn_type).toLowerCase() === kind,
    );
    if (!rows.length) return null;

    return (
      <View style={s.block}>
        <Text style={s.h}>{title}</Text>
        {rows.map((line: any, index: number) => {
          const basis = basisText(line);
          return (
            <View style={s.yarn} key={`${line?.id || line?.yarn_key || line?.mi_id}-${index}`}>
              <View style={s.yarnName}>
                <Text style={s.bold}>{yarnName(line, design)}</Text>
                <Text style={s.muted}>
                  {basis ? `${basis} · ` : ''}g/m {n(line?.grams_per_metre).toFixed(2)}
                </Text>
              </View>
              <Text style={s.rate}>{money(line?.rate)}</Text>
              <Text style={s.cost}>{money(line?.cost)}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const row = (label: string, value: any, strong = false) => (
    <View style={s.row}>
      <Text style={strong ? s.bold : s.label}>{label}</Text>
      <Text style={strong ? s.final : s.value}>{value}</Text>
    </View>
  );

  const snap = saved?.snap || {};
  const inputs = saved?.inputs || {};
  const displayCode = text(saved?.code) || text(design?.code) || '-';
  const displayType = text(saved?.type) || text(design?.type) || '-';
  const displayWeave = text(design?.weave) || '-';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.top}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>ESTIMATED FABRIC COST</Text>
              <Text style={s.readonly}>READ ONLY · SAVED COSTING</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close costing">
              <Text style={s.x}>×</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" style={{ margin: 30 }} />
          ) : error ? (
            <View style={{ padding: 20 }}>
              <Text style={s.error}>{error}</Text>
            </View>
          ) : saved ? (
            <ScrollView showsVerticalScrollIndicator>
              <Text style={s.meta}>
                Design: <Text style={s.bold}>{displayCode}</Text>{'   '}
                Type: <Text style={s.bold}>{displayType}</Text>{'   '}
                Weave: <Text style={s.bold}>{displayWeave}</Text>
              </Text>
              <Text style={s.savedMeta}>
                Costing: {text(saved?.id) || costingId}
                {saved?.created_at ? ` · Saved ${text(saved.created_at)}` : ''}
              </Text>

              {section('warp', 'WARP')}
              {section('weft', 'WEFT')}
              {section('selvedge', 'SELVEDGE')}

              <Text style={s.h}>BUILD-UP · PER METRE</Text>
              {row('Total yarn cost', money(snap.rm))}
              {row('Weaving', money(snap.weaving_cost))}
              {row('Greige mfg cost', money(snap.greige_mfg))}
              {row('Greige brokerage', money(snap.greige_brok_amt))}
              {row('Greige price /m', money(snap.greige_price), true)}
              {row('Shrinkage impact', money(snap.shrink_impact))}
              {row('Dyeing / processing', money(snap.dye_proc_amount))}
              {row('Finished brokerage', money(snap.fin_brok_amt))}
              {row('Cutting / packing', money(snap.cut_pack))}
              {row('Finished price /m', money(snap.final_cost), true)}

              <Text style={s.h}>PRODUCTION SNAPSHOT</Text>
              {row('Greige width', `${n(inputs.greige_width).toFixed(2)} in`)}
              {row('PPI loom', n(snap.ppi_loom).toFixed(0))}
              {row('PPI fabric', n(snap.ppi_table).toFixed(0))}
              {row('Production / day', `${n(snap.prod_day).toFixed(0)} m`)}
              {row('Conversion / day', money(snap.per_day_conversion))}
              {row('RM contribution', `${n(snap.rm_pct).toFixed(1)}%`)}
              {row('Weaving contribution', `${n(snap.weave_pct).toFixed(1)}%`)}

              <Text style={s.note}>
                Read only. Values are loaded from the saved costing record. Nothing is recalculated, saved, or modified from Production Order.
              </Text>
            </ScrollView>
          ) : null}

          <TouchableOpacity style={s.close} onPress={onClose}>
            <Text style={s.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 10,
  },
  title: { fontSize: 17, fontWeight: '900' },
  readonly: { fontSize: 9, fontWeight: '800', marginTop: 2 },
  x: { fontSize: 28, paddingHorizontal: 8 },
  meta: { fontSize: 11, paddingTop: 12, paddingBottom: 4 },
  savedMeta: { fontSize: 9, color: '#777', paddingBottom: 8 },
  block: { marginBottom: 10 },
  h: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 6,
    color: '#8a4d1d',
  },
  yarn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8,
  },
  yarnName: { flex: 1, paddingRight: 8 },
  bold: { fontWeight: '900' },
  muted: { fontSize: 10, color: '#777', marginTop: 2 },
  rate: { width: 78, textAlign: 'right', fontSize: 11 },
  cost: { width: 72, textAlign: 'right', fontWeight: '900', fontSize: 11 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 6,
  },
  label: { fontSize: 11, color: '#555' },
  value: { fontSize: 11, fontWeight: '700' },
  final: { fontSize: 12, fontWeight: '900', color: '#b65f20' },
  note: { fontSize: 9, color: '#777', textAlign: 'center', marginVertical: 14 },
  error: { color: '#b00020', textAlign: 'center' },
  close: {
    backgroundColor: '#f1f1f1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  closeText: { fontWeight: '900' },
});
