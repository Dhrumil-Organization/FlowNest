// FILE: src/features/support/HeaderSupportButtons.tsx
// Support Desk icons in the FlowNest header (rights-wise, compact):
//   🎫  Raise ticket  (right support.raise_ticket) — takes a screenshot of the current screen,
//                     remembers which screen it was, and opens the ticket form
//   🎧  IT Desk       (right support.it_desk)      — opens the IT team's software
// Tablet / desktop: two small icons. Phone: ONE icon (space is tight); with both rights it opens
// a small menu (the screenshot is taken first, so the menu is not in the picture).
import Icon from '@expo/vector-icons/MaterialIcons';
import { usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import { captureScreen, useTicketDraft } from './capture';

export const SUPPORT_RAISE = 'support.raise_ticket';
export const SUPPORT_IT = 'support.it_desk';

type Props = { size: 'mobile' | 'tablet' | 'desktop'; iconSize: number; btnStyle: any };

/** which Support icons this user sees on this screen (the header uses it to plan its layout) */
export function useSupportRights() {
  const { canAccess } = usePermission();
  const pathname = usePathname() || '';
  const here = pathname.includes('/support') || pathname.includes('/it-desk');
  const raise = !here && canAccess(SUPPORT_RAISE);
  const it = !here && canAccess(SUPPORT_IT);
  return { raise, it, any: raise || it };
}

export function HeaderSupportButtons({ size, iconSize, btnStyle }: Props) {
  const { canAccess } = usePermission();
  const router = useRouter();
  const pathname = usePathname() || '';
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const raise = canAccess(SUPPORT_RAISE);
  const it = canAccess(SUPPORT_IT);
  if (!raise && !it) return null;
  if (pathname.includes('/support') || pathname.includes('/it-desk')) return null;

  const snap = async () => {
    const shot = await captureScreen();
    const draft = useTicketDraft.getState();
    draft.setFrom(pathname);
    if (shot) draft.addShot({ uri: shot.uri, name: `screen-${pathname.split('/').filter(Boolean).pop() || 'home'}.jpg`, from: pathname, width: shot.width, height: shot.height });
    return !!shot;
  };
  const openRaise = async (alreadyShot = false) => {
    if (busy) return;
    setBusy(true);
    try { if (!alreadyShot) await snap(); } finally { setBusy(false); }
    router.push('/new/support?new=1' as any);
  };
  const openIt = () => router.push('/new/it-desk' as any);

  const btn = (icon: string, label: string, onPress: () => void) => (
    <TouchableOpacity key={label} onPress={onPress} style={btnStyle} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={label} disabled={busy}>
      {busy && icon === 'confirmation-number' ? <ActivityIndicator size="small" color="#fff" /> : <Icon name={icon as any} size={iconSize} color="#fff" />}
    </TouchableOpacity>
  );

  if (size !== 'mobile' || !(raise && it)) {
    return (
      <>
        {raise ? btn('confirmation-number', 'Raise a ticket (with a screenshot of this screen)', () => void openRaise()) : null}
        {it ? btn('support-agent', 'IT Desk', openIt) : null}
      </>
    );
  }

  // phone with both rights: one icon + small menu
  return (
    <>
      {btn('support-agent', 'Support', async () => {
        if (busy) return;
        setBusy(true);
        try { await snap(); } finally { setBusy(false); }
        setMenu(true);
      })}
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={s.backdrop} onPress={() => { useTicketDraft.getState().clear(); setMenu(false); }}>
          <View style={s.menu}>
            <Text style={s.head}>SUPPORT</Text>
            <TouchableOpacity style={s.item} onPress={() => { setMenu(false); void openRaise(true); }}>
              <View style={[s.icon, { backgroundColor: `${T.blue}18` }]}><Icon name="confirmation-number" size={20} color={T.blue} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>Raise a ticket</Text>
                <Text style={s.sub}>Screenshot of this screen is attached</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={s.item} onPress={() => { useTicketDraft.getState().clear(); setMenu(false); openIt(); }}>
              <View style={[s.icon, { backgroundColor: `${T.copper}18` }]}><Icon name="support-agent" size={20} color={T.copper} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>IT Desk</Text>
                <Text style={s.sub}>IT team tasks and user tickets</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  // the icon sits on the header's second line on phones -> the menu opens just below it
  backdrop: { flex: 1, backgroundColor: 'rgba(13,27,42,0.4)', alignItems: 'flex-end', paddingTop: 112, paddingRight: 10 },
  menu: { width: 280, backgroundColor: T.surface, borderRadius: 16, padding: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, elevation: 12 },
  head: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, color: T.muted, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '900', color: T.nav },
  sub: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 1 },
});
