// FILE: src/components/YarnManagementSystemNEW/DeleteSheets.tsx
// Delete confirmation (legacy YarnDeletePermissionModal — one for MAIN, one for SUB items) and
// the delete API result dialog (legacy "DELETE API result modal"). Texts are the legacy texts.
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Btn, Sheet } from '../erpUi';
import { deleteItemCodeLabel, deleteItemName, DeleteResultType, DeleteTargetType, Row } from './model';

export function DeleteConfirmSheet({
  visible,
  loading,
  itemType,
  item,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  loading: boolean;
  itemType: DeleteTargetType;
  item: Row | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isSubItem = itemType === 'SUB';
  return (
    <Sheet
      open={visible}
      onClose={() => {
        if (!loading) onCancel();
      }}
      eyebrow="CONFIRM"
      title={isSubItem ? 'Delete Sub Item' : 'Delete Item'}
      wideMax={420}
      footer={
        <Btn
          label={loading ? 'Deleting...' : isSubItem ? 'Delete Sub Item' : 'Delete Item'}
          icon="delete-outline"
          kind="danger"
          loading={loading}
          onPress={onConfirm}
          style={{ flex: 1 }}
        />
      }
    >
      <View style={{ alignItems: 'center', gap: 10 }}>
        <View style={[s.bubble, { backgroundColor: `${T.red}14` }]}>
          <Icon name="delete-outline" size={25} color={T.red} />
        </View>
        <Text style={s.question}>
          {isSubItem ? 'Are you sure you want to delete this sub item?' : 'Are you sure you want to delete this item?'}
        </Text>
      </View>
      <View style={s.itemBox}>
        <Text numberOfLines={2} style={s.itemName}>
          {deleteItemName(item)}
        </Text>
        <Text style={s.itemCode}>Item Code: {deleteItemCodeLabel(item, itemType)}</Text>
      </View>
      <Text style={s.warn}>This action cannot be undone.</Text>
    </Sheet>
  );
}

export function DeleteResultSheet({
  visible,
  loading,
  resultType,
  targetType,
  message,
  onClose,
  onOk,
}: {
  visible: boolean;
  loading: boolean;
  resultType: DeleteResultType;
  targetType: DeleteTargetType;
  message: string;
  /** Dismiss without the OK action (legacy onRequestClose). */
  onClose: () => void;
  onOk: () => void;
}) {
  const ok = resultType === 'SUCCESS';
  const tone = ok ? T.green : T.red;
  const title = ok
    ? targetType === 'SUB'
      ? 'Sub Item Deleted'
      : 'Item Deleted'
    : resultType === 'PERMISSION'
      ? 'Delete Permission'
      : 'Delete Failed';
  return (
    <Sheet
      open={visible}
      onClose={() => {
        if (!loading) onClose();
      }}
      eyebrow="DELETE"
      title={title}
      wideMax={420}
      footer={<Btn label="OK" loading={loading} onPress={onOk} style={{ flex: 1 }} />}
    >
      <View style={{ alignItems: 'center', gap: 12 }}>
        <View style={[s.bubble, { backgroundColor: `${tone}14` }]}>
          <Icon name={ok ? 'check' : 'error-outline'} size={25} color={tone} />
        </View>
        <Text style={s.message}>{message}</Text>
        {resultType === 'PERMISSION' ? (
          <Text style={s.warn}>
            {targetType === 'SUB'
              ? 'This sub item is currently in use or deletion is not permitted.'
              : 'This item is currently in use or deletion is not permitted.'}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  bubble: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  question: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: T.ink, textAlign: 'center' },
  itemBox: { padding: 12, backgroundColor: T.sub, borderRadius: 10, borderWidth: 1, borderColor: T.border },
  itemName: { fontSize: 14, fontWeight: '800', color: T.ink, lineHeight: 19 },
  itemCode: { marginTop: 5, fontSize: 12, fontWeight: '600', color: T.muted },
  warn: { fontSize: 12.5, lineHeight: 18, fontWeight: '700', color: T.red, textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: T.ink, textAlign: 'center' },
});
