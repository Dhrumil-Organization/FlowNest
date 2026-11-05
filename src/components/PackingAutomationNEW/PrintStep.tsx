// FILE: src/components/PackingAutomationNEW/PrintStep.tsx
// Step 3 — cones, copies, Requir patti, printer.
import { T } from '@/src/theme';
import React, { useState } from 'react';
import { View } from 'react-native';
import { ServerPicker } from '../ProductionOrderNEW/ui';
import type { Printer } from './api';
import { Choice, Counter, FieldLabel, LinkBtn, Notice, PickerField, Section } from './ui';
import type { Errors, Form } from './usePackingForm';
import { MAX_COPIES } from './usePackingForm';

const statusText = (p?: Printer) => (!p ? undefined : p.online === true ? '● Online' : p.online === false ? '● Offline' : `● ${p.status || 'Status unknown'}`);

export default function PrintStep({ f, errors, printError, printers, printersBusy, printersError, printerLocked, onReloadPrinters, actions }: {
  f: Form; errors: Errors; printError?: string;
  printers: Printer[]; printersBusy?: boolean; printersError?: string; printerLocked?: boolean; onReloadPrinters: () => void;
  actions: { set: (k: 'nocones' | 'noprint' | 'printer', v: string) => void; setRpatti: (v: 'Y' | 'N') => void };
}) {
  const [pickPrinter, setPickPrinter] = useState(false);
  const current = printers.find((p) => p.name === f.printer);
  const offline = current?.online === false;
  return (
    <>
      {printError ? <Notice tone="err" text={printError} /> : null}
      <Section title="Cones & labels">
        <Counter label="Cones per box" sub="Cones packed in this box" value={f.nocones} onChange={(v) => actions.set('nocones', v)} min={1} max={999} error={errors.nocones} />
        <View style={{ height: 1, backgroundColor: T.alt, marginVertical: 14 }} />
        <Counter label="Label copies" sub="Prints of this label" value={f.noprint} onChange={(v) => actions.set('noprint', v)} min={1} max={MAX_COPIES} error={errors.noprint} />
        <View style={{ height: 1, backgroundColor: T.alt, marginVertical: 14 }} />
        <FieldLabel label="Requir patti" required />
        <Choice horizontal options={[{ value: 'Y', label: 'Yes' }, { value: 'N', label: 'No' }]} value={f.rpatti} onChange={actions.setRpatti} />
      </Section>

      <Section title="Printer" right={!printerLocked ? <LinkBtn label="Refresh" icon="refresh" onPress={onReloadPrinters} /> : undefined}>
        {printersError ? <Notice tone="err" text={printersError} action={{ label: 'Retry', onPress: onReloadPrinters }} /> : null}
        <PickerField label="" icon="print" value={f.printer || undefined}
          placeholder={printersBusy ? 'Loading printers…' : printers.length ? 'Choose printer' : 'No printers found'}
          sub={statusText(current)} loading={printersBusy} locked={printerLocked}
          disabled={!printers.length}
          onPress={() => setPickPrinter(true)}
          error={errors.printer}
          hint={printerLocked && f.printer ? 'Your label printer is fixed for your login.' : !printerLocked && f.printer ? 'Remembered on this device.' : undefined} />
        {offline ? <Notice tone="err" text={`${f.printer} is offline. Labels may not print until it is back.`} /> : null}
      </Section>

      <ServerPicker<Printer>
        open={pickPrinter} onClose={() => setPickPrinter(false)} eyebrow="PACKING" title="Printer"
        placeholder="Search printer"
        load={async (q) => {
          const s = q.trim().toUpperCase();
          return s ? printers.filter((p) => p.name.toUpperCase().includes(s)) : printers;
        }}
        keyOf={(p) => p.name}
        render={(p) => ({ title: p.name, sub: [statusText(p), p.name === f.printer ? 'Current' : ''].filter(Boolean).join(' · ') })}
        onPick={(p) => { setPickPrinter(false); actions.set('printer', p.name); }}
      />
    </>
  );
}
