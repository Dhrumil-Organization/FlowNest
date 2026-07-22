// ─────────────────────────────────────────────────────────────
// FILE: src/screens/dashboard/DashboardScreen.tsx
// Permission-aware dashboard + proper logout cleanup.
// ─────────────────────────────────────────────────────────────

// import React from 'react';
// import {
//   StyleSheet,
//   Text,
//   View
// } from 'react-native';
// import { T } from '../../theme';

import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { T } from '../../theme';

type Nav = any;

function StatCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardLabel}>THIS MONTH · PRODUCTION COST</Text>
        <Text style={styles.link}>Full report ›</Text>
      </View>
      <View style={styles.costRow}>
        <View style={styles.ring}>
          <Text style={styles.ringVal}>₹13.52</Text>
          <Text style={styles.ringSub}>L</Text>
          <Text style={styles.ringSub}>Jun '26</Text>
        </View>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>COST / PICK</Text>
          <Text style={styles.metricOrange}>₹0.337</Text>
          <Text style={styles.metricLabel}>PRODUCTION</Text>
          <Text style={styles.metricVal}>58.5 K m</Text>
        </View>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>AVG PICKS</Text>
          <Text style={styles.metricVal}>68.5</Text>
          <Text style={styles.metricLabel}>COST / MC-DAY</Text>
          <Text style={styles.metricVal}>₹2,682</Text>
        </View>
      </View>
    </View>
  );
}

function TargetCard() {
  return (
    <View style={styles.darkCard}>
      <Text style={styles.darkTitle}>May '26 Target</Text>
      <Text style={styles.darkSub}>3 days remaining</Text>
      <View style={styles.targetRow}>
        <View style={styles.darkRing}>
          <Text style={styles.darkRingVal}>77%</Text>
          <Text style={styles.darkRingSub}>billed</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.darkLabel}>SALES</Text>
          <Text style={styles.darkText}>SO booked <Text style={styles.orange}>₹1.32 Cr</Text></Text>
          <Text style={styles.darkText}>Billed <Text style={styles.orange}>₹1.16 Cr</Text></Text>
          <Text style={[styles.darkLabel, { marginTop: 11 }]}>COLLECTION</Text>
          <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
          <Text style={styles.darkText}>₹71.50 L / ₹85.00 L</Text>
        </View>
      </View>
    </View>
  );
}

// export function DashboardScreen() {
//   const navigation = useNavigation<Nav>();
//   const logout = useAppSessionStore((s) => s.logout);
//   const appSession = useAppSessionStore((s) => s.appSession);
//   const allowedScreens = useAppSessionStore((s) => s.allowedScreens());

//   const context = appSession?.business_context;

//   const handleLogout = () => {
//     Alert.alert('Sign out?', 'Your local session will be cleared on this device.', [
//       { text: 'Cancel', style: 'cancel' },
//       {
//         text: 'Sign out',
//         style: 'destructive',
//         onPress: async () => {
//           await logout();
//         },
//       },
//     ]);
//   };

//   return (
//     <SafeAreaView style={styles.safe} edges={['top']}>
//       <View style={styles.header}>
//         <View>
//           <Text style={styles.brand}>MADHUSUDHAN FABRICS</Text>
//           <Text style={styles.title}>Dashboard</Text>
//           <Text style={styles.contextText}>
//             {context?.prp_code || '—'} · FY {context?.year_no || '—'} · Store {context?.str_code || '—'}
//           </Text>
//         </View>
//         <TouchableOpacity onPress={handleLogout} style={styles.signOutBtn}>
//           <Text style={styles.signOutText}>Sign out</Text>
//         </TouchableOpacity>
//       </View>

//       <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 90 }}>
//         <View style={styles.segment}>
//           <View style={styles.segmentActive}><Text style={styles.segmentActiveText}>Company View</Text></View>
//           <View style={styles.segmentIdle}><Text style={styles.segmentIdleText}>My View</Text></View>
//         </View>

//         <StatCard />
//         <TargetCard />

//         <TouchableOpacity style={styles.reportCard} activeOpacity={0.8}>
//           <View style={styles.reportIcon}><Text style={{ fontSize: 24 }}>📊</Text></View>
//           <View style={{ flex: 1 }}>
//             <Text style={styles.reportTitle}>Monthly Report</Text>
//             <Text style={styles.reportSub}>Target vs actual · by month</Text>
//           </View>
//           <Text style={styles.chev}>›</Text>
//         </TouchableOpacity>

//         <View style={styles.permissionsCard}>
//           <Text style={styles.permissionsTitle}>Allowed Modules</Text>
//           <Text style={styles.permissionsSub}>Generated from app_session permissions</Text>
//           <View style={styles.moduleGrid}>
//             {allowedScreens.length === 0 ? (
//               <Text style={styles.emptyText}>No module permission found.</Text>
//             ) : (
//               allowedScreens.map((s) => (
//                 <TouchableOpacity
//                   key={s.screen_key}
//                   style={styles.moduleTile}
//                   activeOpacity={0.85}
//                   onPress={() => {
//                     if (s.screen_key === 'designs') navigation.navigate('Designs');
//                   }}
//                 >
//                   <Text style={styles.moduleIcon}>□</Text>
//                   <Text style={styles.moduleName}>{s.screen_name}</Text>
//                   <Text style={styles.moduleMeta}>{s.tabs?.length || 0} tabs</Text>
//                 </TouchableOpacity>
//               ))
//             )}
//           </View>
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }
export function DashboardScreen() {
  const router = useRouter();
  const logout = useAppSessionStore((s) => s.logout);
  // const appSession = useAppSessionStore((s) => s.appSession);
  // const allowedScreens = useAppSessionStore((s) => s.allowedScreens());
  const appSession = useAppSessionStore((s) => s.appSession);

  const allowedScreens =
    appSession?.permissions?.screens?.filter((s) => s.can_view) ?? [];
  const context = appSession?.business_context;

  const handleLogout = () => {
    Alert.alert('Sign out?', 'Your local session will be cleared on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  // return (
  //   <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
  //     <Text>Dashboard</Text>
  //   </View>
  // );

      return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>MADHUSUDHAN FABRICS</Text>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.contextText}>
              {context?.prp_code || '—'} · FY {context?.year_no || '—'} · Store {context?.str_code || '—'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 90 }}>
          <View style={styles.segment}>
            <View style={styles.segmentActive}><Text style={styles.segmentActiveText}>Company View</Text></View>
            <View style={styles.segmentIdle}><Text style={styles.segmentIdleText}>My View</Text></View>
          </View>

          <StatCard />
          <TargetCard />

          <TouchableOpacity style={styles.reportCard} activeOpacity={0.8}>
            <View style={styles.reportIcon}><Text style={{ fontSize: 24 }}>📊</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reportTitle}>Monthly Report</Text>
              <Text style={styles.reportSub}>Target vs actual · by month</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>

          <View style={styles.permissionsCard}>
            <Text style={styles.permissionsTitle}>Allowed Modules</Text>
            <Text style={styles.permissionsSub}>Generated from app_session permissions</Text>
            <View style={styles.moduleGrid}>
              {allowedScreens.length === 0 ? (
                <Text style={styles.emptyText}>No module permission found.</Text>
              ) : (
                allowedScreens.map((s) => (
                  <TouchableOpacity
                    key={s.screen_key}
                    style={styles.moduleTile}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (s.screen_key === 'designs') router.push('/new/(tabs)/designs');
                    }}
                  >
                    <Text style={styles.moduleIcon}>□</Text>
                    <Text style={styles.moduleName}>{s.screen_name}</Text>
                    <Text style={styles.moduleMeta}>{s.tabs?.length || 0} tabs</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  header: {
    backgroundColor: T.nav,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { fontSize: 10, color: '#6F91AD', fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#fff', fontSize: 25, fontWeight: '900', marginTop: 2 },
  contextText: { color: '#7FA0BA', fontSize: 11, marginTop: 2, fontWeight: '700' },
  signOutBtn: { borderWidth: 1, borderColor: '#29445C', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10 },
  signOutText: { color: '#DCEAF5', fontSize: 13, fontWeight: '900' },
  body: { flex: 1, padding: 14 },
  segment: { flexDirection: 'row', backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginBottom: 14 },
  segmentActive: { flex: 1, backgroundColor: T.nav, paddingVertical: 14, alignItems: 'center' },
  segmentIdle: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  segmentActiveText: { color: '#fff', fontWeight: '900' },
  segmentIdleText: { color: T.muted, fontWeight: '900' },
  card: { backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 14 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  cardLabel: { color: T.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  link: { color: T.copper, fontSize: 12, fontWeight: '900' },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  ring: { width: 76, height: 76, borderRadius: 38, borderWidth: 10, borderColor: T.copper, alignItems: 'center', justifyContent: 'center' },
  ringVal: { fontSize: 17, fontWeight: '900', color: T.ink },
  ringSub: { fontSize: 8, color: T.muted },
  metricCol: { flex: 1 },
  metricLabel: { color: T.muted, fontSize: 9, fontWeight: '900', marginTop: 4 },
  metricVal: { color: T.ink, fontSize: 15, fontWeight: '900' },
  metricOrange: { color: T.copper, fontSize: 15, fontWeight: '900' },
  darkCard: { backgroundColor: T.nav, borderRadius: 16, padding: 16, marginBottom: 14 },
  darkTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  darkSub: { color: '#92A9BE', fontSize: 12, marginTop: 2 },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 22 },
  darkRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 10, borderColor: T.copper, alignItems: 'center', justifyContent: 'center' },
  darkRingVal: { color: '#fff', fontSize: 23, fontWeight: '900' },
  darkRingSub: { color: '#9DB2C5', fontSize: 11 },
  darkLabel: { color: '#7892AA', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  darkText: { color: '#D9E7F2', fontSize: 13, fontWeight: '700', marginTop: 5 },
  orange: { color: T.copper, fontWeight: '900' },
  progressTrack: { height: 7, borderRadius: 5, backgroundColor: '#2A4054', marginTop: 8, marginBottom: 4 },
  progressFill: { height: 7, borderRadius: 5, width: '77%', backgroundColor: '#3F8B5A' },
  reportCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 15, marginBottom: 14, gap: 12 },
  reportIcon: { width: 44, height: 44, backgroundColor: T.sub, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reportTitle: { color: T.ink, fontSize: 15, fontWeight: '900' },
  reportSub: { color: T.muted, fontSize: 12, marginTop: 2 },
  chev: { color: T.muted, fontSize: 24 },
  permissionsCard: { backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 15 },
  permissionsTitle: { color: T.ink, fontSize: 16, fontWeight: '900' },
  permissionsSub: { color: T.muted, fontSize: 12, marginTop: 2, marginBottom: 12 },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moduleTile: { width: '48%', backgroundColor: T.sub, borderRadius: 14, padding: 14, minHeight: 94, justifyContent: 'center' },
  moduleIcon: { color: T.copper, fontSize: 22, fontWeight: '900' },
  moduleName: { color: T.ink, fontSize: 13, fontWeight: '900', marginTop: 8 },
  moduleMeta: { color: T.muted, fontSize: 11, marginTop: 2 },
  emptyText: { color: T.muted, fontSize: 13 },
});
