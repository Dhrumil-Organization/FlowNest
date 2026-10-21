// FILE: src/components/StoreItemMasterNew/MakeSheet.tsx
// Add / edit one make-model line of an item (opens from "Add make" or a row tap).
import { T } from '@/src/theme';
import React, { useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { DP, ItemMake, MakeErrors, makeStatusLabel, NumKey, Opt, sanitizeDecimal, validateMake } from './model';
import { Btn, Cell, CheckChip, Field, SelectField, Sheet, StatusPill } from './ui';

type MakeModelOption = {
  makeCode: string;
  makeName: string;
  model: string;
  makeSrNo: number;
};

const Section = ({ title }: { title: string }) => (
  <Text style={{ fontSize: 12.5, fontWeight: '800', color: T.copper, marginTop: 6, marginBottom: 10, paddingHorizontal: 6 }}>{title}</Text>
);

export default function MakeSheet({
  make,
  isNew,
  editable,
  onClose,
  onSave,
  onRemove,
  locations = [],
  statuses = [],
  rateEditable = true,
  makeOptions = [],
}: {
  locations?: Opt[];
  statuses?: Opt[];
  rateEditable?: boolean;
  makeOptions?: MakeModelOption[];
  make: ItemMake;
  isNew: boolean;
  editable: boolean;
  onClose: () => void;
  onSave: (m: ItemMake) => void;
  onRemove: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const cols = width >= 700 ? 3 : 2;
  const [m, setM] = useState<ItemMake>(make);
  const [errors, setErrors] = useState<MakeErrors>({});

  const makeNameOptions: Opt[] = Array.from(
    new Map(
      makeOptions
        .filter((x) => x.makeCode && x.makeName?.trim())
        .map((x) => [
          String(x.makeCode),
          {
            id: String(x.makeCode),
            label: `${x.makeCode} - ${x.makeName}`,
          },
        ]),
    ).values(),
  );

  const modelOptions: Opt[] = Array.from(
    new Map(
      makeOptions
        .filter(
          (x) =>
            String(x.makeCode) === String(m.makeCode) &&
            !!x.model?.trim(),
        )
        .map((x) => [
          String(x.model).trim(),
          {
            id: String(x.model).trim(),
            label: String(x.model).trim(),
          },
        ]),
    ).values(),
  );

  const set = <K extends keyof ItemMake>(k: K, v: ItemMake[K]) => setM((p) => ({ ...p, [k]: v }));
  const text = (k: 'makeName' | 'model' | 'shortName') => (v: string) => set(k, v.toUpperCase() as any);
  const num = (k: NumKey) => (v: string) => set(k, sanitizeDecimal(v, DP[k]) as any);

  // plain render function (NOT a component) so inputs keep focus while typing
  const RATE_KEYS: NumKey[] = ['opRate', 'rate1', 'rate2', 'rate3', 'rate4', 'saleRate'];
  const numF = (k: NumKey, label: string) => (
    <Cell key={k} cols={cols}>
      <Field
        label={label}
        value={m[k]}
        readOnly={!editable}
        onChangeText={num(k)}
        keyboardType="decimal-pad"
        align="right"
        placeholder={(0).toFixed(DP[k])}
      />
    </Cell>
  );

  const done = () => {
    const e = validateMake(m);
    setErrors(e);
    if (Object.keys(e).length === 0) onSave({ ...m, makeName: m.makeName.trim(), model: m.model.trim(), shortName: m.shortName.trim() });
  };

  return (
    <Sheet
      visible
      title={isNew ? 'Add make' : editable ? 'Edit make' : 'Make details'}
      subtitle={m.makeName ? `${m.makeCode ? `${m.makeCode} – ` : ''}${m.makeName}` : undefined}
      onClose={onClose}
      footer={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {editable && !isNew ? <Btn kind="danger" icon="delete-outline" label="Remove" onPress={() => onRemove(m.id)} /> : null}
          <Btn label={editable ? 'Cancel' : 'Close'} onPress={onClose} flex />
          {editable ? <Btn kind="primary" label={isNew ? 'Add make' : 'Update make'} onPress={done} flex /> : null}
        </View>
      }
    >
      <View style={{ marginHorizontal: -6 }}>
        <Section title="Make" />
        <View style={g.grid}>
          <Cell cols={cols}>
            <Field
              label="Make code"
              value={m.makeCode}
              readOnly
            />
          </Cell>

          <Cell cols={cols} span={cols - 1}>
            <SelectField
              label="Make name"
              value={m.makeCode}
              options={makeNameOptions}
              disabled={!editable}
              onChange={(id) => {
                const selected = makeOptions.find(
                  (x) => String(x.makeCode) === String(id),
                );

                if (!selected) return;

                setM((prev) => ({
                  ...prev,
                  makeCode: selected.makeCode,
                  makeName: selected.makeName,
                  model: '',
                  // Clear the previously selected model's SrNo when the make changes.
                  apiFields: {
                    ...(prev.apiFields ?? {}),
                    SrNo: 0,
                    MakSrNo: 0,
                    make_srno: 0,
                  },
                }));

                setErrors((prev) => ({
                  ...prev,
                  makeName: undefined,
                }));
              }}
            />
          </Cell>

          <Cell cols={cols} span={cols}>
            <SelectField
              label="Model"
              value={m.model}
              options={modelOptions}
              disabled={!editable || !m.makeCode}
              onChange={(id) => {
                const selected = makeOptions.find(
                  (x) =>
                    String(x.makeCode) === String(m.makeCode) &&
                    String(x.model).trim() === String(id).trim()
                );

                if (!selected) return;

                setM((prev) => ({
                  ...prev,
                  model: selected.model,
                  // Preserve the SrNo of the exact selected Make/Model API option.
                  // api.ts uses these values to populate SrNo / MakSrNo in save payload.
                  apiFields: {
                    ...(prev.apiFields ?? {}),
                    SrNo: Number(selected.makeSrNo) || 0,
                    MakSrNo: Number(selected.makeSrNo) || 0,
                    make_srno: Number(selected.makeSrNo) || 0,
                  },
                }));
              }}
            />
          </Cell>
          <Cell cols={cols}>
            <Field label="Short name" value={m.shortName} readOnly={!editable} onChangeText={text('shortName')} autoCapitalize="characters" />
          </Cell>
          <Cell cols={cols}>
            <SelectField label="Location" value={m.location} options={locations} disabled={!editable} allowClear onChange={(id) => set('location', id)} />
          </Cell>
        </View>

        <Section title="Stock levels" />
        <View style={g.grid}>
          {numF('roLevel', 'R.O. level')}
          {numF('roQty', 'R.O. qty')}
          {numF('opQty', 'Opening qty')}
          {numF('opRate', 'Opening rate')}
          {numF('surplusLevel', 'Surplus level')}
        </View>

        <Section title="Rates" />
        <View style={g.grid}>
          {numF('rate1', 'Rate 1')}
          {numF('rate2', 'Rate 2')}
          {numF('rate3', 'Rate 3')}
          {numF('rate4', 'Rate 4')}
          {numF('saleRate', 'Sale rate')}
        </View>

        <Section title="Inward tolerance" />
        <View style={g.grid}>
          {numF('inwardExtraQtyPct', 'Inward extra qty (%)')}
          {numF('inwardExtraQty', 'Inward extra qty')}
          <Cell cols={cols}>
            <SelectField
              label="Status"
              value={m.status === 'Active' ? 'A' : m.status === 'Passive' ? 'P' : (m.status || 'A')}
              options={statuses.length ? statuses : [{ id: 'A', label: 'Active' }, { id: 'P', label: 'Passive' }]}
              disabled={!editable}
              onChange={(id) => set('status', id)}
            />
          </Cell>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <CheckChip label="Dead" value={m.dead} onChange={(v) => set('dead', v)} disabled={!editable} />
          {(() => {
            const st = makeStatusLabel(m.status, statuses);
            return <StatusPill kind={m.dead ? 'dead' : st === 'Active' ? 'active' : 'passive'} label={m.dead ? 'Dead' : st} />;
          })()}
        </View>
      </View>
    </Sheet>
  );
}

const g = {
  grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, rowGap: 12 },
};
