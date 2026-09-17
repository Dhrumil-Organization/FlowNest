// utils/snackbar.ts
type SnackbarType = 'success' | 'error' | 'info' | 'warning';

type SnackbarAction = {
  text: string;
  onPress: () => void;
};

let globalShow: ((message: string, type?: SnackbarType, action?: SnackbarAction, duration?: number) => void) | null = null;

export const registerSnackbar = (fn: typeof globalShow) => {
  globalShow = fn;
};

export const showSnackbar = (
  message: string,
  type: SnackbarType = 'info',
  action?: SnackbarAction,
  duration?: number,
) => {
  if (globalShow) {
    globalShow(message, type, action, duration);
  } else {
    console.warn('Snackbar not registered. Call registerSnackbar in your root layout.');
  }
};

// Convenience functions
export const showSuccess = (message: string, action?: SnackbarAction) => {
  showSnackbar(message, 'success', action);
};

export const showError = (message: string, action?: SnackbarAction) => {
  showSnackbar(message, 'error', action);
};

export const showInfo = (message: string, action?: SnackbarAction) => {
  showSnackbar(message, 'info', action);
};

export const showWarning = (message: string, action?: SnackbarAction) => {
  showSnackbar(message, 'warning', action);
};
