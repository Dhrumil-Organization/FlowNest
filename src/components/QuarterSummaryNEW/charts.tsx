// FILE: src/components/QuarterSummaryNEW/charts.tsx
// react-native-svg charts of the Quarter Summary screen — same geometry maths as the legacy
// Gauge / DonutChart in components/QuarterWiseDispatch/QuarterSummaryScreen.tsx, recoloured with T tokens.
import { T } from '@/src/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { fmt, pct } from './model';

/** Ring gauge: percent clamped 0–100, label = pct(clamped). */
export function Gauge({ percent, color }: { percent: any; color: string }) {
  const size = 84;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const p = Math.max(0, Math.min(100, Number(percent || 0)));
  const offset = circumference - (p / 100) * circumference;

  return (
    <View style={[st.box, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={T.border} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      <Text style={st.gaugeText}>{pct(p)}</Text>
    </View>
  );
}

/** Donut: each segment's share = |value| / sum(|values|); centre shows fmt(total) + unit. */
export function DonutChart({
  total,
  unit,
  segments,
}: {
  total: any;
  unit: string;
  segments: { value: any; color: string }[];
}) {
  const size = 116;
  const stroke = 21;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const safeTotal = segments.reduce((sum, x) => sum + Math.abs(Number(x.value || 0)), 0) || 1;
  let start = 0;

  return (
    <View style={[st.box, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={T.border} strokeWidth={stroke} fill="none" />

          {segments.map((seg, index) => {
            const value = Math.abs(Number(seg.value || 0));
            const dash = (value / safeTotal) * circumference;

            const item = (
              <Circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={seg.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-start}
              />
            );

            start += dash;
            return item;
          })}
        </G>
      </Svg>

      <View style={st.donutCenter}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={st.donutTotal}>
          {fmt(total)}
        </Text>
        <Text style={st.donutUnit}>{unit}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  gaugeText: { position: 'absolute', color: T.ink, fontSize: 11, fontWeight: '800' },
  donutCenter: { position: 'absolute', alignItems: 'center', width: 62 },
  donutTotal: { color: T.ink, fontSize: 12.5, fontWeight: '800' },
  donutUnit: { color: T.muted, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },
});
