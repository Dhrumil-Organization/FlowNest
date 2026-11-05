import { Alert as RNAlert, Platform } from 'react-native';

/**
 * react-native-web mein `Alert.alert` kuch nahi karta (no-op), isliye web par
 * Delete confirm / validation messages dikhte hi nahi the.
 *
 * Ye wrapper app (Android/iOS) par asli Alert use karta hai aur web par browser
 * ke alert / confirm use karta hai. API bilkul same hai, isliye baaki code
 * mein sirf import badalna hai.
 */
type Btn = { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };

export const Alert = {
    alert: (title: string, message?: string, buttons?: Btn[], options?: any) => {
        if (Platform.OS !== 'web') {
            RNAlert.alert(title, message, buttons as any, options);
            return;
        }

        const text = [title, message].filter(Boolean).join('\n\n');
        const actionable = (buttons || []).filter((b) => b.style !== 'cancel');
        const cancel = (buttons || []).find((b) => b.style === 'cancel');

        // Confirm dialog (Cancel + action)
        if (buttons && buttons.length > 1) {
            const ok = typeof window !== 'undefined' ? window.confirm(text) : false;
            if (ok) actionable.forEach((b) => b.onPress?.());
            else cancel?.onPress?.();
            return;
        }

        // Simple info alert
        if (typeof window !== 'undefined') window.alert(text);
        buttons?.[0]?.onPress?.();
    },
};
