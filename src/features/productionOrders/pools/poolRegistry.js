/**
 * Reference / optional merge helper. The ACTUAL authoritative registry lives
 * in src/registry/modules/production.module.ts, not in this file.
 */
export const PRODUCTION_ORDER_TAB_RESOURCES=Object.freeze([
  {key:'orders',name:'Orders',type:'tab',displayOrder:10,actions:[{key:'view',name:'View Orders'},{key:'add',name:'New production order'},{key:'edit',name:'Modify production order'},{key:'delete',name:'Delete production order',dangerous:true}]},
  {key:'pools',name:'Pools',type:'tab',displayOrder:20,actions:[{key:'view',name:'View Pools / My Orders'},{key:'view_all',name:'View all executives pools'}]},
  {key:'job_work',name:'Job work',type:'tab',displayOrder:30,actions:[{key:'view',name:'View Job work'},{key:'edit',name:'Modify job work orders'}]},
]);
export function withProductionOrderTabsRegistry(existingAreas) {
  const areas=JSON.parse(JSON.stringify(existingAreas||[]));
  const production=areas.find(a=>a.key==='production');
  const root=production?.resources?.find(r=>r.key==='production');
  const screen=root?.children?.find(r=>r.key==='production_order_entry');
  if(!screen) throw new Error('Missing production.production_order_entry; use the current production.module.ts');
  screen.children=screen.children||[];
  for(const def of PRODUCTION_ORDER_TAB_RESOURCES){
    const exists=screen.children.find(c=>c.key===def.key);
    if(!exists) screen.children.push(JSON.parse(JSON.stringify(def)));
  }
  return areas;
}
export const withPoolsRegistry=withProductionOrderTabsRegistry;
export const POOL_REGISTRY_RESOURCE=PRODUCTION_ORDER_TAB_RESOURCES[1];
