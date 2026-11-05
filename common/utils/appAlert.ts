import { Alert as NativeAlert, Platform } from 'react-native';

export type AppAlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type AppAlertOptions = {
  cancelable?: boolean;
  onDismiss?: () => void;
};

type AlertRequest = {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  options?: AppAlertOptions;
  resolve: () => void;
};

type AlertListener = (request: AlertRequest) => void;

const listeners = new Set<AlertListener>();
const pending: AlertRequest[] = [];

function emit(request: AlertRequest) {
  if (listeners.size === 0) {
    pending.push(request);
    return;
  }
  listeners.forEach(listener => listener(request));
}

export const AppAlert = {
  alert(
    title: string,
    messageOrButtons?: string | AppAlertButton[],
    buttonsOrOptions?: AppAlertButton[] | AppAlertOptions,
    maybeOptions?: AppAlertOptions,
  ): Promise<void> {
    const message = typeof messageOrButtons === 'string' ? messageOrButtons : undefined;
    const buttons =
      Array.isArray(messageOrButtons)
        ? messageOrButtons
        : Array.isArray(buttonsOrOptions)
          ? buttonsOrOptions
          : undefined;
    const options =
      (Array.isArray(buttonsOrOptions) ? maybeOptions : buttonsOrOptions) as
        | AppAlertOptions
        | undefined;
    // Native behavior remains the same. This is intentionally delegated to
    // React Native Alert so existing Android/iOS UX and button callbacks are
    // not changed.
    if (Platform.OS !== 'web') {
      return new Promise(resolve => {
        const nativeButtons = (buttons && buttons.length > 0
          ? buttons
          : [{ text: 'OK' }]
        ).map(button => ({
          text: button.text,
          style: button.style,
          onPress: () => {
            button.onPress?.();
            resolve();
          },
        }));

        NativeAlert.alert(title, message, nativeButtons, {
          cancelable: options?.cancelable,
          onDismiss: () => {
            options?.onDismiss?.();
            resolve();
          },
        });
      });
    }

    return new Promise(resolve => {
      emit({
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
        options,
        resolve,
      });
    });
  },

  subscribe(listener: AlertListener): () => void {
    listeners.add(listener);

    // Deliver alerts that fired before the web host mounted.
    while (pending.length) {
      listener(pending.shift()!);
    }

    return () => listeners.delete(listener);
  },
};

export default AppAlert;
