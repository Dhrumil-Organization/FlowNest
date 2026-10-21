// FILE: src/components/StoreItemMasterNew/Skeleton.tsx
// Skeleton loaders for Store Item Master (replaces every circular ActivityIndicator page loader).
//
//  • One shared animation drives every skeleton on screen, so all shimmers sweep in sync.
//  • The shine moves LEFT → RIGHT across each block (soft-edged band, no gradient library needed).
//  • Colours come only from the light tokens T (the global dark theme converts them).
//  • Layouts follow the same breakpoints as the real screen: phone (1 col) / tablet (2) / desktop (3).
import React, { useEffect, useState } from 'react';
import { Animated, DimensionValue, Easing, LayoutChangeEvent, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { T } from '../../../src/theme';
import { Breakpoint, CONTENT_MAX } from './model';
import { Cell, u } from './ui';

/* ------------------------------------------------------------------ */
/* Shared shimmer clock (runs only while at least one skeleton is shown) */
/* ------------------------------------------------------------------ */

const progress = new Animated.Value(0);
let users = 0;
let loop: Animated.CompositeAnimation | null = null;

const acquire = () => {
  if (users++ > 0) return;
  progress.setValue(0);
  loop = Animated.loop(
    Animated.timing(progress, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
  );
  loop.start();
};
const release = () => {
  if (--users > 0) return;
  users = 0;
  loop?.stop();
  loop = null;
};

/** Soft edge: the shine band is a row of strips whose opacity rises and falls. */
const STRIPS = [0.04, 0.12, 0.26, 0.42, 0.55, 0.55, 0.42, 0.26, 0.12, 0.04];

type Tone = 'light' | 'dark';

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  tone = 'light',
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  const [w, setW] = useState(0);
  useEffect(() => {
    acquire();
    return release;
  }, []);

  const band = Math.max(90, Math.round(w * 0.55));
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-band, w] });
  const dark = tone === 'dark';

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, overflow: 'hidden', backgroundColor: dark ? 'rgba(255,255,255,0.10)' : T.alt }, style]}
    >
      {w > 0 ? (
        <Animated.View pointerEvents="none" style={[sk.band, { width: band, transform: [{ translateX }] }]}>
          {STRIPS.map((o, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: dark ? '#FFFFFF' : T.surface, opacity: dark ? o * 0.35 : o * 1.5 }} />
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

const sk = StyleSheet.create({
  band: { position: 'absolute', top: 0, bottom: 0, left: 0, flexDirection: 'row' },
});

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

const GUT = 14;

/** Label + input-sized block (matches u.input minHeight 46). */
export const SkeletonField = ({ labelWidth = 70 }: { labelWidth?: number }) => (
  <View>
    <Skeleton width={labelWidth} height={11} radius={6} style={{ marginBottom: 8 }} />
    <Skeleton height={46} radius={12} />
  </View>
);

const SkeletonCardHead = ({ titleWidth = 110, right }: { titleWidth?: number; right?: React.ReactNode }) => (
  <View style={[u.cardHead, { justifyContent: 'space-between' }]}>
    <Skeleton width={titleWidth} height={18} radius={6} />
    {right}
  </View>
);

/** Details card — same grid as the real form: Property, Year, Store / Code, Name / Group … */
export function DetailsSkeleton({ cols }: { cols: number }) {
  const cell = (n: number, span = 1, w = 70) => (
    <Cell key={n} cols={cols} span={span} gutter={GUT}>
      <SkeletonField labelWidth={w} />
    </Cell>
  );
  return (
    <View style={[u.card, { gap: 0 }]}>
      <SkeletonCardHead titleWidth={90} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, marginHorizontal: -GUT / 2 }}>
        {cell(1, 1, 60)}
        {cell(2, 1, 40)}
        {cell(3, 1, 50)}
        {cell(4, 1, 66)}
        {cell(5, cols === 3 ? 2 : cols, 76)}
        {cell(6, 1, 78)}
        {cell(7, 1, 92)}
        {cell(8, 1, 90)}
        {cell(9, 1, 78)}
        {cell(10, 1, 84)}
        {cell(11, 1, 78)}
        <Cell cols={cols} span={cols === 3 ? 1 : cols} gutter={GUT}>
          <Skeleton width={110} height={11} radius={6} style={{ marginBottom: 8 }} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Skeleton width={118} height={44} radius={12} />
            <Skeleton width={110} height={44} radius={12} />
          </View>
        </Cell>
      </View>
    </View>
  );
}

/** Makes & models card: table on tablet/desktop, stacked cards on phone. */
export function MakesSkeleton({ bp }: { bp: Breakpoint }) {
  return (
    <View style={u.card}>
      <SkeletonCardHead
        titleWidth={140}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {bp !== 'phone' ? <Skeleton width={104} height={38} radius={10} /> : null}
            <Skeleton width={bp === 'phone' ? 96 : 110} height={38} radius={10} />
          </View>
        }
      />
      {bp === 'phone' ? (
        <View style={{ gap: 10 }}>
          {[0, 1].map((i) => (
            <View key={i} style={{ borderWidth: 1, borderColor: T.border, borderRadius: 14, padding: 12, gap: 10 }}>
              <Skeleton width="60%" height={16} radius={6} />
              <Skeleton width="85%" height={13} radius={6} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 }}>
                {[0, 1, 2, 3].map((j) => (
                  <View key={j} style={{ width: '50%', gap: 6 }}>
                    <Skeleton width={56} height={10} radius={5} />
                    <Skeleton width={70} height={14} radius={6} />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Skeleton height={38} radius={10} />
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 40 }}>
              {bp === 'desktop' ? <Skeleton width={54} height={14} radius={6} /> : null}
              <Skeleton width="18%" height={14} radius={6} />
              <Skeleton height={14} radius={6} style={{ flex: 1 }} />
              <Skeleton width={bp === 'desktop' ? '12%' : '16%'} height={14} radius={6} />
              <Skeleton width={bp === 'desktop' ? '10%' : '14%'} height={14} radius={6} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** Dark hero banner placeholder. */
export function HeroSkeleton({ bp }: { bp: Breakpoint }) {
  return (
    <View style={{ backgroundColor: T.nav, borderRadius: 16, padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton tone="dark" width={50} height={12} radius={6} />
          <Skeleton tone="dark" width={bp === 'phone' ? '70%' : 240} height={22} radius={7} />
        </View>
        <Skeleton tone="dark" width={bp === 'phone' ? 64 : 84} height={52} radius={12} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} tone="dark" height={52} radius={12} style={{ flex: 1 }} />
        ))}
      </View>
    </View>
  );
}

/** Form body only (used while an item is being opened). */
export function FormSkeleton({ bp, cols }: { bp: Breakpoint; cols: number }) {
  return (
    <View style={{ gap: bp === 'phone' ? 12 : 14 }}>
      <DetailsSkeleton cols={cols} />
      <MakesSkeleton bp={bp} />
    </View>
  );
}

/** Whole screen (first load: hero + form + action bar). */
export function ScreenSkeleton({ bp, cols, onLayout }: { bp: Breakpoint; cols: number; onLayout?: (e: LayoutChangeEvent) => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }} onLayout={onLayout} accessibilityLabel="Loading Store Item Master" accessibilityRole="progressbar">
      <View style={{ flex: 1, overflow: 'hidden', padding: bp === 'phone' ? 12 : 16 }}>
        <View style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', gap: bp === 'phone' ? 12 : 14 }}>
          <HeroSkeleton bp={bp} />
          <FormSkeleton bp={bp} cols={cols} />
        </View>
      </View>
      <View style={{ backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border, padding: 10, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 8, width: '100%', maxWidth: CONTENT_MAX }}>
          {(bp === 'phone' ? [0, 1, 2, 3] : [0, 1, 2, 3, 4]).map((i) => (
            <Skeleton key={i} height={44} radius={12} style={i === 4 ? { width: 44 } : { flex: 1 }} />
          ))}
        </View>
      </View>
    </View>
  );
}

/** Browse list rows (grid rows on tablet/desktop, cards on phone). */
export function BrowseSkeleton({ layout }: { layout: Breakpoint }) {
  const rows = layout === 'phone' ? 5 : 9;
  return (
    <View accessibilityLabel="Loading items" accessibilityRole="progressbar" style={{ paddingHorizontal: layout === 'phone' ? 16 : 0 }}>
      {Array.from({ length: rows }).map((_, i) =>
        layout === 'phone' ? (
          <View key={i} style={{ borderWidth: 1, borderColor: T.border, borderRadius: 14, padding: 12, marginBottom: 10, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Skeleton height={16} radius={6} style={{ flex: 1 }} />
              <Skeleton width={44} height={22} radius={8} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
              <View style={{ flex: 1, gap: 7 }}>
                <Skeleton width="70%" height={12} radius={6} />
                <Skeleton width="45%" height={12} radius={6} />
              </View>
              <Skeleton width={64} height={16} radius={6} />
            </View>
          </View>
        ) : (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', height: layout === 'desktop' ? 44 : 56, paddingHorizontal: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: T.hair }}>
            <Skeleton width={layout === 'desktop' ? 60 : 50} height={13} radius={6} />
            <Skeleton height={13} radius={6} style={{ flex: 2.6 }} />
            <Skeleton width={layout === 'desktop' ? 56 : 44} height={13} radius={6} />
            <Skeleton height={13} radius={6} style={{ flex: 1.3 }} />
            {layout === 'desktop' ? <Skeleton height={13} radius={6} style={{ flex: 1.3 }} /> : null}
            <Skeleton width={layout === 'desktop' ? 80 : 70} height={13} radius={6} />
            {layout === 'desktop' ? <Skeleton height={13} radius={6} style={{ flex: 1 }} /> : null}
          </View>
        ),
      )}
    </View>
  );
}
