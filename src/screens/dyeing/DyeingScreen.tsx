// FILE: src/screens/dyeing/DyeingScreen.tsx
// "Dyeing" module (formerly the "Priority" tab). Route stays `priority`
// and the root permission key stays `priority` so every user who already
// has Priority rights keeps them — only the display name changed.
//
// Three tabs, each gated by its own right (see priority.permission.ts):
//   priority.chart_priority  -> Priority      (view / edit / save / status / lot)
//   priority.daily_update    -> Daily Update  (view)
//   priority.mill_hub        -> Mill Hub      (view)
//
// Backward compatibility: a user who has only the old root `priority`
// grant (and no tab rights assigned yet) still gets the Priority tab with
// the old root actions (edit = reorder, save = save priority AND status).
// As soon as an admin assigns any tab right, the tab rights take over.

import { usePermission } from '@/src/core/permissions';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PriorityScreen, PriorityPerms } from '../priority/PriorityScreen';
import { DailyUpdateTab } from './DailyUpdateTab';
import { DyeingGuide, GuideSection, useFirstVisitGuide } from './DyeingGuide';
import { MillHubTab } from './MillHubTab';

export const DYEING_ROOT = 'priority';
export const DYEING_TABS = {
  priority: `${DYEING_ROOT}.chart_priority`,
  daily: `${DYEING_ROOT}.daily_update`,
  millHub: `${DYEING_ROOT}.mill_hub`,
} as const;

type TabId = keyof typeof DYEING_TABS;

const TAB_META: { id: TabId; label: string; icon: any }[] = [
  { id: 'priority', label: 'Priority', icon: 'low-priority' },
  { id: 'daily', label: 'Daily Update', icon: 'today' },
  { id: 'millHub', label: 'Mill Hub', icon: 'local-shipping' },
];

export function DyeingScreen() {
  const { canAccess, canDo } = usePermission();

  const access = useMemo(() => ({
    priority: canAccess(DYEING_TABS.priority),
    daily: canAccess(DYEING_TABS.daily),
    millHub: canAccess(DYEING_TABS.millHub),
  }), [canAccess]);

  // Legacy mode = root granted but no tab rights assigned yet.
  const legacy = !access.priority && !access.daily && !access.millHub && canAccess(DYEING_ROOT);

  const priorityPerms: PriorityPerms = useMemo(() => {
    if (legacy) {
      return {
        canEdit: canDo(DYEING_ROOT, 'edit'),
        canSave: canDo(DYEING_ROOT, 'save'),
        canStatus: canDo(DYEING_ROOT, 'save'),
        canLot: canDo(DYEING_ROOT, 'save'),
      };
    }
    return {
      canEdit: canDo(DYEING_TABS.priority, 'edit'),
      canSave: canDo(DYEING_TABS.priority, 'save'),
      canStatus: canDo(DYEING_TABS.priority, 'status'),
      canLot: canDo(DYEING_TABS.priority, 'lot'),
    };
  }, [legacy, canDo]);

  const visibleTabs = TAB_META.filter((t) => (legacy ? t.id === 'priority' : access[t.id]));
  const [activeTab, setActiveTab] = useState<TabId>(visibleTabs[0]?.id ?? 'priority');
  const current = visibleTabs.some((t) => t.id === activeTab) ? activeTab : visibleTabs[0]?.id;

  // Guide: "Guide" button on the tab bar (opens on the current tab) + opens
  // by itself the first time Dyeing is visited on this device.
  const firstVisit = useFirstVisitGuide();
  const [guideOpen, setGuideOpen] = useState(false);
  const guideSection: GuideSection = current === 'daily' ? 'daily' : current === 'millHub' ? 'millHub' : 'priority';
  const closeGuide = () => { setGuideOpen(false); if (firstVisit.show) firstVisit.dismiss(); };

  if (!current) {
    return (
      <View style={s.center}>
        <Icon name="lock-outline" size={28} color={T.muted} />
        <Text style={s.emptyTitle}>No Dyeing tabs assigned</Text>
        <Text style={s.emptyText}>Ask an admin to assign Priority, Daily Update or Mill Hub rights.</Text>
      </View>
    );
  }

  return (
    <View style={s.flex}>
      <View style={s.tabBar}>
        {visibleTabs.map((t) => {
          const on = current === t.id;
          return (
            <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id)} style={[s.tabBtn, on && s.tabBtnOn]} activeOpacity={0.7}>
              <Icon name={t.icon} size={14} color={on ? '#fff' : 'rgba(255,255,255,0.6)'} />
              <Text style={[s.tabBtnText, on && s.tabBtnTextOn]} numberOfLines={1}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={() => setGuideOpen(true)}
          style={s.guideBtn}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Open the Dyeing guide"
        >
          <Icon name="help-outline" size={15} color="#fff" />
          <Text style={s.guideText}>Guide</Text>
        </TouchableOpacity>
      </View>

      <View style={s.flex}>
        {current === 'priority' && <PriorityScreen perms={priorityPerms} />}
        {current === 'daily' && <DailyUpdateTab />}
        {current === 'millHub' && <MillHubTab />}
      </View>

      <DyeingGuide visible={guideOpen || firstVisit.show} section={guideSection} onClose={closeGuide} />
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: T.bg },
  tabBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.nav, paddingHorizontal: 6 },
  guideBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4, paddingHorizontal: 10, height: 28,
    borderRadius: 14, backgroundColor: 'rgba(200,117,51,0.35)', borderWidth: 1, borderColor: 'rgba(200,117,51,0.7)',
  },
  guideText: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnOn: { borderBottomColor: T.copper },
  tabBtnText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  tabBtnTextOn: { color: '#fff', fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: T.bg },
  emptyTitle: { marginTop: 10, fontSize: 15, fontWeight: '900', color: T.ink },
  emptyText: { marginTop: 4, fontSize: 13, textAlign: 'center', color: T.muted },
});
