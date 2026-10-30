// ─────────────────────────────────────────────────────────────
// FILE: src/mill/millBridge.ts
// Everything between Flownest and the Mill Hub page:
//   • MillSessionApi → apig /api/mill/session/*  (Sudamo logs the SAME user into Mills)
//   • MillApi        → apig /api/mill/<action>   (Sudamo = middleware, data from Mills)
//   • MILL_RIGHTS    → page key  ↔  permission resource (mill.*)
//   • buildMillHtml  → the artifact page + window.MILL (user, rights, live data)
// ─────────────────────────────────────────────────────────────
import { ApiClient } from '@/src/api/client';
import { getCredentialsForPropertySwitch } from '@/src/lib/biometricAuth';
import { MILL_HUB_HTML_TEMPLATE } from './millHubHtml';

/** Page key (artifact NAV k / sub-page) → permission path. */
export const MILL_RIGHTS: Record<string, string> = {
  dash: 'mill.dashboard',
  inward: 'mill.inward',
  lots: 'mill.lots',
  machines: 'mill.machines',
  lab: 'mill.lab',
  recipe: 'mill.recipes',
  dispatch: 'mill.dispatch',
  expense: 'mill.expense',
  reports: 'mill.reports',
  'expense.coal': 'mill.expense.coal',
  'expense.coal_steam_entry': 'mill.expense.coal_steam_entry',
  'expense.coal_optimiser': 'mill.expense.coal_optimiser',
  'expense.electricity': 'mill.expense.electricity',
  'expense.chemicals': 'mill.expense.chemicals',
  'expense.labour': 'mill.expense.labour',
  'expense.maintenance': 'mill.expense.maintenance',
  'reports.colour_cost': 'mill.reports.colour_cost',
};

/** Datasets the page understands (artifact constant names). */
/** Live datasets Mills gives (artifact constant names + list screens). LABDIPS / CHEMS are
 *  not in the Mills DB yet → shown empty (strict), never the sample numbers. */
export const MILL_DATASETS = ['LOTS', 'MACHINES', 'MONTH', 'INWARD', 'DISPATCH', 'SHADES'] as const;

export const MILL_LOGIN_REQUIRED = 'MILL_LOGIN_REQUIRED';

export type MillPermissionMap = Record<string, { access?: boolean; actions?: Record<string, boolean> }>;
export type MillUser = { id: number; name: string; first_name?: string; last_name?: string; is_superadmin?: number; role_ids?: number[] };
export type MillSession = { millUser: MillUser; permissions: MillPermissionMap; isSuperAdmin: boolean; hasAccess: boolean; debug?: any };

/** One line that says WHY there is no Mill right (from Sudamo's rights_debug). */
export function millRightsReason(s: MillSession | null | undefined): string {
  const d = s?.debug || {};
  if (d.hint) return d.hint;
  const roles = Array.isArray(d.role_ids) ? d.role_ids.join(', ') : '';
  return `Sudamo user #${d.user_id ?? '?'} · roles [${roles || 'none'}] · Mill decisions: roles ${d.role_decisions ?? 0}, user ${d.user_overrides ?? 0}. Give "Mill Hub" (or its screens) ALLOW in Permission Manager → Mills tab, for one of these roles or this user.`;
}

export type MillApiAnswer<T = any> = {
  success: boolean;
  live: boolean;
  message: string;
  code?: string | null;
  data: T | null;
  bridge?: { ms: number; http: number } | null;
};

async function post<T = any>(path: string, body: Record<string, any> = {}): Promise<MillApiAnswer<T>> {
  try {
    const res: any = await ApiClient.post<any>(path, body);
    if (!res || typeof res !== 'object') return { success: false, live: false, message: 'Empty answer from apig.', data: null };
    return {
      success: !!res.success,
      live: !!res.live,
      message: String(res.message || ''),
      code: res.code ?? null,
      data: (res.data ?? null) as T | null,
      bridge: res.bridge ?? null,
    };
  } catch (error: any) {
    const status = error?.status;
    const message =
      status === 404
        ? 'Mill routes are missing on apig (Sudamo routes/api.php).'
        : status === 401
          ? 'Mills login required.'
          : error?.message || 'Mill call failed.';
    return { success: false, live: false, message, code: status === 401 ? MILL_LOGIN_REQUIRED : status === 404 ? 'MILL_ROUTE_MISSING' : 'MILL_ERROR', data: null };
  }
}

function toSession(d: any): MillSession | null {
  if (!d || !d.logged_in || !d.mill_user) return null;
  return {
    millUser: d.mill_user,
    permissions: (d.permissions && typeof d.permissions === 'object' ? d.permissions : {}) as MillPermissionMap,
    isSuperAdmin: Number(d.is_superadmin || 0) === 1,
    hasAccess: !!d.has_access,
    debug: d.rights_debug,
  };
}

export const MillSessionApi = {
  /** Log the current user into Mills with his own user name + password (through Sudamo). */
  async login(name: string, password: string): Promise<{ session: MillSession | null; message: string; code?: string | null }> {
    const r = await post('/api/mill/session/login', { name: name.trim(), password: password.trim() });
    return { session: r.success ? toSession(r.data) : null, message: r.message, code: r.code };
  },
  /** Silent login with the credentials saved at app login (same as the property switch). */
  async loginWithSaved(): Promise<{ session: MillSession | null; message: string; code?: string | null }> {
    const c = await getCredentialsForPropertySwitch();
    if (!c?.username || !c?.password) return { session: null, message: 'Saved login is not available on this device.', code: 'MILL_NO_CREDENTIALS' };
    return MillSessionApi.login(c.username, c.password);
  },
  async status(): Promise<{ session: MillSession | null; message: string; code?: string | null }> {
    const r = await post('/api/mill/session/status');
    return { session: r.success ? toSession(r.data) : null, message: r.message, code: r.code };
  },
  /** Status, and when Sudamo has no Mills session for this user → silent login. */
  async ensure(): Promise<{ session: MillSession | null; message: string; code?: string | null }> {
    const s = await MillSessionApi.status();
    if (s.session) return s;
    if (s.code && s.code !== MILL_LOGIN_REQUIRED) return s;
    return MillSessionApi.loginWithSaved();
  },
  logout() {
    return post('/api/mill/session/logout');
  },
};

export const MillApi = {
  /** Data call; on an expired Mills session it logs in again silently and retries once. */
  async call<T = any>(action: string, body: Record<string, any> = {}): Promise<MillApiAnswer<T>> {
    let r = await post<T>(`/api/mill/${action}`, body);
    if (!r.success && r.code === MILL_LOGIN_REQUIRED) {
      const again = await MillSessionApi.loginWithSaved();
      if (again.session) r = await post<T>(`/api/mill/${action}`, body);
    }
    return r;
  },
  bootstrap() {
    return MillApi.call<{ live: boolean; today?: string; datasets?: Record<string, any>; pending?: string[]; errors?: string[]; database?: string }>(
      'bootstrap',
    );
  },
  ping() {
    return MillApi.call('ping');
  },
  schema(like?: string, tables?: string) {
    return MillApi.call('schema', { like, tables });
  },
};

/** canAccess for Mill, from the Mill session map (same rules as the ERP map). */
export function millCan(map: MillPermissionMap | undefined, path: string, action?: string): boolean {
  const g = map?.[path.trim().toLowerCase()];
  if (!g?.access) return false;
  if (!action || action === 'view') return true;
  return !!g.actions?.[action.toLowerCase()];
}

export type MillBoot = {
  user: { name: string; role: string };
  rights: Record<string, boolean>;
  data: Record<string, any>;
  today?: string;
  live: boolean;
  offline: boolean;
  note: string;
};

/** JSON that is safe inside <script> … </script>. */
function scriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function buildMillHtml(boot: MillBoot): string {
  const data: Record<string, any> = {};
  for (const k of MILL_DATASETS) if (boot.data && boot.data[k] != null) data[k] = boot.data[k];
  const cfg = {
    user: boot.user,
    rights: boot.rights,
    data,
    strict: true, // never show the artifact's sample numbers as if they were real
    today: boot.today,
    live: boot.live && Object.keys(data).length > 0,
    liveCount: Object.keys(data).length,
    totalCount: MILL_DATASETS.length,
    offline: boot.offline,
    note: boot.note,
  };
  const script = `<script>(function(){var c=${scriptJson(cfg)};
c.can=function(k){return !!(c.rights&&c.rights[k]);};
c.post=function(m){var s=JSON.stringify(m);if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){window.ReactNativeWebView.postMessage(s);}else if(window.parent&&window.parent!==window){window.parent.postMessage({__mill:1,msg:m},'*');}};
window.MILL=c;})();</script>`;
  return MILL_HUB_HTML_TEMPLATE.replace('<!--MILL_BOOT-->', script);
}
