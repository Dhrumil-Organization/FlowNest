// import React, { memo, useMemo } from 'react';

// import {
//   View,
//   Text,
//   StyleSheet,
//   useColorScheme,
//   Dimensions,
// } from 'react-native';

// import Svg, {
//   Path,
//   Line,
// } from 'react-native-svg';

// import { Colors } from '../../common/theme_emp_dash/colors';

// interface Props {
//   labels: string[];
//   values: number[];
// }

// const screenWidth =
//   Dimensions.get('window').width;

// const GRAPH_WIDTH =
//   screenWidth - 56;

// const GRAPH_HEIGHT = 42;

// const TrendGraph = ({
//   labels,
//   values,
// }: Props) => {
//   const isDark =
//     useColorScheme() === 'dark';

//   const colors = isDark
//     ? Colors.dark
//     : Colors.light;

//   const path = useMemo(() => {
//     if (!values?.length) {
//       return '';
//     }

//     const max = Math.max(...values);
//     const min = Math.min(...values);

//     const points = values.map(
//       (value, index) => {
//         const x =
//           (index *
//             GRAPH_WIDTH) /
//           (values.length - 1);

//         const y =
//           GRAPH_HEIGHT -
//           ((value - min) /
//             (max - min || 1)) *
//             16 -
//           12;

//         return { x, y };
//       },
//     );

//     let d = `M ${points[0].x} ${points[0].y}`;

//     for (
//       let i = 0;
//       i < points.length - 1;
//       i++
//     ) {
//       const p0 = points[i];
//       const p1 = points[i + 1];

//       const cpX =
//         (p0.x + p1.x) / 2;

//       d += ` C ${cpX} ${p0.y},
//              ${cpX} ${p1.y},
//              ${p1.x} ${p1.y}`;
//     }

//     return d;
//   }, [values]);

//   return (
//     <View style={styles.container}>
//       <Text
//         style={[
//           styles.title,
//           {
//             color:
//               colors.secondaryText,
//           },
//         ]}>
//         11-DAY TREND
//       </Text>

//       <Line
//         x1="0"
//         y1="0"
//         x2="100%"
//         y2="0"
//         stroke={colors.divider}
//         strokeWidth="1"
//       />

//       <View
//         style={styles.graphWrapper}>
//         <Svg
//           width={GRAPH_WIDTH}
//           height={GRAPH_HEIGHT}>
//           <Path
//             d={path}
//             stroke={
//               colors.trendLine
//             }
//             strokeWidth={2}
//             fill="none"
//           />
//         </Svg>
//       </View>

//       <View
//         style={styles.labelsRow}>
//         {labels.map(label => (
//           <Text
//             key={label}
//             style={[
//               styles.label,
//               {
//                 color:
//                   colors.secondaryText,
//               },
//             ]}>
//             {label}
//           </Text>
//         ))}
//       </View>
//     </View>
//   );
// };

// export default memo(
//   TrendGraph,
// );

// const styles = StyleSheet.create({
//   container: {
//     marginTop: 10,
//   },

//   title: {
//     fontSize: 10,

//     fontWeight: '700',

//     letterSpacing: 1.2,

//     marginBottom: 8,

//     marginHorizontal: 14,
//   },

//   graphWrapper: {
//     paddingHorizontal: 14,

//     height: 48,

//     justifyContent: 'center',
//   },

//   labelsRow: {
//     flexDirection: 'row',

//     justifyContent:
//       'space-between',

//     paddingHorizontal: 14,

//     marginTop: -2,
//   },

//   label: {
//     fontSize: 9,

//     fontWeight: '600',
//   },
// });
import React from 'react';
import { View, Text } from 'react-native';

import { LineChart } from 'react-native-gifted-charts';

interface Props {
  data: {
    label: string;
    value: number;
  }[];
}

export default function TrendGraph({
  data,
}: Props) {
  return (
    <View>
      <Text
        style={{
          marginHorizontal: 14,
          marginBottom: 10,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1,
        }}>
        11-DAY TREND
      </Text>

      <LineChart
        data={data}
        areaChart={false}
        curved
        thickness={2}
        color="#19A7FF"
        hideYAxisText
        hideRules
        hideAxesAndRules
        startFillColor="transparent"
        endFillColor="transparent"
        animateOnDataChange
        animationDuration={700}
        isAnimated
        spacing={55}
        dataPointsColor="#19A7FF"
        dataPointsRadius={4}
        focusEnabled
        showStripOnFocus
        showTextOnFocus
        textColor="#111827"
        textFontSize={12}
      />
    </View>
  );
}