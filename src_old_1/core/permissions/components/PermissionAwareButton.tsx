import React from 'react';
import { TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import { usePermission } from '../usePermission';

export function PermissionAwareButton({
  resource,
  action,
  hideWhenDenied = true,
  onDenied,
  onPress,
  children,
  disabled,
  ...props
}: TouchableOpacityProps & {
  resource: string;
  action: string;
  hideWhenDenied?: boolean;
  onDenied?: () => void;
}) {
  const { canDo, requireAction } = usePermission();
  const allowed = canDo(resource, action);

  if (!allowed && hideWhenDenied) return null;

  return (
    <TouchableOpacity
      {...props}
      disabled={disabled || !allowed}
      onPress={(event) => {
        if (!allowed) {
          if (onDenied) onDenied();
          else requireAction(resource, action);
          return;
        }
        onPress?.(event);
      }}
    >
      {children}
    </TouchableOpacity>
  );
}
