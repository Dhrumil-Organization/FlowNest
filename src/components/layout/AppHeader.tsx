import React from 'react';
import { Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppSessionStore } from '../../stores/AppSessionStore';
import { T } from '../../theme';

type Props = { eyebrow?: string; title: string; subtitle?: string; right?: React.ReactNode; showSignOut?: boolean };
// FIX: AppHeader previously wrapped itself in its own <SafeAreaView edges={['top']}>.
// Every screen that renders AppHeader (directly or via ScreenHeader) already wraps
// itself in a SafeAreaView, so this was applying the top inset twice — extra dead
// space under the notch/status bar on screens like Catalog/Orders/Expense/Stock.
// AppHeader now only sets the status bar style and renders a plain View; the
// enclosing screen's own SafeAreaView is the single place safe-area is applied.
export function AppHeader({ eyebrow='SUDAMO TEXTILE ERP', title, subtitle, right, showSignOut=true }: Props) {
 const logout=useAppSessionStore(s=>s.logout);
 const signOut=()=>Alert.alert('Sign out?','This will clear the mobile session on this device.',[
  {text:'Cancel',style:'cancel'},{text:'Sign out',style:'destructive',onPress:logout}
 ]);
 return <View style={s.safe}>
  <StatusBar barStyle="light-content" backgroundColor={T.nav} />
  <View style={s.header}><View style={s.left}>
   <Text style={s.eyebrow} numberOfLines={1}>{eyebrow}</Text>
   <Text style={s.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{title}</Text>
   {!!subtitle&&<Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>}
  </View><View style={s.right}>{right}{showSignOut&&<TouchableOpacity onPress={signOut} style={s.signOut}><Text style={s.signOutText}>Sign out</Text></TouchableOpacity>}</View></View>
 </View>
}
// FIX: `title`/`eyebrow` previously had no `numberOfLines`, so a long title
// shown alongside wide `right` content (e.g. the "Sync Registry" pill next
// to "Sign out") could squeeze the left column enough to wrap "Business
// Dashboard" onto 3 lines. `numberOfLines={1}` + `adjustsFontSizeToFit` on
// the title makes it shrink to fit instead of wrapping; `right` gets
// `flexShrink:0` so it can no longer be the thing that gets squeezed
// unpredictably.
const s=StyleSheet.create({safe:{backgroundColor:T.nav},header:{backgroundColor:T.nav,paddingHorizontal:24,paddingTop:18,paddingBottom:22,flexDirection:'row',alignItems:'center'},left:{flex:1,paddingRight:12,minWidth:0},eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:2,color:'#8EA6BA'},title:{fontSize:28,fontWeight:'900',color:'#fff',marginTop:4},subtitle:{fontSize:13,fontWeight:'700',color:'#9FB0BF',marginTop:6},right:{flexDirection:'row',alignItems:'center',gap:8,flexShrink:0},signOut:{borderWidth:1.5,borderColor:'#2A4055',borderRadius:14,paddingHorizontal:18,paddingVertical:13},signOutText:{color:'#fff',fontWeight:'900',fontSize:13}});
