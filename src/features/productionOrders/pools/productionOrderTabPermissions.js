/** The real resource path is nested under the existing Production module. */
export const PRODUCTION_ORDERS_CONTAINER = 'production.production_order_entry';
export const PRODUCTION_ORDER_TABS = Object.freeze([
  {key:'orders',label:'Orders',resource:PRODUCTION_ORDERS_CONTAINER+'.orders'},
  {key:'pools',label:'Pools',resource:PRODUCTION_ORDERS_CONTAINER+'.pools'},
  {key:'jobwork',label:'Job work',resource:PRODUCTION_ORDERS_CONTAINER+'.job_work'},
]);
const grantsOf = session => session?.permissions?.grants || {};
export const tabRegistered = (session, path) =>
  Object.prototype.hasOwnProperty.call(grantsOf(session), path);
/**
 * Each TAB uses its own grant. Before the FIRST registry sync, only the
 * existing Orders and Job work tabs use the original container grant; Pools
 * is NEVER exposed until registered and explicitly granted.
 */
export function permittedProductionOrderTabs(session, canAccess) {
  const registered = PRODUCTION_ORDER_TABS.some(t => tabRegistered(session,t.resource));
  return PRODUCTION_ORDER_TABS.filter(t => {
    if (registered) return tabRegistered(session,t.resource) && canAccess(t.resource);
    return t.key !== 'pools' && canAccess(PRODUCTION_ORDERS_CONTAINER);
  });
}
export function authorizedProductionOrderTab(session, canAccess, requested) {
  const allowed = permittedProductionOrderTabs(session,canAccess);
  const found = allowed.find(t=>t.key===requested);
  return found ? found.key : allowed[0]?.key || null;
}
export function canOpenProductionOrders(session,canAccess) {
  return permittedProductionOrderTabs(session,canAccess).length>0;
}
