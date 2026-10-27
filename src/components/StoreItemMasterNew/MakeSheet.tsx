// FILE: src/components/StoreItemMasterNew/MakeSheet.tsx
// Add / edit one make-model line of an item (opens from "Add make" or a row tap).
import React, { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import type { MakeModelOption } from './api';
import MakeMasterSheet from './MakeMasterSheet';
import { DP, ItemMake, MakeErrors, makeStatusLabel, NumKey, Opt, sanitizeDecimal, Scope, validateMake } from './model';
import { Btn, Cell, CheckChip, Field, SelectField, Sheet, StatusPill } from './ui';

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
  API,
  token,
  scope,
  onMakeOptionsChange,
}: {
  /** Needed for the Make / Model master (+ button next to Make name). */
  API?: string;
  token?: string;
  scope?: Scope;
  /** Called with the fresh make/model list after the master dialog adds / updates / deletes. */
  onMakeOptionsChange?: (options: MakeModelOption[]) => void;
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
  const [masterOpen, setMasterOpen] = useState(false);
  const canManageMasters = editable && !!API && !!token && !!scope && !!onMakeOptionsChange;

  /** Row picked / created in the master dialog -> fill Make + Model (and the SrNo the save payload needs). */
  const applyOption = (o: MakeModelOption) =>
    setM((prev) => ({
      ...prev,
      makeCode: o.makeCode,
      makeName: o.makeName,
      model: o.model,
      apiFields: { ...(prev.apiFields ?? {}), SrNo: Number(o.makeSrNo) || 0, MakSrNo: Number(o.makeSrNo) || 0, make_srno: Number(o.makeSrNo) || 0 },
    }));

  /** After a master change: drop a selection whose make / model no longer exists. */
  const reconcile = (list: MakeModelOption[]) =>
    setM((prev) => {
      if (!prev.makeCode) return prev;
      const ofMake = list.filter((x) => String(x.makeCode) === String(prev.makeCode));
      const clearSr = { SrNo: 0, MakSrNo: 0, make_srno: 0 };
      if (!ofMake.length) return { ...prev, makeCode: '', makeName: '', model: '', apiFields: { ...(prev.apiFields ?? {}), ...clearSr } };
      const mk = ofMake[0].makeName;
      if (prev.model && !ofMake.some((x) => String(x.model).trim() === String(prev.model).trim()))
        return { ...prev, makeName: mk, model: '', apiFields: { ...(prev.apiFields ?? {}), ...clearSr } };
      return prev.makeName === mk ? prev : { ...prev, makeName: mk };
    });

  const makeNameOptions: Opt[] = Array.from(
    new Map(
      makeOptions
        .filter((x) => x.makeCode && x.makeName?.trim())
        .map((x) => [
          String(x.makeCode),
          {
            id: String(x.makeCode),
            label: String(x.makeName).trim(),
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
        <View style={g.grid}>
          <Cell cols={cols}>
            <Field
              label="Make code"
              value={m.makeCode}
              readOnly
            />
          </Cell>

          <Cell cols={cols} span={cols - 1}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <SelectField
                  label="Make name"
                  value={m.makeCode}
                  options={makeNameOptions}
                  disabled={!editable}
                  error={errors.makeName}
                  onChange={(id) => {
                    const selected = makeOptions.find(
                      (x) => String(x.makeCode) === String(id),
                    );

                    if (!selected) return;

                    // A make that has no named model (only a blank-model row) can be saved without
                    // picking a model, so take that row's SrNo right away.
                    const ofMake = makeOptions.filter((x) => String(x.makeCode) === String(id));
                    const blankOnly = ofMake.length > 0 && ofMake.every((x) => !x.model?.trim());
                    const sr = blankOnly ? Number(ofMake[0].makeSrNo) || 0 : 0;

                    setM((prev) => ({
                      ...prev,
                      makeCode: selected.makeCode,
                      makeName: selected.makeName,
                      model: '',
                      // Clear the previously selected model's SrNo when the make changes.
                      apiFields: {
                        ...(prev.apiFields ?? {}),
                        SrNo: sr,
                        MakSrNo: sr,
                        make_srno: sr,
                      },
                    }));

                    setErrors((prev) => ({
                      ...prev,
                      makeName: undefined,
                    }));
                  }}
                />
              </View>
              {canManageMasters ? (
                <Btn icon="add" iconOnly kind="primary" onPress={() => setMasterOpen(true)} accessibilityLabel="Add or manage make and model" />
              ) : null}
            </View>
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
        </View>

        <View style={[g.grid, { marginTop: 12 }]}>
          {numF('opQty', 'Opening qty')}
          {numF('rate1', 'Rate 1')}
          {numF('rate2', 'Rate 2')}
          {numF('rate3', 'Rate 3')}
          {numF('rate4', 'Rate 4')}
          {numF('saleRate', 'Sale rate')}
        </View>

        <View style={[g.grid, { marginTop: 12 }]}>
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

      {masterOpen && canManageMasters ? (
        <MakeMasterSheet
          API={API as string}
          token={token as string}
          scope={scope as Scope}
          onClose={() => setMasterOpen(false)}
          onChanged={(list) => {
            onMakeOptionsChange?.(list);
            reconcile(list);
          }}
          onPick={applyOption}
        />
      ) : null}
    </Sheet>
  );
}

const g = {
  grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, rowGap: 12 },
};
