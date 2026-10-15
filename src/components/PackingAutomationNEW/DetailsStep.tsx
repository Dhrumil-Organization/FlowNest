// FILE: src/components/PackingAutomationNEW/DetailsStep.tsx
// Step 2 — party → ONE production type → carton → grade → merge → marka → print no.
// Order matters: grade depends on the party, carton depends on the production type.
import { T } from '@/src/theme';
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ServerPicker } from '../ProductionOrderNEW/ui';
import * as A from './api';
import type { Api, Ctx, Row } from './api';
import { Choice, ErrorText, FieldLabel, Hint, PickerField, Section, TextField } from './ui';
import type { Errors, Form } from './usePackingForm';
import { pick, prodTypeChoices, routeView, splitTypes } from './usePackingForm';

type Sheet = '' | 'party' | 'grade' | 'merge';

export default function DetailsStep({ f, api, ctx, busy, problem, errors, actions }: {
  f: Form; api: Api; ctx: Ctx;
  busy: { party?: boolean; carton?: boolean }; problem: { party?: string; carton?: string };
  errors: Errors;
  actions: {
    chooseParty: (r: Row) => void; chooseProdType: (c: string) => void; chooseGrade: (r: Row) => void; chooseMerge: (r: Row) => void;
    set: (k: 'smarka' | 'printno' | 'carwt', v: string) => void;
  };
}) {
  const [sheet, setSheet] = useState<Sheet>('');
  const close = () => setSheet('');
  const choices = prodTypeChoices(f);
  const planuid = routeView(f).planuid;

  return (
    <>
      <Section title="Party & carton">
        <PickerField label="Party name" required icon="search" value={f.party?.parname} sub={f.party?.parcode ? `Code ${f.party.parcode}` : undefined}
          placeholder="Search party" onPress={() => setSheet('party')} loading={busy.party} error={problem.party || errors.party} />

        {f.party ? (
          <View style={{ marginTop: 16 }}>
            <FieldLabel label="Production type" required />
            {choices.length === 0 ? (
              <ErrorText>No production type is planned for this party.</ErrorText>
            ) : choices.length === 1 && !choices[0].disabled ? (
              // Only one possible → already chosen, nothing to tap.
              <PickerField label="" locked value={choices[0].code} sub={choices[0].carton?.carname} hint="The only production type planned for this party." />
            ) : (
              <>
                <Choice
                  options={choices.map((c) => ({ value: c.code, label: c.code, sub: c.carton ? c.carton.carname : 'No carton planned', disabled: c.disabled }))}
                  value={f.prodtype}
                  onChange={actions.chooseProdType}
                />
                {!errors.prodtype ? <Hint>{`This party has ${choices.length} production types. Choose the one being packed.`}</Hint> : null}
              </>
            )}
            <ErrorText>{errors.prodtype}</ErrorText>
          </View>
        ) : null}

        {f.carton ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <PickerField label="Carton type" locked value={f.carton.carname} style={{ flex: 1, minWidth: 150 }} />
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
          <PickerField label="Grade" required value={f.grade ? f.grade.name || f.grade.code : undefined} placeholder={f.party ? 'Choose' : 'Choose party first'}
            disabled={!f.party} onPress={() => setSheet('grade')} error={f.party ? errors.grade : undefined} style={{ flex: 1, minWidth: 150 }} />
          <TextField label="Print no." required numeric value={f.printno} onChangeText={(v) => actions.set('printno', v.replace(/[^0-9]/g, ''))}
            error={errors.printno} style={{ flex: 1, minWidth: 120 }} />
        </View>
        <PickerField label="Merge (route)" required value={f.merge?.code} sub={f.merge?.name && f.merge.name !== f.merge.code ? f.merge.name : undefined}
          onPress={() => setSheet('merge')} error={errors.merge} style={{ marginTop: 14 }} />
        <TextField label="Shipping marka" required value={f.smarka} onChangeText={(v) => actions.set('smarka', v.toUpperCase())}
          error={errors.smarka} style={{ marginTop: 14 }} />
      </Section>

      <ServerPicker<Row>
        open={sheet === 'party'} onClose={close} eyebrow="PACKING" title="Party"
        placeholder="Search by name or code"
        load={(q) => A.searchParties(api, ctx, { planuid, search: q })}
        keyOf={(r) => pick(r, 'acccode', 'parcode') || JSON.stringify(r)}
        render={(r) => {
          const types = splitTypes(r.prodtype);
          return { title: pick(r, 'accname', 'parname', 'name'), sub: [pick(r, 'acccode', 'parcode'), types.length ? `Types: ${types.join(', ')}` : ''].filter(Boolean).join(' · ') };
        }}
        onPick={(r) => { close(); actions.chooseParty(r); }}
      />
      <ServerPicker<Row>
        open={sheet === 'grade'} onClose={close} eyebrow="PACKING" title="Grade"
        load={(q) => A.searchGrades(api, ctx, { parcode: f.party?.parcode || '', search: q })}
        keyOf={(r) => pick(r, 'grdcode', 'code') || JSON.stringify(r)}
        render={(r) => ({ title: pick(r, 'grdname', 'name') || pick(r, 'grdcode', 'code'), sub: pick(r, 'grdcode', 'code') })}
        onPick={(r) => { close(); actions.chooseGrade(r); }}
      />
      <ServerPicker<Row>
        open={sheet === 'merge'} onClose={close} eyebrow="PACKING" title="Merge (route)"
        load={(q) => A.searchMerges(api, ctx, { route: f.route || {}, search: q })}
        keyOf={(r) => pick(r, 'mercode', 'code') || JSON.stringify(r)}
        render={(r) => ({ title: pick(r, 'mercode', 'code'), sub: pick(r, 'mername', 'name') })}
        onPick={(r) => { close(); actions.chooseMerge(r); }}
      />
    </>
  );
}
