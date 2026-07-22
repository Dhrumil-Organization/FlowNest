// // // import React from 'react';
// // // import { RootNavigator } from '../../src/navigation/RootNavigator';

// // // export default function NewProject() {
// // //   return <RootNavigator />;
// // // }
// // // // import { Text, View } from 'react-native';

// // // // export default function NewProject() {
// // // //   return (
// // // //     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
// // // //       <Text>NEW PROJECT OPENED</Text>
// // // //     </View>
// // // //   );
// // // // }

// // import React, { useEffect } from 'react';
// // import { ActivityIndicator, View } from 'react-native';
// // import { SafeAreaProvider } from 'react-native-safe-area-context';

// // import { AppCoreProvider } from '../../src/core/AppCoreProvider';
// // import { RootNavigator } from '../../src/navigation/RootNavigator';
// // import { useAppSessionStore } from '../../src/stores/AppSessionStore';
// // import { useAppStore } from '../../src/stores/AppStore';

// // export default function NewProject() {
// //   const loadLegacyStorage = useAppStore((s) => s.loadFromStorage);
// //   const hydrateSession = useAppSessionStore((s) => s.hydrate);
// //   const hydrated = useAppSessionStore((s) => s.hydrated);

// //   useEffect(() => {
// //     void Promise.all([
// //       loadLegacyStorage(),
// //       hydrateSession(),
// //     ]);
// //   }, []);

// //   if (!hydrated) {
// //     return (
// //       <View
// //         style={{
// //           flex:1,
// //           justifyContent:'center',
// //           alignItems:'center'
// //         }}
// //       >
// //         <ActivityIndicator />
// //       </View>
// //     );
// //   }

// //   return (
// //     <SafeAreaProvider>
// //       <AppCoreProvider>
// //         <RootNavigator />
// //       </AppCoreProvider>
// //     </SafeAreaProvider>
// //   );
// // }

// import React from 'react';
// import { AppCoreProvider } from '../../src/core/AppCoreProvider';
// import { RootNavigator } from '../../src/navigation/RootNavigator';

// export default function NewProject() {
//   console.log("Before RootNavigator");

//   return (
//     <AppCoreProvider>
//       <RootNavigator />
//     </AppCoreProvider>
//   );
// }