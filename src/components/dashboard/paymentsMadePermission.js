/**
 * Same `app_session.permissions.grants` contract populated by the existing
 * AppPermissionService / AppAccessResolver. Fail closed on missing entries.
 * Do NOT infer access from role names in the UI.
 */
export const PAYMENTS_MADE_PERMISSION_PATH = 'dashboard.payments_made_detail';

export function canViewPaymentsMade(sessionOrPermissions) {
  const grants = sessionOrPermissions?.grants
    ?? sessionOrPermissions?.permissions?.grants
    ?? sessionOrPermissions?.data?.permissions?.grants
    ?? sessionOrPermissions?.response?.data?.permissions?.grants;
  if (!grants || typeof grants !== 'object') return false;

  const view = (path) => {
    const grant = grants[path];
    return grant?.access === true && grant?.actions?.view !== false;
  };

  // Owner dashboard and individual card must both be authorized.
  return view('dashboard')
    && view('dashboard.owner_view')
    && view(PAYMENTS_MADE_PERMISSION_PATH);
}
