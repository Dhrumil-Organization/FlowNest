// FILE: src/components/SalesOrderEntryNEW/index.tsx
// NEW ERP port of the Legacy "Sales Order Entry" module
// (Legacy: components/SalesOrderNew/index.tsx, route app/(tabs)/sales-order-entry.tsx).
// The legacy screen, route and files are untouched.
//
// Tabs (same as Legacy): New Order · Auth (pending count) · Tracking · Summary.
// Only the open tab is mounted — like Legacy, a tab re-reads the property / year the
// New Order tab saved ('selected_prpcode', 'selectedyear') every time it is opened.
//
// Files of this folder
//   index.tsx        this file: tab bar + pending counter
//   api.ts           every HTTP call (endpoint list + params documented there)
//   model.ts         pure rules: numbers, dates, validations, save / edit / auth payloads,
//                    tracking + summary grouping (copied from Legacy)
//   ui.tsx           shared presentation pieces (picker sheet, date field, step card ...)
//   NewOrderTab.tsx  AuthTab.tsx (+ OrderPanel.tsx = view / edit)  TrackingTab.tsx  SummaryTab.tsx
//   VersionSwitch.tsx  New / Old (Legacy) / Both side by side switch used by the route
//
// Legacy behaviour kept as-is (looks like a Legacy bug — decide if you want it changed)
//   1. (fixed 12 Oct 2026) Property / year in every tab: Legacy stored the property only when
//      picked by hand and Auth / Tracking read the year from 'selected_yearno', which Legacy
//      never wrote. Now the auto-selected default and any hand-picked property / year reach
//      all tabs ('selected_prpcode', 'selectedyear', 'selected_yearno'; savedProperty.ts).
//   2. Auth shows a hint when no property was ever chosen (Legacy showed empty lists).
//   3. Changing a From / To date on Auth reloads at once; "Apply" reloads again.
//   4. Tracking "Dispatch" sends only the per-shade quantities (Items); the "Total to
//      dispatch" box is checked against Pending Qty but not sent.
//   5. Tracking / Confirm APC endpoint (/api/soconfirmapc) is the Legacy "best guess"
//      endpoint (marked TODO in Legacy) — kept unchanged.
//   6. The design rate (/api/getdesignrate) is loaded after a design is picked but not
//      shown anywhere (same as Legacy).
//   7. New Order: DDays = days from now to the delivery date (rounded up); DueDate is sent too.
//
// Deliberate differences from legacy
//   - No own header / StatusBar / SafeArea / static "Saved ✓" badge: the global AppHeader is used.
//   - Preference UserId = the logged-in user id ('user_id'). The Legacy route passed the
//     property type ('user_prptype') as the user id, so the default property / year was
//     never found again. A failing preference save no longer empties the customer list.
//   - Tracking "Copy job chart text" works (expo-clipboard). In Legacy `Clipboard` was not
//     imported, so it always showed "Clipboard unavailable".
//   - Authorized card on Auth: the "Job chart" button had no action in Legacy (TODO) — not shown.
//   - Sales executive picker shows the executive name for the party's own executive
//     (Legacy showed an empty row because it read a different field).
//   - Edit / View of an order opens as an in-screen panel (Back / Android back closes it)
//     instead of a full-screen modal; pickers are sheets (bottom sheet on phone, dialog on
//     tablet / web); Tracking cards use 1 / 2 / 3 columns by screen width.
import AsyncStorage from '@/common/utils/compatibleStorage';
import { Segment } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as api from './api';
import AuthTab from './AuthTab';
import { todayYmd } from './model';
import NewOrderTab from './NewOrderTab';
import SummaryTab from './SummaryTab';
import TrackingTab from './TrackingTab';
import { CONTENT, useCols } from './ui';

type Props = { token: string; API: string; username?: string };

type TabId = 'neworder' | 'auth' | 'tracking' | 'summary';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'neworder', label: 'New Order', icon: 'add-shopping-cart' },
  { id: 'auth', label: 'Auth', icon: 'verified-user' },
  { id: 'tracking', label: 'Tracking', icon: 'local-shipping' },
  { id: 'summary', label: 'Summary', icon: 'summarize' },
];

export default function SalesOrderEntryNEW({ token, API }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('neworder');
  const [pendingCnt, setPendingCnt] = useState(0);
  const { isPhone } = useCols();
  // null until read: New Order loads the saved default property / year with this id
  const [userid, setUserid] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('user_id')
      .then((id) => setUserid(id || ''))
      .catch(() => setUserid(''));
  }, []);

  // Legacy tab counter: pending orders of this month
  useEffect(() => {
    if (!token) return;
    api
      .pendingCount(API, token, todayYmd())
      .then(setPendingCnt)
      .catch(() => {});
  }, [token, API]);

  return (
    <View style={s.root}>
      <View style={s.tabs}>
        <View style={CONTENT}>
          <Segment
            value={activeTab}
            onChange={(v) => setActiveTab(v)}
            options={TABS.map((t) => ({
              value: t.id,
              icon: isPhone ? undefined : t.icon,
              label: t.id === 'auth' && pendingCnt > 0 ? `${t.label} (${pendingCnt})` : t.label,
            }))}
          />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {activeTab === 'neworder' && userid !== null ? <NewOrderTab token={token} API={API} userid={userid} /> : null}
        {activeTab === 'auth' && userid !== null ? <AuthTab token={token} API={API} userid={userid} /> : null}
        {activeTab === 'tracking' && userid !== null ? <TrackingTab token={token} API={API} userid={userid} /> : null}
        {activeTab === 'summary' && userid !== null ? <SummaryTab token={token} API={API} userid={userid} /> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  tabs: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, backgroundColor: T.bg, borderBottomWidth: 1, borderBottomColor: T.hair },
});
