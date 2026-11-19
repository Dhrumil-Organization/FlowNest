// FILE: src/features/repackingIssue/dialog.ts
// Promise wrappers over FlowNest's AppAlert (native Alert on Android/iOS, in-app modal on web).
import AppAlert from '@/common/utils/appAlert';

export function confirmAsync(title: string, message: string, okText = 'OK', destructive = false): Promise<boolean> {
  return new Promise(resolve => {
    let done = false;
    const finish = (v: boolean) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    AppAlert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => finish(false) },
        { text: okText, style: destructive ? 'destructive' : 'default', onPress: () => finish(true) }
      ],
      { cancelable: true, onDismiss: () => finish(false) }
    );
  });
}

export function notify(title: string, message: string): Promise<void> {
  return AppAlert.alert(title, message);
}
