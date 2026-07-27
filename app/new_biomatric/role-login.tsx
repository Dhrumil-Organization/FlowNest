// // ─────────────────────────────────────────────────────────────
// // FILE: app/new/role-login.tsx
// // Wraps src/screens/auth/RoleLoginScreen.
// // RoleLoginScreen itself never called navigation.navigate — the old
// // RootNavigator just re-rendered to <Main/> once the token appeared
// // in the store. We reproduce that reactivity with a Redirect here.
// //
// // BIOMETRIC GATE:
// // If a token already exists (cold start / app resume) AND the user
// // had biometric login enabled, we require a successful Face ID /
// // Fingerprint match before redirecting into the app. If it fails or
// // is cancelled, we fall back to showing RoleLoginScreen (password).
// // ─────────────────────────────────────────────────────────────
// import { Redirect } from 'expo-router';
// import React, { useEffect, useState } from 'react';
// import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// import { authenticateWithBiometrics } from '@/src/lib/biometricAuth';
// import { RoleLoginScreen } from '@/src/screens/auth/RoleLoginScreen';
// import { useAppSessionStore } from '@/src/stores/AppSessionStore';
// import { T } from '@/src/theme';

// export default function RoleLoginRoute() {
//   const token = useAppSessionStore((s) => s.token);
//   const biometricEnabled = useAppSessionStore((s) => s.biometricEnabled);

//   const [checking, setChecking] = useState(true);
//   const [unlocked, setUnlocked] = useState(false);
//   const [failed, setFailed] = useState(false);

//   const runBiometricCheck = async () => {
//     setChecking(true);
//     setFailed(false);
//     const ok = await authenticateWithBiometrics('Unlock to continue');
//     setUnlocked(ok);
//     setFailed(!ok);
//     setChecking(false);
//   };

//   useEffect(() => {
//     if (token && biometricEnabled) {
//       void runBiometricCheck();
//     } else {
//       setChecking(false);
//     }
     
//   }, [token, biometricEnabled]);

//   // Case 1: waiting on the biometric prompt result.
//   if (token && biometricEnabled && checking) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator color={T.copper} size="large" />
//       </View>
//     );
//   }

//   // Case 2: biometric was required but failed/cancelled -> offer retry,
//   // and let the person drop down to password login (RoleLoginScreen).
//   if (token && biometricEnabled && failed && !unlocked) {
//     return (
//       <View style={styles.center}>
//         <Text style={styles.title}>Unlock failed</Text>
//         <Text style={styles.sub}>Try again, or log in with your password below.</Text>
//         <TouchableOpacity style={styles.retryBtn} onPress={runBiometricCheck}>
//           <Text style={styles.retryText}>Try again</Text>
//         </TouchableOpacity>
//         <View style={{ marginTop: 24, width: '100%' }}>
//           <RoleLoginScreen />
//         </View>
//       </View>
//     );
//   }

//   // Case 3: no biometric gate needed, or it succeeded -> proceed.
//   if (token && (!biometricEnabled || unlocked)) return <Redirect href="/new/(tabs)" />;

//   return <RoleLoginScreen />;
// }

// const styles = StyleSheet.create({
//   center: { flex: 1, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center', padding: 24, height: '100%' },
//   title: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 6 },
//   sub: { color: '#A9C0D4', fontSize: 13, textAlign: 'center', marginBottom: 18 },
//   retryBtn: {
//     backgroundColor: T.copper,
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderRadius: 12,
//   },
//   retryText: { color: '#fff', fontWeight: '900' },
// });
