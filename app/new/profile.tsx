import AppAlert from '@/common/utils/appAlert';
// ─────────────────────────────────────────────────────────────
// FILE: app/new/profile.tsx
// Profile screen — opened from the avatar chip in AppHeader (top-right,
// next to Sign out). Pushed on top of the tabs stack, so it gets its own
// back-button header (SubScreenHeader) instead of the persistent tab header.
//
// All the data shown here comes straight out of AppSessionStore's
// `rawLoginResponse` (the `response` object from the login API — see
// src/api/client.ts LoginResponse type), with `user` as a fallback for
// anything not present there. Nothing sensitive (access_token,
// prpdbconfig, email_password, usermenu, etc.) is read or displayed —
// only fields that belong on a profile screen.
// ─────────────────────────────────────────────────────────────
//
// DELETE ACCOUNT — same as the Legacy profile screen
// (components/ProfileScreen/index.tsx -> handleDeleteAccount):
//   two confirmations ("Delete Account" -> "Final Confirmation"), then
//   POST {API}/api/delete_account  body {}  headers Authorization: Bearer,
//   Content-Type: application/json, X-Requested-With: XMLHttpRequest.
//   success === true -> "Account Deleted" alert, the whole local storage is
//   cleared (deleteAcoountSession) and the user is sent out of the app;
//   request error -> "Deletion Failed" alert.
// New ERP additions: the saved Auto Login / property-switch credentials of
// the deleted account are removed from the device too, and the user lands on
// the same screen as New ERP "Sign out" (landing) instead of the Legacy login.
// ─────────────────────────────────────────────────────────────
import { API } from '@/common/API/dynamicAPI';
import { deleteAcoountSession } from '@/common/utils/profileStorage';
import { SubScreenHeader } from '@/src/components/layout/SubScreenHeader';
import { getActiveNewErpProperty } from '@/src/core/authFlow';
import { clearCredentialsForPropertySwitch } from '@/src/lib/biometricAuth';
import { forgetRememberedLogin } from '@/src/lib/rememberedLogin';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

function fullName(u: any): string {
  const first = String(u?.first_name || '').trim();
  const last = String(u?.last_name || '').trim();
  const combined = [first, last].filter(Boolean).join(' ');
  return combined || u?.name || u?.displayname || 'User';
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function yesNo(flag: any): string {
  return Number(flag) ? 'Yes' : 'No';
}

// role1 arrives as a one-item array holding a single comma-joined string
// (see login response), e.g. ["Director,Mobile App,...,SuperAdmin"].
function parseRoles(role1: any): string[] {
  if (!role1) return [];
  const raw = Array.isArray(role1) ? role1.join(',') : String(role1);
  return raw.split(',').map((r) => r.trim()).filter(Boolean);
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={st.row}>
      <Text style={st.rowLabel}>{label}</Text>
      <Text style={st.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function SectionCard({ title, children, style }: { title: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[st.card, style]}>
      <Text style={st.cardTitle}>{title}</Text>
      <View style={st.cardBody}>{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const logout = useAppSessionStore((s) => s.logout);
  const token = useAppSessionStore((s) => s.token);
  const [deleting, setDeleting] = useState(false);
  const sessionUser = useAppSessionStore((s) => s.user);
  const rawLoginResponse = useAppSessionStore((s) => s.rawLoginResponse);

  const user = rawLoginResponse?.user || sessionUser || {};
  const year = rawLoginResponse?.year;
  const roles = parseRoles(rawLoginResponse?.role1);
  const prptypes: any[] = Array.isArray(rawLoginResponse?.prptypes) ? rawLoginResponse.prptypes : [];
  const prpMeta = prptypes.find((p) => p?.PrpCode === rawLoginResponse?.prpcode);

  const isSuperAdmin = Number(rawLoginResponse?.issuperadmin ?? user?.is_superadmin) > 0;
  const isDirector = Number(rawLoginResponse?.isdirector ?? user?.is_director) > 0;

  const initials = getInitials(user);
  const name = fullName(user);

  // RESPONSIVE: phone = single column; tablet / web = centred page (max
  // 980px) with a horizontal hero and the two detail cards side by side.
  const { width } = useWindowDimensions();
  const settingsRouter = useRouter();
  const isWide = width >= 760;
  const isDesktop = Platform.OS === 'web' && width >= 1180;
  const gutter = isDesktop ? 28 : isWide ? 22 : width < 360 ? 12 : 16;

  const confirmSignOut = () =>
    AppAlert.alert('Sign out?', 'This will clear the mobile session on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);

  // Legacy: handleDeleteAccount -> "Delete Permanently"
  const deleteAccount = async () => {
    if (deleting) return;
    try {
      setDeleting(true);

      const headers = {
        Authorization: `Bearer ${token || ''}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };

      const response = await axios.post(
        `${API}/api/delete_account`,
        {}, // body
        { headers }, // config
      );

      if (response.data.success === true) {
        console.log('DELETE ACCOUNT API RESPONSE =>', response?.data);

        AppAlert.alert('Account Deleted', 'Your account has been permanently deleted.');

        // The deleted account's saved password must not stay on the device.
        try {
          const property = await getActiveNewErpProperty();
          await forgetRememberedLogin(property);
          await clearCredentialsForPropertySwitch();
        } catch (e) {
          console.log('DELETE ACCOUNT: saved login cleanup failed', e);
        }

        await deleteAcoountSession(); // legacy: AsyncStorage.clear()
        setDeleting(false);
        await logout(); // resets the New ERP session store and opens the landing screen
        return;
      }

      // Legacy left the loader spinning when the server answered without
      // success:true. Stop it and tell the user the account was NOT deleted.
      setDeleting(false);
      AppAlert.alert(
        'Deletion Failed',
        String(response?.data?.message || 'Unable to delete your account at this time. Please try again later.'),
      );
    } catch (error) {
      setDeleting(false);
      console.log('DELETE ACCOUNT ERROR =>', error);

      AppAlert.alert(
        'Deletion Failed',
        'Unable to delete your account at this time. Please try again later.',
      );
    }
  };

  // Legacy: handleDeleteAccount (same two confirmations, same texts)
  const confirmDeleteAccount = () => {
    if (deleting) return;
    AppAlert.alert(
      'Delete Account',
      'This will permanently delete your FlowNest account and remove your personal data associated with this account. This action cannot be undone.',
      [
        { text: 'Keep Account', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            AppAlert.alert(
              'Final Confirmation',
              'Are you absolutely sure you want to permanently delete your account? Once deleted, you will lose access to your account, profile information, and app data.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete Permanently', style: 'destructive', onPress: () => void deleteAccount() },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={st.safe} edges={['bottom']}>
      <SubScreenHeader backLabel="Back" title="Profile" />

      <ScrollView
        style={st.scrollView}
        contentContainerStyle={[st.scroll, { paddingHorizontal: gutter }]}
        showsVerticalScrollIndicator={false}
      >
       <View style={st.page}>
        {/* Hero */}
        <View style={[st.hero, isWide && st.heroWide]}>
          <View style={[st.heroAvatar, isWide && st.heroAvatarWide]}>
            <Text style={[st.heroAvatarText, isWide && st.heroAvatarTextWide]}>{initials}</Text>
          </View>
          <View style={[st.heroInfo, isWide && st.heroInfoWide]}>
          <Text style={[st.heroName, isWide && st.heroNameWide]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{name}</Text>
          {!!user?.email && <Text style={[st.heroEmail, isWide && st.textLeft]} numberOfLines={1}>{user.email}</Text>}

          <View style={[st.badgeRow, isWide && st.badgeRowWide]}>
            {isSuperAdmin && (
              <View style={[st.badge, st.badgeCopper]}>
                <Text style={st.badgeTextLight}>Super Admin</Text>
              </View>
            )}
            {isDirector && (
              <View style={st.badge}>
                <Text style={st.badgeText}>Director</Text>
              </View>
            )}
            {!!user?.saleexeid && (
              <View style={st.badge}>
                <Text style={st.badgeText}>Code: {user.saleexeid}</Text>
              </View>
            )}
          </View>
          </View>
        </View>

        {/* Settings: theme (Light / Dark) and "My screens" */}
        <TouchableOpacity
          onPress={() => settingsRouter.push('/new/settings' as any)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 14, borderRadius: 14, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${T.copper}16` }}>
            <Icon name="settings" size={20} color={T.copper} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: T.ink }}>Settings</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 2 }} numberOfLines={1}>Theme and the screens shown in your menu</Text>
          </View>
          <Icon name="chevron-right" size={22} color={T.muted} />
        </TouchableOpacity>

        <View style={[st.columns, isWide && st.columnsWide]}>
        {/* Account details */}
        <SectionCard title="ACCOUNT DETAILS" style={isWide && st.column}>
          <Row label="User ID" value={user?.id != null ? String(user.id) : null} />
          <Row label="Name" value={name} />
          <Row label="Email" value={user?.email} />
          <Row label="Mobile 1" value={user?.mobile1 || 'Not set'} />
          <Row label="Mobile 2" value={user?.mobile2 || 'Not set'} />
          <Row label="Member since" value={formatDate(user?.created_at)} />
          <Row label="Last updated" value={formatDate(user?.updated_at)} />
          <Row label="Last login" value={formatDate(user?.last_login_at) || 'Not available'} />
        </SectionCard>

        {/* Business context */}
        <SectionCard title="BUSINESS CONTEXT" style={isWide && st.column}>
          <Row label="Property Code" value={rawLoginResponse?.prpcode} />
          <Row label="Property Type" value={prpMeta?.PrpOfFull} />
          <Row label="Store Code" value={rawLoginResponse?.strcode} />
          <Row label="Financial Year" value={year?.YearName} />
          <Row label="User Belongs To" value={rawLoginResponse?.userof === 'S' ? 'Sudamo' : rawLoginResponse?.userof === 'K' ? 'Knit' : rawLoginResponse?.userof} />
          <Row label="Is Director" value={yesNo(isDirector)} />
          <Row label="Is Super Admin" value={yesNo(isSuperAdmin)} />
        </SectionCard>
        </View>

        {/* Roles & access */}
        {roles.length > 0 && (
          <SectionCard title="ROLES & ACCESS">
            <View style={st.chipWrap}>
              {roles.map((role) => (
                <View key={role} style={st.chip}>
                  <Text style={st.chipText}>{role}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* Sign out */}
        <TouchableOpacity
          style={[st.signOutBtn, isWide && st.signOutBtnWide, deleting && st.btnDisabled]}
          onPress={confirmSignOut}
          disabled={deleting}
          activeOpacity={0.85}
        >
          <Text style={st.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Delete account (same flow as the Legacy profile screen) */}
        <View style={[st.dangerCard, isWide && st.dangerCardWide]}>
          <View style={st.dangerHead}>
            <View style={st.dangerIcon}>
              <Icon name="delete-outline" size={20} color={T.red} />
            </View>
            <View style={st.dangerTextWrap}>
              <Text style={st.dangerTitle}>Delete Account</Text>
              <Text style={st.dangerSub}>
                Permanently deletes your account and the personal data linked to it. This cannot be undone.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[st.deleteBtn, deleting && st.btnDisabled]}
            onPress={confirmDeleteAccount}
            disabled={deleting}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Delete Account"
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="delete" size={18} color="#fff" />
            )}
            <Text style={st.deleteBtnText}>{deleting ? 'Deleting…' : 'Delete Account'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
       </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  // light page bg so the iPhone home-indicator area doesn't show a navy strip
  // (SubScreenHeader paints its own navy top area).
  safe: { flex: 1, backgroundColor: T.bg },
  scrollView: { flex: 1, backgroundColor: T.bg },
  scroll: { backgroundColor: T.bg, paddingTop: 16, flexGrow: 1 },
  page: { width: '100%', maxWidth: 980, alignSelf: 'center' },

  hero: { alignItems: 'center', marginBottom: 16 },
  heroWide: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 18,
    gap: 18,
    ...S.card,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.copper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: T.surface,
    ...S.card,
  },
  heroAvatarWide: { width: 76, height: 76, borderRadius: 38 },
  heroAvatarText: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: 0.5 },
  heroAvatarTextWide: { fontSize: 27 },
  heroInfo: { alignItems: 'center', alignSelf: 'stretch' },
  heroInfoWide: { flex: 1, minWidth: 0, alignItems: 'flex-start', alignSelf: 'center' },
  heroName: { marginTop: 10, fontSize: 19, lineHeight: 24, fontWeight: '800', color: T.ink, maxWidth: '92%', textAlign: 'center' },
  heroNameWide: { marginTop: 0, fontSize: 21, lineHeight: 26, maxWidth: '100%', textAlign: 'left' },
  heroEmail: { marginTop: 2, fontSize: 12.5, fontWeight: '500', color: T.muted, textAlign: 'center' },
  textLeft: { textAlign: 'left' },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 10 },
  badgeRowWide: { justifyContent: 'flex-start', marginTop: 8 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  badgeCopper: { backgroundColor: T.copper, borderColor: T.copper },
  badgeText: { fontSize: 11, fontWeight: '600', color: T.ink },
  badgeTextLight: { fontSize: 11, fontWeight: '700', color: '#fff' },

  columns: {},
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  column: { flex: 1, minWidth: 0 },

  card: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 14,
    overflow: 'hidden',
    ...S.card,
  },
  cardTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: T.muted,
    backgroundColor: T.sub,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  cardBody: { paddingHorizontal: 14, paddingVertical: 2 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
    gap: 12,
  },
  rowLabel: { fontSize: 12.5, fontWeight: '500', color: T.muted, flexShrink: 0, maxWidth: '45%' },
  rowValue: { fontSize: 12.5, fontWeight: '600', color: T.ink, flexShrink: 1, textAlign: 'right' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 10 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: T.sub,
    borderWidth: 1,
    borderColor: T.border,
  },
  chipText: { fontSize: 11.5, fontWeight: '600', color: T.yd },

  signOutBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.red,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: T.surface,
    marginTop: 2,
  },
  signOutBtnWide: { alignSelf: 'center', width: '100%', maxWidth: 360 },
  signOutBtnText: { color: T.red, fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.55 },

  dangerCard: {
    marginTop: 18,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${T.red}55`,
    padding: 14,
    gap: 12,
  },
  dangerCardWide: { alignSelf: 'center', width: '100%', maxWidth: 520 },
  dangerHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dangerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${T.red}14`,
  },
  dangerTextWrap: { flex: 1, minWidth: 0 },
  dangerTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
  dangerSub: { marginTop: 2, fontSize: 12, lineHeight: 17, fontWeight: '500', color: T.muted },
  deleteBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: T.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
});
