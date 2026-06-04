import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {colors, fontSize, radius, spacing} from '../utils/theme';
import {InquiryShade} from '../types';
import {shadesApi} from '../services/shadesApi';

interface Props {
  shades: InquiryShade[];
  onChange: (shades: InquiryShade[]) => void;
  showStock?: boolean;
}

const ShadesSection: React.FC<Props> = ({shades, onChange, showStock = true}) => {
  const [loadingStock, setLoadingStock] = useState<Record<number, boolean>>({});

  const update = (idx: number, patch: Partial<InquiryShade>) => {
    const next = shades.map((s, i) => (i === idx ? {...s, ...patch} : s));
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(shades.filter((_, i) => i !== idx));
  };

  const add = () => {
    onChange([
      ...shades,
      {
        shade_name: '',
        quantity: 0,
        rate: null,
        stock_qty: null,
        stock_status: 'unknown',
      },
    ]);
  };

  const fetchStock = useCallback(
    async (idx: number, name: string) => {
      if (!name.trim()) return;
      setLoadingStock(prev => ({...prev, [idx]: true}));
      try {
        const stock = await shadesApi.stock(name.trim());
        const status =
          stock.stock_qty <= 0
            ? 'out'
            : stock.stock_qty < (shades[idx].quantity || 0)
            ? 'low'
            : 'sufficient';
        update(idx, {
          stock_qty: stock.stock_qty,
          stock_status: status as InquiryShade['stock_status'],
        });
      } catch {
        update(idx, {stock_qty: null, stock_status: 'unknown'});
      } finally {
        setLoadingStock(prev => ({...prev, [idx]: false}));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shades],
  );

  // Totals
  const totalQty = shades.reduce((s, sh) => s + (sh.quantity || 0), 0);
  const avgRate = (() => {
    let totalValue = 0;
    let qty = 0;
    shades.forEach(sh => {
      const q = sh.quantity || 0;
      const r = sh.rate || 0;
      qty += q;
      totalValue += q * r;
    });
    return qty > 0 ? Math.round((totalValue / qty) * 100) / 100 : 0;
  })();

  const stockColor = (status?: string) => {
    switch (status) {
      case 'sufficient':
        return {fg: colors.success, bg: colors.successBg};
      case 'low':
        return {fg: colors.warning, bg: colors.warningBg};
      case 'out':
        return {fg: colors.danger, bg: colors.dangerBg};
      default:
        return {fg: colors.textSecondary, bg: colors.bgSecondary};
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>Shades</Text>
        <TouchableOpacity onPress={add}>
          <Text style={styles.addText}>+ Add shade</Text>
        </TouchableOpacity>
      </View>

      {shades.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No shades added. Tap "+ Add shade" to start.
          </Text>
        </View>
      ) : (
        shades.map((shade, idx) => {
          const sc = stockColor(shade.stock_status);
          return (
            <View key={idx} style={styles.row}>
              <View style={styles.rowHead}>
                <Text style={styles.rowLabel}>Shade #{idx + 1}</Text>
                <TouchableOpacity onPress={() => remove(idx)}>
                  <Text style={styles.removeText}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputs}>
                <View style={{flex: 2}}>
                  <Text style={styles.lbl}>Shade name *</Text>
                  <TextInput
                    value={shade.shade_name}
                    onChangeText={t => update(idx, {shade_name: t})}
                    onBlur={() => {
                      if (showStock && shade.shade_name) {
                        fetchStock(idx, shade.shade_name);
                      }
                    }}
                    placeholder="e.g., Black"
                    placeholderTextColor={colors.textTertiary}
                    style={styles.input}
                  />
                  {showStock ? (
                    <View style={[styles.stock, {backgroundColor: sc.bg}]}>
                      {loadingStock[idx] ? (
                        <ActivityIndicator size="small" color={sc.fg} />
                      ) : shade.stock_qty !== null && shade.stock_qty !== undefined ? (
                        <Text style={[styles.stockText, {color: sc.fg}]}>
                          📦 Stock: {shade.stock_qty} kg
                          {shade.stock_status === 'out' ? ' (out)' : ''}
                          {shade.stock_status === 'low' ? ' (low)' : ''}
                        </Text>
                      ) : (
                        <Text style={[styles.stockText, {color: sc.fg}]}>
                          Tap field to fetch stock
                        </Text>
                      )}
                    </View>
                  ) : null}
                </View>

                <View style={{flex: 1}}>
                  <Text style={styles.lbl}>Qty *</Text>
                  <TextInput
                    value={shade.quantity ? String(shade.quantity) : ''}
                    onChangeText={t =>
                      update(idx, {quantity: parseFloat(t) || 0})
                    }
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    style={styles.input}
                  />
                </View>

                <View style={{flex: 1}}>
                  <Text style={styles.lbl}>Rate</Text>
                  <TextInput
                    value={shade.rate ? String(shade.rate) : ''}
                    onChangeText={t =>
                      update(idx, {rate: t ? parseFloat(t) : null})
                    }
                    keyboardType="decimal-pad"
                    placeholder="optional"
                    placeholderTextColor={colors.textTertiary}
                    style={styles.input}
                  />
                </View>
              </View>
            </View>
          );
        })
      )}

      {shades.length > 0 ? (
        <View style={styles.totals}>
          <Text style={styles.totalLine}>
            Total qty: <Text style={styles.totalVal}>{totalQty}</Text>
          </Text>
          {avgRate > 0 ? (
            <Text style={styles.totalLine}>
              Avg rate: <Text style={styles.totalVal}>₹ {avgRate}</Text>
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {fontSize: fontSize.md, fontWeight: '500'},
  addText: {color: colors.info, fontSize: fontSize.sm, fontWeight: '500'},
  empty: {
    padding: spacing.md,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  emptyText: {fontSize: fontSize.sm, color: colors.textSecondary},
  row: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  rowHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rowLabel: {fontSize: fontSize.xs, color: colors.textSecondary},
  removeText: {color: colors.danger, fontSize: 18, fontWeight: '500'},
  inputs: {flexDirection: 'row', gap: 6, alignItems: 'flex-start'},
  lbl: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  input: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  stock: {
    padding: 5,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  stockText: {fontSize: 10, fontWeight: '500'},
  totals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderTopStyle: 'dashed' as any,
  },
  totalLine: {fontSize: fontSize.sm, color: colors.textSecondary},
  totalVal: {color: colors.textPrimary, fontWeight: '500'},
});

export default ShadesSection;
