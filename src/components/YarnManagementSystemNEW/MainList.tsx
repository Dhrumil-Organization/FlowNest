// FILE: src/components/YarnManagementSystemNEW/MainList.tsx
// LIST step: Spun / Filament tabs, "search all fields", add button and the main yarn item cards
// (legacy SpunTab / FilamentTab list halves + the tab bar and search box of the root screen).
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Btn, EmptyState, SearchBox, Segment } from '../erpUi';
import { Row, YarnTab } from './model';
import { ListSkeleton, useCols, y } from './ui';

const TAB_OPTS: { value: YarnTab; label: string }[] = [
  { value: 'Spun', label: 'Spun' },
  { value: 'Filaments', label: 'Filament' },
];

type Props = {
  activeTab: YarnTab;
  onTab: (tab: YarnTab) => void;
  search: string;
  onSearch: (text: string) => void;
  /** Already filtered rows (model.filterMainItems). */
  rows: Row[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onAdd: () => void;
  onMenu: (item: Row) => void;
};

function MainItemCard({ item, onMenu }: { item: Row; onMenu: (item: Row) => void }) {
  const tone = item.WYarnType == '1' ? T.yd : T.purple;
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <Text style={s.title} numberOfLines={2}>
          {item.WNameCode}
        </Text>
        <View style={[s.badge, { backgroundColor: `${tone}14`, borderColor: `${tone}40` }]}>
          <Text style={[s.badgeText, { color: tone }]} numberOfLines={1}>
            {item.mitmcode}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => onMenu(item)}
          style={s.menuBtn}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel="Item actions"
        >
          <Icon name="more-vert" size={22} color={T.nav} />
        </TouchableOpacity>
      </View>
      <View style={s.divider} />
      <View style={s.infoRow}>
        <Text style={s.infoKey}>Blend</Text>
        <Text style={s.infoVal} numberOfLines={2}>
          {item.BlendNames}
        </Text>
      </View>
      <View style={s.infoRow}>
        <Text style={s.infoKey}>Ply</Text>
        <Text style={s.infoVal} numberOfLines={1}>
          {item.WPly}
        </Text>
      </View>
      <View style={s.infoRow}>
        <Text style={s.infoKey}>Other</Text>
        <Text style={s.infoVal} numberOfLines={2}>
          {item.WOther}
        </Text>
      </View>
    </View>
  );
}

export default function MainList({
  activeTab,
  onTab,
  search,
  onSearch,
  rows,
  loading,
  refreshing,
  onRefresh,
  onAdd,
  onMenu,
}: Props) {
  const { cols, isPhone } = useCols();
  const addLabel = activeTab === 'Spun' ? 'Add Spun Main Item' : 'Add Filament Main Item';

  return (
    <View style={y.root}>
      <View style={s.toolbar}>
        <View style={[s.toolbarInner, isPhone && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={isPhone ? undefined : { width: 260 }}>
            <Segment value={activeTab} options={TAB_OPTS} onChange={onTab} />
          </View>
          <SearchBox
            value={search}
            onChangeText={onSearch}
            placeholder="Search all fields..."
            style={isPhone ? undefined : { flex: 1, minWidth: 0 }}
          />
          <Btn label={addLabel} icon="add" kind="copper" onPress={onAdd} />
        </View>
      </View>

      <FlatList
        key={`cols-${cols}`}
        data={loading ? [] : rows}
        numColumns={cols}
        keyExtractor={(item: Row, index: number) => String(item?.id || index)}
        columnWrapperStyle={cols > 1 ? { gap: 10 } : undefined}
        contentContainerStyle={y.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.copper]} tintColor={T.copper} />
        }
        ListEmptyComponent={
          loading ? (
            <ListSkeleton />
          ) : (
            <EmptyState icon="inventory-2" title="No items yet.." text="Add one to get started!" />
          )
        }
        renderItem={({ item }: { item: Row }) => (
          <View style={{ flex: 1 / cols, marginBottom: 10, minWidth: 0 }}>
            <MainItemCard item={item} onMenu={onMenu} />
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  toolbar: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  toolbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 13,
    ...S.card,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: '900', color: T.nav, lineHeight: 20 },
  badge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 120 },
  badgeText: { fontSize: 11.5, fontWeight: '800' },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.alt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: T.hair, marginVertical: 10 },
  infoRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  infoKey: {
    width: 52,
    fontSize: 10.5,
    fontWeight: '800',
    color: T.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  infoVal: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '700', color: T.ink },
});
