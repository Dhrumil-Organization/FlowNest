// FILE: src/components/SalesOrderEntryNEW/VersionSwitch.tsx
// Sales Order Entry — New and Old (Legacy) in the same screen, so both can be
// checked against each other:
//   New   = this folder (NEW ERP theme)
//   Old   = the untouched Legacy screen components/SalesOrderNew (same props the
//           Legacy route app/(tabs)/sales-order-entry.tsx passed)
//   Both  = side by side (only offered on wide screens, >= 1024 px)
// The choice is remembered on the device ('soe_view_mode'). Both versions call the
// same server with the same token / API host (ErpSessionGate keeps the shared
// Legacy API host in sync), so an order made in one shows up in the other.
import AsyncStorage from '@/common/utils/compatibleStorage';
import LegacyOrdersScreen from '@/components/SalesOrderNew';
import { Segment } from '@/src/components/erpUi';
import { T } from '@/src/theme';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import SalesOrderEntryNEW from './index';
import { PaneWidth } from './ui';

type Mode = 'new' | 'old' | 'both';
const KEY = 'soe_view_mode';

type Props = { token: string; API: string; username?: string };

/** Legacy route container: token + user_details + (as Legacy) user_prptype passed as `userid`. */
function LegacySalesOrderEntry({ token }: { token: string }) {
  const [username, setUsername] = useState('');
  const [userid, setUserid] = useState<any>();
  useEffect(() => {
    (async () => {
      const u = await AsyncStorage.getItem('user_details');
      const p = await AsyncStorage.getItem('user_prptype');
      setUsername(u || 'User');
      setUserid(p);
    })();
  }, []);
  const Legacy: any = LegacyOrdersScreen;
  return <Legacy token={token || ''} username={username} userid={userid} />;
}

export default function SalesOrderEntryVersions({ token, API, username }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 1024;
  const [mode, setMode] = useState<Mode>('new');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === 'new' || v === 'old' || v === 'both') setMode(v);
      })
      .catch(() => {});
  }, []);

  const choose = (m: Mode) => {
    setMode(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  };

  // "Both" needs room; on a narrow screen it shows New (the choice is kept for wide screens)
  const shown: Mode = mode === 'both' && !wide ? 'new' : mode;

  const options: { value: Mode; label: string; icon?: string }[] = [
    { value: 'new', label: 'New', icon: wide ? 'fiber-new' : undefined },
    { value: 'old', label: 'Old (Legacy)', icon: wide ? 'history' : undefined },
  ];
  if (wide) options.push({ value: 'both', label: 'Both side by side', icon: 'vertical-split' });

  return (
    <View style={s.root}>
      <View style={s.bar}>
        <View style={s.barInner}>
          <Text style={s.barLabel}>VERSION</Text>
          <View style={{ flex: 1 }}>
            <Segment value={shown} onChange={choose} options={options} />
          </View>
        </View>
      </View>

      {shown === 'both' ? (
        <View style={s.split}>
          <View style={s.pane}>
            <Text style={[s.paneTag, { backgroundColor: T.nav }]}>NEW</Text>
            <PaneWidth.Provider value={Math.floor((width - 2) / 2)}>
              <SalesOrderEntryNEW token={token} API={API} username={username} />
            </PaneWidth.Provider>
          </View>
          <View style={s.divider} />
          <View style={s.pane}>
            <Text style={[s.paneTag, { backgroundColor: T.copper }]}>OLD (LEGACY)</Text>
            <LegacySalesOrderEntry token={token} />
          </View>
        </View>
      ) : shown === 'old' ? (
        <View style={{ flex: 1 }}>
          <LegacySalesOrderEntry token={token} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <SalesOrderEntryNEW token={token} API={API} username={username} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  bar: { paddingHorizontal: 12, paddingTop: 8, backgroundColor: T.bg },
  barInner: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  barLabel: { fontSize: 10.5, fontWeight: '800', color: T.muted, letterSpacing: 0.6 },
  split: { flex: 1, flexDirection: 'row' },
  pane: { flex: 1, minWidth: 0 },
  divider: { width: 2, backgroundColor: T.border },
  paneTag: {
    alignSelf: 'center',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#fff',
  },
});
