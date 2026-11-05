// FILE: src/components/YarnManagementSystemNEW/SubItemForm.tsx
// SUB_ITEM / CREATE step: create or modify a sub item of a main yarn item (legacy
// SubItemCreateTab form). As in legacy only the blend percentages and the Yarn Type are
// editable — Yarn Main Code, Count, Ply, Other, Sub Item Name and Denier come from yarnitemshow
// and are read-only. Changing a percentage rebuilds the sub item name (model.buildSubItem).
import { T } from '@/src/theme';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Btn, BusyOverlay, Field, PanelHeader } from '../erpUi';
import { BlendRow, buildSubItem, getTotalPercentage, labelOf, Row } from './model';
import { FooterBar, FormIntro, FormSkeleton, SelectOne, useCols, y } from './ui';

type Props = {
  isModifyMode: boolean;
  modifyItemName: string;
  form: Row;
  setForm: (updater: (prev: Row) => Row) => void;
  blendList: BlendRow[];
  setBlendList: (rows: BlendRow[]) => void;
  subitemtypedata: Row[];
  /** yarnitemshow + masters are loading for "Create New Sub Item". */
  formLoading: boolean;
  /** addyarnsubitem / yarncreationmodify is running. */
  saving: boolean;
  /** legacy `disabled={isLoading}` of the submit button. */
  submitDisabled: boolean;
  onBack: () => void;
  onSubmit: () => void;
};

export default function SubItemForm({
  isModifyMode,
  modifyItemName,
  form,
  setForm,
  blendList,
  setBlendList,
  subitemtypedata,
  formLoading,
  saving,
  submitDisabled,
  onBack,
  onSubmit,
}: Props) {
  const { isPhone } = useCols();
  const cell = isPhone ? { width: '100%' as const } : { flexGrow: 1, flexBasis: '46%' as const, minWidth: 0 };
  const full = { width: '100%' as const };
  const total = getTotalPercentage(blendList);

  return (
    <View style={y.root}>
      <PanelHeader onBack={onBack} title={isModifyMode ? 'Modify Sub Item' : 'Create Sub Item'} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={y.formContent}
        >
          {formLoading ? (
            <FormSkeleton fields={7} />
          ) : (
            <>
              {isModifyMode ? (
                <FormIntro
                  icon="edit"
                  title="Modify Sub Item"
                  text={`Item: ${modifyItemName || form?.name || form?.WNameCode || 'Selected Sub Item'}`}
                />
              ) : (
                <FormIntro
                  icon="create-new-folder"
                  title="Create Sub Item"
                  text="Complete the yarn details below. Required fields are marked with *."
                />
              )}

              <View style={y.card}>
                <View style={y.grid}>
                  <Field
                    label="Yarn Main Code"
                    required
                    placeholder="Yarn Main Code"
                    value={form.WNameCode || ''}
                    editable={false}
                    style={full}
                  />

                  <View style={[full, { gap: 8 }]}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      Blend<Text style={{ color: T.red }}> *</Text>
                    </Text>
                    {blendList.length === 0 ? (
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Field placeholder="Blend..." value="" editable={false} style={{ flex: 2, minWidth: 0 }} />
                        <Field placeholder="%" value="" editable={false} style={{ flex: 1, minWidth: 0 }} />
                      </View>
                    ) : (
                      blendList.map((item, index) => (
                        <View key={index} style={{ flexDirection: 'row', gap: 10 }}>
                          <Field
                            placeholder="Blend..."
                            value={item.name}
                            editable={false}
                            style={{ flex: 2, minWidth: 0 }}
                          />
                          <Field
                            placeholder="%"
                            value={item.per}
                            keyboardType="numeric"
                            style={{ flex: 1, minWidth: 0 }}
                            onChangeText={(text: string) => {
                              const updated = blendList.map((b, i) => (i === index ? { ...b, per: text } : b));
                              setBlendList(updated);

                              setForm((prev) => ({
                                ...prev,
                                linkitmcode: buildSubItem(prev, updated),
                              }));
                            }}
                          />
                        </View>
                      ))
                    )}
                    {blendList.length > 0 && total !== 100 ? (
                      <Text style={{ color: T.red, fontSize: 12.5, fontWeight: '700' }}>
                        Total must be 100% (Current: {total}%)
                      </Text>
                    ) : null}
                  </View>

                  <Field
                    label="Count"
                    required
                    placeholder="Count..."
                    value={form.count_no || ''}
                    editable={false}
                    style={cell}
                  />

                  <SelectOne
                    label="Ply"
                    required
                    placeholder="Choose Ply..."
                    data={[]}
                    labelKeys={['ply', 'id']}
                    value={labelOf({ ply: form.ply, id: form.ply_id }, ['ply', 'id'])}
                    selectedValue={form.ply_id}
                    disabled
                    style={cell}
                    onSelect={() => {}}
                  />

                  <SelectOne
                    label="Yarn Type"
                    required
                    placeholder="Choose yarn type..."
                    data={subitemtypedata}
                    labelKeys={['name', 'id']}
                    value={labelOf({ name: form.subtype_name, id: form.subtype_id }, ['name', 'id'])}
                    selectedValue={form.subtype_id}
                    style={cell}
                    onSelect={(item) => {
                      setForm((prev) => ({
                        ...prev,
                        subtype_id: item?.id || '',
                        subtype_name: item?.name || '',
                      }));
                    }}
                  />

                  <Field
                    label="Other"
                    placeholder="Others..."
                    value={form.others || ''}
                    editable={false}
                    style={cell}
                  />

                  <Field
                    label="Sub Item Name"
                    required
                    placeholder="Main Item..."
                    value={form.linkitmcode || ''}
                    editable={false}
                    style={full}
                  />

                  <Field
                    label="Denier"
                    required
                    placeholder="Denier..."
                    value={String(form.denier ?? '')}
                    editable={false}
                    style={cell}
                  />
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <FooterBar>
        <Btn label="Cancel" kind="ghost" onPress={onBack} />
        <Btn
          label={isModifyMode ? 'Update Sub Item' : 'Add Sub Item'}
          icon={isModifyMode ? 'edit' : 'add'}
          disabled={submitDisabled}
          onPress={onSubmit}
        />
      </FooterBar>

      <BusyOverlay visible={saving} text={isModifyMode ? 'Updating Sub Item...' : 'Adding Sub Item...'} />
    </View>
  );
}
