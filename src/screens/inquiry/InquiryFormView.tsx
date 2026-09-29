// FILE: src/screens/inquiry/InquiryFormView.tsx
// New / edit inquiry (legacy InquiryFormScreen + PartySelection + AddParty +
// DesignSelection + ShadeSelection + ShadesSection) — ONE view, the pickers
// open as sheets on top, so nothing is lost while picking.
//
// Same rules as legacy:
//   - party required (search /api/parties/search, or "Add new party via GSTIN"
//     -> /api/check_single_gstin -> party with acc_code '' + prp_code = prptype)
//   - each design/item: existing (search /api/designs/search) or new (name +
//     construction required), >= 1 shade, qty > 0 (= sum of shade qty),
//     unit, GST %, expected delivery date (DD-MM-YYYY, not before today)
//   - shade master: /api/shadedrop (SIP for S else SK, store 002, sales_order)
//   - stock chip: /api/appgreyinstockdata — S matches SDSNCODE, others ITMCODE
//     (+ SHDCODE) -> TOTQTY; out / low (< shade qty) / sufficient
//   - create: POST /api/inquiries, then POST /api/designs/{id}/shades per design
//   - edit: only while pending_costing, PUT /api/inquiries/{id}
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useInquiry, useInquiryNav } from './InquiryContext';
import {
  Design,
  DsnWord,
  dsnWord,
  errMsg,
  formatQty,
  InquiryDesignInput,
  InquiryShade,
  isSip,
  isValidEmail,
  isValidGSTIN,
  isValidMobile,
  num,
  Party,
} from './inquiryModel';
import { Banner, Btn, Card, DateField, Field, HIT, Loader, MONO, PickerSheet, SelectBox, useWide, ViewShell } from './ui';

interface DesignRow extends InquiryDesignInput {
  _id: string;
  shades: InquiryShade[];
}

let rowSeq = 0;
const emptyRow = (): DesignRow => ({
  _id: `r${++rowSeq}_${Date.now()}`,
  design_prp_code: null,
  design_dsn_code: null,
  is_new_design: false,
  design_name_snapshot: '',
  construction_remarks: '',
  quantity: 0,
  unit: 'mtr',
  gst_percent: 5,
  expected_delivery_date: '',
  shades: [],
});

type Picker =
  | { kind: 'party' }
  | { kind: 'design'; rowId: string }
  | { kind: 'shade'; rowId: string; idx: number }
  | null;

export function InquiryFormView({ inquiryId }: { inquiryId?: number }) {
  const { api, prptype } = useInquiry();
  const nav = useInquiryNav();
  const { wide } = useWide();
  const sip = isSip(prptype);
  const editMode = !!inquiryId;

  const [party, setParty] = useState<Party | null>(null);
  const [remarks, setRemarks] = useState('');
  const [rows, setRows] = useState<DesignRow[]>(() => [emptyRow()]);
  const [loading, setLoading] = useState(editMode);
  const [saving, setSaving] = useState(false);
  const [stock, setStock] = useState<any[]>([]);
  const [picker, setPicker] = useState<Picker>(null);
  const [addParty, setAddParty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit: prefill (only while pending_costing)
  useEffect(() => {
    if (!editMode) return;
    let alive = true;
    (async () => {
      try {
        const ex = await api.show(inquiryId!);
        if (!alive) return;
        if (ex.status !== 'pending_costing') {
          AppAlert.alert('Cannot Edit', 'This inquiry can no longer be edited because it has been costed.', [
            { text: 'OK', onPress: () => nav.back() },
          ]);
          return;
        }
        setParty({
          prp_code: ex.party_prp_code,
          acc_code: ex.party_acc_code,
          name: ex.party_name,
          address: ex.party_address || '',
          gstin: ex.party_gstin || '',
        });
        setRemarks(ex.remarks || '');
        setRows((ex.designs || []).map((d, i) => ({
          _id: `d_${i}_${d.id}`,
          design_prp_code: d.design_prp_code,
          design_dsn_code: d.design_dsn_code,
          is_new_design: !!d.is_new_design,
          design_name_snapshot: d.design_name,
          construction_remarks: d.construction_remarks || '',
          quantity: num(d.quantity),
          unit: d.unit,
          gst_percent: num(d.gst_percent),
          expected_delivery_date: d.expected_delivery_date || '',
          shades: d.shades || [],
        })));
      } catch (e) {
        if (alive) setError(errMsg(e, 'Failed to load inquiry'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [api, editMode, inquiryId, nav]);

  // Fabric stock for the shade stock chip (loaded once)
  useEffect(() => {
    let alive = true;
    api.stockList().then((d) => { if (alive) setStock(d); }).catch(() => undefined);
    return () => { alive = false; };
  }, [api]);

  const stockOf = useCallback((row: DesignRow, shadeCode?: string | null) => {
    if (!shadeCode || !row.design_dsn_code || !stock.length) return null;
    const code = String(row.design_dsn_code).trim();
    const shd = String(shadeCode).trim();
    const hit = stock.find((r) =>
      String(sip ? r.SDSNCODE : r.ITMCODE).trim() === code && String(r.SHDCODE).trim() === shd);
    return hit ? num(hit.TOTQTY) : 0;
  }, [stock, sip]);

  const patchRow = (id: string, patch: Partial<DesignRow>) =>
    setRows((cur) => cur.map((r) => (r._id === id ? { ...r, ...patch } : r)));

  const setShades = (row: DesignRow, shades: InquiryShade[]) =>
    patchRow(row._id, { shades, quantity: shades.reduce((s, sh) => s + num(sh.quantity), 0) });

  const removeRow = (id: string) => {
    if (rows.length === 1) { AppAlert.alert(`At least one ${dsnWord(prptype)} required`); return; }
    setRows((cur) => cur.filter((r) => r._id !== id));
  };

  const validate = (): string | null => {
    if (!party) return 'Please select a party first';
    for (let i = 0; i < rows.length; i++) {
      const d = rows[i];
      const w = dsnWord(prptype);
      if (!d.design_name_snapshot.trim()) return sip ? 'Design name required, Please add a design' : 'Item name required, Please add an item';
      if (d.is_new_design && !d.construction_remarks.trim()) return `Please add construction details for new ${dsnWord(prptype, true)}`;
      if (!d.shades?.length) return `Select at least one shade for each ${w}`;
      if (d.shades.some((sh) => !String(sh.shade_name || '').trim())) return `Select the shade name for every shade of ${w} #${i + 1}`;
      if (!d.quantity || d.quantity <= 0) return `Enter a valid quantity for each ${w} from selected shades`;
      if (!d.expected_delivery_date) return `Delivery date required for ${w} #${i + 1}`;
    }
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) { setError(problem); AppAlert.alert(!party ? 'Select Party' : 'Check the form', problem); return; }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        party_prp_code: party!.prp_code,
        party_acc_code: party!.acc_code,
        party_name_snapshot: party!.name,
        party_gstin: party!.gstin,
        party_address: party!.address,
        remarks,
        prptype: api.ctx.prptype,
        yearno: api.ctx.yearno,
        // shades carry stock_qty / stock_status like legacy (computed now, with the final qty)
        designs: rows.map(({ _id, ...rest }) => ({
          ...rest,
          shades: rest.shades.map((sh) => {
            const q = stockOf(rows.find((r) => r._id === _id)!, sh.shade_code);
            const stock_status: InquiryShade['stock_status'] =
              q === null ? 'unknown' : q <= 0 ? 'out' : q < num(sh.quantity) ? 'low' : 'sufficient';
            return { ...sh, stock_qty: q, stock_status };
          }),
        })),
      };
      if (editMode) {
        const updated = await api.update(inquiryId!, payload);
        AppAlert.alert('Success', `Inquiry ${updated?.inquiry_no ?? ''} updated`, [{ text: 'OK', onPress: () => nav.back() }]);
      } else {
        const created = await api.store(payload);
        const saved = created?.designs ?? [];
        // same as legacy: shades saved per created design (index order)
        await Promise.all(saved.map((sd, i) => {
          const local = rows[i];
          if (!local?.shades?.length) return Promise.resolve();
          return api.saveShades(sd.id, local.shades.map((sh) => ({
            shade_name: sh.shade_name, shade_code: sh.shade_code, quantity: sh.quantity, rate: sh.rate,
          })));
        }));
        AppAlert.alert('Success', `Inquiry ${created?.inquiry_no ?? ''} created`, [
          { text: 'OK', onPress: () => (created?.id ? nav.resetTo({ name: 'detail', id: created.id }) : nav.back()) },
        ]);
      }
    } catch (e) {
      const m = errMsg(e, 'Failed to save inquiry');
      setError(m);
      AppAlert.alert('Error', m);
    } finally {
      setSaving(false);
    }
  };

  const pickRow = picker && picker.kind !== 'party' ? rows.find((r) => r._id === picker.rowId) : null;

  if (loading) {
    return <ViewShell title={editMode ? 'Edit Inquiry' : 'New Inquiry'}><Loader label="Loading inquiry…" /></ViewShell>;
  }

  const total = rows.reduce((s, r) => s + num(r.quantity), 0);

  return (
    <ViewShell
      title={editMode ? 'Edit Inquiry' : 'New Inquiry'}
      subtitle="Enter your inquiry details"
      maxWidth={960}
      footer={
        <View style={s.footer}>
          <View style={[s.footerInner, wide && { maxWidth: 960 }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.footLbl}>{rows.length} {dsnWord(prptype, rows.length > 1)} · TOTAL QTY</Text>
              <Text style={s.footVal}>{formatQty(total)}</Text>
            </View>
            <Btn title="Cancel" variant="secondary" onPress={nav.back} style={{ minWidth: 92 }} />
            <Btn title={editMode ? 'Update Inquiry' : 'Save Inquiry'} icon="check" variant="accent" onPress={save} loading={saving} style={{ minWidth: 150 }} />
          </View>
        </View>
      }
    >
      <View style={s.infoRow}>
        <View style={s.infoBox}>
          <Text style={s.infoLbl}>INQUIRY NO.</Text>
          <Text style={s.infoVal}>{editMode ? 'Existing' : 'Auto Generated'}</Text>
        </View>
        <View style={s.infoBox}>
          <Text style={s.infoLbl}>DATE</Text>
          <Text style={s.infoVal}>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
        </View>
      </View>

      {!!error && <Banner tone="danger" icon="error-outline" text={error} />}

      <Card title="Party">
        <SelectBox
          required
          value={party?.name}
          sub={[party?.city, party?.state].filter(Boolean).join(', ') + (party?.gstin ? ` · ${party.gstin}` : '')}
          placeholder="Tap to select party"
          onPress={() => setPicker({ kind: 'party' })}
        />
      </Card>

      <Text style={s.section}>{sip ? 'Designs' : 'Items'} <Text style={{ color: T.red }}>*</Text></Text>

      {rows.map((row, idx) => (
        <Card
          key={row._id}
          title={`${DsnWord(prptype)} #${idx + 1}${row.is_new_design ? ' (New)' : ''}`}
          right={rows.length > 1 ? (
            <TouchableOpacity onPress={() => removeRow(row._id)} hitSlop={HIT} style={s.removeRow}>
              <Icon name="delete-outline" size={15} color={T.red} />
              <Text style={s.removeRowText}>Remove</Text>
            </TouchableOpacity>
          ) : null}
        >
          <View style={s.toggle}>
            {[false, true].map((isNew) => {
              const on = row.is_new_design === isNew;
              return (
                <TouchableOpacity
                  key={String(isNew)}
                  onPress={() => patchRow(row._id, {
                    is_new_design: isNew, design_name_snapshot: '', construction_remarks: '',
                    design_prp_code: null, design_dsn_code: null,
                  })}
                  style={[s.toggleBtn, on && s.toggleOn]}
                  activeOpacity={0.75}
                >
                  <Text style={[s.toggleText, on && { color: '#fff' }]}>
                    {isNew ? `New ${DsnWord(prptype)}` : 'Existing'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[wide && s.grid2]}>
            <View style={wide && s.col}>
              {!row.is_new_design ? (
                <SelectBox
                  label={`${DsnWord(prptype)}`}
                  required
                  value={row.design_name_snapshot}
                  sub={row.design_dsn_code ? `Code ${row.design_dsn_code}` : null}
                  placeholder={`Tap to select ${dsnWord(prptype)}`}
                  onPress={() => setPicker({ kind: 'design', rowId: row._id })}
                />
              ) : (
                <Field
                  label={`${DsnWord(prptype)} Name`}
                  required
                  value={row.design_name_snapshot}
                  onChangeText={(t) => patchRow(row._id, { design_name_snapshot: t })}
                  placeholder={`Enter ${dsnWord(prptype)} name`}
                />
              )}
            </View>
            <View style={wide && s.col}>
              <DateField
                label="Expected Delivery Date"
                required
                value={row.expected_delivery_date}
                onChange={(v) => patchRow(row._id, { expected_delivery_date: v })}
              />
            </View>
          </View>

          <Field
            label="Construction / Remarks"
            required={row.is_new_design}
            value={row.construction_remarks}
            onChangeText={(t) => patchRow(row._id, { construction_remarks: t })}
            placeholder="Warp, weft, GSM, width, composition..."
            multiline
          />

          <ShadesEditor
            row={row}
            stockOf={stockOf}
            onChange={(sh) => setShades(row, sh)}
            onPickShade={(i) => setPicker({ kind: 'shade', rowId: row._id, idx: i })}
          />

          <View style={s.grid2}>
            <View style={s.col}>
              <Field label="Unit" value={row.unit} onChangeText={(t) => patchRow(row._id, { unit: t })} placeholder="mtr" />
            </View>
            <View style={s.col}>
              <Field
                label="GST %"
                value={String(row.gst_percent ?? '')}
                onChangeText={(t) => patchRow(row._id, { gst_percent: parseFloat(t) || 0 })}
                keyboardType="decimal-pad"
                placeholder="5"
              />
            </View>
          </View>
        </Card>
      ))}

      <TouchableOpacity style={s.addRow} onPress={() => setRows((cur) => [...cur, emptyRow()])} activeOpacity={0.75}>
        <Icon name="add" size={17} color={T.blue} />
        <Text style={s.addRowText}>Add Another {DsnWord(prptype)}</Text>
      </TouchableOpacity>

      <Card title="Inquiry remarks (optional)">
        <Field value={remarks} onChangeText={setRemarks} multiline placeholder="Any general note for this inquiry..." style={{ marginBottom: 0 }} />
      </Card>

      {/* ---------- pickers ---------- */}
      <PickerSheet<Party>
        visible={picker?.kind === 'party'}
        title="Select Party"
        placeholder="Search by name, GSTIN, or code"
        onClose={() => setPicker(null)}
        load={(q) => api.searchParties(q)}
        keyOf={(p, i) => `${p.prp_code}-${p.acc_code}-${i}`}
        render={(p) => ({ title: p.name, sub: [[p.city, p.state].filter(Boolean).join(', '), p.gstin].filter(Boolean).join(' · ') })}
        onPick={(p) => { setParty(p); setPicker(null); setError(null); }}
        emptyText="Start typing to search parties"
        headerAction={
          <TouchableOpacity style={s.addParty} onPress={() => { setPicker(null); setAddParty(true); }} activeOpacity={0.75}>
            <Icon name="person-add-alt" size={17} color={T.blue} />
            <Text style={s.addPartyText}>Add New Party via GSTIN</Text>
          </TouchableOpacity>
        }
      />
      <PickerSheet<Design>
        visible={picker?.kind === 'design'}
        title={`Select ${DsnWord(prptype)}`}
        placeholder={`Search ${dsnWord(prptype)} by name or code`}
        onClose={() => setPicker(null)}
        load={(q) => api.searchDesigns(q)}
        keyOf={(d, i) => `${d.prp_code}-${d.dsn_code}-${i}`}
        render={(d) => ({ title: d.name, sub: `Code: ${d.dsn_code}${d.short ? ` · ${d.short}` : ''}` })}
        onPick={(d) => {
          if (pickRow) {
            patchRow(pickRow._id, {
              design_prp_code: d.prp_code, design_dsn_code: d.dsn_code, design_name_snapshot: d.name, is_new_design: false,
            });
          }
          setPicker(null);
        }}
        emptyText={`Start typing to search ${dsnWord(prptype, true)}`}
      />
      <PickerSheet<{ ShdCode: string; ShdName: string }>
        visible={picker?.kind === 'shade'}
        title="Select Shade"
        placeholder="Search shade by name or code"
        remote={false}
        onClose={() => setPicker(null)}
        load={() => api.shadeMaster()}
        keyOf={(x, i) => `${x.ShdCode}-${i}`}
        render={(x) => ({ title: x.ShdName, sub: `Code: ${x.ShdCode}` })}
        onPick={(x) => {
          if (pickRow && picker?.kind === 'shade') {
            const next = pickRow.shades.map((sh, i) => (i === picker.idx ? { ...sh, shade_code: x.ShdCode, shade_name: x.ShdName } : sh));
            setShades(pickRow, next);
          }
          setPicker(null);
        }}
        emptyText="No shades available"
      />
      <AddPartySheet
        visible={addParty}
        onClose={() => setAddParty(false)}
        onSaved={(p) => { setParty(p); setAddParty(false); setError(null); }}
      />
    </ViewShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shades of one design/item                                                  */
/* -------------------------------------------------------------------------- */

function ShadesEditor({ row, stockOf, onChange, onPickShade }: {
  row: DesignRow;
  stockOf: (row: DesignRow, code?: string | null) => number | null;
  onChange: (shades: InquiryShade[]) => void;
  onPickShade: (idx: number) => void;
}) {
  const shades = row.shades;
  const { wide } = useWide();
  const update = (i: number, patch: Partial<InquiryShade>) => onChange(shades.map((sh, k) => (k === i ? { ...sh, ...patch } : sh)));
  const totalQty = shades.reduce((s, sh) => s + num(sh.quantity), 0);
  const avgRate = useMemo(() => {
    let v = 0; let q = 0;
    shades.forEach((sh) => { q += num(sh.quantity); v += num(sh.quantity) * num(sh.rate); });
    return q > 0 ? Math.round((v / q) * 100) / 100 : 0;
  }, [shades]);

  return (
    <View style={s.shades}>
      <View style={s.shadesHead}>
        <Icon name="palette" size={15} color={T.copper} />
        <Text style={s.shadesTitle}>SHADES</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => onChange([...shades, { shade_name: '', shade_code: '', quantity: 0, rate: null, stock_qty: null, stock_status: 'unknown' }])}
          style={s.addShade}
          activeOpacity={0.75}
        >
          <Icon name="add" size={15} color="#fff" />
          <Text style={s.addShadeText}>Add shade</Text>
        </TouchableOpacity>
      </View>

      {shades.length === 0 ? (
        <Text style={s.shadesEmpty}>No shades added. Tap "Add shade" to start.</Text>
      ) : shades.map((sh, i) => {
        const qty = stockOf(row, sh.shade_code);
        const status = qty === null ? 'unknown' : qty <= 0 ? 'out' : qty < num(sh.quantity) ? 'low' : 'sufficient';
        const c = { sufficient: T.green, low: T.amber, out: T.red, unknown: T.muted }[status];
        return (
          <View key={i} style={s.shadeRow}>
            <View style={[s.shadeLine, !wide && { flexWrap: 'wrap' }]}>
              <Text style={s.shadeNo}>{i + 1}</Text>
              <TouchableOpacity onPress={() => onPickShade(i)} style={[s.shadePick, !wide && { flexBasis: '80%' }]} activeOpacity={0.7}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[s.shadeName, !sh.shade_name && { color: T.muted, fontWeight: '600' }]} numberOfLines={1}>
                    {sh.shade_name || 'Tap to select shade'}
                  </Text>
                  {!!sh.shade_code && <Text style={s.shadeCode}>Code {sh.shade_code}</Text>}
                </View>
                <Icon name="search" size={15} color={T.muted} />
              </TouchableOpacity>
              <TextInput
                value={sh.quantity ? String(sh.quantity) : ''}
                onChangeText={(t) => update(i, { quantity: parseFloat(t) || 0 })}
                keyboardType="decimal-pad"
                placeholder="Qty *"
                placeholderTextColor={T.muted}
                style={[s.shadeInput, !wide && { flexGrow: 1 }]}
              />
              <TextInput
                value={sh.rate ? String(sh.rate) : ''}
                onChangeText={(t) => update(i, { rate: t ? parseFloat(t) || null : null })}
                keyboardType="decimal-pad"
                placeholder="Rate"
                placeholderTextColor={T.muted}
                style={[s.shadeInput, !wide && { flexGrow: 1 }]}
              />
              <TouchableOpacity onPress={() => onChange(shades.filter((_, k) => k !== i))} hitSlop={HIT} style={s.shadeDel}>
                <Icon name="close" size={16} color={T.red} />
              </TouchableOpacity>
            </View>
            {!!sh.shade_code && (
              <View style={[s.stock, { backgroundColor: `${c}14` }]}>
                <Icon name="inventory-2" size={12} color={c} />
                <Text style={[s.stockText, { color: c }]}>
                  {qty === null ? 'Stock: select an existing design/item to check' : `Stock: ${formatQty(qty)} kg`}
                  {status === 'out' ? ' (out)' : status === 'low' ? ' (low)' : ''}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      {shades.length > 0 && (
        <View style={s.shadeTotals}>
          <Text style={s.totLine}>Total qty: <Text style={s.totVal}>{formatQty(totalQty)}</Text></Text>
          {avgRate > 0 && <Text style={s.totLine}>Avg rate: <Text style={s.totVal}>₹ {avgRate}</Text></Text>}
        </View>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Add party via GSTIN (legacy AddPartyScreen)                                */
/* -------------------------------------------------------------------------- */

function AddPartySheet({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: (p: Party) => void }) {
  const { api, prptype } = useInquiry();
  const { width, height } = useWindowDimensions();
  const [gstin, setGstin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [f, setF] = useState({ name: '', address: '', city: '', state: '', pincode: '', contact: '', mobile: '', email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    setGstin(''); setVerified(false); setErrors({});
    setF({ name: '', address: '', city: '', state: '', pincode: '', contact: '', mobile: '', email: '' });
  }, [visible]);

  const set = (k: keyof typeof f) => (v: string) => setF((cur) => ({ ...cur, [k]: v }));

  const verify = async () => {
    const g = gstin.trim().toUpperCase();
    if (!isValidGSTIN(g)) { AppAlert.alert('Invalid GSTIN', 'Please enter a valid 15-digit GSTIN'); return; }
    setVerifying(true);
    try {
      const d = await api.fetchGstin(g);
      setF((cur) => ({ ...cur, name: d.trade_name || d.legal_name, address: d.address, city: d.city, state: d.state, pincode: d.pincode }));
      setVerified(true);
    } catch (e) {
      AppAlert.alert('Error', errMsg(e, 'Unable to fetch GSTIN'));
    } finally {
      setVerifying(false);
    }
  };

  const save = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Required';
    if (f.mobile && !isValidMobile(f.mobile)) e.mobile = 'Invalid mobile';
    if (f.email && !isValidEmail(f.email)) e.email = 'Invalid email';
    setErrors(e);
    if (Object.keys(e).length) return;
    onSaved({
      prp_code: prptype,
      acc_code: '',
      name: f.name.trim(),
      address: f.address.trim(),
      city: f.city.trim(),
      state: f.state.trim(),
      pincode: f.pincode.trim(),
      gstin: gstin.trim() || undefined,
      mobile: f.mobile.trim() || undefined,
      email: f.email.trim() || undefined,
      contact: f.contact.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { maxHeight: Math.round(height * 0.92) }, width >= 760 && { maxWidth: 620 }]}>
          <View style={s.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>Add New Party</Text>
              <Text style={s.sheetSub}>Verify GSTIN to fetch the party details</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={HIT}><Icon name="close" size={21} color={T.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 14 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <Field
                label="GSTIN"
                required
                value={gstin}
                onChangeText={(t) => { setGstin(t.toUpperCase()); setVerified(false); }}
                placeholder="22AAAAA0000A1Z5"
                autoCapitalize="characters"
                maxLength={15}
                style={{ flex: 1 }}
                inputStyle={{ fontFamily: MONO }}
              />
              <Btn title="Verify" icon="verified" onPress={verify} loading={verifying} style={{ marginBottom: 10 }} />
            </View>
            {verified && <Banner tone="success" icon="check-circle" text="GSTIN verified — data fetched" />}
            <Field label="Party Name" required value={f.name} onChangeText={set('name')} error={errors.name} placeholder="Enter party name" />
            <Field label="Address" value={f.address} onChangeText={set('address')} multiline placeholder="Enter address" />
            <View style={s.grid2}>
              <Field label="City" value={f.city} onChangeText={set('city')} style={s.col} />
              <Field label="Pincode" value={f.pincode} onChangeText={set('pincode')} keyboardType="numeric" style={s.col} />
            </View>
            <Field label="State" value={f.state} onChangeText={set('state')} />
            <Field label="Contact Person" value={f.contact} onChangeText={set('contact')} placeholder="Enter contact name" />
            <View style={s.grid2}>
              <Field label="Mobile" value={f.mobile} onChangeText={set('mobile')} keyboardType="phone-pad" error={errors.mobile} style={s.col} />
              <Field label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={errors.email} style={s.col} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Btn title="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
              <Btn title="Use this Party" icon="check" variant="accent" onPress={save} style={{ flex: 2 }} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  infoBox: { flex: 1, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 10 },
  infoLbl: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.5 },
  infoVal: { fontSize: 13.5, fontWeight: '800', color: T.ink, marginTop: 2 },
  section: { fontSize: 12, fontWeight: '900', color: T.ink, marginBottom: 8, marginTop: 4, letterSpacing: 0.3 },
  removeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  removeRowText: { fontSize: 11.5, fontWeight: '800', color: T.red },
  toggle: { flexDirection: 'row', gap: 6, marginBottom: 10, backgroundColor: T.sub, borderRadius: 10, padding: 3 },
  toggleBtn: { flex: 1, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  toggleOn: { backgroundColor: T.nav },
  toggleText: { fontSize: 12.5, fontWeight: '800', color: T.ink },
  grid2: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  col: { flex: 1, minWidth: 150 },

  shades: { borderWidth: 1, borderColor: T.border, borderRadius: 10, backgroundColor: T.sub, padding: 10, marginBottom: 10 },
  shadesHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  shadesTitle: { fontSize: 11, fontWeight: '900', color: T.ink, letterSpacing: 0.4 },
  addShade: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: T.copper, borderRadius: 8, paddingHorizontal: 10, height: 30 },
  addShadeText: { color: '#fff', fontSize: 11.5, fontWeight: '900' },
  shadesEmpty: { fontSize: 12, fontWeight: '600', color: T.muted, textAlign: 'center', paddingVertical: 10 },
  shadeRow: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 9, padding: 8, marginBottom: 6 },
  shadeLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shadeNo: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: T.alt, textAlign: 'center', lineHeight: 22,
    fontSize: 11, fontWeight: '900', color: T.muted, overflow: 'hidden',
  },
  shadePick: {
    flex: 1, flexBasis: 160, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, borderWidth: 1,
    borderColor: T.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: T.surface,
  },
  shadeName: { fontSize: 12.5, fontWeight: '800', color: T.ink },
  shadeCode: { fontSize: 10, fontWeight: '600', color: T.muted },
  shadeInput: {
    width: 90, height: 40, borderWidth: 1, borderColor: T.border, borderRadius: 8, backgroundColor: T.surface,
    paddingHorizontal: 9, fontSize: 12.5, fontWeight: '700', color: T.ink, fontFamily: MONO,
  },
  shadeDel: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.red}10` },
  stock: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
  stockText: { fontSize: 10.5, fontWeight: '800' },
  shadeTotals: {
    flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 2, borderTopWidth: 1, borderTopColor: T.border,
  },
  totLine: { fontSize: 12, fontWeight: '600', color: T.muted },
  totVal: { color: T.ink, fontWeight: '900', fontFamily: MONO },

  addRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 12,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: `${T.blue}88`, backgroundColor: `${T.blue}0D`, marginBottom: 10,
  },
  addRowText: { color: T.blue, fontSize: 13, fontWeight: '900' },

  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  footerInner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, width: '100%', alignSelf: 'center' },
  footLbl: { fontSize: 9, fontWeight: '900', color: T.muted, letterSpacing: 0.5 },
  footVal: { fontSize: 16, fontWeight: '900', color: T.ink, fontFamily: MONO },

  addParty: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 12, marginBottom: 8, padding: 11,
    borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: `${T.blue}88`, backgroundColor: `${T.blue}0D`,
  },
  addPartyText: { color: T.blue, fontSize: 13, fontWeight: '900' },

  overlay: { flex: 1, backgroundColor: 'rgba(13,27,42,0.5)', justifyContent: 'center', padding: 14 },
  sheet: { backgroundColor: T.bg, borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 560, alignSelf: 'center' },
  sheetHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  sheetTitle: { fontSize: 15, fontWeight: '900', color: T.ink },
  sheetSub: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
});
