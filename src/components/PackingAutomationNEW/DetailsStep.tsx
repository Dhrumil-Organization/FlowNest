// FILE: src/components/PackingAutomationNEW/DetailsStep.tsx
// Step 2 — party → ONE production type → carton → grade → merge → marka → print no.
// Order matters: grade depends on the party, carton depends on the production type.
import { T } from '@/src/theme';
import React, { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { ServerPicker } from '../ProductionOrderNEW/ui';
import * as A from './api';
import type { Api, Ctx, Row } from './api';
import { Choice, ErrorText, FieldLabel, PickerField, Section, TextField } from './ui';
import type { Errors, Form } from './usePackingForm';
import { gradeTypeIssue, gradeTypeKey, pick, prodTypeChoices, prodTypeName, routeView, splitTypes } from './usePackingForm';

type Sheet = '' | 'party' | 'grade' | 'merge';

export default function DetailsStep({ f, api, ctx, linked, busy, problem, errors, actions }: {
  f: Form; api: Api; ctx: Ctx;
  /** Parties of the chosen route card's plan (web PartySelect). */
  linked: { parties: Row[] };
  busy: { party?: boolean; parties?: boolean; carton?: boolean }; problem: { party?: string; parties?: string; carton?: string };
  errors: Errors;
  actions: {
    chooseParty: (r: Row) => void; chooseProdType: (c: string) => void; chooseGrade: (r: Row) => void; chooseMerge: (r: Row) => void;
    set: (k: 'smarka' | 'printno' | 'carwt', v: string) => void;
  };
}) {
  const [sheet, setSheet] = useState<Sheet>('');
  const close = () => setSheet('');
  const choices = prodTypeChoices(f);
  // Grade ↔ production type check, shown as soon as it answers (not only after Continue).
  const issue = gradeTypeIssue(f);
  const allowedForGrade = f.gradeTypes && f.gradeTypes.key === gradeTypeKey(f) && f.gradeTypes.status === 'ok' ? f.gradeTypes.types : null;
  const gradeHint = [
    issue?.pending ? 'Checking production type…' : '',
    f.gradeBal ? `Balance ${f.gradeBal.balPcs} cones · ${f.gradeBal.balWt} kg (packed ${f.gradeBal.packchees} of ${f.gradeBal.gradechees})` : '',
  ].filter(Boolean).join(' · ') || undefined;

  return (
    <>
      <Section title="Party & carton">
        <PickerField label="Party name" required icon="search" value={f.party?.parname} sub={f.party?.parcode || undefined}
          placeholder="Choose party" onPress={() => setSheet('party')} loading={busy.party || busy.parties} error={problem.parties || problem.party || errors.party} />

        {f.party ? (
          <View style={{ marginTop: 16 }}>
            <FieldLabel label="Production type" required />
            {choices.length === 0 ? (
              <ErrorText>No production type is planned for this party.</ErrorText>
            ) : (
              // Always selectable, even when only one is planned (the right one may differ).
              <Choice horizontal={choices.length <= 4}
                options={choices.map((c) => {
                  const name = prodTypeName(c.code, f);
                  const sub = [name ? c.code : '', c.disabled ? 'Not for this grade' : ''].filter(Boolean).join(' · ');
                  return { value: c.code, label: name || c.code, sub: sub || undefined, disabled: c.disabled };
                })}
                value={f.prodtype}
                onChange={actions.chooseProdType}
              />
            )}
            {!errors.prodtype && choices.length > 1 && !f.prodtype && !issue ? (
              <Text style={{ marginTop: 8, fontSize: 13, fontWeight: '700', color: T.amber }}>
                {allowedForGrade && allowedForGrade.length > 1
                  ? `Grade ${f.grade?.name || f.grade?.code} allows ${allowedForGrade.join(', ')}. Tap the one being packed.`
                  : `This party has ${choices.length} production types. Tap the one being packed — nothing is chosen for you.`}
              </Text>
            ) : null}
            <ErrorText>{errors.prodtype || (issue?.field === 'prodtype' ? issue.text : undefined)}</ErrorText>
          </View>
        ) : null}

        {f.carton ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <PickerField label="Carton type" locked value={f.carton.carname} sub={f.carton.carcode || undefined} style={{ flex: 1, minWidth: 150 }} />
            <View style={{ flex: 1, minWidth: 150 }}>
              {busy.carton ? (
                <>
                  <FieldLabel label="Empty carton wt." required />
                  <View style={{ height: 52, justifyContent: 'center' }}><ActivityIndicator color={T.copper} /></View>
                </>
              ) : (
                <TextField label="Empty carton wt." required decimal value={f.carwt} onChangeText={(v) => actions.set('carwt', v.replace(/[^0-9.]/g, ''))}
                  error={problem.carton || errors.carwt}
                  hint={f.masterCarWt !== null ? `Max ${f.masterCarWt} (master carton)` : undefined} />
              )}
            </View>
          </View>
        ) : null}
      </Section>

      <Section title="Grade & route">
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <PickerField label="Grade" required value={f.grade ? f.grade.name || f.grade.code : undefined} sub={f.grade?.name && f.grade.code !== f.grade.name ? f.grade.code : undefined} placeholder={f.party ? 'Choose' : 'Choose party first'}
            disabled={!f.party} onPress={() => setSheet('grade')}
            error={f.party ? (issue?.field === 'grade' && !issue.pending ? issue.text : errors.grade) : undefined}
            hint={gradeHint} style={{ flex: 1, minWidth: 150 }} />
          <TextField label="Print no." required numeric value={f.printno} onChangeText={(v) => actions.set('printno', v.replace(/[^0-9]/g, ''))}
            error={errors.printno} style={{ flex: 1, minWidth: 120 }} />
        </View>
        <PickerField label="Merge (route)" required value={f.merge ? f.merge.name || f.merge.code : undefined} sub={f.merge?.name && f.merge.code !== f.merge.name ? f.merge.code : undefined}
          onPress={() => setSheet('merge')} error={errors.merge} style={{ marginTop: 14 }} />
        <TextField label="Shipping marka" value={f.smarka} hint="Optional" onChangeText={(v) => actions.set('smarka', v.toUpperCase())}
          error={errors.smarka} style={{ marginTop: 14 }} />
      </Section>


      <ServerPicker<Row>
        open={sheet === 'party'} onClose={close} eyebrow="PACKING" title="Party"
        placeholder="Search by name or code"
        load={async (q) => searchLocal(linked.parties, q, ['accountname', 'accname', 'acccode', 'City', 'prodtype'])}
        emptyText="No party is linked to this route card."
        keyOf={(r) => `${pick(r, 'acccode', 'parcode')}|${pick(r, 'prodtype')}|${pick(r, 'cartoncode')}`}
        render={(r) => {
          const types = splitTypes(r.prodtype);
          const qty = [pick(r, 'actprodqty') && `Prod ${pick(r, 'actprodqty')}`, pick(r, 'ordqty') && `Ord ${pick(r, 'ordqty')}`, pick(r, 'packwt') && `Packed ${pick(r, 'packwt')}`];
          return {
            title: pick(r, 'accountname', 'accname', 'parname'),
            sub: [pick(r, 'acccode', 'parcode'), pick(r, 'City'), types.length ? `Type ${types.join(', ')}` : '', ...qty].filter(Boolean).join(' · '),
          };
        }}
        onPick={(r) => { close(); actions.chooseParty(r); }}
      />
      <ServerPicker<Row>
        open={sheet === 'grade'} onClose={close} eyebrow="PACKING" title="Grade"
        placeholder="Search grade or merge"
        load={async (q) => searchLocal(await A.fetchGrades(api, ctx, routeView(f).prcuid), q, ['GrdName', 'GrdCode', 'MerName'])}
        emptyText="No grade is graded for this route card yet."
        keyOf={(r) => `${pick(r, 'GrdCode', 'grdcode')}|${pick(r, 'MerCode', 'MerName')}`}
        render={(r) => ({
          title: pick(r, 'GrdName', 'grdname') || pick(r, 'GrdCode', 'grdcode'),
          sub: [pick(r, 'GrdCode', 'grdcode'), pick(r, 'MerName') && `Merge ${pick(r, 'MerName')}`].filter(Boolean).join(' · '),
        })}
        onPick={(r) => { close(); actions.chooseGrade(r); }}
      />
      <ServerPicker<Row>
        open={sheet === 'merge'} onClose={close} eyebrow="PACKING" title="Merge (route)"
        placeholder="Search merge"
        load={(q) => {
          const v = routeView(f);
          return A.fetchMerges(api, ctx, {
            itmcode: v.itmcode, grdcode: f.grade?.code || '', shdcode: v.shdcode,
            mercode: f.merge?.code || '', mername: f.merge?.name || '', search: q,
          });
        }}
        emptyText="No merge found for this route card."
        keyOf={(r) => pick(r, 'MerCode', 'mercode') || JSON.stringify(r)}
        render={(r) => ({ title: pick(r, 'MerName', 'mername') || pick(r, 'MerCode', 'mercode'), sub: [pick(r, 'MerCode', 'mercode'), pick(r, 'Qty') && `Qty ${pick(r, 'Qty')}`].filter(Boolean).join(' · ') })}
        onPick={(r) => { close(); actions.chooseMerge(r); }}
      />
    </>
  );
}

/** The help lists come back whole; search them on the device and show the first 60. */
function searchLocal(rows: Row[], q: string, keys: string[]) {
  const s = q.trim().toUpperCase();
  const hits = s ? rows.filter((r) => keys.some((k) => String(r?.[k] ?? '').toUpperCase().includes(s))) : rows;
  return { rows: hits.slice(0, 60), total: hits.length, more: false };
}
