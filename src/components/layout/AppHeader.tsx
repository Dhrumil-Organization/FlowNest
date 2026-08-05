import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppSessionStore } from '../../stores/AppSessionStore';
import { T } from '../../theme';

type Props = { eyebrow?: string; title: string; subtitle?: string; right?: React.ReactNode; showSignOut?: boolean };

// FEATURE: profile avatar — a small initials "chip" that sits to the right
// of Sign out in every header (this is the ONE AppHeader in the app, so
// adding it here makes it a persistent, common element on every tab screen
// instead of something each screen would need to opt into). Tapping it
// opens the dedicated Profile screen (app/new/profile.tsx), which reads the
// full login response out of AppSessionStore.
function getInitials(u: any): string {
  if (!u) return '?';
  const first = String(u.first_name || '').trim();
  const last = String(u.last_name || '').trim();
  if (first || last) {
    const combined = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    if (combined) return combined;
  }
  const name = String(u.name || '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length > 1) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return '?';
}
// FIX: AppHeader previously wrapped itself in its own <SafeAreaView edges={['top']}>.
// Every screen that renders AppHeader (directly or via ScreenHeader) already wraps
// itself in a SafeAreaView, so this was applying the top inset twice — extra dead
// space under the notch/status bar on screens like Catalog/Orders/Expense/Stock.
// AppHeader now only sets the status bar style and renders a plain View; the
// enclosing screen's own SafeAreaView is the single place safe-area is applied.
export function AppHeader({ eyebrow='SUDAMO TEXTILE ERP', title, subtitle, right, showSignOut=true }: Props) {
 const logout=useAppSessionStore(s=>s.logout);
 const router=useRouter();
 const sessionUser=useAppSessionStore(s=>s.user);
 const rawLoginResponse=useAppSessionStore(s=>s.rawLoginResponse);
 const profileUser=rawLoginResponse?.user||sessionUser;
 const initials=getInitials(profileUser);
 const [appVersion, setAppVersion] = useState('');

 useEffect(() => {
    const fetchAppVersion = async () => {
        try {
            const appJson = await import('../../../app.json');
            setAppVersion(appJson.expo.version);
        } catch (error) {
            console.error('Error fetching app version:', error);
        }
    };

    fetchAppVersion();
}, []);
 const signOut=()=>Alert.alert('Sign out?','This will clear the mobile session on this device.',[
  {text:'Cancel',style:'cancel'},{text:'Sign out',style:'destructive',onPress:logout}
 ]);
 return <View style={s.safe}>
  <StatusBar barStyle="light-content" backgroundColor={T.nav} />
  <View style={s.header}><View style={s.left}>
   <Text style={s.eyebrow} numberOfLines={1}>{`${eyebrow}`}</Text>
   <Text style={s.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{title}</Text>
   {!!subtitle&&<Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>}
   {<Text style={s.subtitle} numberOfLines={1}>Version: {appVersion}</Text>}
  </View><View style={s.right}>{right}{showSignOut&&<TouchableOpacity onPress={signOut} style={s.signOut}><Text style={s.signOutText}>Sign out</Text></TouchableOpacity>}
   <TouchableOpacity
    onPress={()=>router.push('/new/profile' as any)}
    style={s.avatar}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel="Open profile"
   >
    <Text style={s.avatarText}>{initials}</Text>
   </TouchableOpacity>
  </View></View>
 </View>
}
// FIX: `title`/`eyebrow` previously had no `numberOfLines`, so a long title
// shown alongside wide `right` content (e.g. the "Sync Registry" pill next
// to "Sign out") could squeeze the left column enough to wrap "Business
// Dashboard" onto 3 lines. `numberOfLines={1}` + `adjustsFontSizeToFit` on
// the title makes it shrink to fit instead of wrapping; `right` gets
// `flexShrink:0` so it can no longer be the thing that gets squeezed
// unpredictably.
const s=StyleSheet.create({safe:{backgroundColor:T.nav},header:{backgroundColor:T.nav,paddingHorizontal:24,paddingTop:18,paddingBottom:22,flexDirection:'row',alignItems:'center'},left:{flex:1,paddingRight:12,minWidth:0},eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:2,color:'#8EA6BA'},title:{fontSize:28,fontWeight:'900',color:'#fff',marginTop:4},subtitle:{fontSize:13,fontWeight:'700',color:'#9FB0BF',marginTop:6},right:{flexDirection:'row',alignItems:'center',gap:8,flexShrink:0},signOut:{borderWidth:1.5,borderColor:'#2A4055',borderRadius:14,paddingHorizontal:18,paddingVertical:13},signOutText:{color:'#fff',fontWeight:'900',fontSize:13},avatar:{width:40,height:40,borderRadius:20,backgroundColor:T.copper,alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'rgba(255,255,255,0.35)'},avatarText:{color:'#fff',fontWeight:'900',fontSize:14,letterSpacing:0.3}});
