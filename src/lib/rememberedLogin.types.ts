// Shared types for the NEW ERP "Remember me" vault
// (rememberedLogin.ts for Android/iOS, rememberedLogin.web.ts for browsers).

export type RememberedCredentials = { username: string; password: string };

export type RememberSupport = {
  /** Remember me can be offered on this device/browser. */
  available: boolean;
  /**
   * true  → Auto Login will ask the device lock (Face ID / screen lock /
   *         Windows Hello / Touch ID) before signing in.
   * false → web only: this computer has no screen lock, Auto Login signs
   *         in directly.
   */
  requiresUnlock: boolean;
  method: 'biometric' | 'device-lock' | 'platform-authenticator' | 'direct' | 'none';
  /** Human label, e.g. "Face ID", "Screen lock", "Windows Hello". */
  label: string;
  /** MaterialIcons name for the UI. */
  icon: string;
  platform: 'ios' | 'android' | 'web';
  /** Why it is unavailable (shown under a disabled Remember me row). */
  reason?: string;
};

export type RememberedLoginInfo = {
  property: string;
  /** Masked / friendly name shown on the Auto Login card. */
  hint: string;
  savedAt: number;
  /** Web only: whether this saved login is locked behind the PC's screen lock. */
  locked?: boolean;
};

export type SaveRememberResult = {
  saved: boolean;
  reason?: 'unsupported' | 'cancelled' | 'failed' | 'needs-gesture';
  message?: string;
};

export type UnlockResult =
  | { status: 'ok'; credentials: RememberedCredentials }
  | { status: 'cancelled' }
  | { status: 'missing' }
  | { status: 'failed'; message: string };
