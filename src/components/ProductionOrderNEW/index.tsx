// FILE: src/components/ProductionOrderNEW/index.tsx
// NEW ERP — Production Orders (entry). React Native (iOS / Android / web)
// port of the React Web ERP screens SudamoProductionOrderNew (browse) and
// SudamoProductionOrderDetailNew (add / edit / view), laid out like the
// Madhusudhan ERP artifact, plus a NEW "Job work out" split:
//
//   ┌ ‹ Production orders                                         ┐
//   │ [   SO based   ] [ Stock & sell ]                           │
//   │ Passat · MD01 · FINISH                                   ▾  │
//   │ ☑ 20260510-001 · Bombay Garments     10,000 m  ₹262/m       │
//   │      Take [10000] of 10,000 m                               │
//   │ JOB WORK OUT                                                │
//   │   20260510-001  in-house 5,000 · job work 5,000             │
//   │   [Shree Ganesh Weavers ▾] [3000] m                         │
//   │   [Laxmi Textiles       ▾] [2000] m   + Add company         │
//   │ [ Review costing & authorize → ]                            │
//   └─────────────────────────────────────────────────────────────┘
//
// Rights: resource 'production.production_order_entry' (production.module.ts):
//   view = open the screen · add = + New · edit = Edit · delete = Delete.
// Token + host: ErpSessionGate (screens/production/ProductionOrderEntryScreen.tsx).
// prpcode / yearno / store: business context (header switch), changeable here.
// Laravel: PrdOrderNewRepository web_* endpoints (+ the job-work patch).
import { useBusinessContext } from '@/src/core/business';
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import AsyncStorage from '@/common/utils/compatibleStorage';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, Text, TouchableOpacity, View } from 'react-native';
import { Btn, SelectField, Sheet, useYearStore } from '../StockVerificationNEW/ui';
import { fetchProperties } from '../StockVerificationNEW/verificationApi';
import { Api, Ctx } from './api';
import type { Row } from './format';
import OrderForm from './OrderForm';
import OrdersList from './OrdersList';
import { CONTENT_W, Switch2 } from './ui';

export const PO_RESOURCE = 'production.production_order_entry';
const CTX_KEY = 'po_entry_ctx_v2'; // v2: drops saved login-store values

type Props = { token: string; API: string; username?: string; isConnected?: boolean };
type Route = { name: 'list' } | { name: 'form'; mode: 'add' | 'edit' | 'view'; uid: any; nonce: number };

function ContextBar({ ctx, onChange, api, prptype }: { ctx: Ctx; onChange: (c: Ctx) => void; api: Api; prptype: string }) {
  const [open, setOpen] = useState(!ctx.prpcode || !ctx.yearno);
  const [d, setD] = useState<Ctx>(ctx);
  const [props, setProps] = useState<Row[]>([]);
  const vApi: any = useMemo(() => ({ ...api, prptype, cfg: {} }), [api, prptype]);
  const ys = useYearStore(open ? vApi : null, d.prpcode, d.yearno, (y) => setD((v) => ({ ...v, yearno: y })), (s) => setD((v) => ({ ...v, strcode: s })));
  useEffect(() => { if (open) { setD(ctx); fetchProperties(vApi).then(setProps).catch(() => setProps([])); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const propOpts = props.map((r) => ({ value: String(r.PrpCode ?? r.prpcode ?? ''), label: String(r.PrpName ?? r.prpname ?? r.PrpCode ?? '') })).filter((o) => o.value);
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 6, paddingVertical: 4 }}>
        <Icon name="business" size={14} color={T.muted} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: T.muted }}>
          {ctx.prpcode || '—'} · FY {ctx.yearno || '—'} · Store {ctx.strcode || '—'}
        </Text>
        <Icon name="edit" size={13} color={T.copper} />
      </TouchableOpacity>
      <Sheet open={open} onClose={() => setOpen(false)} eyebrow="PRODUCTION ORDERS" title="Property, year & greige store"
        footer={<Btn label="Apply" kind="copper" disabled={!d.prpcode || !d.yearno || !d.strcode} onPress={() => { onChange(d); setOpen(false); }} />}>
        <SelectField label="Property" required value={d.prpcode} options={propOpts} onChange={(v) => setD({ prpcode: v, yearno: '', strcode: '' })} />
        <SelectField label="Year" required value={d.yearno} options={ys.yearOpts} loading={ys.yLoading} disabled={!d.prpcode} onChange={(v) => setD((c) => ({ ...c, yearno: v, strcode: '' }))} />
        <SelectField label="Greige store" required value={d.strcode} options={ys.storeOpts} loading={ys.sLoading} disabled={!d.yearno} onChange={(v) => setD((c) => ({ ...c, strcode: v }))} />
      </Sheet>
    </>
  );
}

export default function ProductionOrderNEW({ token, API }: Props) {
  const biz = useBusinessContext();
  const { canDo } = usePermission();
  const api = useMemo<Api>(() => ({ API, token }), [API, token]);
  // strcode = GREIGE store (012 default) — the login store (e.g. 002) is a sales store and filters out the SO lines.
  const [ctx, setCtx] = useState<Ctx>({ prpcode: biz.prpCode || '', yearno: biz.yearNo || '', strcode: '012' });
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<Route>({ name: 'list' });
  const [section, setSection] = useState('orders');

  // Last choice made on this screen wins over the login default for the same property.
  useEffect(() => {
    AsyncStorage.getItem(CTX_KEY).then((raw) => {
      try {
        const saved = raw ? JSON.parse(raw) : null;
        if (saved && saved.prpcode && (!biz.prpCode || saved.prpcode === biz.prpCode)) setCtx(saved);
      } catch { /* ignore */ }
      setReady(true);
    });
  }, [biz.prpCode]);
  const changeCtx = (c: Ctx) => { setCtx(c); AsyncStorage.setItem(CTX_KEY, JSON.stringify(c)); setRoute({ name: 'list' }); };

  useEffect(() => {
    if (Platform.OS !== 'android' || route.name === 'list') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setRoute({ name: 'list' }); return true; });
    return () => sub.remove();
  }, [route.name]);

  const rights = { add: canDo(PO_RESOURCE, 'add'), edit: canDo(PO_RESOURCE, 'edit'), del: canDo(PO_RESOURCE, 'delete') };
  if (!ready) return null;

  if (route.name === 'form') {
    return (
      <OrderForm key={`${route.mode}-${route.uid}-${route.nonce}`} api={api} ctx={ctx} mode={route.mode} uid={route.uid}
        onBack={() => setRoute({ name: 'list' })}
        onSaved={(uid) => setRoute({ name: 'form', mode: 'view', uid, nonce: Date.now() })} />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 12, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: CONTENT_W }}>
          <ContextBar ctx={ctx} onChange={changeCtx} api={api} prptype={biz.prpGroup} />
          <Switch2 options={[['orders', 'Orders'], ['jobwork', 'Job work']]} value={section} onChange={setSection} style={{ marginBottom: 0, marginTop: 6 }} />
        </View>
      </View>
      {section === 'orders' ? (
        <OrdersList api={api} ctx={ctx} rights={rights}
          onNew={() => setRoute({ name: 'form', mode: 'add', uid: 0, nonce: Date.now() })}
          onOpen={(r, mode) => setRoute({ name: 'form', mode, uid: r.uid, nonce: Date.now() })} />
      ) : (
        <OrdersList api={api} ctx={ctx} rights={{ add: false, edit: rights.edit, del: false }} jobWorkOnly
          onNew={() => undefined}
          onOpen={(r, mode) => setRoute({ name: 'form', mode, uid: r.uid, nonce: Date.now() })} />
      )}
    </View>
  );
}
