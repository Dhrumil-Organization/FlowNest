import AsyncStorage from '@/common/utils/compatibleStorage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import DtsNEW from '../../components/DtsNEW';
import { ErpSessionGate } from '../../core/session/erpSession';
import { useAppSessionStore } from '../../stores/AppSessionStore';

// DTS (NEW ERP — Dress Material · Technical Textile · Sportswear: the owner's own section in one place:
// target, monthly report, sales, production, samples, collection, payments made, outstanding, beam shortage,
// each with its drill-down reports).
//
// Token + API host come from the common ErpSessionGate:
//   - sudamo_knits -> apig, rayons -> apiy (login selection AND header switch)
//   - screen renders only after the correct token/host are known
//   - screen remounts fresh when property or token changes (no refresh needed)
//
// Property group (prptype) is the same value the existing Dashboard sends to
// getOwnerDashboard: AsyncStorage `user_prptype`, else the login business
// context (prp_group), else 'S'.
function DtsWithPrpType({ token, API }: { token: string; API: string }) {
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

  return <DtsNEW token={token} API={API} prptype={prptype} />;
}

export function DtsScreen() {
  return <ErpSessionGate>{(s) => <DtsWithPrpType token={s.token} API={s.API} />}</ErpSessionGate>;
}
