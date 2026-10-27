import {PRODUCTION_ORDERS_CONTAINER, PRODUCTION_ORDER_TABS, tabRegistered} from './productionOrderTabPermissions';
export const POOL_RESOURCE = PRODUCTION_ORDERS_CONTAINER + '.pools';
export function poolGrant(session, canAccess = () => false, canDo = () => false) {
  const registered=tabRegistered(session,POOL_RESOURCE);
  const canView=registered && canAccess(POOL_RESOURCE);
  return { registryReady:registered, canView, canViewAll:canView && canDo(POOL_RESOURCE,'view_all') };
}
export function poolContext(session, context={}) {
  const p=session?.business_context || session?.app_session?.business_context || {};
  return {prptype:String(context.prptype||p.prp_group||''),yearno:context.yearno||p.year_no||'',property:context.property||p.prp_code||''};
}
export {PRODUCTION_ORDER_TABS};
