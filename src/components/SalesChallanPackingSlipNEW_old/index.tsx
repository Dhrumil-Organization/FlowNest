// FILE: src/components/SalesChallanPackingSlipNEW/index.tsx
// NEW ERP — Sales Challan Packing Slip. React Native (iOS / Android / web) rebuild of the
// React Web ERP screens SalesChallanPackingSlipBrowse.js (list) and SalesChallanPackingSlip.js
// (add / view / edit / scan), in the PackingAutomationNEW style. Same shape as ProductionOrderNEW:
//
//   list (SlipList)  facility · + New · search / period / sort · slip cards (View · Scan · Modify · Delete)
//   form (SlipForm)  add · view · edit · scan of one slip; Back returns to the list
//
// Rights: resource 'production.sales_challan_packing_slip' (production.module.ts):
//   view = open the screen (PermissionRouteGuard in app/new/(tabs)/sales-challan-packing-slip.tsx)
//   add = + New / Save · edit = Modify · delete = Delete · scan = Scan cartons / Save cartons
//   assign = web getRightList[0].assign → PendingOrderSingleSelect (print party is NOT copied).
// Token + host: ErpSessionGate (screens/production/SalesChallanPackingSlipScreen.tsx).
// prpcode / yearno / store: business context, changeable here (FacilitySheet). HTTP: api.ts. Rules: rules.ts.
import { useBusinessContext } from '@/src/core/business';
import { usePermission } from '@/src/core/permissions';
import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useMemo, useState } from 'react';
import { FacilitySheet } from '../PackingAutomationNEW/RouteStep';
import type { Api, Ctx, Mode } from './api';
import SlipForm from './SlipForm';
import type { Rights } from './SlipForm';
import SlipList from './SlipList';

export const SCPS_RESOURCE = 'production.sales_challan_packing_slip';
const CTX_KEY = 'scps_ctx_v1';

type Route = { name: 'list' } | { name: 'form'; mode: Mode; uid?: string; nonce: number };

type Props = {
  token: string; API: string;
  /** Open straight into a slip (deep link). Default: the list. */
  mode?: Mode; uid?: string;
  /** Web getIsCeo() / getIsParType(), sent with the party help list. */
  isceo?: string; partype?: string;
};

export default function SalesChallanPackingSlipNEW({ token, API, mode, uid, isceo, partype }: Props) {
  const biz: any = useBusinessContext();
  const { canDo } = usePermission();
  const api = useMemo<Api>(() => ({ API, token }), [API, token]);
  const scope = useMemo(() => ({ isceo, partype }), [isceo, partype]);
  const rights: Rights = {
    add: canDo(SCPS_RESOURCE, 'add'),
    edit: canDo(SCPS_RESOURCE, 'edit'),
    del: canDo(SCPS_RESOURCE, 'delete'),
    scan: canDo(SCPS_RESOURCE, 'scan'),
    assign: canDo(SCPS_RESOURCE, 'assign'),
  };

  const [ctx, setCtx] = useState<Ctx>({ prpcode: biz.prpCode || '', yearno: biz.yearNo || '', strcode: biz.strCode || '' });
  const [facility, setFacility] = useState('');
  const [ready, setReady] = useState(false);
  const [facilityOpen, setFacilityOpen] = useState(false);
  // Deep link straight into a slip; a mode the user has no right for opens the list (add) or view (edit / scan, in SlipForm).
  const [route, setRoute] = useState<Route>(() =>
    mode && ((mode === 'add' && rights.add) || (mode !== 'add' && uid)) ? { name: 'form', mode, uid, nonce: Date.now() } : { name: 'list' });
  const [listKey, setListKey] = useState(0); // bump = list reloads after a save / delete
  const [flash, setFlash] = useState<{ tone: 'ok' | 'err' | 'info'; text: string } | null>(null);

  // Last facility chosen on this screen wins over the login default for the same property.
  useEffect(() => {
    AsyncStorage.getItem(CTX_KEY).then((raw: string | null) => {
      try {
        const saved = raw ? JSON.parse(raw) : null;
        if (saved?.ctx?.prpcode && (!biz.prpCode || saved.ctx.prpcode === biz.prpCode)) { setCtx(saved.ctx); setFacility(saved.name || saved.ctx.prpcode); }
        else setFacility(biz.prpName || biz.prpCode || '');
      } catch { /* ignore */ }
      setReady(true);
    });
  }, [biz.prpCode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;

  const sheet = (
    <FacilitySheet open={facilityOpen} onClose={() => setFacilityOpen(false)} ctx={ctx} api={api} prptype={biz.prpGroup}
      onApply={(c: Ctx, name: string) => {
        setCtx(c); setFacility(name); setFacilityOpen(false); setListKey((k) => k + 1);
        AsyncStorage.setItem(CTX_KEY, JSON.stringify({ ctx: c, name }));
      }} />
  );

  if (route.name === 'form') {
    return (
      <>
        <SlipForm key={`${route.mode}-${route.uid}-${route.nonce}`} api={api} ctx={ctx} facility={facility} onFacility={() => setFacilityOpen(true)}
          mode={route.mode} uid={route.uid} rights={rights} scope={scope}
          onBack={(refresh) => {
            if (refresh) setListKey((k) => k + 1);
            setRoute({ name: 'list' });
          }}
          onDeleted={(no) => { setFlash({ tone: 'ok', text: `Packing slip ${no} deleted.` }); setListKey((k) => k + 1); setRoute({ name: 'list' }); }} />
        {sheet}
      </>
    );
  }

  return (
    <>
      <SlipList key={`${listKey}-${ctx.prpcode}-${ctx.yearno}-${ctx.strcode}`} api={api} ctx={ctx} facility={facility} onFacility={() => setFacilityOpen(true)}
        rights={rights} flash={flash} clearFlash={() => setFlash(null)}
        onNew={() => setRoute({ name: 'form', mode: 'add', nonce: Date.now() })}
        onOpen={(id, m) => setRoute({ name: 'form', mode: m, uid: id, nonce: Date.now() })} />
      {sheet}
    </>
  );
}
