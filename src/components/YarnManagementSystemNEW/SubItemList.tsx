// FILE: src/components/YarnManagementSystemNEW/SubItemList.tsx
// Sub item list of one main item. Two legacy screens share this layout:
//   mode 'manage' — SUB_ITEM / LIST (legacy SubItemCreateTab list): ⋮ menu per row + "Create New Sub Item"
//   mode 'browse' — BROWSE (legacy BrowseTab): + per row opens the party mapping + "Close"
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { Btn, EmptyState, PanelHeader } from '../erpUi';
import { Row } from './model';
import { FooterBar, ListSkeleton, ParentCard, useCols, y } from './ui';

type Props = {
  mode: 'manage' | 'browse';
  parent: Row | null;
  rows: Row[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onBack: () => void;
  /** manage: open the row's action menu · browse: open the party mapping of the row. */
  onRowAction: (item: Row) => void;
  /** manage: "Create New Sub Item" · browse: "Close". */
  onFooter: () => void;
};

export default function SubItemList({
  mode,
  parent,
  rows,
  loading,
  refreshing,
  onRefresh,
  onBack,
  onRowAction,
  onFooter,
}: Props) {
  const { cols } = useCols();
  const manage = mode === 'manage';
  const list = Array.isArray(rows) ? rows : [];

  const header = (
    <View>
      <ParentCard code={parent?.itmcode || '-'} name={parent?.WNameCode || '-'} />
      <View style={y.listHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: T.nav }} numberOfLines={1}>
            {manage ? 'Sub Item List' : 'Sub Items'}
          </Text>
          {manage ? (
            <Text style={{ fontSize: 12, fontWeight: '600', color: T.muted, marginTop: 1 }} numberOfLines={1}>
              Existing sub items
            </Text>
          ) : null}
        </View>
        <View style={y.countPill}>
          <Text style={y.countText}>{list.length || 0}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={y.root}>
      <PanelHeader
        onBack={onBack}
        title={manage ? 'Sub Items' : 'Sub Item List'}
        subtitle={manage ? 'Manage sub items for the selected yarn' : 'Select a sub item to manage party mapping'}
      />

      <FlatList
        key={`cols-${cols}`}
        data={loading ? [] : list}
        numColumns={cols}
        keyExtractor={(item: Row, index: number) => String(item?.itmcode || index)}
        columnWrapperStyle={cols > 1 ? { gap: 10 } : undefined}
        contentContainerStyle={y.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.copper]} tintColor={T.copper} />
        }
        ListEmptyComponent={
          loading ? (
            <ListSkeleton />
          ) : (
            <EmptyState
              icon="inventory-2"
              title="No sub items found"
              text={manage ? 'Create a new sub item to get started.' : 'Create a sub item first, then it will appear here.'}
            />
          )
        }
        renderItem={({ item }: { item: Row }) => (
          <View style={{ flex: 1 / cols, marginBottom: 10, minWidth: 0 }}>
            <View style={[y.subCard, { flex: 1 }]}>
              <View style={y.subIcon}>
                <Icon name="inventory-2" size={21} color={T.copper} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={y.subName}>
                  {manage ? item?.WNameCode || item?.itmname || '-' : item?.WNameCode || '-'}
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 6 }}>
                  <Text style={y.codeChip} numberOfLines={1}>
                    {item?.itmcode || '-'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => onRowAction(item)}
                style={[y.roundBtn, !manage && { backgroundColor: T.nav }]}
                accessibilityRole="button"
                accessibilityLabel={manage ? 'Sub item actions' : 'Party mapping'}
              >
                <Icon name={manage ? 'more-vert' : 'add'} size={24} color={manage ? T.nav : '#fff'} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <FooterBar>
        {manage ? (
          <Btn label="Create New Sub Item" icon="add" kind="copper" onPress={onFooter} />
        ) : (
          <Btn label="Close" icon="close" kind="ghost" onPress={onFooter} />
        )}
      </FooterBar>
    </View>
  );
}
