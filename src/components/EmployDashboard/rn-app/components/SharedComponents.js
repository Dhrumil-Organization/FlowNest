// components/SharedComponents.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useDashboardResponsive } from './responsive';

export const COLORS = {
  bg: '#F0F2F5',
  card: '#FFFFFF',
  primary: '#1A2B4A',
  teal: '#00B8A9',
  green: '#4CAF50',
  orange: '#FF9800',
  red: '#F44336',
  blue: '#2196F3',
  purple: '#9C27B0',
  textDark: '#1A2B4A',
  textMid: '#546E7A',
  textLight: '#90A4AE',
  border: '#E8EDF2',
  salesBg: '#1A2B4A', // dark navy for SALES header
  prodBg: '#5B4FCF', // purple for PRODUCTION header
  collBg: '#1B6B5A', // dark teal for COLLECTION header
  outsBg: '#B05000', // dark orange for OUTSTANDING header
};

// ─── Section Card ────────────────────────────────────────────────────────────
export const SectionCard = ({ children, style }) => {
  const { isDesktop, isTablet } = useDashboardResponsive();
  return (
    <View
      style={[
        styles.sectionCard,
        isDesktop && styles.sectionCardDesktop,
        isTablet && styles.sectionCardTablet,
        style,
      ]}
    >
      {children}
    </View>
  );
};

// ─── Section Header (colored band) ───────────────────────────────────────────
export const SectionHeader = ({
  icon,
  title,
  subtitle,
  bgColor,
  rightText,
}) => {
  const { isDesktop, isTablet } = useDashboardResponsive();
  return (
    <View
      style={[
        styles.sectionHeader,
        isDesktop && styles.sectionHeaderDesktop,
        isTablet && styles.sectionHeaderTablet,
        { backgroundColor: bgColor || COLORS.primary },
      ]}
    >
      <View style={styles.sectionHeaderLeft}>
        <Text style={[styles.sectionHeaderIcon, (isDesktop || isTablet) && styles.sectionHeaderIconWide]}>{icon} </Text>
        <Text style={[styles.sectionHeaderTitle, isDesktop && styles.sectionHeaderTitleDesktop]}>{title}</Text>
      </View>
      {subtitle ? <Text style={styles.sectionHeaderSub}>{subtitle}</Text> : null}
      {rightText ? (
        <Text style={styles.sectionHeaderRight}>{rightText}</Text>
      ) : null}
    </View>
  );
};

// ─── Two-column total row ─────────────────────────────────────────────────────
// export const TotalRow = ({
//   leftLabel,
//   leftValue,
//   rightLabel,
//   rightValue,
//   tealLeft,
// }) => (
//   <View style={styles.totalRow}>
//     <View style={styles.totalSide}>
//       <Text style={styles.totalLabel}>{leftLabel}</Text>
//       <Text style={[styles.totalValue, tealLeft && { color: COLORS.teal }]}>
//         {leftValue}
//       </Text>
//     </View>
//     <View style={[styles.totalSide, styles.totalSideRight]}>
//       <Text style={styles.totalLabel}>{rightLabel}</Text>
//       <Text style={styles.totalValue}>{rightValue}</Text>
//     </View>
//   </View>
// );

// ─── Two-column total row ─────────────────────────────────────────────────────
export const TotalRow = ({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  tealLeft,
  rawLeftValue,
  rawRightValue,
  tooltipPrefix,
}) => {
  const { isDesktop, isTablet } = useDashboardResponsive();
  return (
  <View style={[styles.totalRow, isDesktop && styles.totalRowDesktop, isTablet && styles.totalRowTablet]}>
    <View style={styles.totalSide}>
      <Text style={styles.totalLabel}>{leftLabel}</Text>
      {rawLeftValue != null ? (
        <LongPressValue
          rawValue={rawLeftValue}
          formattedValue={leftValue}
          style={[styles.totalValue, tealLeft && { color: COLORS.teal }]}
          prefix={tooltipPrefix}
        />
      ) : (
        <Text style={[styles.totalValue, tealLeft && { color: COLORS.teal }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
          {leftValue}
        </Text>
      )}
    </View>
    <View style={[styles.totalSide, styles.totalSideRight]}>
      <Text style={styles.totalLabel}>{rightLabel}</Text>
      {rawRightValue != null ? (
        <LongPressValue
          rawValue={rawRightValue}
          formattedValue={rightValue}
          style={styles.totalValue}
          prefix={tooltipPrefix}
        />
      ) : (
        <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{rightValue}</Text>
      )}
    </View>
  </View>
  );
};

// ─── Rank row (with optional avatar) ─────────────────────────────────────────
export const RankRow = ({
  rank,
  name,
  avatarColor,
  leftVal,
  rightVal,
  onPress,
  trendUp,
  noBorder,
  rawLeftVal,
  rawRightVal,
}) => {
  const { isDesktop, isTablet, isMobile } = useDashboardResponsive();

  return (
    <TouchableOpacity
      style={[
        styles.rankRow,
        isDesktop && styles.rankRowDesktop,
        isTablet && styles.rankRowTablet,
        noBorder && { borderBottomWidth: 0 },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {rank !== undefined && <Text style={styles.rankNum}>{rank}</Text>}
      {avatarColor && (
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{name.charAt(0)}</Text>
        </View>
      )}

      <Text
        style={[styles.rankName, { flex: 1, minWidth: 0 }]}
        numberOfLines={isMobile ? 2 : 1}
        adjustsFontSizeToFit={!isMobile}
        minimumFontScale={0.72}
      >
        {name}
      </Text>

      {leftVal !== undefined &&
        (rawLeftVal != null ? (
          <LongPressValue
            rawValue={rawLeftVal}
            formattedValue={leftVal}
            style={[
              styles.rankVal,
              {
                color: COLORS.teal,
                marginRight: 12,
                minWidth: isMobile ? 62 : 78,
                textAlign: 'right',
              },
            ]}
          />
        ) : (
          <Text
            style={[
              styles.rankVal,
              {
                color: COLORS.teal,
                marginRight: 12,
                minWidth: isMobile ? 62 : 78,
                textAlign: 'right',
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {leftVal}
          </Text>
        ))}

      {rightVal !== undefined &&
        (rawRightVal != null ? (
          <LongPressValue
            rawValue={rawRightVal}
            formattedValue={rightVal}
            style={[
              styles.rankVal,
              { minWidth: isMobile ? 62 : 78, textAlign: 'right' },
              trendUp === true && { color: COLORS.green },
              trendUp === false && { color: COLORS.red },
            ]}
          />
        ) : (
          <Text
            style={[
              styles.rankVal,
              { minWidth: isMobile ? 62 : 78, textAlign: 'right' },
              trendUp === true && { color: COLORS.green },
              trendUp === false && { color: COLORS.red },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {rightVal}
          </Text>
        ))}
    </TouchableOpacity>
  );
};

// ─── Column header row (small labels) ────────────────────────────────────────
export const ColHeader = ({ label1, label2, label3 }) => {
  const { isDesktop, isTablet, isMobile } = useDashboardResponsive();
  const valueWidth = isMobile ? 62 : isTablet ? 74 : 88;
  return (
  <View style={[styles.colHeader, isDesktop && styles.colHeaderDesktop, isTablet && styles.colHeaderTablet]}>
    <Text style={[styles.colLabel, { flex: 1 }]}>{label1}</Text>
    {label2 && (
      <Text style={[styles.colLabel, { width: valueWidth, textAlign: 'right' }]}>
        {label2}
      </Text>
    )}
    {label3 && (
      <Text style={[styles.colLabel, { width: valueWidth, textAlign: 'right' }]}>
        {label3}
      </Text>
    )}
  </View>
  );
};

// ─── Long Press Tooltip Value ─────────────────────────────────────────────────
// Wrap any formatted value — long press shows raw number in a tooltip above it
// SharedComponents.js — LongPressValue updated
export const LongPressValue = ({
  rawValue,
  formattedValue,
  style,
  prefix = '₹',
}) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <View style={{ position: 'relative' }}>
      {visible && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>
            {prefix}
            {Number(rawValue).toLocaleString('en-IN')}
          </Text>
        </View>
      )}
      <TouchableOpacity
        onLongPress={() => setVisible(true)}
        onPressOut={() => setVisible(false)}
        delayLongPress={300}
        activeOpacity={1}
      >
        <Text style={style} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{formattedValue}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Avatar circle (standalone) ──────────────────────────────────────────────
export const AvatarCircle = ({ name, color, size = 36 }) => (
  <View
    style={[
      styles.avatar,
      {
        backgroundColor: color,
        width: size,
        height: size,
        borderRadius: size / 2,
      },
    ]}
  >
    <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>
      {name.charAt(0)}
    </Text>
  </View>
);

// ─── Summary card (small card on exec/party page) ─────────────────────────────
// export const SummaryCard = ({ label, value, bgColor }) => (
//   <View style={[styles.summaryCard, bgColor && { backgroundColor: bgColor }]}>
//     <Text style={styles.summaryCardLabel}>{label}</Text>
//     <Text style={styles.summaryCardValue}>{value}</Text>
//   </View>
// );
export const SummaryCard = ({
  label,
  value,
  bgColor,
  rawValue,
  prefix = '₹',
}) => {
  const { isDesktop, isTablet } = useDashboardResponsive();
  return (
  <View style={[styles.summaryCard, (isDesktop || isTablet) && styles.summaryCardWide, bgColor && { backgroundColor: bgColor }]}>
    <Text style={styles.summaryCardLabel}>{label}</Text>
    {rawValue != null ? (
      <LongPressValue
        rawValue={rawValue}
        formattedValue={value}
        style={styles.summaryCardValue}
        prefix={prefix}
      />
    ) : (
      <Text style={styles.summaryCardValue}>{value}</Text>
    )}
  </View>
  );
};
// ─── Progress bar ─────────────────────────────────────────────────────────────
export const ProgressBar = ({
  pct,
  color = COLORS.teal,
  bgColor = '#E0E0E0',
}) => (
  <View style={[styles.progressBg, { backgroundColor: bgColor }]}>
    <View
      style={[
        styles.progressFill,
        { width: `${Math.min(pct, 100)}%`, backgroundColor: color },
      ]}
    />
  </View>
);

// ─── Loading / Error ─────────────────────────────────────────────────────────
export const LoadingView = () => (
  <View style={styles.center}>
    <ActivityIndicator size="large" color={COLORS.teal} />
  </View>
);

export const ErrorView = ({ message, onRetry }) => (
  <View style={styles.center}>
    <Text style={{ color: COLORS.red, marginBottom: 12 }}>{message}</Text>
    {onRetry && (
      <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
        <Text style={{ color: '#fff' }}>Retry</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Divider ─────────────────────────────────────────────────────────────────
export const Divider = ({ style }) => <View style={[styles.divider, style]} />;

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    marginHorizontal: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  sectionCardDesktop: { marginHorizontal: 0, borderRadius: 12, marginBottom: 16 },
  sectionCardTablet: { marginHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionHeaderIcon: { color: '#fff', fontSize: 13 },
  sectionHeaderIconWide: { fontSize: 15 },
  sectionHeaderDesktop: { paddingHorizontal: 14, paddingVertical: 10 },
  sectionHeaderTablet: { paddingHorizontal: 13, paddingVertical: 9 },
  sectionHeaderTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionHeaderTitleDesktop: { fontSize: 14 },
  sectionHeaderSub: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  sectionHeaderRight: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  totalRowDesktop: { paddingHorizontal: 16, paddingVertical: 12 },
  totalRowTablet: { paddingHorizontal: 15 },
  totalRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  totalSide: { flex: 1 },
  totalSideRight: { alignItems: 'flex-end' },
  totalLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  totalValue: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  rankRowDesktop: { paddingHorizontal: 16, paddingVertical: 10 },
  rankRowTablet: { paddingHorizontal: 15 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rankNum: {
    width: 18,
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  rankName: { fontSize: 13, color: COLORS.textDark },
  rankVal: { fontSize: 12, fontWeight: '600', color: COLORS.textDark, flexShrink: 0 },
  colHeaderDesktop: { paddingHorizontal: 16 },
  colHeaderTablet: { paddingHorizontal: 15 },
  colHeader: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  colLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryCardWide: { padding: 12, marginHorizontal: 5 },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryCardLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryCardValue: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  progressBg: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 14,
    marginVertical: 6,
  },
  progressFill: { height: 5, borderRadius: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  retryBtn: {
    backgroundColor: COLORS.teal,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 14 },
  tooltip: {
    position: 'absolute',
    bottom: 22, // upar dikhega text ke
    right: 0, // right-align under value
    backgroundColor: '#1A2B4A',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 999,
    minWidth: 90,
    alignItems: 'center',
  },
  tooltipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
