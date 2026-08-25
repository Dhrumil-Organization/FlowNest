// // ExpenseScreen.jsx — Madhusudhan Fabrics (React Native)
// // Complete rebuild matching all 14 screenshots

// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { useFocusEffect } from "@react-navigation/native";
// import React, { useCallback, useRef, useState } from "react";
// import {
//   Dimensions,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { useHeaderExtrasStore } from "../../core/layout/headerExtras";
// // SafeAreaView import removed — no longer used, the tabs layout now owns
// // the top safe-area inset for every tab screen (see (tabs)/_layout.tsx).
// import { useExpenseData } from "../../hooks/useExpenseData";
// import { T } from "../../theme";

// const { width: SCREEN_W } = Dimensions.get("window");

// // ── Formatters ────────────────────────────────────────────────────
// const fCr = (v) => {
//   const L = v / 1e5;
//   return L >= 100 ? `₹${(L / 100).toFixed(2)} Cr` : `₹${L.toFixed(2)} L`;
// };
// const fL = (v) => `₹${(v / 1e5).toFixed(2)} L`;
// const fLn = (v) => `${(v / 1e5).toFixed(2)} L`;
// const f2 = (v) => Number(v || 0).toFixed(2);
// const f3 = (v) => Number(v || 0).toFixed(3);
// const fN = (v) => Math.round(v || 0).toLocaleString("en-IN");
// const arrow = (c, p) => {
//   if (!p) return "—";
//   const d = ((c - p) / p) * 100;
//   return d > 0 ? `▲ ${d.toFixed(1)}%` : `▼ ${Math.abs(d).toFixed(1)}%`;
// };

// const C = {
//   bg: '#F5F1EA',
//   nav: '#0D1B2A',
//   card: '#FFFFFF',
//   soft: '#F8F4EE',
//   soft2: '#FBF8F3',
//   border: '#E5DED4',
//   borderSoft: '#EFE8DE',
//   ink: '#111827',
//   text: '#1F2937',
//   muted: '#8A8177',
//   muted2: '#A69C91',
//   copper: '#B77932',
//   copperDark: '#9E6324',
//   green: '#2F855A',
//   red: '#C53030',
// };

// // ── Skeleton ──────────────────────────────────────────────────────
// function Skeleton({ h = 80 }) {
//   return <View style={[SK.box, { height: h }]} />;
// }
// const SK = StyleSheet.create({
//   box: { backgroundColor: "#f3f4f6", borderRadius: 12, marginBottom: 8 },
// });

// // ── Month tab ─────────────────────────────────────────────────────
// function MonthTab({ label, active, status, onPress }) {
//   console.log("label",label);
//   return (
//     <TouchableOpacity
//       onPress={onPress}
//       activeOpacity={0.7}
//       style={[S.monthTab, active && S.monthTabActive]}
//     >
//       <Text style={[S.monthTabText, active && S.monthTabTextActive]}>
//         {label}
//       </Text>
//       {status === "loading" && !active && <View style={S.loadingRing} />}
//     </TouchableOpacity>
//   );
// }

// // ── Donut chart (SVG-free, pure RN) ──────────────────────────────
// // Uses a simple arc approximation with View rotation trick
// function DonutChart({ elec, sal, stores, total }) {
//   const SIZE = 120;
//   const STROKE = 18;
//   const R = (SIZE - STROKE) / 2;
//   const C = SIZE / 2;

//   // We use a stacked View rotation approach for 3 segments
//   const ePct = total > 0 ? elec / total : 0;
//   const sPct = total > 0 ? sal / total : 0;
//   const stPct = total > 0 ? stores / total : 0;

//   const SEGMENTS = [
//     { pct: ePct, color: "#185FA5", label: "Electricity", value: fL(elec) },
//     { pct: sPct, color: "#c2823a", label: "Salary", value: fL(sal) },
//     { pct: stPct, color: "#1D9E75", label: "Stores", value: fL(stores) },
//   ];

//   // Build arc segments using border trick
//   let cumDeg = -90;

//   return (
//     <View style={S.donutWrap}>
//       {/* Chart left */}
//       <View style={{ width: SIZE, height: SIZE, position: "relative" }}>
//         {/* Background ring */}
//         <View
//           style={{
//             position: "absolute",
//             width: SIZE,
//             height: SIZE,
//             borderRadius: SIZE / 2,
//             borderWidth: STROKE,
//             borderColor: "#f3f4f6",
//           }}
//         />
//         {/* Segments drawn as overlapping arcs using conic approximation */}
//         {SEGMENTS.map((seg, i) => {
//           const startDeg = cumDeg;
//           const spanDeg = seg.pct * 360;
//           cumDeg += spanDeg;
//           if (spanDeg < 1) return null;
//           // Split arcs > 180° into two halves
//           const arcs =
//             spanDeg > 180
//               ? [
//                   { start: startDeg, span: 180 },
//                   { start: startDeg + 180, span: spanDeg - 180 },
//                 ]
//               : [{ start: startDeg, span: spanDeg }];
//           return arcs.map((arc, j) => (
//             <View
//               key={`${i}-${j}`}
//               style={{
//                 position: "absolute",
//                 width: SIZE,
//                 height: SIZE,
//                 overflow: "hidden",
//                 transform: [{ rotate: `${arc.start}deg` }],
//               }}
//             >
//               <View
//                 style={{
//                   position: "absolute",
//                   width: SIZE,
//                   height: SIZE / 2,
//                   overflow: "hidden",
//                   transform: [{ rotate: `${Math.min(arc.span, 180)}deg` }],
//                   transformOrigin: `${SIZE / 2}px ${SIZE / 2}px`,
//                 }}
//               >
//                 <View
//                   style={{
//                     width: SIZE,
//                     height: SIZE,
//                     borderRadius: SIZE / 2,
//                     borderWidth: STROKE,
//                     borderColor: seg.color,
//                     borderTopColor: "transparent",
//                     borderRightColor: "transparent",
//                     borderBottomColor: "transparent",
//                   }}
//                 />
//               </View>
//             </View>
//           ));
//         })}
//         {/* Center label */}
//         <View
//           style={[
//             StyleSheet.absoluteFill,
//             { alignItems: "center", justifyContent: "center" },
//           ]}
//         >
//           <Text style={{ fontSize: 13, fontWeight: "700", color: "#c2823a" }}>
//             {fCr(total)}
//           </Text>
//           <Text style={{ fontSize: 10, color: "#9ca3af" }}>total</Text>
//         </View>
//       </View>

//       {/* Legend right */}
//       <View
//         style={{ flex: 1, justifyContent: "center", paddingLeft: 16, gap: 8 }}
//       >
//         {SEGMENTS.map((seg) => (
//           <View
//             key={seg.label}
//             style={{
//               flexDirection: "row",
//               alignItems: "center",
//               justifyContent: "space-between",
//             }}
//           >
//             <View
//               style={{ flexDirection: "row", alignItems: "center", gap: 7 }}
//             >
//               <View
//                 style={{
//                   width: 10,
//                   height: 10,
//                   borderRadius: 2,
//                   backgroundColor: seg.color,
//                 }}
//               />
//               <Text style={{ fontSize: 13, color: "#374151" }}>
//                 {seg.label}
//               </Text>
//             </View>
//             <View style={{ alignItems: "flex-end" }}>
//               <Text
//                 style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}
//               >
//                 {seg.value}
//               </Text>
//               <Text style={{ fontSize: 11, color: "#9ca3af" }}>
//                 {total > 0 ? (seg.pct * 100).toFixed(1) : "0"}%
//               </Text>
//             </View>
//           </View>
//         ))}
//       </View>
//     </View>
//   );
// }

// // ── Mini donut (Production/Cost split) ───────────────────────────
// function MiniDonut({ rapierPct, label, size = 90 }) {
//   const STROKE = 14;
//   const wjetPct = 100 - rapierPct;
//   return (
//     <View style={{ alignItems: "center" }}>
//       <View
//         style={{
//           width: size,
//           height: size,
//           position: "relative",
//           marginBottom: 8,
//         }}
//       >
//         <View
//           style={{
//             position: "absolute",
//             width: size,
//             height: size,
//             borderRadius: size / 2,
//             borderWidth: STROKE,
//             borderColor: "#c2823a",
//           }}
//         />
//         {/* Waterjet arc overlay */}
//         {wjetPct > 0 && (
//           <View
//             style={{
//               position: "absolute",
//               width: size,
//               height: size,
//               overflow: "hidden",
//               transform: [{ rotate: `${-90 + rapierPct * 3.6}deg` }],
//             }}
//           >
//             <View
//               style={{
//                 width: size,
//                 height: size,
//                 borderRadius: size / 2,
//                 borderWidth: STROKE,
//                 borderColor: "#185FA5",
//                 borderTopColor: "transparent",
//                 borderRightColor: "transparent",
//                 borderBottomColor: "transparent",
//                 transform: [{ rotate: `${Math.min(wjetPct * 3.6, 180)}deg` }],
//               }}
//             />
//           </View>
//         )}
//         {/* Center */}
//         <View
//           style={[
//             StyleSheet.absoluteFill,
//             { alignItems: "center", justifyContent: "center" },
//           ]}
//         >
//           <Text style={{ fontSize: 13, fontWeight: "700", color: "#0f172a" }}>
//             {rapierPct.toFixed(1)}%
//           </Text>
//           <Text style={{ fontSize: 9, color: "#9ca3af" }}>Rapier</Text>
//         </View>
//       </View>
//       <Text
//         style={{
//           fontSize: 12,
//           fontWeight: "500",
//           color: "#374151",
//           marginBottom: 4,
//         }}
//       >
//         {label}
//       </Text>
//       <View style={{ flexDirection: "row", gap: 8 }}>
//         <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
//           <View
//             style={{
//               width: 7,
//               height: 7,
//               borderRadius: 3.5,
//               backgroundColor: "#c2823a",
//             }}
//           />
//           <Text style={{ fontSize: 10, color: "#6b7280" }}>
//             Rapier {rapierPct.toFixed(1)}%
//           </Text>
//         </View>
//         <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
//           <View
//             style={{
//               width: 7,
//               height: 7,
//               borderRadius: 3.5,
//               backgroundColor: "#185FA5",
//             }}
//           />
//           <Text style={{ fontSize: 10, color: "#6b7280" }}>
//             W-Jet {wjetPct.toFixed(1)}%
//           </Text>
//         </View>
//       </View>
//     </View>
//   );
// }

// // ── Bar chart (Comparative analytics) ───────────────────────────
// function ComparativeChart({ months, states }) {
//   const chartData = months
//     .map((mo) => {
//       const d = states[mo.key]?.data;
//       return {
//         label: mo.label,
//         shortLabel: mo.shortLabel,
//         prod: d?.prod_total_L || 0,
//         cpp: d?.cpp_total || 0,
//       };
//     })
//     .reverse(); // oldest first

//   const maxProd = Math.max(...chartData.map((x) => x.prod), 1);
//   const maxCpp = Math.max(...chartData.map((x) => x.cpp), 1);
//   const BAR_W = 32;
//   const CHART_H = 120;

//   const [tooltip, setTooltip] = useState(null);

//   return (
//     <View style={S.chartCard}>
//       <View
//         style={{
//           flexDirection: "row",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: 4,
//         }}
//       >
//         <Text style={S.chartTitle}>Production vs cost / pick</Text>
//         <Text style={S.chartSub}>last 6 months</Text>
//       </View>

//       <View
//         style={{
//           position: "relative",
//           marginTop: 8,
//           overflow: "hidden",
//           height: CHART_H,
//         }}
//       >
//         {/* Grid lines */}
//         {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
//           <View
//             key={pct}
//             style={{
//               position: "absolute",
//               left: 0,
//               right: 0,
//               top: CHART_H * (1 - pct),
//               height: 0.5,
//               backgroundColor: "#f3f4f6",
//             }}
//           />
//         ))}

//         {/* Bars + line */}
//         <View
//           style={{
//             height: CHART_H,
//             flexDirection: "row",
//             alignItems: "flex-end",
//             justifyContent: "space-around",
//           }}
//         >
//           {chartData.map((item, i) => (
//             <TouchableOpacity
//               key={i}
//               onPress={() => setTooltip(tooltip === i ? null : i)}
//               style={{
//                 alignItems: "center",
//                 width: BAR_W + 10,
//                 height: CHART_H,
//                 justifyContent: "flex-end",
//               }}
//             >
//               <View
//                 style={{
//                   width: BAR_W,
//                   backgroundColor: "#c2823a",
//                   height:
//                     maxProd > 0
//                       ? Math.max((item.prod / maxProd) * CHART_H, 2)
//                       : 2,
//                   borderTopLeftRadius: 3,
//                   borderTopRightRadius: 3,
//                   opacity: tooltip !== null && tooltip !== i ? 0.5 : 1,
//                 }}
//               />
//             </TouchableOpacity>
//           ))}
//         </View>

//         {/* Cost/pick line overlay */}
//         <View
//           style={{
//             position: "absolute",
//             left: 0,
//             right: 0,
//             top: 0,
//             height: CHART_H,
//             flexDirection: "row",
//             alignItems: "flex-end",
//             justifyContent: "space-around",
//           }}
//         >
//           {chartData.map((item, i) => {
//             const y =
//               CHART_H - (maxCpp > 0 ? (item.cpp / maxCpp) * CHART_H : 0);
//             return (
//               <View
//                 key={i}
//                 style={{
//                   width: BAR_W + 10,
//                   alignItems: "center",
//                   position: "relative",
//                 }}
//               >
//                 <View
//                   style={{
//                     position: "absolute",
//                     top: y - 4,
//                     width: 8,
//                     height: 8,
//                     borderRadius: 4,
//                     backgroundColor: "#0f172a",
//                     borderWidth: 1.5,
//                     borderColor: "#fff",
//                   }}
//                 />
//               </View>
//             );
//           })}
//         </View>

//         {/* Tooltip */}
//         {tooltip !== null && chartData[tooltip] && (
//           <View style={S.tooltip}>
//             <Text style={S.tooltipMonth}>{chartData[tooltip].label}</Text>
//             <Text style={S.tooltipLine}>
//               Prod (L m): {f2(chartData[tooltip].prod)}
//             </Text>
//             <Text style={S.tooltipLine}>
//               Cost/pick ₹: {f3(chartData[tooltip].cpp)}
//             </Text>
//           </View>
//         )}
//       </View>

//       {/* X axis labels */}
//       <View
//         style={{
//           flexDirection: "row",
//           justifyContent: "space-around",
//           marginTop: 6,
//         }}
//       >
//         {chartData.map((item, i) => (
//           <Text
//             key={i}
//             style={{
//               fontSize: 10,
//               color: "#9ca3af",
//               width: BAR_W + 10,
//               textAlign: "center",
//             }}
//           >
//             {item.shortLabel}
//           </Text>
//         ))}
//       </View>

//       {/* Legend */}
//       <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
//         <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
//           <View
//             style={{
//               width: 12,
//               height: 12,
//               borderRadius: 2,
//               backgroundColor: "#c2823a",
//             }}
//           />
//           <Text style={{ fontSize: 11, color: "#6b7280" }}>
//             Production (L m)
//           </Text>
//         </View>
//         <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
//           <View
//             style={{
//               width: 8,
//               height: 8,
//               borderRadius: 4,
//               backgroundColor: "#0f172a",
//             }}
//           />
//           <Text style={{ fontSize: 11, color: "#6b7280" }}>
//             Cost / pick (₹)
//           </Text>
//         </View>
//       </View>
//     </View>
//   );
// }

// // ── Expandable expense block with icon ───────────────────────────
// function ExpBlock({
//   icon,
//   iconColor,
//   iconBg,
//   title,
//   sub,
//   amt,
//   editLabel,
//   onEdit,
//   children,
// }) {
//   const [open, setOpen] = useState(false);
//   return (
//     <View style={S.expBlock}>
//       <TouchableOpacity
//         style={S.expHeader}
//         onPress={() => setOpen((p) => !p)}
//         activeOpacity={0.7}
//       >
//         <View style={[S.expIcon, { backgroundColor: iconBg }]}>
//           <Text style={{ fontSize: 16 }}>{icon}</Text>
//         </View>
//         <View style={{ flex: 1 }}>
//           <Text style={S.expTitle}>{title}</Text>
//           <Text style={S.expSub}>{sub}</Text>
//         </View>
//         <Text style={[S.expAmt, { color: iconColor }]}>{amt}</Text>
//         {!!editLabel && (
//           <TouchableOpacity
//             onPress={(e) => {
//               onEdit?.();
//             }}
//             style={{ paddingHorizontal: 4 }}
//           >
//             <Text style={S.editLabel}>{editLabel}</Text>
//           </TouchableOpacity>
//         )}
//         <Text
//           style={[S.expChevron, open && { transform: [{ rotate: "180deg" }] }]}
//         >
//           ▾
//         </Text>
//       </TouchableOpacity>
//       {open && <View style={S.expBody}>{children}</View>}
//     </View>
//   );
// }

// // ── Bar row (electricity sub-meter) ──────────────────────────────
// function BarRow({ label, kwh, cost, pct, costPct }) {
//   return (
//     <View style={{ marginBottom: 12 }}>
//       <View
//         style={{
//           flexDirection: "row",
//           justifyContent: "space-between",
//           marginBottom: 3,
//         }}
//       >
//         <Text style={{ fontSize: 12, color: "#374151" }}>{label}</Text>
//         <View style={{ alignItems: "flex-end" }}>
//           <Text style={{ fontSize: 12, color: "#374151" }}>
//             {fN(kwh)} kWh · {fL(cost)}
//           </Text>
//           <Text style={{ fontSize: 11, color: "#9ca3af" }}>
//             {costPct?.toFixed(1)}%
//           </Text>
//         </View>
//       </View>
//       <View style={{ height: 5, backgroundColor: "#f3f4f6", borderRadius: 3 }}>
//         <View
//           style={{
//             width: `${Math.min(pct, 100)}%`,
//             height: 5,
//             backgroundColor: "#185FA5",
//             borderRadius: 3,
//           }}
//         />
//       </View>
//     </View>
//   );
// }

// // ── Shed detail row ───────────────────────────────────────────────
// function ShedRow({ label, value, pk }) {
//   return (
//     <View style={S.shedRow}>
//       <Text style={S.shedLabel}>{label}</Text>
//       <View style={{ alignItems: "flex-end" }}>
//         <Text style={S.shedValue}>{fL(value)}</Text>
//         {pk != null && <Text style={S.shedPk}>+₹{f3(pk)}/pk</Text>}
//       </View>
//     </View>
//   );
// }

// // ── Editable day input table ──────────────────────────────────────
// function DayInputTable({ days, cols, rows, setRows, onAddDay }) {
//   return (
//     <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//       <View>
//         {/* Header */}
//         <View style={S.tableRow}>
//           <Text style={[S.th, { minWidth: 70, textAlign: "left" }]}>Date</Text>
//           {cols.map((c) => (
//             <Text key={c} style={S.th}>
//               {c}
//             </Text>
//           ))}
//         </View>
//         {/* Data rows */}
//         {rows.map((row, ri) => (
//           <View key={ri} style={S.tableRow}>
//             <Text
//               style={[
//                 S.td,
//                 { minWidth: 70, textAlign: "left", fontWeight: "500" },
//               ]}
//             >
//               {row.date}
//             </Text>
//             {cols.map((c, ci) => (
//               <TextInput
//                 key={ci}
//                 style={S.tdInput}
//                 value={String(row.values[ci] || "")}
//                 onChangeText={(v) => {
//                   const updated = rows.map((r, rr) => {
//                     if (rr !== ri) return r;
//                     const vals = [...r.values];
//                     vals[ci] = v;
//                     return { ...r, values: vals };
//                   });
//                   setRows(updated);
//                 }}
//                 keyboardType="numeric"
//                 placeholder="0"
//                 placeholderTextColor="#d1d5db"
//                 editable={false}
//               />
//             ))}
//           </View>
//         ))}
//         {/* Totals */}
//         <View
//           style={[S.tableRow, { borderTopWidth: 1, borderTopColor: "#e5e7eb" }]}
//         >
//           <Text
//             style={[
//               S.th,
//               { minWidth: 70, textAlign: "left", color: "#c2823a" },
//             ]}
//           >
//             TOTAL
//           </Text>
//           {cols.map((c, ci) => {
//             const tot = rows.reduce(
//               (sum, r) => sum + (Number(r.values[ci]) || 0),
//               0
//             );
//             return (
//               <Text key={ci} style={[S.th, { color: "#c2823a" }]}>
//                 {fN(tot)}
//               </Text>
//             );
//           })}
//         </View>
//       </View>
//     </ScrollView>
//   );
// }

// // ── Daily Units view ──────────────────────────────────────────────

// function DailyUnitsView({ d, onBack }) {
//   const COLS = [
//     "MW Loom",
//     "MW Luwa",
//     "Sud Loom",
//     "Sud Luwa",
//     "WJet Loom",
//     "Warp",
//     "M",
//   ];
//   const initRows = (d.daily || []).map((r) => ({
//     date: r.date,
//     values: [
//       r.mw_looms,
//       r.mw_luwa,
//       r.sd_looms,
//       r.sd_luwa,
//       r.wj_looms,
//       r.warping,
//       r.misc,
//     ],
//   }));
//   const [rows, setRows] = useState(initRows);
//   const totalKwh = rows.reduce(
//     (s, r) => s + r.values.reduce((a, v) => a + (Number(v) || 0), 0),
//     0
//   );

//   const addDay = () => {
//     const nextDate = `${String(rows.length + 1).padStart(2, "0")}-${
//       rows[0]?.date?.split("-")[1] || "Jun"
//     }`;
//     setRows((prev) => [
//       ...prev,
//       { date: nextDate, values: Array(COLS.length).fill("") },
//     ]);
//   };

//   return (
//     <View>
//       <TouchableOpacity onPress={onBack} style={{ marginBottom: 14 }}>
//         <Text style={S.subBack}>‹ Back to report</Text>
//       </TouchableOpacity>
//       <Text style={S.subTitle}>Daily units consumed</Text>
//       <Text style={S.subDesc}>
//         Sub-meter readings in kWh per day. "Misc" is the unmetered residual.
//         Monthly totals flow straight into the dashboard and electricity cost.
//       </Text>

//       <DayInputTable
//         days={d.days}
//         cols={COLS}
//         rows={rows}
//         setRows={setRows}
//         onAddDay={addDay}
//       />

//       <TouchableOpacity style={S.addDayBtn} onPress={addDay}>
//         <Text style={S.addDayText}>+ Add a day</Text>
//       </TouchableOpacity>

//       <View style={S.footCard}>
//         <View>
//           <Text style={S.footLabel}>TOTAL UNITS</Text>
//           <Text style={{ fontSize: 16, fontWeight: "600" }}>
//             {fN(totalKwh)}{" "}
//             <Text style={{ fontSize: 13, color: "#9ca3af" }}>kWh</Text>
//           </Text>
//         </View>
//         <View style={{ alignItems: "flex-end" }}>
//           <Text style={S.footLabel}>ELECTRICITY @ ₹{d.unit_rate}</Text>
//           <Text style={{ fontSize: 14, fontWeight: "600", color: "#c2823a" }}>
//             {fL(d.elec_total)}
//           </Text>
//         </View>
//       </View>
//     </View>
//   );
// }

// // ── Daily Salary view ─────────────────────────────────────────────
// function DailySalaryView({ d, onBack }) {
//   const COLS = ["Rapier ₹", "Waterjet ₹", "Total"];
//   const initRows = (d.daily || []).map((r) => ({
//     date: r.date,
//     values: [r.sal_r, r.sal_w, r.sal_t],
//   }));
//   const [rows, setRows] = useState(initRows);

//   const addDay = () => {
//     const nextDate = `${String(rows.length + 1).padStart(2, "0")}-${
//       rows[0]?.date?.split("-")[1] || "Jun"
//     }`;
//     setRows((prev) => [...prev, { date: nextDate, values: ["", "", ""] }]);
//   };

//   const tR = rows.reduce((s, r) => s + (Number(r.values[0]) || 0), 0);
//   const tW = rows.reduce((s, r) => s + (Number(r.values[1]) || 0), 0);
//   const tT = rows.reduce((s, r) => s + (Number(r.values[2]) || 0), 0);

//   return (
//     <View>
//       <TouchableOpacity onPress={onBack} style={{ marginBottom: 14 }}>
//         <Text style={S.subBack}>‹ Back to report</Text>
//       </TouchableOpacity>
//       <Text style={S.subTitle}>Daily salary expenses</Text>
//       <Text style={S.subDesc}>
//         Daily wage cost per shed (₹). Kept separate from utilities. Monthly
//         totals flow into the dashboard.
//       </Text>

//       <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//         <View>
//           <View style={S.tableRow}>
//             <Text style={[S.th, { minWidth: 70, textAlign: "left" }]}>
//               Date
//             </Text>
//             {COLS.map((c) => (
//               <Text key={c} style={S.th}>
//                 {c}
//               </Text>
//             ))}
//           </View>
//           {rows.map((row, ri) => (
//             <View key={ri} style={S.tableRow}>
//               <Text
//                 style={[
//                   S.td,
//                   { minWidth: 70, textAlign: "left", fontWeight: "500" },
//                 ]}
//               >
//                 {row.date}
//               </Text>
//               {[0, 1].map((ci) => (
//                 <TextInput
//                   key={ci}
//                   style={S.tdInput}
//                   value={String(row.values[ci] || "")}
//                   onChangeText={(v) => {
//                     setRows(
//                       rows.map((r, rr) => {
//                         if (rr !== ri) return r;
//                         const vals = [...r.values];
//                         vals[ci] = v;
//                         vals[2] = String(
//                           (Number(vals[0]) || 0) + (Number(vals[1]) || 0)
//                         );
//                         return { ...r, values: vals };
//                       })
//                     );
//                   }}
//                   keyboardType="numeric"
//                   placeholder="0"
//                   placeholderTextColor="#d1d5db"
//                 />
//               ))}
//               <Text style={[S.td, { color: "#c2823a", fontWeight: "500" }]}>
//                 {fN(Number(row.values[2]) || 0)}
//               </Text>
//             </View>
//           ))}
//           <View
//             style={[
//               S.tableRow,
//               { borderTopWidth: 1, borderTopColor: "#e5e7eb" },
//             ]}
//           >
//             <Text
//               style={[
//                 S.th,
//                 { minWidth: 70, textAlign: "left", color: "#c2823a" },
//               ]}
//             >
//               TOTAL
//             </Text>
//             <Text style={[S.th, { color: "#c2823a" }]}>₹{fN(tR)}</Text>
//             <Text style={[S.th, { color: "#c2823a" }]}>₹{fN(tW)}</Text>
//             <Text style={[S.th, { color: "#c2823a" }]}>₹{fN(tT)}</Text>
//           </View>
//         </View>
//       </ScrollView>

//       <TouchableOpacity style={S.addDayBtn} onPress={addDay}>
//         <Text style={S.addDayText}>+ Add a day</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// // ── Daily Maintenance / Other view ────────────────────────────────
// function DailyInputView({ title, desc, d, onBack }) {
//   const COLS = ["Rapier", "Waterjet", "Common"];
//   const initRows = (d.daily || []).map((r) => ({
//     date: r.date,
//     values: ["", "", ""],
//   }));
//   const [rows, setRows] = useState(initRows);

//   const addDay = () => {
//     const nextDate = `${String(rows.length + 1).padStart(2, "0")}-${
//       rows[0]?.date?.split("-")[1] || "Jun"
//     }`;
//     setRows((prev) => [...prev, { date: nextDate, values: ["", "", ""] }]);
//   };

//   const totals = COLS.map((_, ci) =>
//     rows.reduce((s, r) => s + (Number(r.values[ci]) || 0), 0)
//   );
//   const rapier = totals[0] + totals[2] / 2;
//   const waterjet = totals[1] + totals[2] / 2;
//   const total = rapier + waterjet;

//   return (
//     <View>
//       <TouchableOpacity onPress={onBack} style={{ marginBottom: 14 }}>
//         <Text style={S.subBack}>‹ Back to report</Text>
//       </TouchableOpacity>
//       <Text style={S.subTitle}>{title}</Text>
//       <Text style={S.subDesc}>{desc}</Text>

//       <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//         <View>
//           <View style={S.tableRow}>
//             <Text style={[S.th, { minWidth: 70, textAlign: "left" }]}>
//               Date
//             </Text>
//             {COLS.map((c) => (
//               <Text key={c} style={S.th}>
//                 {c}
//               </Text>
//             ))}
//           </View>
//           {rows.map((row, ri) => (
//             <View key={ri} style={S.tableRow}>
//               <Text
//                 style={[
//                   S.td,
//                   { minWidth: 70, textAlign: "left", fontWeight: "500" },
//                 ]}
//               >
//                 {row.date}
//               </Text>
//               {COLS.map((c, ci) => (
//                 <TextInput
//                   key={ci}
//                   style={S.tdInput}
//                   value={String(row.values[ci] || "")}
//                   onChangeText={(v) => {
//                     setRows(
//                       rows.map((r, rr) => {
//                         if (rr !== ri) return r;
//                         const vals = [...r.values];
//                         vals[ci] = v;
//                         return { ...r, values: vals };
//                       })
//                     );
//                   }}
//                   keyboardType="numeric"
//                   placeholder="0"
//                   placeholderTextColor="#d1d5db"
//                 />
//               ))}
//             </View>
//           ))}
//           <View
//             style={[
//               S.tableRow,
//               { borderTopWidth: 1, borderTopColor: "#e5e7eb" },
//             ]}
//           >
//             <Text
//               style={[
//                 S.th,
//                 { minWidth: 70, textAlign: "left", color: "#534AB7" },
//               ]}
//             >
//               TOTAL
//             </Text>
//             {totals.map((t, i) => (
//               <Text key={i} style={[S.th, { color: "#534AB7" }]}>
//                 ₹{fN(t)}
//               </Text>
//             ))}
//           </View>
//         </View>
//       </ScrollView>

//       <TouchableOpacity style={S.addDayBtn} onPress={addDay}>
//         <Text style={S.addDayText}>+ Add a day</Text>
//       </TouchableOpacity>

//       <View style={S.allocCard}>
//         <Text style={S.allocLabel}>AFTER ½ : ½ ALLOCATION</Text>
//         <View
//           style={{
//             flexDirection: "row",
//             justifyContent: "space-around",
//             marginTop: 8,
//           }}
//         >
//           {[
//             ["Rapier", rapier],
//             ["Waterjet", waterjet],
//             ["Total", total],
//           ].map(([l, v]) => (
//             <View key={l} style={{ alignItems: "center" }}>
//               <Text style={{ fontSize: 11, color: "#0000", marginBottom: 3 }}>
//                 {l}
//               </Text>
//               <Text
//                 style={{ fontSize: 16, fontWeight: "600", color: "#c2823a" }}
//               >
//                 ₹{fN(v)}
//               </Text>
//             </View>
//           ))}
//         </View>
//       </View>
//     </View>
//   );
// }

// // ── KPI grid ──────────────────────────────────────────────────────
// function KPIGrid({ d, label }) {
//   const items = [
//     {
//       l: "TOTAL COST",
//       v: fCr(d.total),
//       s: `${label} · ${d.days} days`,
//       c: "#c2823a",
//     },
//     {
//       l: "COST / PICK",
//       v: `₹${f3(d.cpp_total)}`,
//       s: "all sheds",
//       c: "#c2823a",
//     },
//     { l: "AVG PICKS", v: f2(d.avg_pick_tot), s: "prod-weighted", c: "#1D9E75" },
//     {
//       l: "PRODUCTION",
//       v: `${f2(d.prod_total_L)} L m`,
//       s: `${fN(d.prod_total / d.days)} m / mc·day`,
//       c: "#1D9E75",
//     },
//     { l: "COST / MC·DAY", v: `₹${fN(d.cpmc)}`, s: "126 looms", c: "#534AB7" },
//     {
//       l: "UNITS",
//       v: `${Math.round(d.kwh_total / 1000)}K kWh`,
//       s: `@ ₹${d.unit_rate}/unit`,
//       c: "#BA7517",
//     },
//   ];
//   return (
//     <View style={S.kpiGrid}>
//       {items.map((k, i) => (
//         <View key={i} style={[S.kpiCard, { borderTopColor: k.c }]}>
//           <Text style={S.kpiLabel}>{k.l}</Text>
//           <Text style={S.kpiValue}>{k.v}</Text>
//           <Text style={S.kpiSub}>{k.s}</Text>
//         </View>
//       ))}
//     </View>
//   );
// }

// // ── Mgmt card ─────────────────────────────────────────────────────
// function MgmtCard({
//   name,
//   borderColor,
//   prod,
//   pk,
//   elec,
//   sal,
//   store,
//   cpp,
//   cpmc,
// }) {
//   return (
//     <View style={[S.mgmtCard, { borderLeftColor: borderColor }]}>
//       <View style={S.mgmtHeader}>
//         <Text style={S.mgmtName}>{name}</Text>
//         <Text style={S.mgmtSub}>
//           {f2(prod / 1e5)} L m · {f2(pk)} pk
//         </Text>
//       </View>
//       <View style={S.mgmtBody}>
//         {[
//           ["#185FA5", "Electricity", elec],
//           ["#c2823a", "Salary", sal],
//           ["#1D9E75", "Stores", store],
//         ].map(([c, l, v]) => (
//           <View key={l} style={S.mgmtRow}>
//             <View
//               style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
//             >
//               <View style={[S.colorDot, { backgroundColor: c }]} />
//               <Text style={S.mgmtRowLabel}>{l}</Text>
//             </View>
//             <View style={{ alignItems: "flex-end" }}>
//               <Text style={S.mgmtRowValue}>{fL(v)}</Text>
//               <Text style={S.mgmtRowPk}>+₹{f3(v / prod / pk)}/pk</Text>
//             </View>
//           </View>
//         ))}
//       </View>
//       <View style={S.mgmtFooter}>
//         <View style={{ flex: 1 }}>
//           <Text style={S.mgmtFootLabel}>COST / PICK</Text>
//           <Text style={[S.mgmtFootValue, { color: "#c2823a" }]}>
//             ₹{f3(cpp)}
//           </Text>
//         </View>
//         <View style={{ flex: 1 }}>
//           <Text style={S.mgmtFootLabel}>AVG PICKS</Text>
//           <Text style={S.mgmtFootValue}>{f2(pk)}</Text>
//         </View>
//       </View>
//     </View>
//   );
// }

// // ── Past performance row ──────────────────────────────────────────
// function PastRow({ month, st, open, onToggle }) {
//   const d = st.data;
//   return (
//     <TouchableOpacity
//       style={S.pastCard}
//       onPress={onToggle}
//       activeOpacity={0.75}
//     >
//       <View style={S.pastTop}>
//         <View style={{ flex: 1 }}>
//           <Text style={S.pastMonth}>{month.fullLabel}</Text>
//           <Text style={S.pastSub}>
//             {st.status === "loading"
//               ? "Loading…"
//               : st.status === "error"
//               ? "Failed"
//               : d
//               ? `${f2(d.prod_total_L)} L m · ${d.days} days`
//               : "—"}
//           </Text>
//         </View>
//         <View
//           style={{ flexDirection: "row", alignItems: "flex-start", gap: 5 }}
//         >
//           {st.status === "loading" && (
//             <View
//               style={{
//                 width: 70,
//                 height: 14,
//                 backgroundColor: "#f3f4f6",
//                 borderRadius: 4,
//               }}
//             />
//           )}
//           {st.status === "done" && d && (
//             <View style={{ alignItems: "flex-end" }}>
//               <Text
//                 style={{ fontSize: 15, fontWeight: "600", color: "#c2823a" }}
//               >
//                 {fCr(d.total)}
//               </Text>
//               <Text style={{ fontSize: 11, color: "#000", marginTop: 2 }}>
//                 ₹{f3(d.cpp_total)}/pk
//               </Text>
//             </View>
//           )}
//           {d && (
//             <Text
//               style={[
//                 S.pastChevron,
//                 open && { transform: [{ rotate: "180deg" }] },
//               ]}
//             >
//               ▾
//             </Text>
//           )}
//         </View>
//       </View>

//       {open && d && (
//         <View style={S.pastExpanded}>
//           {[
//             ["#185FA5", "Electricity", d.elec_total],
//             ["#c2823a", "Salary", d.sal_total],
//             ["#1D9E75", "Stores", d.store_total],
//           ].map(([c, l, v]) => (
//             <View key={l} style={S.pastRow2}>
//               <View
//                 style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
//               >
//                 <View style={[S.colorDot, { backgroundColor: c }]} />
//                 <Text style={{ fontSize: 13, color: "#000" }}>{l}</Text>
//               </View>
//               <View
//                 style={{ flexDirection: "row", gap: 5, alignItems: "center" }}
//               >
//                 <Text style={{ fontSize: 13 }}>{fL(v)}</Text>
//                 <Text style={{ fontSize: 11, color: "#000" }}>
//                   {d.total > 0 ? ((v / d.total) * 100).toFixed(1) : 0}%
//                 </Text>
//               </View>
//             </View>
//           ))}
//           <View style={S.pastMiniGrid}>
//             {[
//               ["Cost / pick", `₹${f3(d.cpp_total)}`],
//               ["Cost / mc·day", `₹${fN(d.cpmc)}`],
//               [
//                 "Rapier",
//                 `${fLn(d.total_rapier || 0)} · ${d.rapier_pct?.toFixed(1)}%`,
//               ],
//               [
//                 "W-Jet",
//                 `${fLn(d.total_wjet || 0)} · ${d.wjet_pct?.toFixed(1)}%`,
//               ],
//             ].map(([l, v]) => (
//               <View key={l} style={S.pastMiniCard}>
//                 <Text style={S.pastMiniLabel}>{l}</Text>
//                 <Text style={S.pastMiniValue}>{v}</Text>
//               </View>
//             ))}
//           </View>
//         </View>
//       )}
//     </TouchableOpacity>
//   );
// }

// // ── Month Settings ────────────────────────────────────────────────
// function MonthSettings({ d, monthKey }) {
//   const [unitRate, setUnitRate] = useState(String(d.unit_rate || 0));
//   const [days, setDays] = useState(String(d.days || 0));
//   const [storeR, setStoreR] = useState(String(Math.round(d.store_rapier || 0)));
//   const [storeW, setStoreW] = useState(String(Math.round(d.store_wjet || 0)));

//   const save = async () => {
//     try {
//       await AsyncStorage.setItem(
//         `month_settings_${monthKey}`,
//         JSON.stringify({ unitRate, days, storeR, storeW })
//       );
//     } catch (_) {}
//   };

//   return (
//     <View style={S.settingsCard}>
//       {[
//         ["Unit rate (₹/kWh)", unitRate, setUnitRate],
//         ["Working days", days, setDays],
//         ["Stores — Rapier (₹/mo)", storeR, setStoreR],
//         ["Stores — Waterjet (₹/mo)", storeW, setStoreW],
//       ].map(([label, val, setter]) => (
//         <View key={label} style={S.settingsRow}>
//           <Text style={S.settingsLabel}>{label}</Text>
//           <TextInput
//             style={S.settingsInput}
//             value={val}
//             onChangeText={setter}
//             onBlur={save}
//             keyboardType="numeric"
//             editable={false}
//           />
//         </View>
//       ))}
//     </View>
//   );
// }

// // ── Production block ──────────────────────────────────────────────
// function ProductionBlock({ d }) {
//   return (
//     <View style={S.prodBlock}>
//       <View
//         style={{
//           flexDirection: "row",
//           alignItems: "center",
//           justifyContent: "space-between",
//           marginBottom: 8,
//         }}
//       >
//         <Text
//           style={{
//             fontSize: 10,
//             color: "#000",
//             textTransform: "uppercase",
//             letterSpacing: 0.7,
//           }}
//         >
//           Production · from production system
//         </Text>
//         <View
//           style={{
//             backgroundColor: "#E1F5EE",
//             paddingHorizontal: 7,
//             paddingVertical: 2,
//             borderRadius: 10,
//           }}
//         >
//           <Text style={{ fontSize: 10, color: "#0F6E56", fontWeight: "600" }}>
//             AUTO
//           </Text>
//         </View>
//       </View>
//       {[
//         ["Rapier", d.prod_rapier, d.avg_pick_mw],
//         ["Waterjet", d.prod_wjet, d.avg_pick_wjet],
//       ].map(([l, p, pk]) => (
//         <View
//           key={l}
//           style={{
//             flexDirection: "row",
//             justifyContent: "space-between",
//             marginBottom: 5,
//           }}
//         >
//           <Text style={{ fontSize: 13, fontWeight: "500" }}>{l}</Text>
//           <View style={{ alignItems: "flex-end" }}>
//             <Text style={{ fontSize: 13, fontWeight: "600" }}>
//               {f2(p / 1e5)} L m
//             </Text>
//             <Text style={{ fontSize: 11, color: "#000" }}>{pk} pk</Text>
//           </View>
//         </View>
//       ))}
//       <Text style={{ fontSize: 11, color: "#000", marginTop: 4 }}>
//         Meters & picks flow in from the loom production feed — read-only here.
//       </Text>
//     </View>
//   );
// }

// // ── Main Screen ───────────────────────────────────────────────────
// export default function ExpenseScreen({ token, apiBase }) {
//   const { months, states, loadedCount, total, refresh, retryMonth } =
//     useExpenseData({ token, apiBase });

//   // FIX: this screen used to render its own hand-rolled header block
//   // ("MADHUSUDHAN FABRICS" / "Expense" / "Production · Cost" / refresh
//   // button) — the 6th duplicate-header instance found across this app.
//   // The header is rendered once, in app/new/(tabs)/_layout.tsx; the
//   // refresh button and the "Production · Cost" context line now reach it
//   // through the shared extras store instead.
//   const setHeaderExtras = useHeaderExtrasStore((s) => s.setHeaderExtras);
//   const clearHeaderExtras = useHeaderExtrasStore((s) => s.clearHeaderExtras);
//   useFocusEffect(
//     useCallback(() => {
//       setHeaderExtras({
//         subtitle: "Production · Cost",
//         right: (
//           <TouchableOpacity onPress={refresh} style={header.refresh} activeOpacity={0.75}>
//             <Text style={header.refreshText}>↻</Text>
//           </TouchableOpacity>
//         ),
//       });
//       return () => clearHeaderExtras();
//     }, [refresh, setHeaderExtras, clearHeaderExtras]),
//   );

//   const [activeTab, setActiveTab] = useState(0);
//   const [view, setView] = useState("report");
//   const [pastOpen, setPastOpen] = useState({});
//   const scrollRef = useRef < ScrollView > null;

//   const m = months[activeTab];
//   const st = states[m?.key];
//   const d = st?.data;

//   const prevM = months[activeTab + 1];
//   const prevD = prevM ? states[prevM?.key]?.data : null;

//   const togglePast = useCallback(
//     (i) => setPastOpen((p) => ({ ...p, [i]: !p[i] })),
//     []
//   );

//   if (!m) return null;

//   // ── Sub-views ─────────────────────────────────────────────────
//   const subViews = {
//     "daily-units": (
//       <DailyUnitsView d={d || { daily: [] }} onBack={() => setView("report")} />
//     ),
//     "daily-salary": (
//       <DailySalaryView
//         d={d || { daily: [] }}
//         onBack={() => setView("report")}
//       />
//     ),
//     "daily-maint": (
//       <DailyInputView
//         title="Daily maintenance"
//         d={d || { daily: [] }}
//         onBack={() => setView("report")}
//         desc="Maintenance & repair spend per day (₹). Enter per shed, or under Common for shared cost — common auto-splits ½ Rapier / ½ Waterjet."
//       />
//     ),
//     "daily-other": (
//       <DailyInputView
//         title="Daily other expenses"
//         d={d || { daily: [] }}
//         onBack={() => setView("report")}
//         desc="Other direct / indirect expenses per day (₹). Enter per shed, or under Common for shared cost — common auto-splits ½ Rapier / ½ Waterjet."
//       />
//     ),
//   };

//   if (subViews[view]) {
//     return (
//       <View style={S.safe}>
//         <ScrollView
//           ref={scrollRef}
//           style={S.body}
//           contentContainerStyle={{ paddingBottom: 32 }}
//         >
//           {subViews[view]}
//         </ScrollView>
//       </View>
//     );
//   }

//   // ── Main report ───────────────────────────────────────────────
//   return (
//     <View style={S.safe}>
//       <ScrollView
//         style={S.body}
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{ paddingBottom: 32 }}
//       >
//         {/* Month tabs */}
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           style={{ marginBottom: 14 }}
//         >
//           <View style={{ flexDirection: "row", gap: 6 }}>
//             {months.map((mo, i) => (
//               <MonthTab
//                 key={mo.key}
//                 label={mo.label}
//                 active={activeTab === i}
//                 status={states[mo.key]?.status}
//                 onPress={() => {
//                   setActiveTab(i);
//                   setView("report");
//                 }}
//               />
//             ))}
//           </View>
//         </ScrollView>

//         {/* Loading */}
//         {st?.status === "loading" && (
//           <View>
//             <Skeleton h={140} />
//             <Skeleton h={80} />
//             <Skeleton h={80} />
//             <Skeleton h={80} />
//           </View>
//         )}

//         {/* Error */}
//         {st?.status === "error" && (
//           <View style={S.errorBox}>
//             <Text style={S.errorText}>Failed to load {m.fullLabel}</Text>
//             <TouchableOpacity
//               onPress={() => retryMonth(m.key)}
//               style={S.retryBtn}
//             >
//               <Text style={S.retryText}>Retry</Text>
//             </TouchableOpacity>
//           </View>
//         )}

//         {/* Data */}
//         {st?.status === "done" && d && (
//           <>
//             <KPIGrid d={d} label={m.fullLabel} />

//             {/* Cost composition donut */}
//             <View style={S.compositionCard}>
//               <Text style={S.compositionTitle}>
//                 Cost composition · {m.shortLabel} '{m.displayYear}
//               </Text>
//               <DonutChart
//                 elec={d.elec_total}
//                 sal={d.sal_total}
//                 stores={d.store_total}
//                 total={d.total}
//               />
//             </View>

//             {/* Management summary */}
//             <Text style={S.sectionLabel}>MANAGEMENT SUMMARY</Text>
//             <MgmtCard
//               name="Rapier"
//               borderColor="#c2823a"
//               prod={d.prod_rapier}
//               pk={d.avg_pick_mw}
//               elec={d.elec_rapier}
//               sal={d.sal_rapier}
//               store={d.store_rapier}
//               cpp={d.cpp_rapier}
//               cpmc={d.cpmc_rapier || 0}
//             />
//             <MgmtCard
//               name="Waterjet"
//               borderColor="#185FA5"
//               prod={d.prod_wjet}
//               pk={d.avg_pick_wjet}
//               elec={d.elec_wjet}
//               sal={d.sal_wjet}
//               store={d.store_wjet}
//               cpp={d.cpp_wjet}
//               cpmc={d.cpmc_wjet || 0}
//             />
//             <MgmtCard
//               name="Total"
//               borderColor="#e5e7eb"
//               prod={d.prod_total}
//               pk={d.avg_pick_tot}
//               elec={d.elec_total}
//               sal={d.sal_total}
//               store={d.store_total}
//               cpp={d.cpp_total}
//               cpmc={d.cpmc}
//             />

//             {/* Expense breakdown */}
//             <Text style={S.sectionLabel}>EXPENSE BREAKDOWN</Text>

//             {/* Utilities */}
//             <ExpBlock
//               icon="⚡"
//               iconColor="#185FA5"
//               iconBg="#EFF6FF"
//               title="Utilities / units consumed"
//               sub={`${fN(d.kwh_total)} kWh @ ₹${d.unit_rate}`}
//               amt={fLn(d.elec_total)}
//               // editLabel="Edit ›"
//               onEdit={() => setView("daily-units")}
//             >
//               {[
//                 ["MW Rapier — Looms", d.kwh_mw_looms, d.elec_mw_looms],
//                 ["MW Rapier — Luwa (humid.)", d.kwh_mw_luwa, d.elec_mw_luwa],
//                 ["Sud Rapier — Looms", d.kwh_sd_looms, d.elec_sd_looms],
//                 ["Sud Rapier — Luwa (humid.)", d.kwh_sd_luwa, d.elec_sd_luwa],
//                 ["Sud W-Jet — Looms", d.kwh_wj_looms, d.elec_wj_looms],
//                 ["Warping (shared)", d.kwh_warping, d.elec_warping],
//                 ["Miscellaneous (shared)", d.kwh_misc, d.elec_misc],
//               ].map(([label, kwh, cost]) => (
//                 <BarRow
//                   key={label}
//                   label={label}
//                   kwh={kwh}
//                   cost={cost}
//                   pct={d.kwh_total > 0 ? (kwh / d.kwh_total) * 100 : 0}
//                   costPct={d.elec_total > 0 ? (cost / d.elec_total) * 100 : 0}
//                 />
//               ))}
//               <Text style={{ fontSize: 11, color: "#000", marginTop: 4 }}>
//                 Warping + Misc are shared — allocated ⅔ Rapier, ⅓ Waterjet in
//                 costing.
//               </Text>
//             </ExpBlock>

//             {/* Salaries */}
//             <ExpBlock
//               icon="₹"
//               iconColor="#c2823a"
//               iconBg="#FDF3E8"
//               title="Salaries / wages"
//               sub="Rapier + Waterjet"
//               amt={fLn(d.sal_total)}
//               // editLabel="Edit ›"
//               // onEdit={() => setView('daily-salary')}
//               onEdit={() => {
//                 setView("daily-salary");

//                 setTimeout(() => {
//                   scrollRef.current?.scrollTo({
//                     y: 0,
//                     animated: false,
//                   });
//                 }, 50);
//               }}
//             >
//               <ShedRow
//                 label="Rapier shed"
//                 value={d.sal_rapier}
//                 pk={d.sal_rapier / d.prod_rapier / d.avg_pick_mw}
//               />
//               <ShedRow
//                 label="Waterjet shed"
//                 value={d.sal_wjet}
//                 pk={d.sal_wjet / d.prod_wjet / d.avg_pick_wjet}
//               />
//               <View style={S.shedTotal}>
//                 <Text style={[S.shedLabel, { fontWeight: "600" }]}>Total</Text>
//                 <Text style={[S.shedValue, { fontWeight: "600" }]}>
//                   {fL(d.sal_total)} · +₹
//                   {f3(d.sal_total / d.prod_total / d.avg_pick_tot)}/pk
//                 </Text>
//               </View>
//             </ExpBlock>

//             {/* Stores */}
//             <ExpBlock
//               icon="📦"
//               iconColor="#1D9E75"
//               iconBg="#E1F5EE"
//               title="Production-linked expenses"
//               sub="Stores & spares"
//               amt={fLn(d.store_total)}
//             >
//               <ShedRow
//                 label="Rapier stores"
//                 value={d.store_rapier}
//                 pk={d.store_rapier / d.prod_rapier / d.avg_pick_mw}
//               />
//               <ShedRow
//                 label="Waterjet stores"
//                 value={d.store_wjet}
//                 pk={d.store_wjet / d.prod_wjet / d.avg_pick_wjet}
//               />
//               <View style={S.shedTotal}>
//                 <Text style={[S.shedLabel, { fontWeight: "600" }]}>Total</Text>
//                 <Text style={[S.shedValue, { fontWeight: "600" }]}>
//                   {fL(d.store_total)} · +₹
//                   {f3(d.store_total / d.prod_total / d.avg_pick_tot)}/pk
//                 </Text>
//               </View>
//             </ExpBlock>

//             {/* Maintenance */}
//             <ExpBlock
//               icon="🔧"
//               iconColor="#534AB7"
//               iconBg="#EEEDFE"
//               title="Maintenance"
//               sub="Rapier · Waterjet · common (½½)"
//               amt="₹0"
//               // editLabel="Edit ›"
//               onEdit={() => setView("daily-maint")}
//             >
//               {[
//                 ["Rapier", 0],
//                 ["Waterjet", 0],
//                 ["Total", 0],
//               ].map(([l, v]) => (
//                 <View key={l} style={S.shedRow}>
//                   <Text style={S.shedLabel}>{l}</Text>
//                   <Text style={S.shedValue}>₹{fN(v)} · +₹0.000/pk</Text>
//                 </View>
//               ))}
//               <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
//                 Common maintenance auto-splits ½ Rapier / ½ Waterjet. Enter
//                 day-wise via the input module above.
//               </Text>
//             </ExpBlock>

//             {/* Other */}
//             <ExpBlock
//               icon="+"
//               iconColor="#BA7517"
//               iconBg="#FAEEDA"
//               title="Other expenses"
//               sub="Direct / indirect"
//               amt="₹0"
//               // editLabel="Edit ›"
//               onEdit={() => setView("daily-other")}
//             >
//               {[
//                 ["Rapier", 0],
//                 ["Waterjet", 0],
//                 ["Total", 0],
//               ].map(([l, v]) => (
//                 <View key={l} style={S.shedRow}>
//                   <Text style={S.shedLabel}>{l}</Text>
//                   <Text style={S.shedValue}>₹{fN(v)} · +₹0.000/pk</Text>
//                 </View>
//               ))}
//               <Text style={{ fontSize: 11, color: "#000", marginTop: 6 }}>
//                 Common items auto-split ½ Rapier / ½ Waterjet. Enter day-wise
//                 via the input module above.
//               </Text>
//             </ExpBlock>

//             {/* Final derived costing */}
//             <ExpBlock
//               icon="Σ"
//               iconColor="#c2823a"
//               iconBg="#FDF3E8"
//               title="Final derived costing"
//               sub={`₹${f3(d.cpp_total)}/pick · ${f2(d.avg_pick_tot)} picks`}
//               amt={`₹${f3(d.cpp_total)}/pk`}
//             >
//               {[
//                 ["#185FA5", "Electricity", d.elec_total],
//                 ["#c2823a", "Salary", d.sal_total],
//                 ["#1D9E75", "Stores", d.store_total],
//               ].map(([c, l, v]) => (
//                 <View key={l} style={S.finalRow}>
//                   <View
//                     style={{
//                       flexDirection: "row",
//                       alignItems: "center",
//                       gap: 6,
//                     }}
//                   >
//                     <View style={[S.colorDot, { backgroundColor: c }]} />
//                     <Text style={{ fontSize: 13 }}>{l}</Text>
//                   </View>
//                   <View style={{ alignItems: "flex-end" }}>
//                     <Text style={{ fontWeight: "500", fontSize: 13 }}>
//                       {fL(v)}
//                     </Text>
//                     <Text style={{ fontSize: 11, color: "#000" }}>
//                       +₹{f3(v / d.prod_total / d.avg_pick_tot)}/pk
//                     </Text>
//                   </View>
//                 </View>
//               ))}
//               <View style={S.finalTotal}>
//                 <Text style={{ fontWeight: "500" }}>Total cost</Text>
//                 <Text
//                   style={{ fontSize: 16, fontWeight: "600", color: "#c2823a" }}
//                 >
//                   {fCr(d.total)}
//                 </Text>
//               </View>
//               <View style={S.miniGrid}>
//                 {[
//                   ["COST / PICK", `₹${f3(d.cpp_total)}`],
//                   ["AVG PICKS", f2(d.avg_pick_tot)],
//                   ["COST / MC·DAY", `₹${fN(d.cpmc)}`],
//                 ].map(([l, v]) => (
//                   <View key={l} style={S.miniCard}>
//                     <Text style={S.miniLabel}>{l}</Text>
//                     <Text style={S.miniValue}>{v}</Text>
//                   </View>
//                 ))}
//               </View>
//               <Text style={{ fontSize: 11, color: "#000", marginTop: 8 }}>
//                 Cost / pick = total cost ÷ production metres ÷ avg picks (
//                 {f2(d.avg_pick_tot)}).
//               </Text>
//             </ExpBlock>

//             {/* Comparative analytics */}
//             <Text style={S.sectionLabel}>COMPARATIVE ANALYTICS · 6 MONTHS</Text>
//             <ComparativeChart months={months} states={states} />

//             {/* Efficiency indicators */}
//             <Text style={S.sectionLabel}>
//               EFFICIENCY INDICATORS · {m.fullLabel.toUpperCase()}
//             </Text>
//             <View style={S.effGrid}>
//               {[
//                 ["UNITS / METRE", `${f2(d.units_per_mtr)} kWh`],
//                 ["SALARY / METRE", `₹${f2(d.sal_per_mtr)}`],
//                 ["STORES / METRE", `₹${f2(d.store_per_mtr)}`],
//                 ["AVG PICKS", f2(d.avg_pick_tot)],
//                 ["PROD / MC·DAY", `${fN(d.prod_total / d.days)} m`],
//                 ["COST / MC·DAY", `₹${fN(d.cpmc)}`],
//               ].map(([l, v]) => (
//                 <View key={l} style={S.effCard}>
//                   <Text style={S.effLabel}>{l}</Text>
//                   <Text style={S.effValue}>{v}</Text>
//                 </View>
//               ))}
//             </View>

//             {/* Production block */}
//             <Text style={[S.sectionLabel, { marginTop: 8, color: "#000" }]}>
//               PRODUCTION · FROM PRODUCTION SYSTEM
//             </Text>
//             <ProductionBlock d={d} />

//             {/* Month settings */}
//             <Text style={[S.sectionLabel, { marginTop: 8 }]}>
//               MONTH SETTINGS · (ongoing month)
//             </Text>
//             <MonthSettings d={d} monthKey={m.key} />

//             {/* Production / Cost split donuts */}
//             <View style={S.donutRow}>
//               <View style={S.donutHalf}>
//                 <MiniDonut
//                   rapierPct={
//                     d.prod_total > 0 ? (d.prod_rapier / d.prod_total) * 100 : 0
//                   }
//                   label="Production split"
//                 />
//               </View>
//               <View style={S.donutHalf}>
//                 <MiniDonut rapierPct={d.rapier_pct || 0} label="Cost split" />
//               </View>
//             </View>

//             {/* Month-on-month */}
//             <View style={S.momCard}>
//               <Text style={S.momTitle}>Month-on-month</Text>
//               <Text style={S.momSub}>
//                 {prevD ? `vs ${prevM.fullLabel}` : "no prior month"}
//               </Text>
//               <View style={S.miniGrid}>
//                 {[
//                   ["TOTAL COST", fCr(d.total), d.total, prevD?.total],
//                   [
//                     "COST / PICK",
//                     `₹${f3(d.cpp_total)}`,
//                     d.cpp_total,
//                     prevD?.cpp_total,
//                   ],
//                   [
//                     "PRODUCTION",
//                     `${f2(d.prod_total_L)} L m`,
//                     d.prod_total_L,
//                     prevD?.prod_total_L,
//                   ],
//                 ].map(([l, v, c, p]) => (
//                   <View key={l} style={S.miniCard}>
//                     <Text style={S.miniLabel}>{l}</Text>
//                     <Text style={S.miniValue}>{v}</Text>
//                     <Text
//                       style={{
//                         fontSize: 11,
//                         marginTop: 1,
//                         color: c > (p || 0) ? "#ef4444" : "#1D9E75",
//                       }}
//                     >
//                       {prevD ? arrow(c, p) : "—"}
//                     </Text>
//                   </View>
//                 ))}
//               </View>
//             </View>

//             {/* Past performance */}
//             <Text style={S.sectionLabel}>PAST PERFORMANCE</Text>
//             {months.map((mo, i) => (
//               <PastRow
//                 key={mo.key}
//                 month={mo}
//                 st={states[mo.key]}
//                 open={!!pastOpen[i]}
//                 onToggle={() => togglePast(i)}
//               />
//             ))}
//           </>
//         )}
//       </ScrollView>
//     </View>
//   );
// }

// // ── Styles ────────────────────────────────────────────────────────
// const S = StyleSheet.create({
//   safe: { flex: 1, backgroundColor: "#f8f7f4" },
//   header: {
//     backgroundColor: T.nav,
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//   },
//   eyebrow: { fontSize: 10, fontWeight: "700", color: "#fff", letterSpacing: 1 },
//   headerRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   title: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 2 },
//   sub: { fontSize: 11, color: "#fff", marginTop: 2 },
//   refreshBtn: {
//     width: 32,
//     height: 32,
//     backgroundColor: "rgba(255,255,255,0.1)",
//     borderRadius: 16,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   refreshText: { color: "#fff", fontSize: 18 },
//   body: { flex: 1, paddingHorizontal: 12, paddingTop: 14 },

//   monthTab: {
//     paddingVertical: 5,
//     paddingHorizontal: 12,
//     borderRadius: 20,
//     borderWidth: 1,
//     borderColor: "#d1d5db",
//     backgroundColor: "#fff",
//     flexShrink: 0,
//     position: "relative",
//   },
//   monthTabActive: { backgroundColor: T.copper },
//   monthTabText: { fontSize: 13, color: "#000" },
//   monthTabTextActive: { color: "#fff" },
//   loadingRing: {
//     position: "absolute",
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     borderRadius: 20,
//     borderWidth: 1.5,
//     borderColor: "#c2823a",
//   },

//   sectionLabel: {
//     fontSize: 10,
//     color: "#000",
//     textTransform: "uppercase",
//     letterSpacing: 0.8,
//     marginTop: 14,
//     marginBottom: 8,
//   },

//   kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
//   kpiCard: {
//     width: "48%",
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 12,
//     borderTopWidth: 2.5,
//     borderWidth: 0.5,
//     borderColor: "#e5e7eb",
//   },
//   kpiLabel: {
//     fontSize: 10,
//     color: "#000",
//     letterSpacing: 0.7,
//     marginBottom: 5,
//   },
//   kpiValue: { fontSize: 17, fontWeight: "500", color: "#000", marginBottom: 2 },
//   kpiSub: { fontSize: 11, color: "#000" },

//   compositionCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 14,
//     marginBottom: 12,
//     borderWidth: 0.5,
//     borderColor: "#e5e7eb",
//   },
//   compositionTitle: {
//     fontSize: 13,
//     fontWeight: "500",
//     color: "#000",
//     marginBottom: 12,
//   },
//   donutWrap: { flexDirection: "row", alignItems: "center" },

//   mgmtCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     marginBottom: 8,
//     overflow: "hidden",
//     borderWidth: 0.5,
//     borderColor: "#e5e7eb",
//     borderLeftWidth: 3,
//   },
//   mgmtHeader: {
//     padding: 13,
//     borderBottomWidth: 0.5,
//     borderBottomColor: "#f3f4f6",
//   },
//   mgmtName: { fontSize: 14, fontWeight: "500", color: "#000" },
//   mgmtSub: { fontSize: 11, color: "#000" },
//   mgmtBody: { padding: 8 },
//   mgmtRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     paddingVertical: 4,
//   },
//   mgmtRowLabel: { fontSize: 13, color: "#000" },
//   mgmtRowValue: { fontSize: 13, fontWeight: "500" },
//   mgmtRowPk: { fontSize: 11, color: "#000" },
//   mgmtFooter: {
//     flexDirection: "row",
//     padding: 13,
//     borderTopWidth: 0.5,
//     borderTopColor: "#f3f4f6",
//     backgroundColor: "#fafafa",
//   },
//   mgmtFootLabel: {
//     fontSize: 10,
//     color: "#000",
//     textTransform: "uppercase",
//     letterSpacing: 0.6,
//   },
//   mgmtFootValue: { fontSize: 15, fontWeight: "500", marginTop: 2 },
//   colorDot: { width: 8, height: 8, borderRadius: 2 },

//   expBlock: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     marginBottom: 8,
//     overflow: "hidden",
//     borderWidth: 0.5,
//     borderColor: "#e5e7eb",
//   },
//   expHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     padding: 13,
//   },
//   expIcon: {
//     width: 34,
//     height: 34,
//     borderRadius: 10,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   expTitle: { fontSize: 13, fontWeight: "500", color: "#000" },
//   expSub: { fontSize: 11, color: "#000" },
//   editLabel: { fontSize: 12, color: "#c2823a" },
//   expAmt: { fontSize: 14, fontWeight: "600", marginRight: 2 },
//   expChevron: { fontSize: 13, color: "#000" },
//   expBody: { borderTopWidth: 0.5, borderTopColor: "#f3f4f6", padding: 13 },

//   shedRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingVertical: 6,
//     borderBottomWidth: 0.5,
//     borderBottomColor: "#f3f4f6",
//   },
//   shedTotal: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     paddingVertical: 6,
//     borderTopWidth: 0.5,
//     borderTopColor: "#e5e7eb",
//     marginTop: 4,
//   },
//   shedLabel: { fontSize: 13, color: "#000" },
//   shedValue: { fontSize: 13, fontWeight: "500" },
//   shedPk: { fontSize: 11, color: "#000" },

//   finalRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingVertical: 5,
//     borderBottomWidth: 0.5,
//     borderBottomColor: "#f3f4f6",
//   },
//   finalTotal: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingVertical: 8,
//     borderTopWidth: 0.5,
//     borderTopColor: "#e5e7eb",
//     marginTop: 4,
//   },
//   miniGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
//   miniCard: {
//     flex: 1,
//     minWidth: "30%",
//     backgroundColor: "#f8f7f4",
//     borderRadius: 8,
//     padding: 9,
//   },
//   miniLabel: {
//     fontSize: 10,
//     color: "#000",
//     textTransform: "uppercase",
//     letterSpacing: 0.5,
//   },
//   miniValue: { fontSize: 13, fontWeight: "500", marginTop: 3 },

//   chartCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 14,
//     marginBottom: 12,
//     borderWidth: 0.5,
//     borderColor: "#e5e7eb",
//   },
//   chartTitle: { fontSize: 13, fontWeight: "500", color: "#000" },
//   chartSub: { fontSize: 11, color: "#000" },
//   tooltip: {
//     position: "absolute",
//     top: 4,
//     left: 8,
//     backgroundColor: "#0f172a",
//     borderRadius: 8,
//     padding: 8,
//     zIndex: 10,
//   },
//   tooltipMonth: {
//     fontSize: 12,
//     fontWeight: "600",
//     color: "#fff",
//     marginBottom: 3,
//   },
//   tooltipLine: { fontSize: 11, color: "#000" },

//   effGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
//   effCard: {
//     width: "48%",
//     backgroundColor: "#f8f7f4",
//     borderRadius: 8,
//     padding: 10,
//   },
//   effLabel: {
//     fontSize: 10,
//     color: "#000",
//     textTransform: "uppercase",
//     letterSpacing: 0.5,
//   },
//   effValue: { fontSize: 14, fontWeight: "500", marginTop: 3 },

//   prodBlock: {
//     backgroundColor: "#f8f7f4",
//     borderRadius: 12,
//     padding: 13,
//     marginBottom: 10,
//     borderWidth: 0.5,
//     borderColor: "#e5e7eb",
//   },

//   settingsCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 14,
//     marginBottom: 10,
//     borderWidth: 0.5,
//     borderColor: "#e5e7eb",
//   },
//   settingsRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingVertical: 8,
//     borderBottomWidth: 0.5,
//     borderBottomColor: "#f3f4f6",
//   },
//   settingsLabel: { fontSize: 13, color: "#000", flex: 1 },
//   settingsInput: {
//     width: 90,
//     textAlign: "right",
//     borderWidth: 0.5,
//     borderColor: "#d1d5db",
//     borderRadius: 8,
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     fontSize: 13,
//     backgroundColor: "#f9fafb",
//     color: "#111827",
//   },

//   donutRow: {
//     flexDirection: "row",
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 10,
//     borderWidth: 0.5,
//     borderColor: "#e5e7eb",
//   },
//   donutHalf: { flex: 1, alignItems: "center" },

//   momCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 12,
//     marginBottom: 10,
//     borderWidth: 0.5,
//     borderColor: "#e5e7eb",
//   },
//   momTitle: { fontSize: 14, fontWeight: "500", marginBottom: 3 },
//   momSub: { fontSize: 11, color: "#000", marginBottom: 10 },

//   pastCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 14,
//     marginBottom: 7,
//     borderWidth: 0.5,
//     borderColor: "#e5e7eb",
//   },
//   pastTop: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "flex-start",
//   },
//   pastMonth: { fontSize: 14, fontWeight: "500", color: "#000" },
//   pastSub: { fontSize: 11, color: "#000", marginTop: 2 },
//   pastChevron: { fontSize: 13, color: "#000", marginTop: 2 },
//   pastExpanded: {
//     marginTop: 10,
//     borderTopWidth: 0.5,
//     borderTopColor: "#f3f4f6",
//     paddingTop: 8,
//   },
//   pastRow2: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     paddingVertical: 3,
//   },
//   pastMiniGrid: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 6,
//     marginTop: 8,
//   },
//   pastMiniCard: {
//     flex: 1,
//     minWidth: "45%",
//     backgroundColor: "#f8f7f4",
//     borderRadius: 8,
//     padding: 9,
//   },
//   pastMiniLabel: {
//     fontSize: 10,
//     color: "#000",
//     textTransform: "uppercase",
//     letterSpacing: 0.5,
//   },
//   pastMiniValue: { fontSize: 13, fontWeight: "500", marginTop: 2 },

//   tableRow: { flexDirection: "row" },
//   th: {
//     fontSize: 10,
//     color: "#000",
//     textTransform: "uppercase",
//     letterSpacing: 0.5,
//     padding: 5,
//     minWidth: 72,
//     textAlign: "right",
//     backgroundColor: "#f9fafb",
//     borderBottomWidth: 0.5,
//     borderBottomColor: "#d1d5db",
//   },
//   td: {
//     fontSize: 11,
//     padding: 5,
//     minWidth: 72,
//     textAlign: "right",
//     borderBottomWidth: 0.5,
//     borderBottomColor: "#f3f4f6",
//   },
//   tdInput: {
//     width: 72,
//     textAlign: "right",
//     padding: 4,
//     fontSize: 11,
//     backgroundColor: "#fff",
//     borderWidth: 0.5,
//     borderColor: "#e5e7eb",
//     borderRadius: 4,
//     color: "#000",
//   },
//   addDayBtn: {
//     backgroundColor: "#f8f7f4",
//     borderWidth: 0.5,
//     borderColor: "#d1d5db",
//     borderRadius: 10,
//     padding: 12,
//     alignItems: "center",
//     marginVertical: 10,
//   },
//   addDayText: { fontSize: 13, color: "#000" },

//   footCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 14,
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginTop: 8,
//     borderWidth: 0.5,
//     borderColor: "#e5e7eb",
//   },
//   footLabel: {
//     fontSize: 10,
//     color: "#000",
//     textTransform: "uppercase",
//     letterSpacing: 0.7,
//   },
//   allocCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 14,
//     marginTop: 8,
//     borderWidth: 0.5,
//     borderColor: "#e5e7eb",
//   },
//   allocLabel: {
//     fontSize: 10,
//     color: "#000",
//     textTransform: "uppercase",
//     letterSpacing: 0.7,
//     marginBottom: 4,
//   },

//   subBack: { fontSize: 13, color: "#c2823a", marginBottom: 14 },
//   subTitle: {
//     fontSize: 17,
//     fontWeight: "500",
//     marginBottom: 4,
//     color: "#111827",
//   },
//   subDesc: { fontSize: 12, color: "#000", marginBottom: 14, lineHeight: 18 },

//   errorBox: { alignItems: "center", padding: 24 },
//   errorText: { color: "#000", marginBottom: 12 },
//   retryBtn: {
//     backgroundColor: "#13879A",
//     paddingHorizontal: 20,
//     paddingVertical: 8,
//     borderRadius: 20,
//   },
//   retryText: { color: "#fff", fontWeight: "600" },
// });

// const header = StyleSheet.create({
//   wrap: {
//     backgroundColor: C.nav,
//     paddingHorizontal: 16,
//     paddingTop: 13,
//     paddingBottom: 15,
//   },
//   content: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   brand: {
//     color: "rgba(255,255,255,0.52)",
//     fontSize: 8.5,
//     lineHeight: 11,
//     fontWeight: "900",
//     letterSpacing: 1.45,
//   },
//   title: {
//     color: "#fff",
//     fontSize: 18,
//     lineHeight: 22,
//     fontWeight: "900",
//     marginTop: 3,
//   },
//   path: {
//     color: "rgba(255,255,255,0.78)",
//     fontSize: 9.5,
//     lineHeight: 13,
//     fontWeight: "700",
//     marginTop: 2,
//   },
//   pathSub: {
//     color: "rgba(255,255,255,0.52)",
//     fontSize: 8.5,
//     lineHeight: 12,
//     marginTop: 1,
//   },
//   refresh: {
//     width: 46,
//     height: 46,
//     borderRadius: 14,
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.18)",
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "rgba(255,255,255,0.04)",
//   },
//   refreshText: { color: "#fff", fontSize: 22, fontWeight: "800" },
// });

// ExpenseScreen.jsx — Madhusudhan Fabrics (React Native)
// Complete rebuild matching all 14 screenshots

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useHeaderExtrasStore } from "../../core/layout/headerExtras";
// SafeAreaView import removed — no longer used, the tabs layout now owns
// the top safe-area inset for every tab screen (see (tabs)/_layout.tsx).
import { useExpenseData } from "../../hooks/useExpenseData";
import { T } from "../../theme";
// Avg Picks — thin full-width tab + accordion, sits right below the month
// tabs and always reads/writes the SAME selected month (yearno/monthno) as
// the rest of this screen. See AvgPicksSection.js for the full logic (it
// mirrors Salary.js + AvgPicksCalendar.jsx from the web app 1:1).
import { useAppSessionStore } from '@/src/stores/AppSessionStore';
import AvgPicksSection, { AvgPicksTab } from "./AvgPicksSection";
import InteractiveDailyTrendChart from "../dashboard/employ/components/InteractiveDailyTrendChart";

const { width: SCREEN_W } = Dimensions.get("window");

// ── Formatters ────────────────────────────────────────────────────
const fCr = (v) => {
  const L = v / 1e5;
  return L >= 100 ? `₹${(L / 100).toFixed(2)} Cr` : `₹${L.toFixed(2)} L`;
};
const fL = (v) => `₹${(v / 1e5).toFixed(2)} L`;
const fLn = (v) => `${(v / 1e5).toFixed(2)} L`;
const f2 = (v) => Number(v || 0).toFixed(2);
const f3 = (v) => Number(v || 0).toFixed(3);
const f4 = (v) => Number(v || 0).toFixed(4);
const fN = (v) => Math.round(v || 0).toLocaleString("en-IN");

const buildUtilityRateRows = (d) => {
  if (!d) return [];
  if (Array.isArray(d.utility_rates) && d.utility_rates.length > 0) {
    return d.utility_rates;
  }

  // Backward-compatible fallback in case an older cached month was parsed
  // before useExpenseData added utility_rates. No costing value is changed.
  const daily = Array.isArray(d.daily) ? d.daily : [];
  const sumDaily = (key) => daily.reduce(
    (total, row) => total + Number(row?.[key] || 0),
    0,
  );
  const prodMW = Number(d.prod_mw || 0) || sumDaily('prod_mw');
  const prodSud = Number(d.prod_sud || 0) || sumDaily('prod_sud');
  const prodWjet = Number(d.prod_wjet || 0);
  const prodTotal = Number(d.prod_total || 0);
  const rapierPicks = Number(d.avg_pick_mw || 0);
  const waterjetPicks = Number(d.avg_pick_wjet || 0);
  const combinedPicks = Number(d.avg_pick_tot || 0);

  const row = (key, label, kwh, amount, production, picks, shared = false) => ({
    key,
    label,
    kwh: Number(kwh || 0),
    amount: Number(amount || 0),
    shared,
    rate_available: Number(production || 0) > 0,
    pick_rate_available: Number(production || 0) > 0 && Number(picks || 0) > 0,
    cost_per_mtr:
      Number(production || 0) > 0
        ? Number(amount || 0) / Number(production || 0)
        : 0,
    cost_per_pick:
      Number(production || 0) > 0 && Number(picks || 0) > 0
        ? Number(amount || 0) / Number(production || 0) / Number(picks || 0)
        : 0,
  });

  return [
    row('mw_rapier_looms', 'MW Rapier — Looms', d.kwh_mw_looms, d.elec_mw_looms, prodMW, rapierPicks),
    row('mw_rapier_luwa', 'MW Rapier — Luwa (humid.)', d.kwh_mw_luwa, d.elec_mw_luwa, prodMW, rapierPicks),
    row('sud_rapier_looms', 'Sud Rapier — Looms', d.kwh_sd_looms, d.elec_sd_looms, prodSud, rapierPicks),
    row('sud_rapier_luwa', 'Sud Rapier — Luwa (humid.)', d.kwh_sd_luwa, d.elec_sd_luwa, prodSud, rapierPicks),
    row('sud_waterjet_looms', 'Sud W-Jet — Looms', d.kwh_wj_looms, d.elec_wj_looms, prodWjet, waterjetPicks),
    row('warping_shared', 'Warping (shared)', d.kwh_warping, d.elec_warping, prodTotal, combinedPicks, true),
    row('misc_shared', 'Miscellaneous (shared)', d.kwh_misc, d.elec_misc, prodTotal, combinedPicks, true),
  ];
};

const arrow = (c, p) => {
  if (!p) return "—";
  const d = ((c - p) / p) * 100;
  return d > 0 ? `▲ ${d.toFixed(1)}%` : `▼ ${Math.abs(d).toFixed(1)}%`;
};

const C = {
  bg: '#F5F1EA',
  nav: '#0D1B2A',
  card: '#FFFFFF',
  soft: '#F8F4EE',
  soft2: '#FBF8F3',
  border: '#E5DED4',
  borderSoft: '#EFE8DE',
  ink: '#111827',
  text: '#1F2937',
  muted: '#8A8177',
  muted2: '#A69C91',
  copper: '#B77932',
  copperDark: '#9E6324',
  green: '#2F855A',
  red: '#C53030',
};

// ── Skeleton ──────────────────────────────────────────────────────
function Skeleton({ h = 80 }) {
  return <View style={[SK.box, { height: h }]} />;
}
const SK = StyleSheet.create({
  box: { backgroundColor: "#f3f4f6", borderRadius: 12, marginBottom: 8 },
});

// ── Month tab ─────────────────────────────────────────────────────
function MonthTab({ label, active, status, onPress }) {
  console.log("label",label);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[S.monthTab, active && S.monthTabActive]}
    >
      <Text style={[S.monthTabText, active && S.monthTabTextActive]}>
        {label}
      </Text>
      {status === "loading" && !active && <View style={S.loadingRing} />}
    </TouchableOpacity>
  );
}

// ── Donut chart (SVG-free, pure RN) ──────────────────────────────
// Uses a simple arc approximation with View rotation trick
function DonutChart({ elec, sal, stores, total }) {
  const SIZE = 120;
  const STROKE = 18;
  const R = (SIZE - STROKE) / 2;
  const C = SIZE / 2;

  // We use a stacked View rotation approach for 3 segments
  const ePct = total > 0 ? elec / total : 0;
  const sPct = total > 0 ? sal / total : 0;
  const stPct = total > 0 ? stores / total : 0;

  const SEGMENTS = [
    { pct: ePct, color: "#185FA5", label: "Electricity", value: fL(elec) },
    { pct: sPct, color: "#c2823a", label: "Salary", value: fL(sal) },
    { pct: stPct, color: "#1D9E75", label: "Stores", value: fL(stores) },
  ];

  // Build arc segments using border trick
  let cumDeg = -90;

  return (
    <View style={S.donutWrap}>
      {/* Chart left */}
      <View style={{ width: SIZE, height: SIZE, position: "relative" }}>
        {/* Background ring */}
        <View
          style={{
            position: "absolute",
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderWidth: STROKE,
            borderColor: "#f3f4f6",
          }}
        />
        {/* Segments drawn as overlapping arcs using conic approximation */}
        {SEGMENTS.map((seg, i) => {
          const startDeg = cumDeg;
          const spanDeg = seg.pct * 360;
          cumDeg += spanDeg;
          if (spanDeg < 1) return null;
          // Split arcs > 180° into two halves
          const arcs =
            spanDeg > 180
              ? [
                  { start: startDeg, span: 180 },
                  { start: startDeg + 180, span: spanDeg - 180 },
                ]
              : [{ start: startDeg, span: spanDeg }];
          return arcs.map((arc, j) => (
            <View
              key={`${i}-${j}`}
              style={{
                position: "absolute",
                width: SIZE,
                height: SIZE,
                overflow: "hidden",
                transform: [{ rotate: `${arc.start}deg` }],
              }}
            >
              <View
                style={{
                  position: "absolute",
                  width: SIZE,
                  height: SIZE / 2,
                  overflow: "hidden",
                  transform: [{ rotate: `${Math.min(arc.span, 180)}deg` }],
                  transformOrigin: `${SIZE / 2}px ${SIZE / 2}px`,
                }}
              >
                <View
                  style={{
                    width: SIZE,
                    height: SIZE,
                    borderRadius: SIZE / 2,
                    borderWidth: STROKE,
                    borderColor: seg.color,
                    borderTopColor: "transparent",
                    borderRightColor: "transparent",
                    borderBottomColor: "transparent",
                  }}
                />
              </View>
            </View>
          ));
        })}
        {/* Center label */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { alignItems: "center", justifyContent: "center" },
          ]}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#c2823a" }}>
            {fCr(total)}
          </Text>
          <Text style={{ fontSize: 10, color: "#9ca3af" }}>total</Text>
        </View>
      </View>

      {/* Legend right */}
      <View
        style={{ flex: 1, justifyContent: "center", paddingLeft: 16, gap: 8 }}
      >
        {SEGMENTS.map((seg) => (
          <View
            key={seg.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 7 }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: seg.color,
                }}
              />
              <Text style={{ fontSize: 13, color: "#374151" }}>
                {seg.label}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}
              >
                {seg.value}
              </Text>
              <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                {total > 0 ? (seg.pct * 100).toFixed(1) : "0"}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Mini donut (Production/Cost split) ───────────────────────────
function MiniDonut({ rapierPct, label, size = 90 }) {
  const STROKE = 14;
  const wjetPct = 100 - rapierPct;
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: size,
          height: size,
          position: "relative",
          marginBottom: 8,
        }}
      >
        <View
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: STROKE,
            borderColor: "#c2823a",
          }}
        />
        {/* Waterjet arc overlay */}
        {wjetPct > 0 && (
          <View
            style={{
              position: "absolute",
              width: size,
              height: size,
              overflow: "hidden",
              transform: [{ rotate: `${-90 + rapierPct * 3.6}deg` }],
            }}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: STROKE,
                borderColor: "#185FA5",
                borderTopColor: "transparent",
                borderRightColor: "transparent",
                borderBottomColor: "transparent",
                transform: [{ rotate: `${Math.min(wjetPct * 3.6, 180)}deg` }],
              }}
            />
          </View>
        )}
        {/* Center */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { alignItems: "center", justifyContent: "center" },
          ]}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#0f172a" }}>
            {rapierPct.toFixed(1)}%
          </Text>
          <Text style={{ fontSize: 9, color: "#9ca3af" }}>Rapier</Text>
        </View>
      </View>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "500",
          color: "#374151",
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: "#c2823a",
            }}
          />
          <Text style={{ fontSize: 10, color: "#6b7280" }}>
            Rapier {rapierPct.toFixed(1)}%
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: "#185FA5",
            }}
          />
          <Text style={{ fontSize: 10, color: "#6b7280" }}>
            W-Jet {wjetPct.toFixed(1)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Bar chart (Comparative analytics) ───────────────────────────
function ComparativeChart({ months, states }) {
  const chartData = months
    .map((mo) => {
      const d = states[mo.key]?.data;
      return {
        label: mo.label,
        shortLabel: mo.shortLabel,
        prod: d?.prod_total_L || 0,
        cpp: d?.cpp_total || 0,
      };
    })
    .reverse(); // oldest first

  const maxProd = Math.max(...chartData.map((x) => x.prod), 1);
  const maxCpp = Math.max(...chartData.map((x) => x.cpp), 1);
  const BAR_W = 32;
  const CHART_H = 120;

  const [tooltip, setTooltip] = useState(null);

  return (
    <View style={S.chartCard}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <Text style={S.chartTitle}>Production vs cost / pick</Text>
        <Text style={S.chartSub}>last 6 months</Text>
      </View>

      <View
        style={{
          position: "relative",
          marginTop: 8,
          overflow: "hidden",
          height: CHART_H,
        }}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <View
            key={pct}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: CHART_H * (1 - pct),
              height: 0.5,
              backgroundColor: "#f3f4f6",
            }}
          />
        ))}

        {/* Bars + line */}
        <View
          style={{
            height: CHART_H,
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-around",
          }}
        >
          {chartData.map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setTooltip(tooltip === i ? null : i)}
              style={{
                alignItems: "center",
                width: BAR_W + 10,
                height: CHART_H,
                justifyContent: "flex-end",
              }}
            >
              <View
                style={{
                  width: BAR_W,
                  backgroundColor: "#c2823a",
                  height:
                    maxProd > 0
                      ? Math.max((item.prod / maxProd) * CHART_H, 2)
                      : 2,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                  opacity: tooltip !== null && tooltip !== i ? 0.5 : 1,
                }}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Cost/pick line overlay */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: CHART_H,
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-around",
          }}
        >
          {chartData.map((item, i) => {
            const y =
              CHART_H - (maxCpp > 0 ? (item.cpp / maxCpp) * CHART_H : 0);
            return (
              <View
                key={i}
                style={{
                  width: BAR_W + 10,
                  alignItems: "center",
                  position: "relative",
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    top: y - 4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#0f172a",
                    borderWidth: 1.5,
                    borderColor: "#fff",
                  }}
                />
              </View>
            );
          })}
        </View>

        {/* Tooltip */}
        {tooltip !== null && chartData[tooltip] && (
          <View style={S.tooltip}>
            <Text style={S.tooltipMonth}>{chartData[tooltip].label}</Text>
            <Text style={S.tooltipLine}>
              Prod (L m): {f2(chartData[tooltip].prod)}
            </Text>
            <Text style={S.tooltipLine}>
              Cost/pick ₹: {f3(chartData[tooltip].cpp)}
            </Text>
          </View>
        )}
      </View>

      {/* X axis labels */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          marginTop: 6,
        }}
      >
        {chartData.map((item, i) => (
          <Text
            key={i}
            style={{
              fontSize: 10,
              color: "#9ca3af",
              width: BAR_W + 10,
              textAlign: "center",
            }}
          >
            {item.shortLabel}
          </Text>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              backgroundColor: "#c2823a",
            }}
          />
          <Text style={{ fontSize: 11, color: "#6b7280" }}>
            Production (L m)
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#0f172a",
            }}
          />
          <Text style={{ fontSize: 11, color: "#6b7280" }}>
            Cost / pick (₹)
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Expandable expense block with icon ───────────────────────────
function ExpBlock({
  icon,
  iconColor,
  iconBg,
  title,
  sub,
  amt,
  editLabel,
  onEdit,
  children,
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={S.expBlock}>
      <TouchableOpacity
        style={S.expHeader}
        onPress={() => setOpen((p) => !p)}
        activeOpacity={0.7}
      >
        <View style={[S.expIcon, { backgroundColor: iconBg }]}>
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.expTitle}>{title}</Text>
          <Text style={S.expSub}>{sub}</Text>
        </View>
        <Text style={[S.expAmt, { color: iconColor }]}>{amt}</Text>
        {!!editLabel && (
          <TouchableOpacity
            onPress={(e) => {
              onEdit?.();
            }}
            style={{ paddingHorizontal: 4 }}
          >
            <Text style={S.editLabel}>{editLabel}</Text>
          </TouchableOpacity>
        )}
        <Text
          style={[S.expChevron, open && { transform: [{ rotate: "180deg" }] }]}
        >
          ▾
        </Text>
      </TouchableOpacity>
      {open && <View style={S.expBody}>{children}</View>}
    </View>
  );
}

// ── Bar row (electricity sub-meter) ──────────────────────────────
function BarRow({
  label,
  kwh,
  cost,
  pct,
  costPct,
  perMtr,
  perPick,
  rateAvailable = true,
  pickRateAvailable = true,
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 5,
        }}
      >
        <Text style={{ fontSize: 12, color: "#374151", flex: 1 }}>{label}</Text>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 12, color: "#374151" }}>
            {fN(kwh)} kWh · {fL(cost)}
          </Text>
          <Text style={{ fontSize: 11, color: "#9ca3af" }}>
            {costPct?.toFixed(1)}%
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 7,
        }}
      >
        <View
          style={{
            backgroundColor: "#EFF6FF",
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Text style={{ fontSize: 10.5, color: "#185FA5", fontWeight: "700" }}>
            {rateAvailable ? `₹${f3(perMtr)}/mtr` : "₹—/mtr"}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: "#F0FDF4",
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Text style={{ fontSize: 10.5, color: "#18794E", fontWeight: "700" }}>
            {pickRateAvailable ? `₹${f4(perPick)}/pick` : "₹—/pick"}
          </Text>
        </View>
      </View>

      <View style={{ height: 5, backgroundColor: "#f3f4f6", borderRadius: 3 }}>
        <View
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: 5,
            backgroundColor: "#185FA5",
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}

// ── Shed detail row ───────────────────────────────────────────────
function ShedRow({ label, value, pk }) {
  return (
    <View style={S.shedRow}>
      <Text style={S.shedLabel}>{label}</Text>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={S.shedValue}>{fL(value)}</Text>
        {pk != null && <Text style={S.shedPk}>+₹{f3(pk)}/pk</Text>}
      </View>
    </View>
  );
}

// ── Editable day input table ──────────────────────────────────────
function DayInputTable({ days, cols, rows, setRows, onAddDay }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* Header */}
        <View style={S.tableRow}>
          <Text style={[S.th, { minWidth: 70, textAlign: "left" }]}>Date</Text>
          {cols.map((c) => (
            <Text key={c} style={S.th}>
              {c}
            </Text>
          ))}
        </View>
        {/* Data rows */}
        {rows.map((row, ri) => (
          <View key={ri} style={S.tableRow}>
            <Text
              style={[
                S.td,
                { minWidth: 70, textAlign: "left", fontWeight: "500" },
              ]}
            >
              {row.date}
            </Text>
            {cols.map((c, ci) => (
              <TextInput
                key={ci}
                style={S.tdInput}
                value={String(row.values[ci] || "")}
                onChangeText={(v) => {
                  const updated = rows.map((r, rr) => {
                    if (rr !== ri) return r;
                    const vals = [...r.values];
                    vals[ci] = v;
                    return { ...r, values: vals };
                  });
                  setRows(updated);
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#d1d5db"
                editable={false}
              />
            ))}
          </View>
        ))}
        {/* Totals */}
        <View
          style={[S.tableRow, { borderTopWidth: 1, borderTopColor: "#e5e7eb" }]}
        >
          <Text
            style={[
              S.th,
              { minWidth: 70, textAlign: "left", color: "#c2823a" },
            ]}
          >
            TOTAL
          </Text>
          {cols.map((c, ci) => {
            const tot = rows.reduce(
              (sum, r) => sum + (Number(r.values[ci]) || 0),
              0
            );
            return (
              <Text key={ci} style={[S.th, { color: "#c2823a" }]}>
                {fN(tot)}
              </Text>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ── Daily Units view ──────────────────────────────────────────────

function DailyUnitsView({ d, onBack }) {
  const COLS = [
    "MW Loom",
    "MW Luwa",
    "Sud Loom",
    "Sud Luwa",
    "WJet Loom",
    "Warp",
    "M",
  ];
  const initRows = (d.daily || []).map((r) => ({
    date: r.date,
    values: [
      r.mw_looms,
      r.mw_luwa,
      r.sd_looms,
      r.sd_luwa,
      r.wj_looms,
      r.warping,
      r.misc,
    ],
  }));
  const [rows, setRows] = useState(initRows);
  const totalKwh = rows.reduce(
    (s, r) => s + r.values.reduce((a, v) => a + (Number(v) || 0), 0),
    0
  );

  const addDay = () => {
    const nextDate = `${String(rows.length + 1).padStart(2, "0")}-${
      rows[0]?.date?.split("-")[1] || "Jun"
    }`;
    setRows((prev) => [
      ...prev,
      { date: nextDate, values: Array(COLS.length).fill("") },
    ]);
  };

  return (
    <View>
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 14 }}>
        <Text style={S.subBack}>‹ Back to report</Text>
      </TouchableOpacity>
      <Text style={S.subTitle}>Daily units consumed</Text>
      <Text style={S.subDesc}>
        Sub-meter readings in kWh per day. "Misc" is the unmetered residual.
        Monthly totals flow straight into the dashboard and electricity cost.
      </Text>

      <DayInputTable
        days={d.days}
        cols={COLS}
        rows={rows}
        setRows={setRows}
        onAddDay={addDay}
      />

      <TouchableOpacity style={S.addDayBtn} onPress={addDay}>
        <Text style={S.addDayText}>+ Add a day</Text>
      </TouchableOpacity>

      <View style={S.footCard}>
        <View>
          <Text style={S.footLabel}>TOTAL UNITS</Text>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>
            {fN(totalKwh)}{" "}
            <Text style={{ fontSize: 13, color: "#9ca3af" }}>kWh</Text>
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={S.footLabel}>ELECTRICITY @ ₹{d.unit_rate}</Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#c2823a" }}>
            {fL(d.elec_total)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Daily Salary view ─────────────────────────────────────────────
function DailySalaryView({ d, onBack }) {
  const COLS = ["Rapier ₹", "Waterjet ₹", "Total"];
  const initRows = (d.daily || []).map((r) => ({
    date: r.date,
    values: [r.sal_r, r.sal_w, r.sal_t],
  }));
  const [rows, setRows] = useState(initRows);

  const addDay = () => {
    const nextDate = `${String(rows.length + 1).padStart(2, "0")}-${
      rows[0]?.date?.split("-")[1] || "Jun"
    }`;
    setRows((prev) => [...prev, { date: nextDate, values: ["", "", ""] }]);
  };

  const tR = rows.reduce((s, r) => s + (Number(r.values[0]) || 0), 0);
  const tW = rows.reduce((s, r) => s + (Number(r.values[1]) || 0), 0);
  const tT = rows.reduce((s, r) => s + (Number(r.values[2]) || 0), 0);

  return (
    <View>
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 14 }}>
        <Text style={S.subBack}>‹ Back to report</Text>
      </TouchableOpacity>
      <Text style={S.subTitle}>Daily salary expenses</Text>
      <Text style={S.subDesc}>
        Daily wage cost per shed (₹). Kept separate from utilities. Monthly
        totals flow into the dashboard.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={S.tableRow}>
            <Text style={[S.th, { minWidth: 70, textAlign: "left" }]}>
              Date
            </Text>
            {COLS.map((c) => (
              <Text key={c} style={S.th}>
                {c}
              </Text>
            ))}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={S.tableRow}>
              <Text
                style={[
                  S.td,
                  { minWidth: 70, textAlign: "left", fontWeight: "500" },
                ]}
              >
                {row.date}
              </Text>
              {[0, 1].map((ci) => (
                <TextInput
                  key={ci}
                  style={S.tdInput}
                  value={String(row.values[ci] || "")}
                  onChangeText={(v) => {
                    setRows(
                      rows.map((r, rr) => {
                        if (rr !== ri) return r;
                        const vals = [...r.values];
                        vals[ci] = v;
                        vals[2] = String(
                          (Number(vals[0]) || 0) + (Number(vals[1]) || 0)
                        );
                        return { ...r, values: vals };
                      })
                    );
                  }}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#d1d5db"
                />
              ))}
              <Text style={[S.td, { color: "#c2823a", fontWeight: "500" }]}>
                {fN(Number(row.values[2]) || 0)}
              </Text>
            </View>
          ))}
          <View
            style={[
              S.tableRow,
              { borderTopWidth: 1, borderTopColor: "#e5e7eb" },
            ]}
          >
            <Text
              style={[
                S.th,
                { minWidth: 70, textAlign: "left", color: "#c2823a" },
              ]}
            >
              TOTAL
            </Text>
            <Text style={[S.th, { color: "#c2823a" }]}>₹{fN(tR)}</Text>
            <Text style={[S.th, { color: "#c2823a" }]}>₹{fN(tW)}</Text>
            <Text style={[S.th, { color: "#c2823a" }]}>₹{fN(tT)}</Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={S.addDayBtn} onPress={addDay}>
        <Text style={S.addDayText}>+ Add a day</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Daily Maintenance / Other view ────────────────────────────────
function DailyInputView({ title, desc, d, onBack }) {
  const COLS = ["Rapier", "Waterjet", "Common"];
  const initRows = (d.daily || []).map((r) => ({
    date: r.date,
    values: ["", "", ""],
  }));
  const [rows, setRows] = useState(initRows);

  const addDay = () => {
    const nextDate = `${String(rows.length + 1).padStart(2, "0")}-${
      rows[0]?.date?.split("-")[1] || "Jun"
    }`;
    setRows((prev) => [...prev, { date: nextDate, values: ["", "", ""] }]);
  };

  const totals = COLS.map((_, ci) =>
    rows.reduce((s, r) => s + (Number(r.values[ci]) || 0), 0)
  );
  const rapier = totals[0] + totals[2] / 2;
  const waterjet = totals[1] + totals[2] / 2;
  const total = rapier + waterjet;

  return (
    <View>
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 14 }}>
        <Text style={S.subBack}>‹ Back to report</Text>
      </TouchableOpacity>
      <Text style={S.subTitle}>{title}</Text>
      <Text style={S.subDesc}>{desc}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={S.tableRow}>
            <Text style={[S.th, { minWidth: 70, textAlign: "left" }]}>
              Date
            </Text>
            {COLS.map((c) => (
              <Text key={c} style={S.th}>
                {c}
              </Text>
            ))}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={S.tableRow}>
              <Text
                style={[
                  S.td,
                  { minWidth: 70, textAlign: "left", fontWeight: "500" },
                ]}
              >
                {row.date}
              </Text>
              {COLS.map((c, ci) => (
                <TextInput
                  key={ci}
                  style={S.tdInput}
                  value={String(row.values[ci] || "")}
                  onChangeText={(v) => {
                    setRows(
                      rows.map((r, rr) => {
                        if (rr !== ri) return r;
                        const vals = [...r.values];
                        vals[ci] = v;
                        return { ...r, values: vals };
                      })
                    );
                  }}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#d1d5db"
                />
              ))}
            </View>
          ))}
          <View
            style={[
              S.tableRow,
              { borderTopWidth: 1, borderTopColor: "#e5e7eb" },
            ]}
          >
            <Text
              style={[
                S.th,
                { minWidth: 70, textAlign: "left", color: "#534AB7" },
              ]}
            >
              TOTAL
            </Text>
            {totals.map((t, i) => (
              <Text key={i} style={[S.th, { color: "#534AB7" }]}>
                ₹{fN(t)}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={S.addDayBtn} onPress={addDay}>
        <Text style={S.addDayText}>+ Add a day</Text>
      </TouchableOpacity>

      <View style={S.allocCard}>
        <Text style={S.allocLabel}>AFTER ½ : ½ ALLOCATION</Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            marginTop: 8,
          }}
        >
          {[
            ["Rapier", rapier],
            ["Waterjet", waterjet],
            ["Total", total],
          ].map(([l, v]) => (
            <View key={l} style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 11, color: "#0000", marginBottom: 3 }}>
                {l}
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#c2823a" }}
              >
                ₹{fN(v)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ── KPI grid ──────────────────────────────────────────────────────
function KPIGrid({ d, label }) {
  const items = [
    {
      l: "TOTAL COST",
      v: fCr(d.total),
      s: `${label} · ${d.days} days`,
      c: "#c2823a",
    },
    {
      l: "COST / PICK",
      v: `₹${f3(d.cpp_total)}`,
      s: "all sheds",
      c: "#c2823a",
    },
    { l: "AVG PICKS", v: f2(d.avg_pick_tot), s: "prod-weighted", c: "#1D9E75" },
    {
      l: "PRODUCTION",
      v: `${f2(d.prod_total_L)} L m`,
      s: `${fN(d.prod_total / d.days)} m / mc·day`,
      c: "#1D9E75",
    },
    { l: "COST / MC·DAY", v: `₹${fN(d.cpmc)}`, s: "126 looms", c: "#534AB7" },
    {
      l: "UNITS",
      v: `${Math.round(d.kwh_total / 1000)}K kWh`,
      s: `@ ₹${d.unit_rate}/unit`,
      c: "#BA7517",
    },
  ];
  return (
    <View style={S.kpiGrid}>
      {items.map((k, i) => (
        <View key={i} style={[S.kpiCard, { borderTopColor: k.c }]}>
          <Text style={S.kpiLabel}>{k.l}</Text>
          <Text style={S.kpiValue}>{k.v}</Text>
          <Text style={S.kpiSub}>{k.s}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Mgmt card ─────────────────────────────────────────────────────
function MgmtCard({
  name,
  borderColor,
  prod,
  pk,
  elec,
  sal,
  store,
  cpp,
  cpmc,
}) {
  return (
    <View style={[S.mgmtCard, { borderLeftColor: borderColor }]}>
      <View style={S.mgmtHeader}>
        <Text style={S.mgmtName}>{name}</Text>
        <Text style={S.mgmtSub}>
          {f2(prod / 1e5)} L m · {f2(pk)} pk
        </Text>
      </View>
      <View style={S.mgmtBody}>
        {[
          ["#185FA5", "Electricity", elec],
          ["#c2823a", "Salary", sal],
          ["#1D9E75", "Stores", store],
        ].map(([c, l, v]) => (
          <View key={l} style={S.mgmtRow}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <View style={[S.colorDot, { backgroundColor: c }]} />
              <Text style={S.mgmtRowLabel}>{l}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={S.mgmtRowValue}>{fL(v)}</Text>
              <Text style={S.mgmtRowPk}>+₹{f3(v / prod / pk)}/pk</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={S.mgmtFooter}>
        <View style={{ flex: 1 }}>
          <Text style={S.mgmtFootLabel}>COST / PICK</Text>
          <Text style={[S.mgmtFootValue, { color: "#c2823a" }]}>
            ₹{f3(cpp)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.mgmtFootLabel}>AVG PICKS</Text>
          <Text style={S.mgmtFootValue}>{f2(pk)}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Past performance row ──────────────────────────────────────────
function PastRow({ month, st, open, onToggle }) {
  const d = st.data;
  return (
    <TouchableOpacity
      style={S.pastCard}
      onPress={onToggle}
      activeOpacity={0.75}
    >
      <View style={S.pastTop}>
        <View style={{ flex: 1 }}>
          <Text style={S.pastMonth}>{month.fullLabel}</Text>
          <Text style={S.pastSub}>
            {st.status === "loading"
              ? "Loading…"
              : st.status === "error"
              ? "Failed"
              : d
              ? `${f2(d.prod_total_L)} L m · ${d.days} days`
              : "—"}
          </Text>
        </View>
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 5 }}
        >
          {st.status === "loading" && (
            <View
              style={{
                width: 70,
                height: 14,
                backgroundColor: "#f3f4f6",
                borderRadius: 4,
              }}
            />
          )}
          {st.status === "done" && d && (
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{ fontSize: 15, fontWeight: "600", color: "#c2823a" }}
              >
                {fCr(d.total)}
              </Text>
              <Text style={{ fontSize: 11, color: "#000", marginTop: 2 }}>
                ₹{f3(d.cpp_total)}/pk
              </Text>
            </View>
          )}
          {d && (
            <Text
              style={[
                S.pastChevron,
                open && { transform: [{ rotate: "180deg" }] },
              ]}
            >
              ▾
            </Text>
          )}
        </View>
      </View>

      {open && d && (
        <View style={S.pastExpanded}>
          {[
            ["#185FA5", "Electricity", d.elec_total],
            ["#c2823a", "Salary", d.sal_total],
            ["#1D9E75", "Stores", d.store_total],
          ].map(([c, l, v]) => (
            <View key={l} style={S.pastRow2}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <View style={[S.colorDot, { backgroundColor: c }]} />
                <Text style={{ fontSize: 13, color: "#000" }}>{l}</Text>
              </View>
              <View
                style={{ flexDirection: "row", gap: 5, alignItems: "center" }}
              >
                <Text style={{ fontSize: 13 }}>{fL(v)}</Text>
                <Text style={{ fontSize: 11, color: "#000" }}>
                  {d.total > 0 ? ((v / d.total) * 100).toFixed(1) : 0}%
                </Text>
              </View>
            </View>
          ))}
          <View style={S.pastMiniGrid}>
            {[
              ["Cost / pick", `₹${f3(d.cpp_total)}`],
              ["Cost / mc·day", `₹${fN(d.cpmc)}`],
              [
                "Rapier",
                `${fLn(d.total_rapier || 0)} · ${d.rapier_pct?.toFixed(1)}%`,
              ],
              [
                "W-Jet",
                `${fLn(d.total_wjet || 0)} · ${d.wjet_pct?.toFixed(1)}%`,
              ],
            ].map(([l, v]) => (
              <View key={l} style={S.pastMiniCard}>
                <Text style={S.pastMiniLabel}>{l}</Text>
                <Text style={S.pastMiniValue}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Month Settings ────────────────────────────────────────────────
function MonthSettings({ d, monthKey }) {
  const [unitRate, setUnitRate] = useState(String(d.unit_rate || 0));
  const [days, setDays] = useState(String(d.days || 0));
  const [storeR, setStoreR] = useState(String(Math.round(d.store_rapier || 0)));
  const [storeW, setStoreW] = useState(String(Math.round(d.store_wjet || 0)));

  const save = async () => {
    try {
      await AsyncStorage.setItem(
        `month_settings_${monthKey}`,
        JSON.stringify({ unitRate, days, storeR, storeW })
      );
    } catch (_) {}
  };

  return (
    <View style={S.settingsCard}>
      {[
        ["Unit rate (₹/kWh)", unitRate, setUnitRate],
        ["Working days", days, setDays],
        ["Stores — Rapier (₹/mo)", storeR, setStoreR],
        ["Stores — Waterjet (₹/mo)", storeW, setStoreW],
      ].map(([label, val, setter]) => (
        <View key={label} style={S.settingsRow}>
          <Text style={S.settingsLabel}>{label}</Text>
          <TextInput
            style={S.settingsInput}
            value={val}
            onChangeText={setter}
            onBlur={save}
            keyboardType="numeric"
            editable={false}
          />
        </View>
      ))}
    </View>
  );
}

// ── Expense input coverage ─────────────────────────────────────────
function ExpenseCoverageNotice({ d, month }) {
  const daily = Array.isArray(d?.daily) ? d.daily : [];
  if (!month || daily.length === 0) return null;

  const lastDayFor = (predicate) => {
    let last = 0;
    daily.forEach((row) => {
      if (!predicate(row)) return;
      const day = Number(String(row?.date || '').slice(0, 2));
      if (Number.isFinite(day) && day > last) last = day;
    });
    return last;
  };

  const electricityLast = lastDayFor(
    (row) => Number(row?.total_kwh || 0) !== 0,
  );
  const salaryLast = lastDayFor(
    (row) => Number(row?.sal_t || 0) !== 0,
  );

  const now = new Date();
  const isCurrentMonth =
    Number(month.calYear) === now.getFullYear()
    && Number(month.calMonth) === now.getMonth();
  const requestedDay = isCurrentMonth
    ? now.getDate()
    : new Date(Number(month.calYear), Number(month.calMonth) + 1, 0).getDate();

  const requiredPresent = electricityLast > 0 && salaryLast > 0;
  const completeDay = requiredPresent
    ? Math.min(electricityLast, salaryLast, requestedDay)
    : 0;

  const monthName = new Date(
    Number(month.calYear),
    Number(month.calMonth),
    1,
  ).toLocaleDateString('en-GB', { month: 'short' });

  const coverageHeads = [
    { key: 'electricity', label: 'Electricity', lastDay: electricityLast },
    { key: 'salary', label: 'Salary', lastDay: salaryLast },
  ].map((head) => {
    const isCurrent = head.lastDay >= requestedDay;
    const pendingFromDay = !isCurrent
      ? (head.lastDay > 0 ? head.lastDay + 1 : 1)
      : null;

    return {
      ...head,
      isCurrent,
      pendingFromDay,
      pendingDays: pendingFromDay
        ? Math.max(0, requestedDay - pendingFromDay + 1)
        : 0,
    };
  });

  const pending = coverageHeads.filter((head) => !head.isCurrent);
  const dayMonth = (day) => `${String(day).padStart(2, '0')} ${monthName}`;

  const completeText = completeDay > 0
    ? `01–${String(completeDay).padStart(2, '0')} ${monthName} ${month.calYear}`
    : `No fully complete expense day yet for ${month.fullLabel}`;

  return (
    <View style={S.coverageCard}>
      <View style={{ flex: 1 }}>
        <Text style={S.coverageKicker}>EXPENSE DATA COVERAGE</Text>
        <Text style={S.coverageTitle}>
          {pending.length === 0 ? 'Entered through' : 'Complete through'} {completeText}
        </Text>
        {pending.length > 0 ? (
          <View style={S.coverageHeadList}>
            {coverageHeads.map((head) => (
              <View key={head.key} style={S.coverageHeadRow}>
                <Text style={S.coverageHeadLabel}>{head.label}</Text>
                <Text style={head.isCurrent ? S.coverageHeadCurrent : S.coverageHeadPending}>
                  {head.lastDay > 0
                    ? `Entered through ${dayMonth(head.lastDay)}`
                    : `No entry in ${monthName}`}
                  {head.isCurrent
                    ? ' · current'
                    : ` · pending ${dayMonth(head.pendingFromDay)}–${dayMonth(requestedDay)} (${head.pendingDays}d)`}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={S.coverageOk}>All required daily expense heads are current through {dayMonth(requestedDay)}.</Text>
        )}
      </View>
      <View style={[S.coverageBadge, pending.length > 0 ? S.coverageBadgeWarn : S.coverageBadgeOk]}>
        <Text style={S.coverageBadgeText}>{pending.length > 0 ? 'PARTIAL' : 'CURRENT'}</Text>
      </View>
    </View>
  );
}

// ── Production block ──────────────────────────────────────────────
function ProductionBlock({ d }) {
  const [series, setSeries] = useState('combined');
  const daily = Array.isArray(d?.daily) ? d.daily : [];

  const trend = daily.map((row, index) => {
    const rapier = Number(row?.prod_mw || 0) + Number(row?.prod_sud || 0);
    const waterjet = Number(row?.prod_wj || 0);
    const combined = Number(row?.prod_tot || 0) || (rapier + waterjet);
    const value = series === 'rapier'
      ? rapier
      : series === 'waterjet'
        ? waterjet
        : combined;

    return {
      day: String(Number(String(row?.date || index + 1).slice(0, 2)) || index + 1),
      meters: value,
    };
  });

  const total = series === 'rapier'
    ? Number(d?.prod_rapier || 0)
    : series === 'waterjet'
      ? Number(d?.prod_wjet || 0)
      : Number(d?.prod_total || 0);

  const picks = series === 'rapier'
    ? Number(d?.avg_pick_mw || 0)
    : series === 'waterjet'
      ? Number(d?.avg_pick_wjet || 0)
      : Number(d?.avg_pick_tot || 0);

  const label = series === 'rapier'
    ? 'Rapier'
    : series === 'waterjet'
      ? 'Waterjet'
      : 'Combined';

  return (
    <View style={S.prodBlock}>
      <View style={S.prodHeaderRow}>
        <View>
          <Text style={S.prodKicker}>Production · from production system</Text>
          <Text style={S.prodTitle}>{label} day-wise production</Text>
        </View>
        <View style={S.autoBadge}>
          <Text style={S.autoBadgeText}>AUTO</Text>
        </View>
      </View>

      <View style={S.prodSelector}>
        {[
          ['combined', 'Combined'],
          ['rapier', 'Rapier'],
          ['waterjet', 'Waterjet'],
        ].map(([key, text]) => {
          const active = series === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setSeries(key)}
              activeOpacity={0.75}
              style={[S.prodChip, active && S.prodChipActive]}
            >
              <Text style={[S.prodChipText, active && S.prodChipTextActive]}>{text}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={S.prodSummaryRow}>
        <View>
          <Text style={S.prodSummaryLabel}>MONTH PRODUCTION</Text>
          <Text style={S.prodSummaryValue}>{f2(total / 1e5)} L m</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={S.prodSummaryLabel}>AVG PICKS</Text>
          <Text style={S.prodSummaryValue}>{f2(picks)}</Text>
        </View>
      </View>

      <InteractiveDailyTrendChart
        data={trend}
        valueKey="meters"
        labelKey="day"
        color={series === 'waterjet' ? '#185FA5' : series === 'rapier' ? '#B77932' : '#0D1B2A'}
        fillColor={series === 'waterjet' ? '#185FA5' : series === 'rapier' ? '#B77932' : '#0D1B2A'}
        height={116}
        pointGap={48}
        minWidth={Math.max(320, trend.length * 48)}
        showBaseline
        valueFormatter={(value) => {
          const n = Number(value || 0);
          if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(2)} L m`;
          if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)} K m`;
          return `${Math.round(n).toLocaleString('en-IN')} m`;
        }}
      />

      <Text style={S.prodFootnote}>
        Select Combined, Rapier or Waterjet. The chart always uses the selected month’s day-wise production feed.
      </Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function ExpenseScreen({ token, apiBase }) {
  const appSession = useAppSessionStore((state) => state.appSession);
  const context = appSession?.business_context;
  const { months, states, loadedCount, total, refresh, retryMonth } =
    useExpenseData({ token, apiBase });
  // FIX: this screen used to render its own hand-rolled header block
  // ("MADHUSUDHAN FABRICS" / "Expense" / "Production · Cost" / refresh
  // button) — the 6th duplicate-header instance found across this app.
  // The header is rendered once, in app/new/(tabs)/_layout.tsx; the
  // refresh button and the "Production · Cost" context line now reach it
  // through the shared extras store instead.
  const setHeaderExtras = useHeaderExtrasStore((s) => s.setHeaderExtras);
  const clearHeaderExtras = useHeaderExtrasStore((s) => s.clearHeaderExtras);
  useFocusEffect(
    useCallback(() => {
      setHeaderExtras({
        subtitle: "Production · Cost",
        right: (
          <TouchableOpacity onPress={refresh} style={header.refresh} activeOpacity={0.75}>
            <Text style={header.refreshText}>↻</Text>
          </TouchableOpacity>
        ),
      });
      return () => clearHeaderExtras();
    }, [refresh, setHeaderExtras, clearHeaderExtras]),
  );

  const [activeTab, setActiveTab] = useState(0);
  const [view, setView] = useState("report");
  const [pastOpen, setPastOpen] = useState({});
  // Avg Picks accordion — thin full-width tab right below the month tabs.
  // Always tracks the currently selected month (see `m` below), so it never
  // needs its own year/month picker.
  const [avgPicksOpen, setAvgPicksOpen] = useState(false);
  const scrollRef = useRef < ScrollView > null;

  const m = months[activeTab];
  const st = states[m?.key];
  const d = st?.data;
  const utilityRows = buildUtilityRateRows(d);

  const prevM = months[activeTab + 1];
  const prevD = prevM ? states[prevM?.key]?.data : null;

  const togglePast = useCallback(
    (i) => setPastOpen((p) => ({ ...p, [i]: !p[i] })),
    []
  );

  if (!m) return null;

  // ── Sub-views ─────────────────────────────────────────────────
  const subViews = {
    "daily-units": (
      <DailyUnitsView d={d || { daily: [] }} onBack={() => setView("report")} />
    ),
    "daily-salary": (
      <DailySalaryView
        d={d || { daily: [] }}
        onBack={() => setView("report")}
      />
    ),
    "daily-maint": (
      <DailyInputView
        title="Daily maintenance"
        d={d || { daily: [] }}
        onBack={() => setView("report")}
        desc="Maintenance & repair spend per day (₹). Enter per shed, or under Common for shared cost — common auto-splits ½ Rapier / ½ Waterjet."
      />
    ),
    "daily-other": (
      <DailyInputView
        title="Daily other expenses"
        d={d || { daily: [] }}
        onBack={() => setView("report")}
        desc="Other direct / indirect expenses per day (₹). Enter per shed, or under Common for shared cost — common auto-splits ½ Rapier / ½ Waterjet."
      />
    ),
  };

  if (subViews[view]) {
    return (
      <View style={S.safe}>
        <ScrollView
          ref={scrollRef}
          style={S.body}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {subViews[view]}
        </ScrollView>
      </View>
    );
  }

  // ── Main report ───────────────────────────────────────────────
  return (
    <View style={S.safe}>
      <ScrollView
        style={S.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Month tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 14 }}
        >
          <View style={{ flexDirection: "row", gap: 6 }}>
            {months.map((mo, i) => (
              <MonthTab
                key={mo.key}
                label={mo.label}
                active={activeTab === i}
                status={states[mo.key]?.status}
                onPress={() => {
                  setActiveTab(i);
                  setView("report");
                }}
              />
            ))}
          </View>
        </ScrollView>

        {/* Avg Picks — thin full-width accordion tab, directly under the
            month tabs. Always bound to the currently selected month `m`
            (same yearno/monthno the rest of this screen already uses). */}
        {/* <AvgPicksTab
          expanded={avgPicksOpen}
          onPress={() => setAvgPicksOpen((o) => !o)}
        /> */}
        <AvgPicksSection
          token={token}
          apiBase={apiBase}
          month={m}
          expanded={avgPicksOpen}
          context={context}
          refresh={refresh}
        />

        {/* Loading */}
        {st?.status === "loading" && (
          <View>
            <Skeleton h={140} />
            <Skeleton h={80} />
            <Skeleton h={80} />
            <Skeleton h={80} />
          </View>
        )}

        {/* Error */}
        {st?.status === "error" && (
          <View style={S.errorBox}>
            <Text style={S.errorText}>Failed to load {m.fullLabel}</Text>
            <TouchableOpacity
              onPress={() => retryMonth(m.key)}
              style={S.retryBtn}
            >
              <Text style={S.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Data */}
        {st?.status === "done" && d && (
          <>
            <ExpenseCoverageNotice d={d} month={m} />
            <KPIGrid d={d} label={m.fullLabel} />

            {/* Cost composition donut */}
            <View style={S.compositionCard}>
              <Text style={S.compositionTitle}>
                Cost composition · {m.shortLabel} '{m.displayYear}
              </Text>
              <DonutChart
                elec={d.elec_total}
                sal={d.sal_total}
                stores={d.store_total}
                total={d.total}
              />
            </View>

            {/* Management summary */}
            <Text style={S.sectionLabel}>MANAGEMENT SUMMARY</Text>
            <MgmtCard
              name="Rapier"
              borderColor="#c2823a"
              prod={d.prod_rapier}
              pk={d.avg_pick_mw}
              elec={d.elec_rapier}
              sal={d.sal_rapier}
              store={d.store_rapier}
              cpp={d.cpp_rapier}
              cpmc={d.cpmc_rapier || 0}
            />
            <MgmtCard
              name="Waterjet"
              borderColor="#185FA5"
              prod={d.prod_wjet}
              pk={d.avg_pick_wjet}
              elec={d.elec_wjet}
              sal={d.sal_wjet}
              store={d.store_wjet}
              cpp={d.cpp_wjet}
              cpmc={d.cpmc_wjet || 0}
            />
            <MgmtCard
              name="Total"
              borderColor="#e5e7eb"
              prod={d.prod_total}
              pk={d.avg_pick_tot}
              elec={d.elec_total}
              sal={d.sal_total}
              store={d.store_total}
              cpp={d.cpp_total}
              cpmc={d.cpmc}
            />

            {/* Expense breakdown */}
            <Text style={S.sectionLabel}>EXPENSE BREAKDOWN</Text>

            {/* Utilities */}
            <ExpBlock
              icon="⚡"
              iconColor="#185FA5"
              iconBg="#EFF6FF"
              title="Utilities / units consumed"
              sub={`${fN(d.kwh_total)} kWh @ ₹${d.unit_rate}`}
              amt={`${fLn(d.elec_total)} L`}
              // editLabel="Edit ›"
              onEdit={() => setView("daily-units")}
            >
              {utilityRows.map((row) => (
                <BarRow
                  key={row.key || row.label}
                  label={row.label}
                  kwh={row.kwh}
                  cost={row.amount}
                  pct={d.kwh_total > 0 ? (row.kwh / d.kwh_total) * 100 : 0}
                  costPct={d.elec_total > 0 ? (row.amount / d.elec_total) * 100 : 0}
                  perMtr={row.cost_per_mtr}
                  perPick={row.cost_per_pick}
                  rateAvailable={row.rate_available !== false}
                  pickRateAvailable={row.pick_rate_available !== false}
                />
              ))}
              <Text style={{ fontSize: 11, color: "#000", marginTop: 4 }}>
                ₹/mtr and ₹/pick are utility contribution KPIs only. Warping +
                Misc remain shared exactly as before — existing ⅔ Rapier, ⅓
                Waterjet costing allocation is unchanged. Shared display rates
                use combined production and weighted picks.
              </Text>
            </ExpBlock>

            {/* Salaries */}
            <ExpBlock
              icon="₹"
              iconColor="#c2823a"
              iconBg="#FDF3E8"
              title="Salaries / wages"
              sub="Rapier + Waterjet"
              amt={`${fLn(d.sal_total)} L`}
              // editLabel="Edit ›"
              // onEdit={() => setView('daily-salary')}
              onEdit={() => {
                setView("daily-salary");

                setTimeout(() => {
                  scrollRef.current?.scrollTo({
                    y: 0,
                    animated: false,
                  });
                }, 50);
              }}
            >
              <ShedRow
                label="Rapier shed"
                value={d.sal_rapier}
                pk={d.sal_rapier / d.prod_rapier / d.avg_pick_mw}
              />
              <ShedRow
                label="Waterjet shed"
                value={d.sal_wjet}
                pk={d.sal_wjet / d.prod_wjet / d.avg_pick_wjet}
              />
              <View style={S.shedTotal}>
                <Text style={[S.shedLabel, { fontWeight: "600" }]}>Total</Text>
                <Text style={[S.shedValue, { fontWeight: "600" }]}>
                  {fL(d.sal_total)} · +₹
                  {f3(d.sal_total / d.prod_total / d.avg_pick_tot)}/pk
                </Text>
              </View>
            </ExpBlock>

            {/* Stores */}
            <ExpBlock
              icon="📦"
              iconColor="#1D9E75"
              iconBg="#E1F5EE"
              title="Production-linked expenses"
              sub="Stores & spares"
              amt={`${fLn(d.store_total)} L`}
            >
              <ShedRow
                label="Rapier stores"
                value={d.store_rapier}
                pk={d.store_rapier / d.prod_rapier / d.avg_pick_mw}
              />
              <ShedRow
                label="Waterjet stores"
                value={d.store_wjet}
                pk={d.store_wjet / d.prod_wjet / d.avg_pick_wjet}
              />
              <View style={S.shedTotal}>
                <Text style={[S.shedLabel, { fontWeight: "600" }]}>Total</Text>
                <Text style={[S.shedValue, { fontWeight: "600" }]}>
                  {fL(d.store_total)} · +₹
                  {f3(d.store_total / d.prod_total / d.avg_pick_tot)}/pk
                </Text>
              </View>
            </ExpBlock>

            {/* Maintenance */}
            <ExpBlock
              icon="🔧"
              iconColor="#534AB7"
              iconBg="#EEEDFE"
              title="Maintenance"
              sub="Rapier · Waterjet · common (½½)"
              amt="₹0"
              // editLabel="Edit ›"
              onEdit={() => setView("daily-maint")}
            >
              {[
                ["Rapier", 0],
                ["Waterjet", 0],
                ["Total", 0],
              ].map(([l, v]) => (
                <View key={l} style={S.shedRow}>
                  <Text style={S.shedLabel}>{l}</Text>
                  <Text style={S.shedValue}>₹{fN(v)} · +₹0.000/pk</Text>
                </View>
              ))}
              <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                Common maintenance auto-splits ½ Rapier / ½ Waterjet. Enter
                day-wise via the input module above.
              </Text>
            </ExpBlock>

            {/* Other */}
            <ExpBlock
              icon="+"
              iconColor="#BA7517"
              iconBg="#FAEEDA"
              title="Other expenses"
              sub="Direct / indirect"
              amt="₹0"
              // editLabel="Edit ›"
              onEdit={() => setView("daily-other")}
            >
              {[
                ["Rapier", 0],
                ["Waterjet", 0],
                ["Total", 0],
              ].map(([l, v]) => (
                <View key={l} style={S.shedRow}>
                  <Text style={S.shedLabel}>{l}</Text>
                  <Text style={S.shedValue}>₹{fN(v)} · +₹0.000/pk</Text>
                </View>
              ))}
              <Text style={{ fontSize: 11, color: "#000", marginTop: 6 }}>
                Common items auto-split ½ Rapier / ½ Waterjet. Enter day-wise
                via the input module above.
              </Text>
            </ExpBlock>

            {/* Final derived costing */}
            <ExpBlock
              icon="Σ"
              iconColor="#c2823a"
              iconBg="#FDF3E8"
              title="Final derived costing"
              sub={`₹${f3(d.cpp_total)}/pick · ${f2(d.avg_pick_tot)} picks`}
              amt={`₹${f3(d.cpp_total)}/pk`}
            >
              {[
                ["#185FA5", "Electricity", d.elec_total],
                ["#c2823a", "Salary", d.sal_total],
                ["#1D9E75", "Stores", d.store_total],
              ].map(([c, l, v]) => (
                <View key={l} style={S.finalRow}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <View style={[S.colorDot, { backgroundColor: c }]} />
                    <Text style={{ fontSize: 13 }}>{l}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontWeight: "500", fontSize: 13 }}>
                      {fL(v)}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#000" }}>
                      +₹{f3(v / d.prod_total / d.avg_pick_tot)}/pk
                    </Text>
                  </View>
                </View>
              ))}
              <View style={S.finalTotal}>
                <Text style={{ fontWeight: "500" }}>Total cost</Text>
                <Text
                  style={{ fontSize: 16, fontWeight: "600", color: "#c2823a" }}
                >
                  {fCr(d.total)}
                </Text>
              </View>
              <View style={S.miniGrid}>
                {[
                  ["COST / PICK", `₹${f3(d.cpp_total)}`],
                  ["AVG PICKS", f2(d.avg_pick_tot)],
                  ["COST / MC·DAY", `₹${fN(d.cpmc)}`],
                ].map(([l, v]) => (
                  <View key={l} style={S.miniCard}>
                    <Text style={S.miniLabel}>{l}</Text>
                    <Text style={S.miniValue}>{v}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ fontSize: 11, color: "#000", marginTop: 8 }}>
                Cost / pick = total cost ÷ production metres ÷ avg picks (
                {f2(d.avg_pick_tot)}).
              </Text>
            </ExpBlock>

            {/* Comparative analytics */}
            <Text style={S.sectionLabel}>COMPARATIVE ANALYTICS · 6 MONTHS</Text>
            <ComparativeChart months={months} states={states} />

            {/* Efficiency indicators */}
            <Text style={S.sectionLabel}>
              EFFICIENCY INDICATORS · {m.fullLabel.toUpperCase()}
            </Text>
            <View style={S.effGrid}>
              {[
                ["UNITS / METRE", `${f2(d.units_per_mtr)} kWh`],
                ["SALARY / METRE", `₹${f2(d.sal_per_mtr)}`],
                ["STORES / METRE", `₹${f2(d.store_per_mtr)}`],
                ["AVG PICKS", f2(d.avg_pick_tot)],
                ["PROD / MC·DAY", `${fN(d.prod_total / d.days)} m`],
                ["COST / MC·DAY", `₹${fN(d.cpmc)}`],
              ].map(([l, v]) => (
                <View key={l} style={S.effCard}>
                  <Text style={S.effLabel}>{l}</Text>
                  <Text style={S.effValue}>{v}</Text>
                </View>
              ))}
            </View>

            {/* Production block */}
            <Text style={[S.sectionLabel, { marginTop: 8, color: "#000" }]}>
              PRODUCTION · FROM PRODUCTION SYSTEM
            </Text>
            <ProductionBlock d={d} />

            {/* Month settings */}
            <Text style={[S.sectionLabel, { marginTop: 8 }]}>
              MONTH SETTINGS · (ongoing month)
            </Text>
            <MonthSettings d={d} monthKey={m.key} />

            {/* Production / Cost split donuts */}
            <View style={S.donutRow}>
              <View style={S.donutHalf}>
                <MiniDonut
                  rapierPct={
                    d.prod_total > 0 ? (d.prod_rapier / d.prod_total) * 100 : 0
                  }
                  label="Production split"
                />
              </View>
              <View style={S.donutHalf}>
                <MiniDonut rapierPct={d.rapier_pct || 0} label="Cost split" />
              </View>
            </View>

            {/* Month-on-month */}
            <View style={S.momCard}>
              <Text style={S.momTitle}>Month-on-month</Text>
              <Text style={S.momSub}>
                {prevD ? `vs ${prevM.fullLabel}` : "no prior month"}
              </Text>
              <View style={S.miniGrid}>
                {[
                  ["TOTAL COST", fCr(d.total), d.total, prevD?.total],
                  [
                    "COST / PICK",
                    `₹${f3(d.cpp_total)}`,
                    d.cpp_total,
                    prevD?.cpp_total,
                  ],
                  [
                    "PRODUCTION",
                    `${f2(d.prod_total_L)} L m`,
                    d.prod_total_L,
                    prevD?.prod_total_L,
                  ],
                ].map(([l, v, c, p]) => (
                  <View key={l} style={S.miniCard}>
                    <Text style={S.miniLabel}>{l}</Text>
                    <Text style={S.miniValue}>{v}</Text>
                    <Text
                      style={{
                        fontSize: 11,
                        marginTop: 1,
                        color: c > (p || 0) ? "#ef4444" : "#1D9E75",
                      }}
                    >
                      {prevD ? arrow(c, p) : "—"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Past performance */}
            <Text style={S.sectionLabel}>PAST PERFORMANCE</Text>
            {months.map((mo, i) => (
              <PastRow
                key={mo.key}
                month={mo}
                st={states[mo.key]}
                open={!!pastOpen[i]}
                onToggle={() => togglePast(i)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8f7f4" },
  header: {
    backgroundColor: T.nav,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eyebrow: { fontSize: 10, fontWeight: "700", color: "#fff", letterSpacing: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 2 },
  sub: { fontSize: 11, color: "#fff", marginTop: 2 },
  refreshBtn: {
    width: 32,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshText: { color: "#fff", fontSize: 18 },
  body: { flex: 1, paddingHorizontal: 12, paddingTop: 14 },

  coverageCard: {
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E5DED4',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  coverageKicker: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.05,
    color: '#8A8177',
  },
  coverageTitle: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  coverageHeadList: {
    marginTop: 8,
    gap: 6,
  },
  coverageHeadRow: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#EFE7DB',
  },
  coverageHeadLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#5C5147',
  },
  coverageHeadPending: {
    marginTop: 2,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '800',
    color: '#A75D13',
  },
  coverageHeadCurrent: {
    marginTop: 2,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '800',
    color: '#2F855A',
  },
  coveragePending: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#A75D13',
  },
  coverageOk: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#2F855A',
  },
  coverageBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  coverageBadgeWarn: { backgroundColor: '#FFF0D8' },
  coverageBadgeOk: { backgroundColor: '#E6F4EA' },
  coverageBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#5C5147',
  },
  prodHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  prodKicker: {
    fontSize: 9,
    color: '#8A8177',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  prodTitle: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  autoBadge: {
    backgroundColor: '#E1F5EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  autoBadgeText: { fontSize: 9, color: '#0F6E56', fontWeight: '800' },
  prodSelector: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 12,
  },
  prodChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F4F0EA',
    borderWidth: 1,
    borderColor: '#E5DED4',
  },
  prodChipActive: { backgroundColor: '#0D1B2A', borderColor: '#0D1B2A' },
  prodChipText: { fontSize: 11, fontWeight: '800', color: '#6F665D' },
  prodChipTextActive: { color: '#FFFFFF' },
  prodSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  prodSummaryLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#8A8177',
  },
  prodSummaryValue: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  prodFootnote: {
    marginTop: 5,
    fontSize: 10,
    lineHeight: 15,
    color: '#756C61',
  },
  monthTab: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    flexShrink: 0,
    position: "relative",
  },
  monthTabActive: { backgroundColor: T.copper },
  monthTabText: { fontSize: 13, color: "#000" },
  monthTabTextActive: { color: "#fff" },
  loadingRing: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#c2823a",
  },

  sectionLabel: {
    fontSize: 10,
    color: "#000",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
  },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  kpiCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderTopWidth: 2.5,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  kpiLabel: {
    fontSize: 10,
    color: "#000",
    letterSpacing: 0.7,
    marginBottom: 5,
  },
  kpiValue: { fontSize: 17, fontWeight: "500", color: "#000", marginBottom: 2 },
  kpiSub: { fontSize: 11, color: "#000" },

  compositionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  compositionTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#000",
    marginBottom: 12,
  },
  donutWrap: { flexDirection: "row", alignItems: "center" },

  mgmtCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    borderLeftWidth: 3,
  },
  mgmtHeader: {
    padding: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  mgmtName: { fontSize: 14, fontWeight: "500", color: "#000" },
  mgmtSub: { fontSize: 11, color: "#000" },
  mgmtBody: { padding: 8 },
  mgmtRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  mgmtRowLabel: { fontSize: 13, color: "#000" },
  mgmtRowValue: { fontSize: 13, fontWeight: "500" },
  mgmtRowPk: { fontSize: 11, color: "#000" },
  mgmtFooter: {
    flexDirection: "row",
    padding: 13,
    borderTopWidth: 0.5,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#fafafa",
  },
  mgmtFootLabel: {
    fontSize: 10,
    color: "#000",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  mgmtFootValue: { fontSize: 15, fontWeight: "500", marginTop: 2 },
  colorDot: { width: 8, height: 8, borderRadius: 2 },

  expBlock: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  expHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 13,
  },
  expIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  expTitle: { fontSize: 13, fontWeight: "500", color: "#000" },
  expSub: { fontSize: 11, color: "#000" },
  editLabel: { fontSize: 12, color: "#c2823a" },
  expAmt: { fontSize: 14, fontWeight: "600", marginRight: 2 },
  expChevron: { fontSize: 13, color: "#000" },
  expBody: { borderTopWidth: 0.5, borderTopColor: "#f3f4f6", padding: 13 },

  shedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  shedTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    marginTop: 4,
  },
  shedLabel: { fontSize: 13, color: "#000" },
  shedValue: { fontSize: 13, fontWeight: "500" },
  shedPk: { fontSize: 11, color: "#000" },

  finalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  finalTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    marginTop: 4,
  },
  miniGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  miniCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#f8f7f4",
    borderRadius: 8,
    padding: 9,
  },
  miniLabel: {
    fontSize: 10,
    color: "#000",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  miniValue: { fontSize: 13, fontWeight: "500", marginTop: 3 },

  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  chartTitle: { fontSize: 13, fontWeight: "500", color: "#000" },
  chartSub: { fontSize: 11, color: "#000" },
  tooltip: {
    position: "absolute",
    top: 4,
    left: 8,
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 8,
    zIndex: 10,
  },
  tooltipMonth: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 3,
  },
  tooltipLine: { fontSize: 11, color: "#000" },

  effGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  effCard: {
    width: "48%",
    backgroundColor: "#f8f7f4",
    borderRadius: 8,
    padding: 10,
  },
  effLabel: {
    fontSize: 10,
    color: "#000",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  effValue: { fontSize: 14, fontWeight: "500", marginTop: 3 },

  prodBlock: {
    backgroundColor: "#f8f7f4",
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },

  settingsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  settingsLabel: { fontSize: 13, color: "#000", flex: 1 },
  settingsInput: {
    width: 90,
    textAlign: "right",
    borderWidth: 0.5,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    backgroundColor: "#f9fafb",
    color: "#111827",
  },

  donutRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  donutHalf: { flex: 1, alignItems: "center" },

  momCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  momTitle: { fontSize: 14, fontWeight: "500", marginBottom: 3 },
  momSub: { fontSize: 11, color: "#000", marginBottom: 10 },

  pastCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 7,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  pastTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  pastMonth: { fontSize: 14, fontWeight: "500", color: "#000" },
  pastSub: { fontSize: 11, color: "#000", marginTop: 2 },
  pastChevron: { fontSize: 13, color: "#000", marginTop: 2 },
  pastExpanded: {
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#f3f4f6",
    paddingTop: 8,
  },
  pastRow2: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  pastMiniGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  pastMiniCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f8f7f4",
    borderRadius: 8,
    padding: 9,
  },
  pastMiniLabel: {
    fontSize: 10,
    color: "#000",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pastMiniValue: { fontSize: 13, fontWeight: "500", marginTop: 2 },

  tableRow: { flexDirection: "row" },
  th: {
    fontSize: 10,
    color: "#000",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    padding: 5,
    minWidth: 72,
    textAlign: "right",
    backgroundColor: "#f9fafb",
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
  },
  td: {
    fontSize: 11,
    padding: 5,
    minWidth: 72,
    textAlign: "right",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  tdInput: {
    width: 72,
    textAlign: "right",
    padding: 4,
    fontSize: 11,
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    color: "#000",
  },
  addDayBtn: {
    backgroundColor: "#f8f7f4",
    borderWidth: 0.5,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginVertical: 10,
  },
  addDayText: { fontSize: 13, color: "#000" },

  footCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  footLabel: {
    fontSize: 10,
    color: "#000",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  allocCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  allocLabel: {
    fontSize: 10,
    color: "#000",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 4,
  },

  subBack: { fontSize: 13, color: "#c2823a", marginBottom: 14 },
  subTitle: {
    fontSize: 17,
    fontWeight: "500",
    marginBottom: 4,
    color: "#111827",
  },
  subDesc: { fontSize: 12, color: "#000", marginBottom: 14, lineHeight: 18 },

  errorBox: { alignItems: "center", padding: 24 },
  errorText: { color: "#000", marginBottom: 12 },
  retryBtn: {
    backgroundColor: "#13879A",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryText: { color: "#fff", fontWeight: "600" },
});

const header = StyleSheet.create({
  wrap: {
    backgroundColor: C.nav,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 15,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 8.5,
    lineHeight: 11,
    fontWeight: "900",
    letterSpacing: 1.45,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
    marginTop: 3,
  },
  path: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  pathSub: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 8.5,
    lineHeight: 12,
    marginTop: 1,
  },
  refresh: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  refreshText: { color: "#fff", fontSize: 22, fontWeight: "800" },
});