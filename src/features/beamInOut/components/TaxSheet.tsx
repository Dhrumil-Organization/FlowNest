// FILE: src/features/beamInOut/components/TaxSheet.tsx
// Tax Detail: one line per tax of the Entry Type's structure — % or amount, and the running "Calculated" total.
// Works on a copy: Cancel really cancels; OK checks CGST = SGST (like the web) before applying.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDeviceClass } from '@/src/core/layout/useDeviceClass';
import { cleanDecimal } from '../../repackingIssue/logic';
import { C, LABEL, R, SP } from '../../repackingIssue/theme';
import { Sheet } from '../../repackingIssue/components/Sheet';
import { Btn, Input } from '../../repackingIssue/components/ui';
import { calcTax, cleanSignedDecimal, fmt2, gstKind, validateTax } from '../logic';
import type { TaxLine } from '../types';

export function TaxSheet({ visible, gross, lines, sameState, taxAccNote, readOnly, onApply, onClose, noGst = false }: {
  /** no job yarn: every GST line is 0 (empty beams carry no GST) */
  noGst?: boolean;
  visible: boolean;
  gross: number;
  lines: TaxLine[];
  /** same state → CGST + SGST; different → IGST; null → all GST lines open */
  sameState: boolean | null;
  /** e.g. "State of the party is blank" */
  taxAccNote?: string;
  readOnly: boolean;
  onApply: (lines: TaxLine[]) => void;
  onClose: () => void;
}) {
  const { isPhone } = useDeviceClass();
  const [draft, setDraft] = useState<TaxLine[]>(lines);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (visible) {
      setDraft(lines);
      setErr('');
    }
  }, [visible, lines]);

  const calc = useMemo(() => calcTax(gross, draft, sameState, noGst), [gross, draft, sameState, noGst]);

  /* Enter: % → Amount → next line's % … ; Enter on the last field = OK (like the web Tax Detail) */
  const refs = useRef<Record<string, TextInput | null>>({});
  const order = calc.lines.filter(l => !l.off && !readOnly).flatMap(l => [`p${l.taxSr}`, `a${l.taxSr}`]);
  const next = (key: string) => {
    const i = order.indexOf(key);
    const k = order[i + 1];
    if (k) refs.current[k]?.focus();
    else ok();
  };

  const setLine = (sr: number, p: Partial<TaxLine>) => {
    setDraft(d => d.map(t => (t.taxSr === sr ? { ...t, ...p } : t)));
    setErr('');
  };

  const ok = () => {
    const m = validateTax(draft, sameState);
    if (m) return setErr(m);
    onApply(draft);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Tax Detail"
      subtitle={noGst ? `Beams ₹ ${fmt2(gross)}  •  no GST on empty beams` : `Job yarn ₹ ${fmt2(gross)}  •  GST on the yarn only`}
      maxWidth={820}
      footer={
        <View style={st.foot}>
          <View style={{ flex: 1 }}>
            <Text style={LABEL}>Net Amount</Text>
            <Text style={st.net}>₹ {fmt2(calc.net)}</Text>
          </View>
          <Btn kind="ghost" title={readOnly ? 'Close' : 'Cancel'} onPress={onClose} />
          {!readOnly ? <Btn icon="check" title="OK" onPress={ok} /> : null}
        </View>
      }>
      <ScrollView contentContainerStyle={{ padding: isPhone ? SP.md : SP.lg }} keyboardShouldPersistTaps="handled">
        {taxAccNote ? (
          <View style={st.note}><Icon name="info-outline" size={18} color={C.cta} /><Text style={st.noteTxt}>{taxAccNote}</Text></View>
        ) : null}
        {err ? <View style={st.err}><Icon name="error-outline" size={18} color={C.danger} /><Text style={st.errTxt}>{err}</Text></View> : null}

        <View style={st.table}>
          <View style={[st.tr, st.th]}>
            <Text style={[st.thTxt, { flex: 1 }]}>Description</Text>
            <Text style={[st.thTxt, st.cPer]}>%</Text>
            <Text style={[st.thTxt, st.cAmt]}>Amount</Text>
            {!isPhone ? <Text style={[st.thTxt, st.cCalc]}>Calculated</Text> : null}
          </View>
          {calc.lines.map((l, i) => {
            const gst = !!gstKind(l);
            const locked = readOnly || l.off;
            return (
              <View key={l.taxSr} style={[st.tr, i % 2 === 1 && { backgroundColor: C.quiet }, gst && !l.off && st.gstRow, l.off && { opacity: 0.45 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.name} numberOfLines={2}>
                    <Text style={[st.mode, l.taxMode === '-' && { color: C.danger }]}>{l.taxMode === '-' ? '−  ' : '+  '}</Text>
                    {l.taxName}
                  </Text>
                  {l.off ? <Text style={st.sub}>{sameState ? 'Same state — CGST + SGST apply' : 'Other state — IGST applies'}</Text> : isPhone ? <Text style={st.sub}>= {fmt2(l.calculated)}</Text> : null}
                </View>
                <View style={st.cPer}>
                  <Input
                    ref={el => { refs.current[`p${l.taxSr}`] = el; }}
                    onSubmitEditing={() => next(`p${l.taxSr}`)}
                    blurOnSubmit={false}
                    returnKeyType="next"
                    autoFocus={!locked && order[0] === `p${l.taxSr}`}
                    value={l.manual ? '' : l.per}
                    placeholder={l.manual ? '—' : '0'}
                    onChangeText={t => setLine(l.taxSr, { per: cleanDecimal(t, 2), manual: false, amt: '' })}
                    keyboardType="decimal-pad"
                    editable={!locked}
                    style={st.inNum}
                    selectTextOnFocus
                  />
                </View>
                <View style={st.cAmt}>
                  <Input
                    ref={el => { refs.current[`a${l.taxSr}`] = el; }}
                    onSubmitEditing={() => next(`a${l.taxSr}`)}
                    blurOnSubmit={false}
                    returnKeyType={order[order.length - 1] === `a${l.taxSr}` ? 'done' : 'next'}
                    value={l.manual ? l.amt : l.amount ? fmt2(l.amount).replace(/,/g, '') : ''}
                    placeholder="0.00"
                    onChangeText={t => setLine(l.taxSr, { amt: l.taxMode === '-' ? cleanDecimal(t, 2) : cleanSignedDecimal(t, 2), manual: t.trim() !== '', per: '' })}
                    keyboardType={l.taxMode === '-' ? 'decimal-pad' : 'numbers-and-punctuation'}
                    editable={!locked}
                    style={[st.inNum, l.manual && { borderColor: C.cta }]}
                    selectTextOnFocus
                  />
                </View>
                {!isPhone ? <Text style={[st.calc, st.cCalc]}>{fmt2(l.calculated)}</Text> : null}
              </View>
            );
          })}
        </View>
        <Text style={st.help}>Each % is worked out on the running total above it (the first line on the Gross); CGST and SGST use the same base. Typing an amount overrides the % (on a + line it can be negative, e.g. Round Off −0.40). Enter moves to the next field; Enter on the last one is OK, Esc cancels.</Text>

        <View style={st.sum}>
          <Sum label="Gross" value={calc.gross} />
          <Sum label="Less" value={-calc.less} />
          <Sum label="GST" value={calc.gst} />
          <Sum label="Other" value={r(calc.net - calc.gross + calc.less - calc.gst)} />
          <Sum label="Net" value={calc.net} strong />
        </View>
      </ScrollView>
    </Sheet>
  );
}

const r = (n: number) => Math.round(n * 100) / 100;

function Sum({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <View style={{ flex: 1, minWidth: 90 }}>
      <Text style={LABEL}>{label}</Text>
      <Text style={[st.sumVal, strong && { color: C.cta, fontSize: 17 }]}>{fmt2(value)}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  table: { borderWidth: 1, borderColor: C.line, borderRadius: R.md, overflow: 'hidden', backgroundColor: C.card },
  tr: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingHorizontal: SP.md, paddingVertical: 6 },
  th: { backgroundColor: C.nav, paddingVertical: 10 },
  thTxt: { color: C.onNav, fontWeight: '800', fontSize: 12, letterSpacing: 0.4 },
  gstRow: { backgroundColor: C.ctaSoft },
  cPer: { width: 76, textAlign: 'right' },
  cAmt: { width: 120, textAlign: 'right' },
  cCalc: { width: 120, textAlign: 'right' },
  name: { fontSize: 13, fontWeight: '700', color: C.ink },
  mode: { fontWeight: '800', color: C.ok },
  sub: { fontSize: 11, color: C.muted, marginTop: 2 },
  inNum: { textAlign: 'right', fontVariant: ['tabular-nums'], minHeight: 38, paddingVertical: 6 },
  calc: { fontSize: 13, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'] },
  help: { fontSize: 12, color: C.muted, marginTop: SP.sm },
  sum: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginTop: SP.lg, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  sumVal: { fontSize: 15, fontWeight: '800', color: C.nav, fontVariant: ['tabular-nums'], marginTop: 2 },
  net: { fontSize: 20, fontWeight: '800', color: C.cta, fontVariant: ['tabular-nums'] },
  foot: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, flex: 1 },
  note: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, backgroundColor: C.ctaSoft, padding: SP.sm, borderRadius: R.sm, marginBottom: SP.md },
  noteTxt: { flex: 1, color: C.ink, fontSize: 13 },
  err: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, backgroundColor: C.dangerSoft, padding: SP.sm, borderRadius: R.sm, marginBottom: SP.md },
  errTxt: { flex: 1, color: C.danger, fontWeight: '700', fontSize: 13 },
});
