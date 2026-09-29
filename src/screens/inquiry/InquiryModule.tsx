// FILE: src/screens/inquiry/InquiryModule.tsx
// NEW ERP — Inquiry module root. ONE route renders the whole flow:
//
//   Dashboard ─┬─ New / Edit inquiry (party · design · shade pickers, add party via GSTIN)
//              ├─ Inquiry detail ─┬─ Add costing (design picker) ─ Cost sheet
//              │                  ├─ Send quotation (email / WhatsApp / PDF)
//              │                  ├─ Confirm (-> sales order) · Reject
//              │                  └─ Notes
//              ├─ Notes
//              ├─ TAT configuration · Authorizers (prptype != S)
//              └─ Authorization queue ─ Review cost sheet (authorizers, prptype != S)
//
// Session: token + API host come from ErpSessionGate (InquiryScreen wrapper).
// Business context is the SAME as legacy: prptype = storage 'user_prptype',
// yearno = getCurrentFinancialYear(). Rights: /api/checkrights (mob_inquiry)
// with the same user_id value legacy sends (the 'user_prptype' value).
import { getCurrentFinancialYear } from '@/common/commonfunction';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { useBusinessContext } from '@/src/core/business/BusinessContextProvider';
import { T } from '@/src/theme';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ConfirmView, QuotationView, RejectView } from './ActionViews';
import { SettingsView, TatConfigView } from './AdminViews';
import { AuthQueueView, AuthReviewView } from './AuthViews';
import { CostingPickerView, CostSheetView } from './CostingViews';
import { DashboardView } from './DashboardView';
import { createInquiryApi } from './inquiryApi';
import {
  EntryProvider,
  InquiryCtx,
  InquiryDataProvider,
  InquiryNavProvider,
  InquiryRoute,
} from './InquiryContext';
import { InquiryDetailView } from './InquiryDetailView';
import { InquiryFormView } from './InquiryFormView';
import { InquiryRights, isSip } from './inquiryModel';
import { NotesView } from './NotesView';
import { Loader } from './ui';

type Props = { token: string; API: string; username?: string };

function renderRoute(route: InquiryRoute) {
  switch (route.name) {
    case 'dashboard': return <DashboardView />;
    case 'form': return <InquiryFormView inquiryId={route.inquiryId} />;
    case 'detail': return <InquiryDetailView id={route.id} />;
    case 'notes': return <NotesView inquiryId={route.inquiryId} inquiryNo={route.inquiryNo} />;
    case 'costingPicker': return <CostingPickerView id={route.id} />;
    case 'costSheet': return <CostSheetView inquiryId={route.inquiryId} designId={route.designId} />;
    case 'quotation': return <QuotationView id={route.id} />;
    case 'confirm': return <ConfirmView id={route.id} />;
    case 'reject': return <RejectView id={route.id} />;
    case 'authQueue': return <AuthQueueView />;
    case 'authReview': return <AuthReviewView inquiryId={route.inquiryId} designId={route.designId} />;
    case 'tatConfig': return <TatConfigView />;
    case 'settings': return <SettingsView />;
    default: return null;
  }
}

export default function InquiryModule({ token, API, username = 'User' }: Props) {
  const { prpGroup } = useBusinessContext();
  const [prptype, setPrptype] = useState<string | null>(null);
  const yearno = useMemo(() => getCurrentFinancialYear(), []);

  // prptype exactly like legacy ('user_prptype'); business context only as a fallback
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem('user_prptype')
      .then((v) => { if (alive) setPrptype(String(v || prpGroup || '').trim()); })
      .catch(() => { if (alive) setPrptype(String(prpGroup || '').trim()); });
    return () => { alive = false; };
  }, [prpGroup]);

  const api = useMemo(
    () => (prptype === null ? null : createInquiryApi(API, token, { prptype, yearno })),
    [API, token, prptype, yearno],
  );

  const [rights, setRights] = useState<InquiryRights | null>(null);
  const [rightsLoaded, setRightsLoaded] = useState(false);
  const [isAuthorizer, setIsAuthorizer] = useState(false);
  const [pendingAuth, setPendingAuth] = useState(0);

  const reloadRights = useCallback(async () => {
    if (!api || prptype === null) return;
    try {
      setRights(await api.rights(prptype));
    } catch {
      setRights(null);
    } finally {
      setRightsLoaded(true);
    }
  }, [api, prptype]);

  const refreshAuth = useCallback(async () => {
    if (!api || prptype === null || isSip(prptype)) return;
    try {
      const perms = await api.myPermissions();
      setIsAuthorizer(!!perms?.is_authorizer);
      if (perms?.is_authorizer) {
        const q = await api.authQueue();
        setPendingAuth(q.counts?.pending ?? 0);
      } else {
        setPendingAuth(0);
      }
    } catch {
      // ignore (same as legacy)
    }
  }, [api, prptype]);

  useEffect(() => { void reloadRights(); }, [reloadRights]);

  const ctx = useMemo<InquiryCtx | null>(() => (api && prptype !== null ? {
    api, prptype, yearno, username, rights, rightsLoaded, reloadRights, isAuthorizer, pendingAuth, refreshAuth,
  } : null), [api, prptype, yearno, username, rights, rightsLoaded, reloadRights, isAuthorizer, pendingAuth, refreshAuth]);

  if (!ctx) return <View style={s.root}><Loader label="Loading inquiries…" /></View>;

  return (
    <InquiryDataProvider value={ctx}>
      <InquiryNavProvider>
        {(stack) => (
          <View style={s.root}>
            {stack.map((entry, i) => {
              const top = i === stack.length - 1;
              return (
                <View key={entry.key} style={[StyleSheet.absoluteFill, s.layer, !top && s.hidden]} pointerEvents={top ? 'auto' : 'none'}>
                  <EntryProvider entryKey={entry.key} focused={top}>
                    {renderRoute(entry.route)}
                  </EntryProvider>
                </View>
              );
            })}
          </View>
        )}
      </InquiryNavProvider>
    </InquiryDataProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  layer: { backgroundColor: T.bg },
  hidden: { display: 'none' },
});
