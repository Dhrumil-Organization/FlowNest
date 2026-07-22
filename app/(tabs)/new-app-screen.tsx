// import { AppCoreProvider } from '@/src/core/AppCoreProvider';
// import { MainTabs } from '@/src/navigation/MainTabs';
// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { Stack } from 'expo-router';
// import React from 'react';
// const Tab = createBottomTabNavigator();
// // export function MainTabs(){
// //  const {canAccess,canDo,isSuperAdmin}=usePermission();
// //  const canAdmin=isSuperAdmin||canDo('administration.permission_manager','manage');
// //  return <Tab.Navigator screenOptions={{headerShown:false,tabBarActiveTintColor:T.copper,tabBarInactiveTintColor:T.muted,tabBarStyle:{height:64,backgroundColor:T.surface,borderTopColor:T.border},tabBarLabelStyle:{fontSize:10,fontWeight:'800',marginBottom:7},tabBarIconStyle:{marginTop:7}}}>
// //   <Tab.Screen name="Home" component={DashboardScreen} options={{tabBarIcon:({color})=><Text style={{color}}>⌂</Text>}}/>
// //   {canAccess('designs')&&<Tab.Screen name="Designs" component={DesignsScreen} options={{tabBarIcon:({color})=><Text style={{color}}>□</Text>}}/>}
// //   {canAccess('costing')&&<Tab.Screen name="Costing" component={CostingScreen} options={{tabBarIcon:({color})=><Text style={{color}}>₹</Text>}}/>}
// //   {canAccess('orders')&&<Tab.Screen name="Orders" component={OrdersEntry} options={{tabBarIcon:({color})=><Text style={{color}}>▤</Text>}}/>}
// //   {(canAccess('management.reports')||isSuperAdmin)&&<Tab.Screen name="Reports" component={ReportsHubScreen} options={{tabBarIcon:({color})=><Text style={{color}}>◫</Text>}}/>}
// //   {canAdmin&&<Tab.Screen name="Permissions" component={PermissionManagerScreen} options={{tabBarLabel:'Admin',tabBarIcon:({color})=><Text style={{color}}>⚙</Text>}}/>}
// //  </Tab.Navigator>;
// // }
// // export default MainTabs;

// // import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// // import React from 'react';
// // import { DashboardScreen } from '../screens/dashboard/DashboardScreen';

// // const Tab = createBottomTabNavigator();

// export function NewAppScreen() {
//     console.log("MainTabs Render calledd.......from New Home......");
//     // const { canAccess, canDo, isSuperAdmin } = usePermission();

//     return (
//         // <Tab.Navigator>
//         //     <Tab.Screen
//         //         name="Home"
//         //         component={DashboardScreen}
//         //     />
//         //     <Tab.Screen name="Designs" component={DesignsScreen} options={{tabBarIcon:({color})=><Text style={{color}}>□</Text>}}/>
//         //     {/* {canAccess('designs') && <Tab.Screen name="Designs" component={DesignsScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color }}>□</Text> }} />} */}
//         // </Tab.Navigator>
//         // <View style={{ flex: 1 }}>
//         //     <Text>hello</Text>
//         // </View>
//         // <Tab.Navigator>
//         //     <Tab.Screen
//         //         name="Home"
//         //         component={DashboardScreen}
//         //     />
//         //     {/* <Tab.Screen name="Designs" component={DesignsScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color }}>□</Text> }} /> */}
//         // </Tab.Navigator>
//         <AppCoreProvider>
//             <Stack.Screen name="Main" component={MainTabs} />
//         </AppCoreProvider>
//     );
// }
// // export function MainTabs() {
// //     const { canAccess, canDo, isSuperAdmin } = usePermission();
// //     const canAdmin = isSuperAdmin || canDo('administration.permission_manager', 'manage');
// //     return <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: T.copper, tabBarInactiveTintColor: T.muted, tabBarStyle: { height: 64, backgroundColor: T.surface, borderTopColor: T.border }, tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginBottom: 7 }, tabBarIconStyle: { marginTop: 7 } }}>
// //         <Tab.Screen name="Home" component={DashboardScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color }}>⌂</Text> }} />
// //         {canAccess('designs') && <Tab.Screen name="Designs" component={DesignsScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color }}>□</Text> }} />}
// //         {canAccess('costing') && <Tab.Screen name="Costing" component={CostingScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color }}>₹</Text> }} />}
// //         {canAccess('orders') && <Tab.Screen name="Orders" component={OrdersEntry} options={{ tabBarIcon: ({ color }) => <Text style={{ color }}>▤</Text> }} />}
// //         {(canAccess('management.reports') || isSuperAdmin) && <Tab.Screen name="Reports" component={ReportsHubScreen} options={{ tabBarIcon: ({ color }) => <Text style={{ color }}>◫</Text> }} />}
// //         {canAdmin && <Tab.Screen name="Permissions" component={PermissionManagerScreen} options={{ tabBarLabel: 'Admin', tabBarIcon: ({ color }) => <Text style={{ color }}>⚙</Text> }} />}
// //     </Tab.Navigator>;
// // }