// FILE: src/components/OutstandingNEW/FilterSheet.tsx
// Filters of the Receivables / Receivables Sudamo / Payable dashboards.
// Same filters, same selection rules as the legacy CustomDrawer:
//   Internal / External / Both      single
//   Sales Property Group            single   (hidden for the role "Receivables View Combine")
//   Property                        multi    + Select All (of the searched list) + clear
//   Party                           single   + clear
//   Sub Head                        multi    + Select All + clear
//   Sales Executive                 multi    + Select All + clear   (Receivables only)
//   Load
// Every pick is applied at once (as legacy), "Load" requests the dashboard.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { T } from '@/src/theme';
import { Btn, PickField, SearchBox, Segment, Sheet } from '@/src/components/erpUi';
import {
  INTERNAL_OPTIONS,
  InternalOption,
  Row,
  Variant,
  filterParties,
  filterProperties,
  filterSalesExes,
  filterSubHeads,
} from './model';

type View_ = 'filters' | 'group' | 'property' | 'party' | 'subhead' | 'sexe';

/** Rows drawn per "page" of a pick list (legacy lazy-loaded 10 at a time). */
const PAGE = 50;

type Props = {
  open: boolean;
  onClose: () => void;
  variant: Variant;
  /** role "Receivables View Combine": no property-group picker */
  combine: boolean;

  internal: InternalOption;
  onInternal: (o: InternalOption) => void;

  groups: Row[];
  groupsLoading: boolean;
  group: Row | null;
  onGroup: (g: Row | null) => void;

  properties: Row[];
  propertiesLoading: boolean;
  selProperties: Row[];
  onProperties: (rows: Row[]) => void;

  parties: Row[];
  partiesLoading: boolean;
  selParty: Row | null;
  onParty: (row: Row | null) => void;

  subHeads: Row[];
  subHeadsLoading: boolean;
  selSubHeads: Row[];
  onSubHeads: (rows: Row[]) => void;

  salesExes: Row[];
  salesExesLoading: boolean;
  selSalesExes: Row[];
  onSalesExes: (rows: Row[]) => void;

  loading: boolean;
  onLoad: () => void;
};

const countText = (rows: Row[], nameOf: (r: Row) => any, plural: string) =>
  rows.length === 0 ? '' : rows.length === 1 ? String(nameOf(rows[0]) ?? '') : `${rows.length} ${plural} selected`;

export default function FilterSheet(p: Props) {
  const [view, setView] = useState<View_>('filters');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);

  // every time the sheet opens it starts on the filter list
  useEffect(() => {
    if (p.open) setView('filters');
  }, [p.open]);

  const go = (next: View_) => {
    setQuery('');
    setLimit(PAGE);
    setView(next);
  };

  const close = () => {
    if (view !== 'filters') go('filters');
    else p.onClose();
  };

  const title =
    view === 'group' ? 'Sales Property Group'
      : view === 'property' ? 'Property'
        : view === 'party' ? 'Party'
          : view === 'subhead' ? 'Sub Head'
            : view === 'sexe' ? 'Sales Executive'
              : 'Filters';

  /* ---------------- pick list (shared by the 4 list filters) ---------------- */

  type ListCfg = {
    rows: Row[];
    selected: Row[];
    keyOf: (r: Row) => any;
    nameOf: (r: Row) => any;
    codeOf?: (r: Row) => any;
    multi: boolean;
    onChange: (rows: Row[]) => void;
    placeholder: string;
  };

  const cfg: ListCfg | null = useMemo(() => {
    switch (view) {
      case 'property':
        return {
          rows: filterProperties(p.properties, query),
          selected: p.selProperties,
          keyOf: (r) => r.PrpCode,
          nameOf: (r) => r.PrpName,
          multi: true,
          onChange: p.onProperties,
          placeholder: 'Search Property...',
        };
      case 'party':
        return {
          rows: filterParties(p.parties, query),
          selected: p.selParty ? [p.selParty] : [],
          keyOf: (r) => r.acccode,
          nameOf: (r) => r.accname,
          codeOf: (r) => r.acccode,
          multi: false,
          onChange: (rows) => p.onParty(rows[0] || null),
          placeholder: 'Search Party...',
        };
      case 'subhead':
        return {
          rows: filterSubHeads(p.subHeads, query),
          selected: p.selSubHeads,
          keyOf: (r) => r.SHead,
          nameOf: (r) => r.SHName,
          codeOf: (r) => r.SHead,
          multi: true,
          onChange: p.onSubHeads,
          placeholder: 'Search SubHead...',
        };
      case 'sexe':
        return {
          rows: filterSalesExes(p.salesExes, query),
          selected: p.selSalesExes,
          keyOf: (r) => r.Code,
          nameOf: (r) => r.SalesExecutive,
          codeOf: (r) => r.Code,
          multi: true,
          onChange: p.onSalesExes,
          placeholder: 'Search Sales Executive...',
        };
      default:
        return null;
    }
  }, [view, query, p.properties, p.parties, p.subHeads, p.salesExes, p.selProperties, p.selParty, p.selSubHeads, p.selSalesExes]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderList = (c: ListCfg) => {
    const isOn = (r: Row) => c.selected.some((d) => c.keyOf(d) === c.keyOf(r));
    const toggle = (r: Row) => {
      if (!c.multi) {
        c.onChange([r]); // legacy: a tap always replaces the single party
        return;
      }
      c.onChange(isOn(r) ? c.selected.filter((d) => c.keyOf(d) !== c.keyOf(r)) : [...c.selected, r]);
    };
    const shown = c.rows.slice(0, limit);
    return (
      <>
        <SearchBox
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setLimit(PAGE);
          }}
          placeholder={c.placeholder}
        />

        <View style={s.listBar}>
          <Text style={s.listCount}>
            {c.selected.length} selected · {c.rows.length} listed
          </Text>
          {c.multi ? (
            <Btn label="Select All" icon="done-all" kind="soft" compact onPress={() => c.onChange(c.rows)} disabled={c.rows.length === 0} />
          ) : null}
          {c.selected.length > 0 ? <Btn label="Clear" icon="close" kind="ghost" compact onPress={() => c.onChange([])} /> : null}
        </View>

        {c.selected.length > 0 ? (
          <View style={s.selWrap}>
            {c.selected.slice(0, 12).map((r) => (
              <TouchableOpacity
                key={String(c.keyOf(r))}
                style={s.selChip}
                onPress={() => c.onChange(c.selected.filter((d) => c.keyOf(d) !== c.keyOf(r)))}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${c.nameOf(r)}`}
              >
                <Text style={s.selChipText} numberOfLines={1}>{String(c.nameOf(r) ?? '')}</Text>
                <Icon name="close" size={13} color={T.copper} />
              </TouchableOpacity>
            ))}
            {c.selected.length > 12 ? <Text style={s.selMore}>+{c.selected.length - 12} more</Text> : null}
          </View>
        ) : null}

        <View style={s.pickList}>
          {shown.length === 0 ? (
            <Text style={s.none}>Nothing found</Text>
          ) : (
            shown.map((r, i) => {
              const on = isOn(r);
              const code = c.codeOf ? c.codeOf(r) : null;
              return (
                <TouchableOpacity
                  key={`${c.keyOf(r)}-${i}`}
                  style={[s.pickItem, on && s.pickItemOn]}
                  onPress={() => toggle(r)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Icon
                    name={(c.multi ? (on ? 'check-box' : 'check-box-outline-blank') : on ? 'radio-button-checked' : 'radio-button-unchecked') as any}
                    size={20}
                    color={on ? T.copper : T.muted}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.pickText, on && { fontWeight: '800' }]} numberOfLines={2}>{String(c.nameOf(r) ?? '')}</Text>
                    {code !== null && code !== undefined && String(code) !== '' ? <Text style={s.pickCode} numberOfLines={1}>{String(code)}</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {c.rows.length > limit ? (
          <Btn label={`Show more (${c.rows.length - limit} left)`} icon="expand-more" kind="ghost" onPress={() => setLimit((n) => n + PAGE)} />
        ) : null}
      </>
    );
  };

  /* ---------------- render ---------------- */

  return (
    <Sheet
      open={p.open}
      onClose={close}
      eyebrow={p.variant.title.toUpperCase()}
      title={title}
      side
      wideMax={460}
      footer={
        view === 'filters' ? (
          <Btn label="Load" icon="refresh" kind="copper" loading={p.loading} onPress={p.onLoad} style={{ flex: 1 }} />
        ) : (
          <Btn label="Done" icon="check" onPress={() => go('filters')} style={{ flex: 1 }} />
        )
      }
    >
      {view === 'filters' ? (
        <>
          <Segment
            label="Internal / External"
            value={p.internal.value}
            options={INTERNAL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(val) => {
              const next = INTERNAL_OPTIONS.find((o) => o.value === val);
              if (next) p.onInternal(next);
            }}
          />

          {!p.combine ? (
            <PickField
              label="Sales Property Group"
              icon="domain"
              value={p.group?.PrpTypeOf}
              placeholder="Select Property Group"
              loading={p.groupsLoading}
              onPress={() => go('group')}
            />
          ) : null}

          <PickField
            label="Property"
            icon="business"
            value={countText(p.selProperties, (r) => r.PrpName, 'properties')}
            placeholder={p.propertiesLoading ? 'Loading...' : 'All properties'}
            loading={p.propertiesLoading}
            disabled={p.propertiesLoading}
            onPress={() => go('property')}
            onClear={() => p.onProperties([])}
          />

          <PickField
            label="Party"
            icon="person"
            value={p.selParty ? `${p.selParty.accname} (${p.selParty.acccode})` : ''}
            placeholder={p.partiesLoading ? 'Loading...' : 'All parties'}
            loading={p.partiesLoading}
            disabled={p.partiesLoading}
            onPress={() => go('party')}
            onClear={() => p.onParty(null)}
          />

          <PickField
            label="Sub Head"
            icon="account-tree"
            value={countText(p.selSubHeads, (r) => r.SHName, 'sub heads')}
            placeholder={p.subHeadsLoading ? 'Loading...' : 'All sub heads'}
            loading={p.subHeadsLoading}
            disabled={p.subHeadsLoading}
            onPress={() => go('subhead')}
            onClear={() => p.onSubHeads([])}
          />

          {p.variant.salesExecutiveFilter ? (
            <PickField
              label="Sales Executive"
              icon="badge"
              value={countText(p.selSalesExes, (r) => r.SalesExecutive, 'sales executives')}
              placeholder={p.salesExesLoading ? 'Loading...' : 'All sales executives'}
              loading={p.salesExesLoading}
              disabled={p.salesExesLoading}
              onPress={() => go('sexe')}
              onClear={() => p.onSalesExes([])}
            />
          ) : null}

          <View style={s.note}>
            <Icon name="info-outline" size={15} color={T.muted} />
            <Text style={s.noteText}>Choose the filters, then press Load.</Text>
          </View>
        </>
      ) : null}

      {view === 'group' ? (
        p.groupsLoading ? (
          <ActivityIndicator color={T.copper} style={{ marginVertical: 24 }} />
        ) : (
          <View style={s.pickList}>
            {p.groups.length === 0 ? <Text style={s.none}>No property group found</Text> : null}
            {p.groups.map((g) => {
              const on = p.group?.PrpTypeCode === g.PrpTypeCode;
              return (
                <TouchableOpacity
                  key={String(g.PrpTypeCode)}
                  style={[s.pickItem, on && s.pickItemOn]}
                  onPress={() => {
                    p.onGroup(g);
                    go('filters');
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Icon name={(on ? 'radio-button-checked' : 'radio-button-unchecked') as any} size={20} color={on ? T.copper : T.muted} />
                  <Text style={[s.pickText, { flex: 1 }, on && { fontWeight: '800' }]} numberOfLines={2}>{String(g.PrpTypeOf ?? '')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )
      ) : null}

      {cfg ? renderList(cfg) : null}
    </Sheet>
  );
}

const s = StyleSheet.create({
  listBar: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  listCount: { flex: 1, minWidth: 120, fontSize: 11.5, fontWeight: '700', color: T.muted },
  selWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  selChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: `${T.copper}14`,
    borderWidth: 1,
    borderColor: `${T.copper}40`,
  },
  selChipText: { fontSize: 11.5, fontWeight: '700', color: T.copper, flexShrink: 1, maxWidth: 220 },
  selMore: { fontSize: 11.5, fontWeight: '700', color: T.muted },
  pickList: { borderWidth: 1, borderColor: T.border, borderRadius: 12, overflow: 'hidden', backgroundColor: T.surface },
  pickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: T.hair,
  },
  pickItemOn: { backgroundColor: `${T.copper}0F` },
  pickText: { fontSize: 13.5, fontWeight: '600', color: T.ink },
  pickCode: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
  none: { padding: 18, textAlign: 'center', color: T.muted, fontSize: 13, fontWeight: '600' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteText: { flex: 1, fontSize: 11.5, fontWeight: '600', color: T.muted },
});
