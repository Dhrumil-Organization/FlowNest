// components/MiniLineChart.js
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';

/**
 * MiniLineChart
 *
 * Existing callers can continue passing `width` for fixed-size native layouts.
 * Responsive callers should pass `responsive`, which measures the actual
 * parent width so charts never stay stuck at the old 340px mobile width on
 * web/tablet screens.
 */
const MiniLineChart = ({
  data = [],
  width = 280,
  height = 50,
  color = '#00C9A7',
  fillColor = null,
  showBaseline = false,
  responsive = false,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);


  const measuredWidth = responsive ? Math.max(0, Math.floor(containerWidth)) : width;

  if (responsive && measuredWidth <= 0) {
    return (
      <View
        style={[styles.responsiveWrap, { height }]}
        onLayout={(event) => {
          const next = Math.floor(event.nativeEvent.layout.width);
          if (next > 0 && next !== containerWidth) setContainerWidth(next);
        }}
      />
    );
  }

  if (!data || data.length < 2) return <View style={{ width: responsive ? '100%' : width, height }} />;

  const chartWidth = Math.max(40, measuredWidth);
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padX = 4;
  const padY = 4;
  const chartW = chartWidth - padX * 2;
  const chartH = height - padY * 2;

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * chartW;
    const y = padY + chartH - ((v - min) / range) * chartH;
    return `${x},${y}`;
  });

  const pointsStr = points.join(' ');
  const firstX = padX;
  const lastX = padX + chartW;
  const baseY = padY + chartH;
  const fillPoints = `${firstX},${baseY} ${pointsStr} ${lastX},${baseY}`;

  const chart = (
    <Svg width={responsive ? '100%' : chartWidth} height={height} viewBox={`0 0 ${chartWidth} ${height}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="miniLineChartGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={fillColor || color} stopOpacity="0.3" />
          <Stop offset="1" stopColor={fillColor || color} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      {fillColor && <Polygon points={fillPoints} fill="url(#miniLineChartGrad)" />}
      {showBaseline && (
        <Line
          x1={padX}
          y1={padY + chartH}
          x2={padX + chartW}
          y2={padY + chartH}
          stroke="#E0E0E0"
          strokeWidth="1"
        />
      )}
      <Polyline
        points={pointsStr}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );

  if (!responsive) return chart;

  return (
    <View
      style={styles.responsiveWrap}
      onLayout={(event) => {
        const next = Math.floor(event.nativeEvent.layout.width);
        if (next > 0 && next !== containerWidth) setContainerWidth(next);
      }}
    >
      {chart}
    </View>
  );
};

const styles = StyleSheet.create({
  responsiveWrap: {
    width: '100%',
    minWidth: 1,
  },
});

export default MiniLineChart;
