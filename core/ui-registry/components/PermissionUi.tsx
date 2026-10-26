import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { usePermission } from '../../permissions';

export function PermissionSection({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { canAccess } = usePermission();
  return canAccess(permission) ? <>{children}</> : null;
}

export function PermissionButton({
  permission,
  action,
  children,
  onPress,
}: {
  permission: string;
  action: string;
  children: React.ReactNode;
  onPress: () => void;
}) {
  const { canDo } = usePermission();
  if (!canDo(permission, action)) return null;
  return <Pressable onPress={onPress}>{children}</Pressable>;
}

export function PermissionDialog({
  permission,
  visible,
  onRequestClose,
  children,
}: {
  permission: string;
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
}) {
  const { canAccess } = usePermission();
  return (
    <Modal visible={visible && canAccess(permission)} onRequestClose={onRequestClose} transparent>
      <View>{children}</View>
    </Modal>
  );
}
