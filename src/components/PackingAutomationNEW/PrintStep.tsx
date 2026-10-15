// FILE: src/components/PackingAutomationNEW/PrintStep.tsx
// Step 3 — cones, copies, Requir patti, printer.
import React, { useState } from 'react';
import { View } from 'react-native';
import { ServerPicker } from '../ProductionOrderNEW/ui';
import * as A from './api';
import type { Api, Ctx } from './api';
import { Choice, Counter, FieldLabel, Notice, PickerField, Section } from './ui';
import type { Errors, Form } from './usePackingForm';
import { MAX_COPIES } from './usePackingForm';

export default function PrintStep({ f, api, ctx, errors, printError, actions }: {
  f: Form; api: Api; ctx: Ctx; errors: Errors; printError?: string;
  actions: { set: (k: 'nocones' | 'noprint' | 'printer', v: string) => void; setRpatti: (v: 'Y' | 'N') => void };
}) {
  const [pickPrinter, setPickPrinter] = useState(false);
  return (
    <>
      {printError ? <Notice tone="err" text={printError} /> : null}
      <Section title="Cones & labels">
        <Counter label="Cones per box" sub="Cones packed in this box" value={f.nocones} onChange={(v) => actions.set('nocones', v)} min={1} max={999} error={errors.nocones} />
        <View style={{ height: 1, backgroundColor: '#0000000F', marginVertical: 14 }} />
        <Counter label="Label copies" sub="Prints of this label" value={f.noprint} onChange={(v) => actions.set('noprint', v)} min={1} max={MAX_COPIES} error={errors.noprint} />
        <View style={{ height: 1, backgroundColor: '#0000000F', marginVertical: 14 }} />
        <FieldLabel label="Requir patti" required />
        <Choice horizontal options={[{ value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }]} value={f.rpatti} onChange={actions.setRpatti} />
      </Section>

      <Section title="Printer">
        <PickerField label="" icon="print" value={f.printer} placeholder="Choose printer" onPress={() => setPickPrinter(true)}
          error={errors.printer} hint={f.printer ? 'Remembered on this device for this facility.' : undefined} />
      </Section>

      <ServerPicker<string>
        open={pickPrinter} onClose={() => setPickPrinter(false)} eyebrow="PACKING" title="Printer"
        placeholder="Search printer"
        load={async (q) => {
          const all = await A.fetchPrinters(api, ctx);
          const s = q.toUpperCase();
          return s ? all.filter((p) => p.toUpperCase().includes(s)) : all;
        }}
        keyOf={(p) => p}
        render={(p) => ({ title: p, sub: p === f.printer ? 'Current' : undefined })}
        onPick={(p) => { setPickPrinter(false); actions.set('printer', p); }}
      />
    </>
  );
}
