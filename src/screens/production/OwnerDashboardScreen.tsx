import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import OwnerDashboardNEW from '../../components/OwnerDashboardNEW';
import { ErpSessionGate } from '../../core/session/erpSession';
import { useAppSessionStore } from '../../stores/AppSessionStore';

// Owner Dashboard (NEW ERP — one-page owner summary: sales, collection, outstanding,
// sales orders, profit, alerts, production, deployment and the executive table).
//
// Token + API host come from the common ErpSessionGate:
//   - sudamo_knits -> apig, rayons -> apiy (login selection AND header switch)
//   - screen renders only after the correct token/host are known
//   - screen remounts fresh when property or token changes (no refresh needed)
//
// Property group (prptype) is the same value the existing Dashboard sends to
// getOwnerDashboard: AsyncStorage `user_prptype`, else the login business
// context (prp_group), else 'S'.
function OwnerDashboardWithPrpType({ token, API, username }: { token: string; API: string; username: string }) {
  const contextPrpType = useAppSessionStore((state) => state.appSession?.business_context?.prp_group);
  const [prptype, setPrptype] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      let stored = '';
      try {
        stored = (await AsyncStorage.getItem('user_prptype')) || '';
      } catch {
        stored = '';
      }
      if (alive) setPrptype(String(stored || contextPrpType || 'S').trim().toUpperCase() || 'S');
    })();
    return () => {
      alive = false;
    };
  }, [contextPrpType]);

  if (prptype === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return <OwnerDashboardNEW token={token} API={API} username={username} prptype={prptype} />;
}

export function OwnerDashboardScreen() {
  return (
    <ErpSessionGate>
      {(s) => <OwnerDashboardWithPrpType token={s.token} API={s.API} username={s.username} />}
    </ErpSessionGate>
  );
}
