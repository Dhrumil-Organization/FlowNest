// FILE: src/features/repackingIssue/components/CartonEntry.tsx
// Carton detail: Carton No | Qty | Weight.  No Chees. Both are saved on the carton (POYProdRD2 qty / wt) and
// reduce the source stock. Item Qty = qty of MTR cartons + weight of KGS cartons (AmtCalc of the source inward).
// Floor flow: scan (Urovo trigger / wedge / keyboard) → Qty → Weight → Enter adds the row
// and returns to Carton No for the next scan. Every new carton must be in stock for the item's
// Item / Merge / Grade / Shade (getcartondetail) — that row gives puid / psrno / psubsr / trantype.
// "Pick from stock" adds several cartons at once with their balance as Qty / Weight.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { confirmAsync } from '../dialog';
import { cartonTotals, cartonUom, cleanDecimal, fmt3, newKey, toNum } from '../logic';
import { triggerUrovoScan, useRepackScanner } from '../scanner';
import { C, LABEL, R, SP } from '../theme';
import { CartonRow, StockCarton } from '../types';
import { StockPicker, StockState } from './StockPicker';
import { Btn, Input } from './ui';

const EPS = 0.0005;

export function CartonEntry({ cartons, onChange, blocked, stock, uom, readOnly, canScan, canRemove }: {
  cartons: CartonRow[];
  onChange: (rows: CartonRow[]) => void;
  /** carton nos already used in other items of this voucher */
  blocked: Set<string>;
  /** stock of the item's Item / Merge / Grade / Shade */
  stock: StockState;
  uom: string;
  readOnly?: boolean;
  /** permission repacking_issue.carton_entry:scan */
  canScan: boolean;
  /** permission repacking_issue.carton_entry:remove_carton */
  canRemove: boolean;
}) {
  const [cartNo, setCartNo] = useState('');
  const [mtr, setMtr] = useState('');
  const [wt, setWt] = useState('');
  const [editKey, setEditKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ t: 'err' | 'ok'; s: string } | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const cartRef = useRef<TextInput>(null);
  const mtrRef = useRef<TextInput>(null);
  const wtRef = useRef<TextInput>(null);

  const entryAllowed = !readOnly && canScan;
  const tot = cartonTotals(cartons, uom);

  const dupReason = (no: string): string | null => {
    const n = no.trim().toUpperCase();
    if (!n) return 'Enter carton no.';
    if (cartons.some(c => c.key !== editKey && c.cartNo.trim().toUpperCase() === n)) return `Carton ${no} is already in this item`;
    if (blocked.has(n)) return `Carton ${no} is already in another item`;
    return null;
  };

  const checked = React.useRef<{ no: string; source?: CartonRow['source'] } | null>(null);

  /** stock row for a carton no. (also matches without leading zeros) */
  const findStock = (no: string): StockCarton | undefined => {
    const n = no.trim().toUpperCase();
    const z = n.replace(/^0+/, '');
    return stock.rows?.find(r => {
      const c = r.cartNo.trim().toUpperCase();
      return c === n || c.replace(/^0+/, '') === z;
    });
  };

  const stockError = (): string | null => {
    if (!stock.rows) return 'Select Item, Merge, Grade and Shade first';
    if (stock.loading) return 'Stock is loading, try again in a moment';
    if (stock.error) return `Stock not loaded: ${stock.error}`;
    return null;
  };

  const acceptCarton = (raw: string) => {
    const no = raw.trim();
    setCartNo(no);
    const d = dupReason(no) ?? stockError();
    if (d) {
      setMsg({ t: 'err', s: d });
      cartRef.current?.focus();
      return;
    }
    const hit = findStock(no);
    if (!hit) {
      setMsg({ t: 'err', s: `Carton ${no} is not in stock for this item / merge / grade / shade` });
      cartRef.current?.focus();
      return;
    }
    if (hit.locked) {
      setMsg({ t: 'err', s: `Carton ${hit.cartNo} is locked${hit.lockReason ? `: ${hit.lockReason}` : ''}` });
      cartRef.current?.focus();
      return;
    }
    if (dupReason(hit.cartNo)) {
      setMsg({ t: 'err', s: dupReason(hit.cartNo)! });
      return;
    }
    checked.current = { no: hit.cartNo, source: hit.source };
    setCartNo(hit.cartNo);
    setMtr(hit.source.qty ? String(hit.source.qty) : '');
    setWt(hit.source.wt ? String(hit.source.wt) : '');
    setMsg({ t: 'ok', s: `${hit.tranName || 'Stock'} • balance ${fmt3(hit.source.qty ?? 0)} / ${fmt3(hit.source.wt ?? 0)}` });
    mtrRef.current?.focus();
  };

  const addFromStock = (rows: StockCarton[]) => {
    const fresh = rows.filter(r => !r.locked && !dupReason(r.cartNo));
    onChange([
      ...cartons,
      ...fresh.map(r => ({
        key: newKey('c'),
        cartNo: r.cartNo,
        mtr: String(r.source.qty ?? ''),
        wt: String(r.source.wt ?? ''),
        source: r.source,
      })),
    ]);
    setPickOpen(false);
    setMsg({ t: 'ok', s: `Added ${fresh.length} carton(s) from stock` });
  };

  const scanner = useRepackScanner(code => {
    if (!editKey) acceptCarton(code);
  }, entryAllowed);

  const reset = () => {
    checked.current = null;
    setCartNo('');
    setMtr('');
    setWt('');
    setEditKey(null);
    setTimeout(() => cartRef.current?.focus(), 50);
  };

  const add = () => {
    const d = dupReason(cartNo);
    if (d) return setMsg({ t: 'err', s: d });
    const no = cartNo.trim();
    const prev = editKey ? cartons.find(c => c.key === editKey) : undefined;
    const source = checked.current?.no === no ? checked.current.source : prev?.cartNo === no ? prev.source : undefined;
    if (!source) {
      // typed and Add pressed without Enter → look it up now
      acceptCarton(no);
      return;
    }
    const kgs = String(source.amtCalc || uom).toUpperCase() === 'KGS';
    if ((kgs ? toNum(wt) : toNum(mtr)) <= 0) {
      setMsg({ t: 'err', s: `${kgs ? 'Weight' : 'Qty'} must be more than 0` });
      return (kgs ? wtRef : mtrRef).current?.focus();
    }
    if (source.qty && toNum(mtr) > source.qty + EPS) {
      setMsg({ t: 'err', s: `Qty is more than the stock balance (${fmt3(source.qty)})` });
      return mtrRef.current?.focus();
    }
    if (source.wt && toNum(wt) > source.wt + EPS) {
      setMsg({ t: 'err', s: `Weight is more than the stock balance (${fmt3(source.wt)})` });
      return wtRef.current?.focus();
    }
    const row: CartonRow = { key: editKey ?? newKey('c'), cartNo: no, mtr, wt, source, raw: prev?.cartNo === no ? prev.raw : undefined };
    onChange(editKey ? cartons.map(c => (c.key === editKey ? row : c)) : [...cartons, row]);
    setMsg({ t: 'ok', s: `${editKey ? 'Updated' : 'Added'} carton ${row.cartNo}` });
    reset();
  };

  const edit = (c: CartonRow) => {
    if (!entryAllowed) return;
    checked.current = { no: c.cartNo, source: c.source };
    setEditKey(c.key);
    setCartNo(c.cartNo);
    setMtr(c.mtr);
    setWt(c.wt);
    setMsg(null);
    setTimeout(() => mtrRef.current?.focus(), 50);
  };

  const remove = async (c: CartonRow) => {
    if (!(await confirmAsync('Remove carton', `Remove carton ${c.cartNo}?`, 'Remove', true))) return;
    onChange(cartons.filter(x => x.key !== c.key));
    if (editKey === c.key) reset();
  };

  const scannerLabel =
    scanner.state === 'active' ? 'Scanner ready' : scanner.state === 'listening' ? 'Scanner listening' : null;

  return (
    <View>
      {entryAllowed ? (
        <>
          {Platform.OS === 'android' && scannerLabel ? (
            <View style={cs.scanBar}>
              <View style={[cs.dot, { backgroundColor: scanner.state === 'active' ? C.ok : C.cta }]} />
              <Text style={cs.scanTxt}>{scannerLabel}</Text>
              <Pressable onPress={triggerUrovoScan} style={cs.scanBtn} accessibilityLabel="Fire scanner">
                <Icon name="qr-code-scanner" size={16} color={C.onNav} />
                <Text style={cs.scanBtnTxt}>Scan</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={cs.stockBar}>
            <Icon name="inventory-2" size={16} color={stock.error ? C.danger : C.nav} />
            <Text style={[cs.stockTxt, stock.error ? { color: C.danger } : null]} numberOfLines={2}>
              {!stock.rows
                ? 'Select Item, Merge, Grade and Shade to load stock'
                : stock.loading
                  ? 'Loading stock…'
                  : stock.error
                    ? stock.error
                    : `${stock.rows.filter(r => !r.locked && !blocked.has(r.cartNo.toUpperCase()) && !cartons.some(c => c.cartNo.toUpperCase() === r.cartNo.toUpperCase())).length} carton(s) in stock`}
            </Text>
            {stock.error ? <Btn small kind="ghost" icon="refresh" title="Retry" onPress={stock.reload} /> : null}
            <Btn small icon="playlist-add-check" title="Pick from stock" onPress={() => setPickOpen(true)} disabled={!stock.rows || stock.loading || !!stock.error} />
          </View>

          <View style={cs.entry}>
            <View style={{ flex: 1.4, minWidth: 0 }}>
              <Text style={[LABEL, cs.lbl]}>Carton No</Text>
              <Input
                ref={cartRef}
                value={cartNo}
                onChangeText={t => { setCartNo(t); setMsg(null); }}
                onSubmitEditing={() => acceptCarton(cartNo)}
                placeholder="Scan / type"
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                editable={!editKey}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[LABEL, cs.lbl]}>Qty</Text>
              <Input
                ref={mtrRef}
                value={mtr}
                onChangeText={t => setMtr(cleanDecimal(t))}
                onSubmitEditing={() => wtRef.current?.focus()}
                keyboardType="decimal-pad"
                placeholder="0.000"
                returnKeyType="next"
                blurOnSubmit={false}
                style={{ textAlign: 'right' }}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[LABEL, cs.lbl]}>Weight</Text>
              <Input
                ref={wtRef}
                value={wt}
                onChangeText={t => setWt(cleanDecimal(t))}
                onSubmitEditing={add}
                keyboardType="decimal-pad"
                placeholder="0.000"
                returnKeyType="done"
                style={{ textAlign: 'right' }}
              />
            </View>
          </View>
          <View style={cs.actions}>
            {msg ? (
              <Text style={[cs.msg, { color: msg.t === 'err' ? C.danger : C.ok }]} numberOfLines={2}>{msg.s}</Text>
            ) : (
              <Text style={cs.tip}>Scan carton → Qty → Weight → Enter</Text>
            )}
            <View style={{ flexDirection: 'row', gap: SP.sm }}>
              {editKey ? <Btn small kind="ghost" title="Cancel" onPress={reset} /> : null}
              <Btn small kind="dark" icon={editKey ? 'check' : 'add'} title={editKey ? 'Update' : 'Add'} onPress={add} />
            </View>
          </View>
        </>
      ) : !readOnly ? (
        <Text style={[cs.tip, { marginBottom: SP.md }]}>You don't have permission to scan / add cartons.</Text>
      ) : null}

      <View style={cs.table}>
        <View style={[cs.tr, cs.th]}>
          <Text style={[cs.c0, cs.thTxt]}>#</Text>
          <Text style={[cs.c1, cs.thTxt]}>Carton No</Text>
          <Text style={[cs.c2, cs.thTxt]}>Qty</Text>
          <Text style={[cs.c2, cs.thTxt]}>Weight</Text>
          <View style={cs.c3} />
        </View>
        {cartons.length === 0 ? (
          <Text style={cs.empty}>No cartons yet</Text>
        ) : (
          cartons.map((c, i) => (
            <Pressable key={c.key} onPress={() => edit(c)} style={[cs.tr, i % 2 === 1 && cs.alt, editKey === c.key && cs.editing]}>
              <Text style={[cs.c0, cs.td]}>{i + 1}</Text>
              <View style={[cs.c1, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <Text style={[cs.td, { fontWeight: '700', flexShrink: 1 }]} numberOfLines={1}>{c.cartNo}</Text>
                <Text style={[cs.tag, cartonUom(c, uom) === 'KGS' && cs.tagKgs]}>{cartonUom(c, uom)}</Text>
              </View>
              <Text style={[cs.c2, cs.td]}>{fmt3(toNum(c.mtr))}</Text>
              <Text style={[cs.c2, cs.td]}>{fmt3(toNum(c.wt))}</Text>
              <View style={cs.c3}>
                {!readOnly && canRemove ? (
                  <Pressable onPress={() => remove(c)} hitSlop={10} accessibilityLabel={`Remove carton ${c.cartNo}`}>
                    <Icon name="close" size={18} color={C.danger} />
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          ))
        )}
        <View style={[cs.tr, cs.tf]}>
          <Text style={[cs.c0, cs.tfTxt]} />
          <Text style={[cs.c1, cs.tfTxt]}>{tot.count} carton{tot.count === 1 ? '' : 's'}</Text>
          <Text style={[cs.c2, cs.tfTxt]}>{fmt3(tot.mtr)}</Text>
          <Text style={[cs.c2, cs.tfTxt]}>{fmt3(tot.wt)}</Text>
          <View style={cs.c3} />
        </View>
      </View>
      <Text style={cs.uom}>
        Item Qty {fmt3(tot.qty)} = qty of MTR cartons + weight of KGS cartons (AmtCalc of the inward). Item Wt = weight total.
      </Text>

      <StockPicker
        visible={pickOpen}
        stock={stock}
        used={new Set([...blocked, ...cartons.map(c => c.cartNo.trim().toUpperCase())])}
        onAdd={addFromStock}
        onClose={() => setPickOpen(false)}
      />
    </View>
  );
}

const cs = StyleSheet.create({
  scanBar: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.md, paddingVertical: 6, paddingHorizontal: SP.md, borderRadius: R.md, backgroundColor: C.track },
  dot: { width: 8, height: 8, borderRadius: 4 },
  scanTxt: { flex: 1, fontSize: 12, fontWeight: '700', color: C.nav },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.nav, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6 },
  scanBtnTxt: { color: C.onNav, fontWeight: '800', fontSize: 12 },
  entry: { flexDirection: 'row', gap: SP.sm },
  stockBar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.md, padding: SP.sm, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.quiet },
  stockTxt: { flex: 1, minWidth: 140, fontSize: 12, fontWeight: '700', color: C.nav },
  lbl: { marginBottom: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SP.sm, marginBottom: SP.md, gap: SP.sm },
  msg: { flex: 1, fontSize: 13, fontWeight: '700' },
  tip: { flex: 1, fontSize: 12, color: C.muted },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: R.md, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', minHeight: 42, paddingHorizontal: SP.sm, borderBottomWidth: 1, borderColor: C.hair },
  th: { backgroundColor: C.nav, minHeight: 36, borderBottomWidth: 0 },
  thTxt: { color: C.onNav, fontWeight: '800', fontSize: 12 },
  tf: { backgroundColor: C.ctaSoft, borderBottomWidth: 0 },
  tfTxt: { fontWeight: '800', color: C.cta, fontSize: 13, fontVariant: ['tabular-nums'] },
  alt: { backgroundColor: C.quiet },
  editing: { backgroundColor: C.ctaSoft },
  c0: { width: 28 },
  c1: { flex: 1.4, minWidth: 0 },
  c2: { flex: 1, textAlign: 'right' },
  c3: { width: 34, alignItems: 'flex-end' },
  td: { fontSize: 14, color: C.ink, fontVariant: ['tabular-nums'] },
  empty: { textAlign: 'center', color: C.muted, paddingVertical: SP.lg },
  uom: { fontSize: 12, color: C.muted, marginTop: 6 },
  tag: { fontSize: 10, fontWeight: '800', color: C.nav, backgroundColor: C.track, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, overflow: 'hidden' },
  tagKgs: { color: C.cta, backgroundColor: C.ctaSoft }
});
