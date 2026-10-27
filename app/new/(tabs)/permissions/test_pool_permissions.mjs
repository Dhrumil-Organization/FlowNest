import assert from 'node:assert/strict';
import {poolGrant} from '../Mobile/src/features/productionOrders/pools/poolPermissions.js';
import { tabAccess, permittedProductionOrderTabs, canOpenProductionOrders, authorizedProductionOrderTab }
  from '../Mobile/src/features/productionOrders/pools/productionOrderTabPermissions.js';
import { withProductionOrderTabsRegistry }
  from '../Mobile/src/features/productionOrders/pools/poolRegistry.js';

const session=(o=false,p=false,j=false,all=false,root=false)=>({permissions:{registry_ready:true,grants:{
  'production_orders':{access:root,actions:{view:root}},
  'production_orders.orders':{access:o,actions:{view:o}},
  'production_orders.pools':{access:p,actions:{view:p,view_all:all}},
  'production_orders.job_work':{access:j,actions:{view:j}},
}}});
assert.equal(canOpenProductionOrders({}),false);
assert.equal(canOpenProductionOrders(session(false,false,false)),false);
assert.deepEqual(permittedProductionOrderTabs(session(true,false,false)).map(x=>x.key),['orders']);
assert.deepEqual(permittedProductionOrderTabs(session(false,true,false)).map(x=>x.key),['pools']);
assert.deepEqual(permittedProductionOrderTabs(session(false,false,true)).map(x=>x.key),['job_work']);
assert.deepEqual(permittedProductionOrderTabs(session(true,true,true)).map(x=>x.key),['orders','pools','job_work']);
assert.equal(poolGrant(session(false,true,false,true,false)).canView,true,'Pools independent of root');
assert.equal(poolGrant(session(true,false,true,true,true)).canView,false,'Other tab grants never open Pools');
assert.equal(poolGrant(session(false,true,false,false)).canViewAll,false);
assert.equal(poolGrant(session(false,true,false,true)).canViewAll,true);
assert.equal(authorizedProductionOrderTab(session(false,true,false),'orders'),'pools','Default first authorized');
assert.equal(authorizedProductionOrderTab(session(false,true,false),'pools'),'pools');
assert.equal(authorizedProductionOrderTab(session(false,false,false),'orders'),null);
assert.equal(tabAccess({permissions:{registry_ready:false,grants:{'production_orders.pools':{access:true}}}},'production_orders.pools').canView,false);
const seed=[{key:'production',resources:[{key:'creel',name:'Creel',actions:['view']}]}];
let registry=withProductionOrderTabsRegistry(seed);
assert.equal(registry[0].resources.length,2);
let po=registry[0].resources.find(x=>x.key==='production_orders');
assert.deepEqual(po.children.map(c=>c.key),['orders','pools','job_work']);
registry=withProductionOrderTabsRegistry(registry);
po=registry[0].resources.find(x=>x.key==='production_orders');
assert.equal(po.children.length,3,'idempotent registry sync');
assert.ok(registry[0].resources.some(x=>x.key==='creel'),'existing modules unaffected');
console.log('PASS independent Orders / Pools / Job work tab permissions, fallback, no parent gate, registry merge');
