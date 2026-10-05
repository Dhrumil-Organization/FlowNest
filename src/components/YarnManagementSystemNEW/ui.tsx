// FILE: src/components/YarnManagementSystemNEW/ui.tsx
// Presentation-only building blocks of the NEW Yarn Management System: searchable single /
// multi select fields (replacing legacy Shared/PartyDropdown + PartyDropdownYarn), the action
// sheet, list skeleton, form intro, sticky footer bar and shared styles. No API / business rules.
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { PickField, Sheet } from '../erpUi';
import SearchableMultiSelectModal from '../ui/SearchableMultiSelectModal';
import SearchablePickerModal from '../ui/SearchablePickerModal';
import { labelOf, Row } from './model';

/** phone < 768 → 1 column, tablet → 2, desktop (>= 1180) → 3. */
export function useCols() {
  const { width } = useWindowDimensions();
  const cols = width >= 1180 ? 3 : width >= 768 ? 2 : 1;
  return { width, cols, isPhone: width < 768 };
}

const valueOf = (row: Row | null | undefined, valueKey: string) => String(row?.[valueKey] ?? '');

/** Single-select field: tap → searchable list; returns the picked master row. */
export function SelectOne({
  label,
  required,
  placeholder,
  title,
  data,
  labelKeys,
  valueKey = 'id',
  value,
  selectedValue,
  onSelect,
  disabled,
  style,
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  title?: string;
  data: Row[];
  labelKeys: string[];
  valueKey?: string;
  /** Text shown in the field. */
  value: string;
  selectedValue?: any;
  onSelect: (item: Row) => void;
  disabled?: boolean;
  style?: any;
}) {
  const [open, setOpen] = useState(false);
  const options = useMemo(
    () =>
      (Array.isArray(data) ? data : []).map((row) => ({
        value: valueOf(row, valueKey),
        label: labelOf(row, labelKeys),
      })),
    [data, labelKeys.join('|'), valueKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return (
    <>
      <PickField
        label={label}
        required={required}
        value={value}
        placeholder={placeholder}
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={style}
      />
      <SearchablePickerModal
        visible={open}
        title={title || label}
        options={options}
        selectedValue={String(selectedValue ?? '')}
        onClose={() => setOpen(false)}
        onSelect={(option) => {
          const item = (Array.isArray(data) ? data : []).find((row) => valueOf(row, valueKey) === String(option.value));
          if (item) onSelect(item);
        }}
      />
    </>
  );
}

/** Multi-select field: tap → searchable check list; returns the picked master rows in the
 *  order they were ticked (the order drives the blend code "11/10" and the item name). */
export function SelectMany({
  label,
  required,
  placeholder,
  title,
  data,
  labelKeys,
  valueKey = 'id',
  selected,
  onSelect,
  style,
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  title?: string;
  data: Row[];
  labelKeys: string[];
  valueKey?: string;
  /** Currently selected rows ({id, name}); rows missing from `data` are kept as they are. */
  selected: Row[];
  onSelect: (items: Row[]) => void;
  style?: any;
}) {
  const [open, setOpen] = useState(false);
  const list = Array.isArray(data) ? data : [];
  const options = useMemo(() => {
    const base = list.map((row) => ({ value: valueOf(row, valueKey), label: labelOf(row, labelKeys) }));
    const known = new Set(base.map((o) => o.value));
    const extra = (selected || [])
      .filter((row) => !known.has(valueOf(row, valueKey)))
      .map((row) => ({ value: valueOf(row, valueKey), label: labelOf(row, labelKeys) }));
    return [...extra, ...base];
  }, [data, selected, labelKeys.join('|'), valueKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedValues = useMemo(() => (selected || []).map((row) => valueOf(row, valueKey)), [selected, valueKey]);
  const text = (selected || []).map((row) => String(row?.[labelKeys[0]] ?? '')).filter(Boolean).join(', ');
  return (
    <>
      <PickField
        label={label}
        required={required}
        value={text}
        placeholder={placeholder}
        onPress={() => setOpen(true)}
        style={style}
      />
      <SearchableMultiSelectModal
        visible={open}
        title={title || label}
        options={options}
        selectedValues={selectedValues}
        onClose={() => setOpen(false)}
        onApply={(values) => {
          setOpen(false);
          const items = (values || [])
            .map(
              (v) =>
                list.find((row) => valueOf(row, valueKey) === String(v)) ||
                (selected || []).find((row) => valueOf(row, valueKey) === String(v)),
            )
            .filter(Boolean) as Row[];
          onSelect(items);
        }}
      />
    </>
  );
}

export type SheetAction = { icon: string; label: string; onPress: () => void; danger?: boolean };

/** Bottom sheet (phone) / dialog (wide) listing the actions of one card. */
export function ActionSheet({
  open,
  onClose,
  title,
  subtitle,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  actions: SheetAction[];
}) {
  return (
    <Sheet open={open} onClose={onClose} eyebrow="YARN" title={title} wideMax={460}>
      {subtitle ? (
        <Text style={y.sheetSub} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      <View style={y.actionList}>
        {actions.map((a, i) => {
          const c = a.danger ? T.red : T.nav;
          return (
            <TouchableOpacity
              key={a.label}
              activeOpacity={0.75}
              onPress={a.onPress}
              style={[y.actionRow, i > 0 && { borderTopWidth: 1, borderTopColor: T.hair }]}
              accessibilityRole="button"
              accessibilityLabel={a.label}
            >
              <View style={[y.actionIcon, { backgroundColor: a.danger ? `${T.red}14` : `${T.copper}14` }]}>
                <Icon name={a.icon as any} size={20} color={a.danger ? T.red : T.copper} />
              </View>
              <Text style={[y.actionLabel, { color: c }]} numberOfLines={1}>
                {a.label}
              </Text>
              <Icon name="chevron-right" size={20} color={T.muted} />
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={y.actionCancel} accessibilityRole="button">
        <Text style={y.actionCancelText}>Cancel</Text>
      </TouchableOpacity>
    </Sheet>
  );
}

/** Placeholder cards shown while a list is loading. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={y.skelCard}>
          <View style={y.skelIcon} />
          <View style={{ flex: 1, gap: 9 }}>
            <View style={[y.skelLine, { width: '70%', height: 15 }]} />
            <View style={[y.skelLine, { width: '34%' }]} />
          </View>
          <View style={y.skelDot} />
        </View>
      ))}
    </View>
  );
}

/** Placeholder form shown while a form is loading its item. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <View style={[y.card, { gap: 18 }]}>
      {Array.from({ length: fields }).map((_, i) => (
        <View key={i} style={{ gap: 8 }}>
          <View style={[y.skelLine, { width: i % 2 ? '30%' : '38%' }]} />
          <View style={[y.skelLine, { width: '100%', height: 44, borderRadius: 10 }]} />
        </View>
      ))}
    </View>
  );
}

/** Tinted intro strip at the top of a form. */
export function FormIntro({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <View style={y.intro}>
      <View style={y.introIcon}>
        <Icon name={icon as any} size={21} color={T.copper} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={y.introTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={y.introText} numberOfLines={2}>
          {text}
        </Text>
      </View>
    </View>
  );
}

/** Code chip + name of the parent (main) item shown above a sub item list. */
export function ParentCard({ code, name }: { code: string; name: string }) {
  return (
    <View style={y.parent}>
      <Text style={y.codeChip} numberOfLines={1}>
        {code}
      </Text>
      <Text style={y.parentName} numberOfLines={2}>
        {name}
      </Text>
    </View>
  );
}

/** Bottom action bar of a step (buttons right-aligned, wraps on phone). */
export function FooterBar({ children }: { children: React.ReactNode }) {
  return (
    <View style={y.footer}>
      <View style={y.footerInner}>{children}</View>
    </View>
  );
}

export const y = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { padding: 12, paddingBottom: 28, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  formContent: { padding: 12, paddingBottom: 28, width: '100%', maxWidth: 920, alignSelf: 'center', gap: 12 },
  card: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    ...S.card,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  formTitle: { fontSize: 12, fontWeight: '900', color: T.nav, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },

  // action sheet
  sheetSub: { fontSize: 13, fontWeight: '700', color: T.ink },
  actionList: { borderWidth: 1, borderColor: T.border, borderRadius: 12, overflow: 'hidden', backgroundColor: T.surface },
  actionRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  actionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: '800' },
  actionCancel: {
    minHeight: 46,
    borderRadius: 11,
    backgroundColor: T.alt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCancelText: { fontSize: 14, fontWeight: '800', color: T.nav },

  // skeleton
  skelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    minHeight: 84,
  },
  skelIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: T.alt },
  skelLine: { height: 12, borderRadius: 6, backgroundColor: T.alt },
  skelDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.alt },

  // intro
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 14,
    backgroundColor: `${T.copper}12`,
    borderWidth: 1,
    borderColor: `${T.copper}33`,
  },
  introIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: { fontSize: 15, fontWeight: '900', color: T.nav },
  introText: { fontSize: 12.5, fontWeight: '600', color: T.muted, marginTop: 2, lineHeight: 17 },

  // parent card
  parent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    borderRadius: 14,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  codeChip: {
    backgroundColor: `${T.yd}14`,
    color: T.yd,
    fontWeight: '800',
    fontSize: 12.5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
    maxWidth: 160,
  },
  parentName: { flex: 1, minWidth: 0, color: T.ink, fontSize: 14.5, fontWeight: '800' },

  // footer
  footer: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  footerInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },

  // list head
  listHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 10 },
  countPill: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${T.yd}14`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: { color: T.yd, fontWeight: '900', fontSize: 12 },

  // sub item card
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 13,
    ...S.card,
  },
  subIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: `${T.copper}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subName: { color: T.ink, fontSize: 14, fontWeight: '800', lineHeight: 20 },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.alt,
  },
});
