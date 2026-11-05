// components/InteractiveDailyTrendChart.js
import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Line, Polygon, Polyline, Stop } from 'react-native-svg';

/**
 * Shared production-safe interactive daily chart.
 *
 * - Uses the exact same coordinates for line rendering and point hit targets.
 * - Horizontally scrolls with fixed point spacing instead of squeezing the month.
 * - Tapping a point shows the exact source-row label + value.
 * - Does not alter/aggregate backend values.
 */
export default function InteractiveDailyTrendChart({
  data = [],
  valueKey = 'amount',
  labelKey = 'day',
  color = '#00C9A7',
  fillColor = null,
  height = 64,
  pointGap = 54,
  minWidth = 340,
  valueFormatter = value => String(Number(value || 0)),
  showBaseline = false,
  showHint = true,
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  // Measured container width (UI only) so the chart fills wide columns
  // instead of leaving empty space; still scrolls when points don't fit.
  const [boxWidth, setBoxWidth] = useState(0);
  const onBoxLayout = e => {
    const w = Math.floor(e?.nativeEvent?.layout?.width || 0);
    setBoxWidth(prev => (Math.abs(prev - w) > 1 ? w : prev));
  };

  const points = useMemo(() => {
    if (!Array.isArray(data)) return [];

    return data.map((row, index) => {
      const rawValue =
        row?.[valueKey] ??
        row?.amount ??
        row?.meters ??
        row?.value ??
        row?.qty ??
        0;

      const numericValue = Number(rawValue);

      return {
        label: String(
          row?.[labelKey] ??
          row?.day ??
          row?.label ??
          row?.date ??
          index + 1,
        ),
        value: Number.isFinite(numericValue) ? numericValue : 0,
      };
    });
  }, [data, labelKey, valueKey]);

  if (points.length === 0) {
    return <View style={{ height }} />;
  }

  const sidePadding = 22;
  const graphTop = 24;
  const graphBottom = height - 8;
  const graphHeight = Math.max(1, graphBottom - graphTop);
  const naturalWidth = Math.max(
    minWidth,
    sidePadding * 2 + Math.max(0, points.length - 1) * pointGap,
  );
  const contentWidth = Math.max(naturalWidth, boxWidth);
  // Spread points across the available width when there is spare room.
  const effectiveGap =
    points.length > 1
      ? Math.max(pointGap, (contentWidth - sidePadding * 2) / (points.length - 1))
      : pointGap;

  const values = points.map(point => point.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);

  const coords = points.map((point, index) => ({
    x:
      points.length === 1
        ? contentWidth / 2
        : sidePadding + index * effectiveGap,
    y:
      graphBottom -
      ((point.value - min) / range) * graphHeight,
  }));

  const pointsStr = coords.map(point => `${point.x},${point.y}`).join(' ');
  const fillPoints = `${coords[0].x},${graphBottom} ${pointsStr} ${coords[coords.length - 1].x},${graphBottom}`;

  const selected =
    selectedIndex !== null && points[selectedIndex]
      ? { ...points[selectedIndex], ...coords[selectedIndex] }
      : null;

  const tooltipWidth = 104;
  const tooltipLeft = selected
    ? Math.max(
        4,
        Math.min(
          contentWidth - tooltipWidth - 4,
          selected.x - tooltipWidth / 2,
        ),
      )
    : 0;

  return (
    <View style={styles.outer} onLayout={onBoxLayout}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ width: contentWidth }}
      >
        <View style={{ width: contentWidth }}>
          <View style={{ width: contentWidth, height }}>
            <Svg
              pointerEvents="none"
              width={contentWidth}
              height={height}
              style={StyleSheet.absoluteFill}
            >
              <Defs>
                <LinearGradient id="dailyTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop
                    offset="0"
                    stopColor={fillColor || color}
                    stopOpacity="0.28"
                  />
                  <Stop
                    offset="1"
                    stopColor={fillColor || color}
                    stopOpacity="0.02"
                  />
                </LinearGradient>
              </Defs>

              {fillColor && points.length > 1 ? (
                <Polygon points={fillPoints} fill="url(#dailyTrendGradient)" />
              ) : null}

              {showBaseline ? (
                <Line
                  x1={sidePadding}
                  y1={graphBottom}
                  x2={contentWidth - sidePadding}
                  y2={graphBottom}
                  stroke="#E0E0E0"
                  strokeWidth="1"
                />
              ) : null}

              {points.length > 1 ? (
                <Polyline
                  points={pointsStr}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}
            </Svg>

            {coords.map((coord, index) => {
              const active = selectedIndex === index;

              return (
                <TouchableOpacity
                  key={`${points[index].label}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${points[index].label}: ${valueFormatter(points[index].value)}`}
                  activeOpacity={0.8}
                  onPress={() =>
                    setSelectedIndex(current =>
                      current === index ? null : index,
                    )
                  }
                  style={[
                    styles.pointHit,
                    {
                      left: coord.x - 17,
                      top: coord.y - 17,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.pointDot,
                      {
                        borderColor: color,
                        backgroundColor: active ? '#FFFFFF' : color,
                      },
                      active && styles.pointDotActive,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}

            {selected ? (
              <View
                pointerEvents="none"
                style={[
                  styles.tooltip,
                  {
                    left: tooltipLeft,
                    top: Math.max(0, selected.y - 52),
                    width: tooltipWidth,
                  },
                ]}
              >
                <Text style={styles.tooltipLabel}>{selected.label}</Text>
                <Text style={styles.tooltipValue} numberOfLines={1}>
                  {valueFormatter(selected.value)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.axisArea}>
            {coords.map((coord, index) => (
              <Text
                key={`axis-${points[index].label}-${index}`}
                style={[
                  styles.axisLabel,
                  { left: coord.x - 18 },
                ]}
                numberOfLines={1}
              >
                {points[index].label}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>

      {showHint && points.length > 7 ? (
        <Text style={styles.hint}>
          Swipe horizontally · tap a point for value
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    overflow: 'hidden',
  },
  pointHit: {
    position: 'absolute',
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  pointDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  pointDotActive: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2.5,
  },
  tooltip: {
    position: 'absolute',
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0D2234',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
    elevation: 5,
  },
  tooltipLabel: {
    color: '#CAD2D9',
    fontSize: 8,
    fontWeight: '800',
  },
  tooltipValue: {
    marginTop: 2,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  axisArea: {
    position: 'relative',
    height: 22,
  },
  axisLabel: {
    position: 'absolute',
    top: 3,
    width: 36,
    textAlign: 'center',
    color: '#8E969D',
    fontSize: 8,
  },
  hint: {
    marginTop: 1,
    color: '#999999',
    textAlign: 'center',
    fontSize: 8,
  },
});
