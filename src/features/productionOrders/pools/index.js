export { default as ProductionOrdersPoolsSlot } from './ProductionOrdersPoolsSlot';
export { default as ProductionPoolsTab } from './ProductionPoolsTab';
export { poolGrant, poolContext, POOL_RESOURCE } from './poolPermissions';
export { POOL_REGISTRY_RESOURCE, withPoolsRegistry, withProductionOrderTabsRegistry } from './poolRegistry';
export {
  PRODUCTION_ORDER_TABS,
  PRODUCTION_ORDERS_CONTAINER,
  tabRegistered,
  permittedProductionOrderTabs,
  canOpenProductionOrders,
  authorizedProductionOrderTab,
} from './productionOrderTabPermissions';
