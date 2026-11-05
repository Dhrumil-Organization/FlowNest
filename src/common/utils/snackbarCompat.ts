// Expo-safe compatibility wrapper for the old react-native-snackbar API.
//
// The project already has a native-independent Snackbar mounted by app/_layout.tsx.
// Keeping this tiny adapter means legacy screens can keep their existing
// Snackbar.show({...}) calls without importing a native TurboModule.
import { showSnackbar } from './snackbar';

type SnackbarConfig = {
  text?: string;
  duration?: number;
  backgroundColor?: string;
  textColor?: string;
  action?: {
    text: string;
    textColor?: string;
    onPress?: () => void;
  };
};

const durationFor = (duration?: number) => {
  // react-native-snackbar LENGTH_INDEFINITE is represented by a non-positive
  // duration. The app Snackbar does not have a true indefinite mode, so keep
  // it visible for a long period rather than making it disappear immediately.
  if (duration === 0) return 10 * 60 * 1000;
  return duration || 4000;
};

const typeFor = (backgroundColor?: string): 'success' | 'error' | 'info' | 'warning' => {
  const color = String(backgroundColor || '').toLowerCase();
  if (color.includes('red') || color === '#dc3545' || color === '#f44336') return 'error';
  if (color.includes('green') || color === '#28a745' || color === '#4caf50') return 'success';
  if (color.includes('yellow') || color.includes('orange') || color === '#ffc107') return 'warning';
  return 'info';
};

export const Snackbar = {
  LENGTH_SHORT: 2000,
  LENGTH_LONG: 4000,
  LENGTH_INDEFINITE: 0,
  show(config: SnackbarConfig) {
    const text = String(config?.text ?? '');
    if (!text) return;

    showSnackbar(
      text,
      typeFor(config.backgroundColor),
      config.action?.onPress
        ? { text: String(config.action.text || 'OK'), onPress: config.action.onPress }
        : undefined,
      durationFor(config.duration),
    );
  },
};

export default Snackbar;
