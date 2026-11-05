// ─────────────────────────────────────────────────────────────
// FILE: app/(all)/lookup-select.tsx
//
// This used to be the "Select ERP Platform" screen (Legacy / New).
// There is ONE ERP now, so nothing is selected here any more: the route is
// kept only so an old link / bookmark / saved navigation state that still
// points to it lands on the ERP sign-in instead of a "not found" page.
// ─────────────────────────────────────────────────────────────
import { ensureSingleErp } from '@/src/core/singleErp';
import { T } from '@/src/theme';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function LookupSelectRedirect() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    void (async () => {
      await ensureSingleErp();
      if (alive) router.replace('/new/property-select');
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.bg }}>
      <ActivityIndicator size="large" color={T.copper} />
    </View>
  );
}
