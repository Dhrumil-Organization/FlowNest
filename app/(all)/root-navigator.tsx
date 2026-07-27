// // ─────────────────────────────────────────────────────────────
// // FILE: src/navigation/RootNavigator.tsx
// // Routes by real app session token, not static role user.
// // ─────────────────────────────────────────────────────────────

// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import React from 'react';
// // import { RoleLoginScreen } from '../screens/auth/RoleLoginScreen';
// // import { MainTabs } from './MainTabs';
// // import { useAppSessionStore } from '../stores/AppSessionStore';
// import MainTabs from '@/src/navigation/MainTabs';
// import RoleLoginScreen from '@/src/screens/auth/RoleLoginScreen';
// import { useAppSessionStore } from '@/src/stores/AppSessionStore';

// const Stack = createNativeStackNavigator();

// export function RootNavigator() {
//   const token = useAppSessionStore((s) => s.token);

//   return (
//     <Stack.Navigator screenOptions={{ headerShown: false }}>
//       {!token ? (
//         <Stack.Screen name="RoleLogin" component={RoleLoginScreen} />
//       ) : (
//         <Stack.Screen name="Main" component={MainTabs} />
//       )}
//     </Stack.Navigator>
//   );
// }

// // app/root-navigator.tsx
// import { RootNavigator } from '@/src/navigation/RootNavigator';

// export default function RootNavigatorScreen() {
//   // return <RootNavigator />;
//   return (
//     <RootNavigator />
//     // <Text>Hii</Text>
//   )
    
// }