// FILE: src/components/YarnManagementSystemNEW/deleteFlow.tsx
// Delete flow of a MAIN or SUB yarn item as one hook (part of the index.tsx state machine):
// confirmation sheet → POST yarnitemdelete → result sheet → refresh only after OK on a genuine
// successful delete. Mirrors legacy handleDeleteItem / handleSubItemDelete / confirmDeleteItem /
// handleDeleteResultOk and the three delete modals.
import React, { useState } from 'react';
import { Api, postYarnItemDelete } from './api';
import { DeleteConfirmSheet, DeleteResultSheet } from './DeleteSheets';
import { getPrpType } from './masters';
import { deleteItemCode, deletePayload, DeleteResultType, DeleteTargetType, readDeleteResponse, Row } from './model';

export function useYarnDelete(args: {
  api: Api;
  yarnstrcode: any;
  /** Refresh after a successful delete: MAIN → main list, SUB → sub item list of the parent. */
  onDeleted: (targetType: DeleteTargetType) => Promise<void>;
}) {
  const { api, yarnstrcode, onDeleted } = args;

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletePermissionVisible, setDeletePermissionVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleteTargetType, setDeleteTargetType] = useState<DeleteTargetType>('MAIN');
  const [deleteResultVisible, setDeleteResultVisible] = useState(false);
  const [deleteResultType, setDeleteResultType] = useState<DeleteResultType>('ERROR');
  const [deleteResultMessage, setDeleteResultMessage] = useState('');
  const [deleteResultTargetType, setDeleteResultTargetType] = useState<DeleteTargetType>('MAIN');

  /** Keep exactly the row selected for deletion and ask for confirmation. */
  const askDelete = (item: Row | null, type: DeleteTargetType) => {
    if (!item) return;
    setDeleteTarget(item);
    setDeleteTargetType(type);
    setDeletePermissionVisible(true);
  };

  /** POST yarnitemdelete { prptype, itmcode, strcode, txntype }. */
  const confirmDeleteItem = async () => {
    if (!deleteTarget || deleteLoading) return;

    // A SUB row always uses its own itmcode, never the parent's.
    const itemCode = deleteItemCode(deleteTarget, deleteTargetType);

    if (!itemCode) {
      setDeletePermissionVisible(false);
      setDeleteTarget(null);
      setDeleteResultType('ERROR');
      setDeleteResultMessage('Item code not found. Unable to delete this item.');
      setDeleteResultTargetType(deleteTargetType);
      setDeleteResultVisible(true);
      return;
    }

    const userPtype = await getPrpType();
    const payload = deletePayload(deleteTarget, itemCode, userPtype, yarnstrcode);

    setDeleteLoading(true);

    try {
      const body = await postYarnItemDelete(api, payload);

      const { message, isDeleteSuccess } = readDeleteResponse(body);

      setDeleteLoading(false);
      setDeletePermissionVisible(false);
      setDeleteResultTargetType(deleteTargetType);
      setDeleteResultMessage(message);

      // success:true alone is not a delete ("Record is in use." also comes with success:true):
      // anything that is not a genuine delete is shown as a permission response.
      setDeleteResultType(isDeleteSuccess ? 'SUCCESS' : 'PERMISSION');

      setDeleteResultVisible(true);
    } catch (error: any) {
      console.log('yarnitemdelete error:', error);
      setDeleteLoading(false);
      setDeletePermissionVisible(false);
      setDeleteResultTargetType(deleteTargetType);
      setDeleteResultType('ERROR');
      setDeleteResultMessage(
        error?.response?.data?.response?.message ||
          error?.response?.data?.message ||
          'Unable to delete item. Please try again.',
      );
      setDeleteResultVisible(true);
    }
  };

  const handleDeleteResultOk = async () => {
    if (deleteLoading) return;

    const resultType = deleteResultType;
    const resultTargetType = deleteResultTargetType;

    setDeleteResultVisible(false);
    setDeleteResultMessage('');
    setDeleteTarget(null);

    // Never refresh the list for permission / error responses.
    if (resultType !== 'SUCCESS') {
      return;
    }

    setDeleteLoading(true);
    try {
      await onDeleted(resultTargetType);
    } catch (error) {
      console.log('Delete result refresh error:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  /** Confirmation + result sheets; mounted above every step so they stay over the screen
   *  from which Delete was pressed. */
  const sheets = (
    <>
      <DeleteConfirmSheet
        visible={deletePermissionVisible}
        loading={deleteLoading}
        itemType={deleteTargetType}
        item={deleteTarget}
        onCancel={() => {
          if (deleteLoading) return;
          setDeletePermissionVisible(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDeleteItem}
      />
      <DeleteResultSheet
        visible={deleteResultVisible}
        loading={deleteLoading}
        resultType={deleteResultType}
        targetType={deleteResultTargetType}
        message={deleteResultMessage}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteResultVisible(false);
            setDeleteResultMessage('');
            setDeleteTarget(null);
          }
        }}
        onOk={handleDeleteResultOk}
      />
    </>
  );

  return { askDelete, sheets };
}
