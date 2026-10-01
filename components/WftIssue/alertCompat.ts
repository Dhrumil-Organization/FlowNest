import { Alert as RNAlert, Platform, AlertButton, AlertOptions } from 'react-native';

/**
 * react-native-web mein Alert.alert() kuch bhi nahi dikhata (buttons wale confirm
 * dialog bhi nahi chalte). Isliye web par browser ke alert/confirm use karte hain,
 * aur Android/iOS par normal React Native Alert hi chalta hai.
 *
 * Use bilkul same hai:  Alert.alert(title, message, buttons)
 */
export const Alert = {
    alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
        if (Platform.OS !== 'web') {
            RNAlert.alert(title, message, buttons, options);
            return;
        }

        const g: any = globalThis;
        const text = [title, message].filter(Boolean).join('\n\n');
        const list = buttons ?? [];

        // Sirf info alert (0 ya 1 button)
        if (list.length <= 1) {
            g.alert(text);
            list[0]?.onPress?.();
            return;
        }

        // Confirm dialog (Cancel + action)
        const cancelBtn =
            list.find((b) => b.style === 'cancel') ??
            list.find((b) => /^cancel$/i.test(b.text ?? ''));
        const actionBtn = [...list].reverse().find((b) => b !== cancelBtn);

        if (g.confirm(text)) {
            actionBtn?.onPress?.();
        } else {
            cancelBtn?.onPress?.();
        }
    },
};

export default Alert;
