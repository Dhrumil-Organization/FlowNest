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
import { SubScreenHeader } from '@/src/components/layout/SubScreenHeader';
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import { S, T } from '@/src/theme';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={st.card}>
      <Text style={st.cardTitle}>{title}</Text>
      <View style={st.cardBody}>{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const logout = useAppSessionStore((s) => s.logout);
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

  const confirmSignOut = () =>
    AppAlert.alert('Sign out?', 'This will clear the mobile session on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);

  return (
    <SafeAreaView style={st.safe} edges={['bottom']}>
      <SubScreenHeader backLabel="Back" title="Profile" />

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={st.hero}>
          <View style={st.heroAvatar}>
            <Text style={st.heroAvatarText}>{initials}</Text>
          </View>
          <Text style={st.heroName} numberOfLines={1} adjustsFontSizeToFit>{name}</Text>
          {!!user?.email && <Text style={st.heroEmail} numberOfLines={1}>{user.email}</Text>}

          <View style={st.badgeRow}>
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

        {/* Account details */}
        <SectionCard title="ACCOUNT DETAILS">
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
        <SectionCard title="BUSINESS CONTEXT">
          <Row label="Property Code" value={rawLoginResponse?.prpcode} />
          <Row label="Property Type" value={prpMeta?.PrpOfFull} />
          <Row label="Store Code" value={rawLoginResponse?.strcode} />
          <Row label="Financial Year" value={year?.YearName} />
          <Row label="User Belongs To" value={rawLoginResponse?.userof === 'S' ? 'Sudamo' : rawLoginResponse?.userof === 'K' ? 'Knit' : rawLoginResponse?.userof} />
          <Row label="Is Director" value={yesNo(isDirector)} />
          <Row label="Is Super Admin" value={yesNo(isSuperAdmin)} />
        </SectionCard>

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
        <TouchableOpacity style={st.signOutBtn} onPress={confirmSignOut} activeOpacity={0.85}>
          <Text style={st.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.nav },
  scroll: { backgroundColor: T.bg, paddingHorizontal: 18, paddingTop: 20, flexGrow: 1 },

  hero: { alignItems: 'center', marginBottom: 22 },
  heroAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: T.copper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: T.surface,
    ...S.card,
  },
  heroAvatarText: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: 0.5 },
  heroName: { marginTop: 12, fontSize: 21, fontWeight: '900', color: T.ink, maxWidth: '90%' },
  heroEmail: { marginTop: 3, fontSize: 13, fontWeight: '600', color: T.muted },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  badgeCopper: { backgroundColor: T.copper, borderColor: T.copper },
  badgeText: { fontSize: 11, fontWeight: '800', color: T.ink },
  badgeTextLight: { fontSize: 11, fontWeight: '800', color: '#fff' },

  card: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 16,
    overflow: 'hidden',
    ...S.card,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: T.muted,
    backgroundColor: T.sub,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  cardBody: { paddingHorizontal: 16, paddingVertical: 4 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
    gap: 12,
  },
  rowLabel: { fontSize: 13, fontWeight: '700', color: T.muted, flexShrink: 0 },
  rowValue: { fontSize: 13, fontWeight: '800', color: T.ink, flexShrink: 1, textAlign: 'right' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: T.sub,
    borderWidth: 1,
    borderColor: T.border,
  },
  chipText: { fontSize: 12, fontWeight: '800', color: T.yd },

  signOutBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: T.red,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: T.surface,
    marginTop: 4,
  },
  signOutBtnText: { color: T.red, fontWeight: '900', fontSize: 14, letterSpacing: 0.3 },
});
