import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppAlert, type AppAlertButton } from '@/common/utils/appAlert';
import { T } from '@/src/constants/theme';

type Request = {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  options?: { cancelable?: boolean; onDismiss?: () => void };
  resolve: () => void;
};

export default function AppAlertHost() {
  const [queue, setQueue] = useState<Request[]>([]);

  useEffect(() => {
    return AppAlert.subscribe(request => {
      setQueue(existing => [...existing, request]);
    });
  }, []);

  const current = queue[0] || null;

  const close = (button?: AppAlertButton) => {
    if (!current) return;

    try {
      button?.onPress?.();
    } finally {
      current.resolve();
      current.options?.onDismiss?.();
      setQueue(existing => existing.slice(1));
    }
  };

  if (!current) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (current.options?.cancelable !== false) close();
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.accent} />
          <Text style={styles.title}>{current.title}</Text>
          {!!current.message && (
            <Text style={styles.message}>{current.message}</Text>
          )}

          <View style={styles.buttons}>
            {current.buttons.map((button, index) => (
              <Pressable
                key={`${button.text}-${index}`}
                onPress={() => close(button)}
                style={({ pressed }) => [
                  styles.button,
                  button.style === 'destructive' && styles.destructiveButton,
                  button.style === 'cancel' && styles.cancelButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'destructive' && styles.destructiveText,
                    button.style === 'cancel' && styles.cancelText,
                  ]}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(13, 27, 42, 0.42)',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: T.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 22,
    shadowColor: T.nav,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  accent: {
    width: 44,
    height: 4,
    borderRadius: 4,
    backgroundColor: T.copper,
    marginBottom: 16,
  },
  title: {
    color: T.ink,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    color: T.ink,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    minWidth: 92,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.copper,
    alignItems: 'center',
  },
  cancelButton: {
    borderColor: T.border,
    backgroundColor: T.sub,
  },
  destructiveButton: {
    borderColor: T.red,
  },
  pressed: {
    opacity: 0.72,
  },
  buttonText: {
    color: T.copper,
    fontSize: 14,
    fontWeight: '700',
  },
  cancelText: {
    color: T.muted,
  },
  destructiveText: {
    color: T.red,
  },
});
