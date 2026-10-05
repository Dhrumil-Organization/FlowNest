// FILE: src/components/YarnManagementSystemNEW/MainItemForm.tsx
// SPUN_FORM / FILAMENT_FORM step: add or modify a main yarn item (legacy SpunTab / FilamentTab
// form halves + renderMainItemForm). Every field change recomputes the item name and denier with
// the same rules as legacy (model.buildMainItem / filamentbuildMainItem / calculate*Denier).
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Btn, BusyOverlay, Field, PanelHeader } from '../erpUi';
import {
  buildMainItem,
  calculateDenier,
  calculatefilamentDenier,
  COUNT_REGEX,
  DENIER_REGEX,
  filamentbuildMainItem,
  labelOf,
  Row,
} from './model';
import { FooterBar, FormIntro, SelectMany, SelectOne, useCols, y } from './ui';

type Props = {
  isSpun: boolean;
  isModifyMode: boolean;
  modifyItemName: string;
  form: Row;
  setForm: (updater: (prev: Row) => Row) => void;
  /** Blend rows currently ticked (legacy selectedblend / selectedfilamentblend). */
  selectedBlend: Row[];
  setSelectedBlend: (items: Row[]) => void;
  blenddata: Row[];
  countdata: Row[];
  plydata: Row[];
  typedata: Row[];
  lustredata: Row[];
  /** yarnitemshow is loading the item to modify. */
  loadingItem: boolean;
  onBack: () => void;
  onSubmit: () => void;
};

export default function MainItemForm({
  isSpun,
  isModifyMode,
  modifyItemName,
  form,
  setForm,
  selectedBlend,
  setSelectedBlend,
  blenddata,
  countdata,
  plydata,
  typedata,
  lustredata,
  loadingItem,
  onBack,
  onSubmit,
}: Props) {
  const { isPhone } = useCols();
  const cell = isPhone ? { width: '100%' as const } : { flexGrow: 1, flexBasis: '46%' as const, minWidth: 0 };
  const kind = isSpun ? 'Spun' : 'Filament';
  const build = isSpun ? buildMainItem : filamentbuildMainItem;
  const denierOf = isSpun ? calculateDenier : calculatefilamentDenier;

  const heading = isModifyMode ? `Modify ${kind} Main Item` : `Add ${kind} Main Item`;

  return (
    <View style={y.root}>
      <PanelHeader
        onBack={onBack}
        title={isSpun ? 'Spun Item' : 'Filament Item'}
        subtitle={
          isSpun
            ? isModifyMode
              ? 'Modify spun main item'
              : 'Create spun main item'
            : isModifyMode
              ? 'Modify filament main item'
              : 'Create filament main item'
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={y.formContent}
        >
          {isModifyMode ? (
            <FormIntro
              icon="edit"
              title={heading}
              text={`Item: ${modifyItemName || form?.WNameCode || form?.linkitmcode || 'Selected Item'}`}
            />
          ) : (
            <FormIntro
              icon="create-new-folder"
              title={heading}
              text="Complete the yarn details below. Required fields are marked with *."
            />
          )}

          <View style={y.card}>
            <Text style={y.formTitle}>{heading}</Text>
            <View style={y.grid}>
              <SelectMany
                label="Blend"
                required
                placeholder="Choose blend..."
                data={blenddata}
                labelKeys={['name', 'id']}
                selected={Array.isArray(selectedBlend) ? selectedBlend : []}
                style={cell}
                onSelect={(items) => {
                  setSelectedBlend(items);

                  const selectedIds = items.map((i) => i.id);
                  const selectedNames = items.map((i) => i.name);

                  setForm((prev) => {
                    const updated = {
                      ...prev,
                      blend_id: selectedIds,
                      blend: selectedNames,
                    };

                    return {
                      ...updated,
                      linkitmcode: build(updated),
                    };
                  });
                }}
              />

              <SelectOne
                label="Count Type"
                required
                placeholder="Choose count type..."
                data={countdata}
                labelKeys={['name', 'id']}
                value={labelOf({ name: form.count, id: form.count_id }, ['name', 'id'])}
                selectedValue={form.count_id}
                style={cell}
                onSelect={(item) => {
                  setForm((prev) => {
                    const updated = {
                      ...prev,
                      count_id: item?.id || '',
                      count: item?.name || '',
                      formula: item?.formula || '',
                    };
                    return {
                      ...updated,
                      linkitmcode: build(updated),
                      denier: denierOf(updated, item?.formula),
                    };
                  });
                }}
              />

              <Field
                label="Count"
                required
                placeholder="Count..."
                value={form.count_no || ''}
                keyboardType="number-pad"
                style={cell}
                onChangeText={(text: string) => {
                  if (!COUNT_REGEX.test(text)) return;

                  setForm((prev) => {
                    const updated = {
                      ...prev,
                      count_no: text,
                    };

                    return {
                      ...updated,
                      denier: denierOf(updated, prev.formula),
                      linkitmcode: build(updated),
                    };
                  });
                }}
              />

              <SelectOne
                label="Ply"
                required
                placeholder="Choose Ply..."
                data={plydata}
                labelKeys={['ply', 'id']}
                value={labelOf({ ply: form.ply, id: form.ply_id }, ['ply', 'id'])}
                selectedValue={form.ply_id}
                style={cell}
                onSelect={(item) => {
                  setForm((prev) => {
                    const updated = {
                      ...prev,
                      ply_id: item?.id || '',
                      ply: item?.ply || '',
                    };
                    return {
                      ...updated,
                      linkitmcode: build(updated),
                      denier: denierOf(updated, prev.formula),
                    };
                  });
                }}
              />

              {!isSpun ? (
                <SelectOne
                  label="Filament Type"
                  required
                  placeholder="Choose Type..."
                  data={typedata}
                  labelKeys={['type', 'id']}
                  value={labelOf({ type: form.type, id: form.type_id }, ['type', 'id'])}
                  selectedValue={form.type_id}
                  style={cell}
                  onSelect={(item) => {
                    setForm((prev) => {
                      const updated = {
                        ...prev,
                        type_id: item?.id || '',
                        type: item?.type || '',
                      };
                      return {
                        ...updated,
                        linkitmcode: filamentbuildMainItem(updated),
                      };
                    });
                  }}
                />
              ) : null}

              {!isSpun ? (
                <SelectOne
                  label="Lustre"
                  required
                  placeholder="Choose lustre..."
                  data={lustredata}
                  labelKeys={['lustre', 'id']}
                  value={labelOf({ lustre: form.lustre, id: form.lustre_id }, ['lustre', 'id'])}
                  selectedValue={form.lustre_id}
                  style={cell}
                  onSelect={(item) => {
                    setForm((prev) => {
                      const updated = {
                        ...prev,
                        lustre_id: item?.id || '',
                        lustre: item?.lustre || '',
                      };
                      return {
                        ...updated,
                        linkitmcode: filamentbuildMainItem(updated),
                      };
                    });
                  }}
                />
              ) : null}

              <Field
                label="Other"
                placeholder="Other..."
                value={form.others || ''}
                maxLength={200}
                style={cell}
                onChangeText={(text: string) =>
                  setForm((prev) => {
                    const updated = {
                      ...prev,
                      others: text,
                    };
                    return {
                      ...updated,
                      linkitmcode: build(updated),
                    };
                  })
                }
              />

              <Field
                label="Main Item"
                required
                placeholder="Main Item..."
                value={form.linkitmcode || ''}
                style={cell}
                onChangeText={(text: string) =>
                  setForm((prev) => ({
                    ...prev,
                    linkitmcode: text,
                  }))
                }
              />

              <Field
                label="Denier"
                required
                placeholder="Denier..."
                value={String(form.denier ?? '')}
                keyboardType="decimal-pad"
                style={cell}
                onChangeText={(text: string) => {
                  // Auto-calculated, but the user may override it (legacy).
                  if (!DENIER_REGEX.test(text)) return;
                  setForm((prev) => ({
                    ...prev,
                    denier: text,
                  }));
                }}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <FooterBar>
        <Btn label="Cancel" kind="ghost" onPress={onBack} />
        <Btn
          label={isModifyMode ? `Modify ${kind} Item` : `Add ${kind} Item`}
          icon={isModifyMode ? 'edit' : 'add'}
          onPress={onSubmit}
        />
      </FooterBar>

      <BusyOverlay visible={loadingItem} text="Loading item..." />
    </View>
  );
}
