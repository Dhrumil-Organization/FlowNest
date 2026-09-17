// components/MiniLineChart.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';

/**
 * MiniLineChart
 * Props:
 *   data        : Array of numbers  e.g. [420000, 380000, 510000, ...]
 *   width       : number (default 280)
 *   height      : number (default 50)
 *   color       : string (default '#00C9A7')
 *   fillColor   : string (gradient fill below line)
 *   showBaseline: bool
 */
const MiniLineChart = ({
  data = [],
  width = 280,
  height = 50,
  color = '#00C9A7',
  fillColor = null,
  showBaseline = false,
}) => {
  if (!data || data.length < 2) return <View style={{ width, height }} />;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padX = 4;
  const padY = 4;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * chartW;
    const y = padY + chartH - ((v - min) / range) * chartH;
    return `${x},${y}`;
  });

  const pointsStr = points.join(' ');

  // For filled polygon
  const firstX = padX;
  const lastX  = padX + chartW;
  const baseY  = padY + chartH;
  const fillPoints = `${firstX},${baseY} ${pointsStr} ${lastX},${baseY}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={fillColor || color} stopOpacity="0.3" />
          <Stop offset="1" stopColor={fillColor || color} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      {fillColor && (
        <Polygon points={fillPoints} fill="url(#grad)" />
      )}
      {showBaseline && (
        <Line
          x1={padX} y1={padY + chartH}
          x2={padX + chartW} y2={padY + chartH}
          stroke="#E0E0E0" strokeWidth="1"
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
};

export default MiniLineChart;
