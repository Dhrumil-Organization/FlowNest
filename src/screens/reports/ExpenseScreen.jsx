// // ExpenseScreen.jsx — Madhusudhan Fabrics (React Native)
// // Complete rebuild matching all 14 screenshots

// import AsyncStorage from "@/common/utils/compatibleStorage";
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

            {/* Cost composition donut */}
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

import AsyncStorage from "@/common/utils/compatibleStorage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
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
// Responsive layout helpers (UI only) — phone 1 col / tablet 2 / desktop 3.
import { ReportContainer, ResponsiveGrid, SplitPane, useReportLayout } from "@/src/components/dashboard/ResponsiveReport";
import { DASH_GAP } from "@/src/components/dashboard/DashboardGrid";

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

        {/* Cost/pick line overlay. Connected SVG line remains visible on web and native. */}
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height: CHART_H }}>
          <Svg width="100%" height={CHART_H} viewBox={`0 0 600 ${CHART_H}`} preserveAspectRatio="none">
            <Polyline points={chartData.map((item, i) => {
              const x = chartData.length > 1 ? 50 + (i * 500) / (chartData.length - 1) : 300;
              const y = CHART_H - (maxCpp > 0 ? (item.cpp / maxCpp) * (CHART_H - 12) : 0) - 6;
              return `${x},${Math.max(6, Math.min(CHART_H - 6, y))}`;
            }).join(" ")} fill="none" stroke="#0f172a" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            {chartData.map((item, i) => {
              const x = chartData.length > 1 ? 50 + (i * 500) / (chartData.length - 1) : 300;
              const y = CHART_H - (maxCpp > 0 ? (item.cpp / maxCpp) * (CHART_H - 12) : 0) - 6;
              return <Circle key={i} cx={x} cy={Math.max(6, Math.min(CHART_H - 6, y))} r="4" fill="#0f172a" stroke="#fff" strokeWidth="1.5" />;
            })}
          </Svg>
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
// ── Daily Expense + Utility Trends (Client Artifact) ─────────────
function TrendBars({ rows, valueKey, valueFormatter, selected, onSelect, barColor = '#c2823a' }) {
  const max = Math.max(...rows.map(r => Number(r[valueKey] || 0)), 0.000001);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 6 }}>
      {rows.map((r, i) => {
        const v = Number(r[valueKey] || 0);
        const active = selected === i;
        return (
          <TouchableOpacity key={`${r.date_ymd || r.day}-${i}`} onPress={() => onSelect(i)}
            style={{ width: 38, alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: 9, color: active ? '#111827' : '#9ca3af', marginBottom: 3 }}>
              {active ? valueFormatter(v) : ''}
            </Text>
            <View style={{ height: 92, width: 22, justifyContent: 'flex-end', backgroundColor: '#f3f4f6', borderRadius: 5, overflow: 'hidden' }}>
              <View style={{ width: '100%', height: `${Math.max(3, (v / max) * 100)}%`, backgroundColor: barColor, opacity: active ? 1 : 0.62 }} />
            </View>
            <Text style={{ fontSize: 9, color: active ? '#111827' : '#6b7280', marginTop: 4 }}>{r.day}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function DailyTrendSheet({ open, onClose, d, trend }) {
  const safeTrend = trend || {};
  const isUtility = safeTrend.kind === 'utility';
  const isRapier = safeTrend.kind === 'rapier';
  const isWaterjet = safeTrend.kind === 'waterjet';
  const rows = isUtility
    ? (d.utility_daily_trend || []).filter(r => r.key === safeTrend.key)
    : (d.expense_daily_trend || []);
  const valueOf = r => isUtility ? Number(r.cost_per_mtr || 0)
    : isRapier ? Number(r.rapier_cost_per_pick || 0)
    : isWaterjet ? Number(r.waterjet_cost_per_pick || 0)
    : Number(r.cost_per_pick || 0);
  const positive = rows.map(valueOf).filter(v => v > 0);
  const avg = positive.length ? positive.reduce((a,v)=>a+v,0) / positive.length : 0;
  const best = positive.length ? Math.min(...positive) : 0;
  const worst = positive.length ? Math.max(...positive) : 0;
  const [selected, setSelected] = useState(Math.max(0, rows.length - 1));
  React.useEffect(() => { setSelected(Math.max(0, rows.length - 1)); }, [safeTrend.kind, safeTrend.key, rows.length]);
  const row = rows[Math.min(selected, Math.max(0, rows.length - 1))] || {};
  const title = isUtility ? (safeTrend.label || 'Utility') : isRapier ? 'Rapier' : isWaterjet ? 'Waterjet' : 'Total (Rapier + Waterjet)';
  const prod = r => isUtility ? Number(r.production_mtr || 0) : isRapier ? Number(r.rapier_mtr || 0) : isWaterjet ? Number(r.waterjet_mtr || 0) : Number(r.production_mtr || 0);
  const picks = r => isRapier ? Number(r.rapier_avg_picks || 0) : isWaterjet ? Number(r.waterjet_avg_picks || 0) : Number(r.avg_picks || 0);
  const cost = r => isUtility ? Number(r.amount || 0) : isRapier ? Number(r.rapier_total_cost || 0) : isWaterjet ? Number(r.waterjet_total_cost || 0) : Number(r.total_cost || 0);
  if (!open || !trend) return null;
  return <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
    <View style={{flex:1,backgroundColor:'rgba(15,23,42,0.38)',justifyContent:'center',padding:18}}>
      <View style={{backgroundColor:'#fff',borderRadius:16,maxHeight:'88%',padding:14,width:'100%',maxWidth:720,alignSelf:'center'}}>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
          <View style={{flex:1,paddingRight:10}}><Text style={{fontSize:17,fontWeight:'700',color:'#111827'}}>{title}</Text>
            <Text style={{fontSize:10.5,color:'#6b7280',marginTop:3,lineHeight:15}}>{isUtility ? "Daily electricity cost per metre — units × rate ÷ that day's production of the machines it feeds." : "Daily cost per pick — electricity, wages and allocated stores ÷ metres ÷ picks."}</Text></View>
          <TouchableOpacity onPress={onClose} style={{padding:6}}><Text style={{fontSize:20,color:'#6b7280'}}>×</Text></TouchableOpacity>
        </View>
        <View style={{flexDirection:'row',gap:7,marginBottom:8}}>
          {[['MONTH AVG',avg],['BEST DAY',best],['WORST DAY',worst]].map(([l,v])=><View key={l} style={{flex:1,borderWidth:1,borderColor:'#e5e7eb',borderRadius:9,padding:8}}><Text style={{fontSize:9,color:'#6b7280'}}>{l}</Text><Text style={{fontSize:14,fontWeight:'700',marginTop:2}}>₹{isUtility?f3(v):f3(v)}{isUtility?'/m':'/pk'}</Text></View>)}
        </View>
        <TrendBars rows={rows.map(r=>({...r,_v:valueOf(r)}))} valueKey="_v" valueFormatter={v=>`₹${f3(v)}`} selected={selected} onSelect={setSelected} barColor={isUtility?'#185FA5':isWaterjet?'#185FA5':'#c2823a'} />
        {!!row.date_ymd && <View style={{backgroundColor:'#f8fafc',borderRadius:9,padding:9,marginVertical:6}}><Text style={{fontSize:11.5,fontWeight:'700'}}>Day {row.day}</Text><Text style={{fontSize:10.5,color:'#4b5563',marginTop:3}}>{isUtility ? `${fN(row.kwh)} kWh · ${fN(prod(row))} m · ${fL(cost(row))} · ₹${f3(valueOf(row))}/m` : `${fN(prod(row))} m · ${f2(picks(row))} picks · ${fL(cost(row))} · ₹${f3(valueOf(row))}/pick`}</Text></View>}
        <ScrollView style={{maxHeight:210}} nestedScrollEnabled>
          <View style={{flexDirection:'row',paddingVertical:6,borderBottomWidth:1,borderBottomColor:'#e5e7eb'}}><Text style={{flex:0.8,fontSize:9,fontWeight:'700'}}>DATE</Text><Text style={{flex:1,textAlign:'right',fontSize:9,fontWeight:'700'}}>{isUtility?'kWh':'PROD m'}</Text><Text style={{flex:1,textAlign:'right',fontSize:9,fontWeight:'700'}}>{isUtility?'PROD m':'PICKS'}</Text><Text style={{flex:1,textAlign:'right',fontSize:9,fontWeight:'700'}}>COST</Text><Text style={{flex:1,textAlign:'right',fontSize:9,fontWeight:'700'}}>{isUtility?'₹/m':'₹/PICK'}</Text></View>
          {rows.map((r,i)=><TouchableOpacity key={`${r.date_ymd}-${i}`} onPress={()=>setSelected(i)} style={{flexDirection:'row',paddingVertical:6,borderBottomWidth:1,borderBottomColor:'#f3f4f6',backgroundColor:i===selected?'#f8fafc':'#fff'}}><Text style={{flex:0.8,fontSize:10}}>{r.day}</Text><Text style={{flex:1,textAlign:'right',fontSize:10}}>{fN(isUtility?r.kwh:prod(r))}</Text><Text style={{flex:1,textAlign:'right',fontSize:10}}>{fN(isUtility?prod(r):picks(r))}</Text><Text style={{flex:1,textAlign:'right',fontSize:10}}>{fL(cost(r))}</Text><Text style={{flex:1,textAlign:'right',fontSize:10,fontWeight:'700'}}>₹{f3(valueOf(r))}</Text></TouchableOpacity>)}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}


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
  onTrend,
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
        <TouchableOpacity disabled={!onTrend} onPress={onTrend} activeOpacity={0.72} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 12, color: "#374151" }}>{label}</Text>
          {!!onTrend && <Text style={{ fontSize: 9.5, fontWeight: "700", color: "#185FA5" }}>daily ›</Text>}
        </TouchableOpacity>
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
  const rows = Array.isArray(d.electricity_daily) ? d.electricity_daily : [];
  const [openDay, setOpenDay] = useState(rows.length ? rows.length - 1 : -1);
  const totalKwh = rows.reduce((sum, r) => sum + Number(r.total_kwh || 0), 0);
  const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const monthLabel = d.label || '';
  const fmtDate = (ymd) => {
    const x = String(ymd || '');
    if (x.length !== 8) return x;
    const dt = new Date(Number(x.slice(0,4)), Number(x.slice(4,6))-1, Number(x.slice(6,8)));
    return `${String(dt.getDate()).padStart(2,'0')}-${dt.toLocaleString('en-US',{month:'short'})}`;
  };
  const meterRows = (r) => [
    ['MW Rapier — Looms', r.mw_rapier_looms],
    ['Sud Rapier — Looms', r.sip_rapier_looms],
    ['Sud W-Jet — Looms', r.sip_waterjet_looms],
  ];
  const moreRows = (r) => [
    ['MW Rapier — Luwa (humid.)', r.mw_rapier_luwa],
    ['Sud Rapier — Luwa (humid.)', r.sip_rapier_luwa],
    ['Warping (shared)', r.warping_shared],
    ['Miscellaneous (shared)', r.misc_shared],
  ];

  return (
    <View>
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 12 }}>
        <Text style={S.subBack}>‹ Back to report</Text>
      </TouchableOpacity>
      <Text style={S.subTitle}>Electricity units</Text>
      <Text style={S.subDesc}>
        Read-only daily sub-meter readings from Expense Costing. Tap a day to audit the meter split. No value is entered or saved from this screen.
      </Text>

      <View style={{borderWidth:1,borderColor:'#e5e7eb',borderRadius:12,padding:12,marginBottom:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10}}>
        <View style={{flexShrink:1}}><Text style={{fontSize:9,color:'#6b7280',fontWeight:'700'}}>MONTH TO DATE {monthLabel ? `· ${monthLabel}` : ''}</Text><Text style={{fontSize:20,fontWeight:'700',marginTop:3}}>{fN(totalKwh)} <Text style={{fontSize:12,color:'#6b7280'}}>kWh</Text></Text></View>
        <View style={{alignItems:'flex-end'}}><Text style={{fontSize:9,color:'#6b7280'}}>ELECTRICITY @ ₹{f2(d.unit_rate || 0)}</Text><Text style={{fontSize:17,fontWeight:'700',color:'#185FA5',marginTop:3}}>{fL(totalAmount)}</Text></View>
      </View>

      {rows.length === 0 ? <View style={{padding:18,borderWidth:1,borderColor:'#e5e7eb',borderRadius:10}}><Text style={{fontSize:12,color:'#6b7280'}}>No daily electricity readings are available for this month.</Text></View> : rows.map((r, i) => {
        const open = openDay === i;
        return <View key={`${r.date_ymd}-${i}`} style={{borderWidth:1,borderColor:open?'#cbd5e1':'#e5e7eb',borderRadius:10,marginBottom:7,overflow:'hidden',backgroundColor:'#fff'}}>
          <TouchableOpacity onPress={()=>setOpenDay(open?-1:i)} style={{padding:11,flexDirection:'row',alignItems:'center'}} activeOpacity={0.75}>
            <View style={{width:25,height:25,borderRadius:6,backgroundColor:open?'#185FA5':'#f3f4f6',alignItems:'center',justifyContent:'center',marginRight:9}}><Text style={{fontSize:11,fontWeight:'700',color:open?'#fff':'#6b7280'}}>{Number(r.day || i+1)}</Text></View>
            <View style={{flex:1}}><Text style={{fontSize:12,fontWeight:'700'}}>{fmtDate(r.date_ymd)}</Text><Text style={{fontSize:9.5,color:'#6b7280',marginTop:2}}>{fN(r.total_kwh)} kWh</Text></View>
            <Text style={{fontSize:11,fontWeight:'700',color:'#185FA5',marginRight:8}}>{fN(r.total_kwh)} kWh</Text><Text style={{fontSize:11,color:'#6b7280'}}>{open?'⌃':'⌄'}</Text>
          </TouchableOpacity>
          {open && <View style={{borderTopWidth:1,borderTopColor:'#f1f5f9',paddingHorizontal:11,paddingBottom:10}}>
            {meterRows(r).map(([label,v])=><View key={label} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:7,borderBottomWidth:1,borderBottomColor:'#f8fafc'}}><Text style={{fontSize:11,color:'#374151'}}>{label}</Text><Text style={{fontSize:11,fontWeight:'600'}}>{fN(v)} kWh</Text></View>)}
            <Text style={{fontSize:9,fontWeight:'700',color:'#6b7280',marginTop:9,marginBottom:2}}>MORE METERS · HUMIDIFICATION, WARPING, MISC</Text>
            {moreRows(r).map(([label,v])=><View key={label} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:6}}><Text style={{fontSize:10.5,color:'#4b5563'}}>{label}</Text><Text style={{fontSize:10.5,fontWeight:'600'}}>{fN(v)} kWh</Text></View>)}
            <View style={{marginTop:6,paddingTop:8,borderTopWidth:1,borderTopColor:'#e5e7eb',flexDirection:'row',justifyContent:'space-between'}}><View><Text style={{fontSize:10,fontWeight:'700'}}>DAY TOTAL</Text><Text style={{fontSize:9,color:'#6b7280',marginTop:2}}>₹{f2(r.unit_rate || d.unit_rate || 0)}/kWh · {r.is_reconciled === false ? `difference ${fN(r.difference_kwh)} kWh` : 'reconciled'}</Text></View><View style={{alignItems:'flex-end'}}><Text style={{fontSize:13,fontWeight:'700',color:'#185FA5'}}>{fN(r.total_kwh)} kWh</Text><Text style={{fontSize:10,color:'#6b7280',marginTop:2}}>{fL(r.amount || 0)}</Text></View></View>
          </View>}
        </View>;
      })}
    </View>
  );
}

// ── Daily Salary view ─────────────────────────────────────────────
function DailySalaryView({ d, onBack, fill = false }) {
  const cf = fill ? { flex: 1 } : null; // UI only: stretch table to full width on tablet/desktop
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fill ? { flexGrow: 1 } : undefined}>
        <View style={fill ? { flex: 1 } : undefined}>
          <View style={S.tableRow}>
            <Text style={[S.th, cf, { minWidth: 70, textAlign: "left" }]}>
              Date
            </Text>
            {COLS.map((c) => (
              <Text key={c} style={[S.th, cf]}>
                {c}
              </Text>
            ))}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={S.tableRow}>
              <Text
                style={[
                  S.td, cf,
                  { minWidth: 70, textAlign: "left", fontWeight: "500" },
                ]}
              >
                {row.date}
              </Text>
              {[0, 1].map((ci) => (
                <TextInput
                  key={ci}
                  style={[S.tdInput, cf && { flex: 1, minWidth: 72 }]}
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
              <Text style={[S.td, cf, { color: "#c2823a", fontWeight: "500" }]}>
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
                S.th, cf,
                { minWidth: 70, textAlign: "left", color: "#c2823a" },
              ]}
            >
              TOTAL
            </Text>
            <Text style={[S.th, cf, { color: "#c2823a" }]}>₹{fN(tR)}</Text>
            <Text style={[S.th, cf, { color: "#c2823a" }]}>₹{fN(tW)}</Text>
            <Text style={[S.th, cf, { color: "#c2823a" }]}>₹{fN(tT)}</Text>
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
function DailyInputView({ title, desc, d, onBack, fill = false }) {
  const cf = fill ? { flex: 1 } : null; // UI only: stretch table to full width on tablet/desktop
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fill ? { flexGrow: 1 } : undefined}>
        <View style={fill ? { flex: 1 } : undefined}>
          <View style={S.tableRow}>
            <Text style={[S.th, cf, { minWidth: 70, textAlign: "left" }]}>
              Date
            </Text>
            {COLS.map((c) => (
              <Text key={c} style={[S.th, cf]}>
                {c}
              </Text>
            ))}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={S.tableRow}>
              <Text
                style={[
                  S.td, cf,
                  { minWidth: 70, textAlign: "left", fontWeight: "500" },
                ]}
              >
                {row.date}
              </Text>
              {COLS.map((c, ci) => (
                <TextInput
                  key={ci}
                  style={[S.tdInput, cf && { flex: 1, minWidth: 72 }]}
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
                S.th, cf,
                { minWidth: 70, textAlign: "left", color: "#534AB7" },
              ]}
            >
              TOTAL
            </Text>
            {totals.map((t, i) => (
              <Text key={i} style={[S.th, cf, { color: "#534AB7" }]}>
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
function KPIGrid({ d, label, cols = 1 }) {
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
  // Tablet: 3 tiles per row, desktop: all 6 in one row. Phone keeps the
  // original 2-up wrap below.
  if (cols > 1) {
    return (
      <ResponsiveGrid cols={cols >= 3 ? 6 : 3} gap={10} style={{ marginBottom: 12, rowGap: 10 }}>
        {items.map((k, i) => (
          <View key={i} style={[S.kpiCard, { width: "100%", flex: 1, borderTopColor: k.c }]}>
            <Text style={S.kpiLabel} numberOfLines={1}>{k.l}</Text>
            <Text style={S.kpiValue} numberOfLines={1}>{k.v}</Text>
            <Text style={S.kpiSub} numberOfLines={1}>{k.s}</Text>
          </View>
        ))}
      </ResponsiveGrid>
    );
  }
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
  onTrend,
}) {
  return (
    <View style={[S.mgmtCard, { borderLeftColor: borderColor }]}>
      <View style={S.mgmtHeader}>
        <View style={{ flex: 1 }}>
          <Text style={S.mgmtName}>{name}</Text>
          <Text style={S.mgmtSub}>{f2(prod / 1e5)} L m · {f2(pk)} pk</Text>
        </View>
        {!!onTrend && <TouchableOpacity onPress={onTrend} activeOpacity={0.72} style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, backgroundColor: "#f3f4f6" }}>
          <Text style={{ fontSize: 9.5, fontWeight: "700", color: "#6b7280" }}>daily trend ›</Text>
        </TouchableOpacity>}
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
  /*
   * Coverage is authoritative from the live dashboard API.
   *
   * Do NOT derive this from coverage_daily/daily here. In the JSON path,
   * `daily` is the checking-production trend and does not contain the legacy
   * XLSX fields `total_kwh` / `sal_t`. Recalculating coverage from that array
   * therefore makes every month look as if Electricity and Salary are missing.
   */
  const coverage = d?.coverage;
  if (!month || !coverage) return null;

  const heads = Array.isArray(coverage.coverage_heads)
    ? coverage.coverage_heads
    : [];
  const pendingExpenses = Array.isArray(coverage.pending_expenses)
    ? coverage.pending_expenses
    : [];

  const requestedYmd = Number(coverage.requested_upto_ymd || 0);
  const completeYmd = Number(coverage.complete_through_ymd || 0);
  const isComplete = coverage.is_complete === true
    || String(coverage.coverage_status || '').toLowerCase() === 'complete';

  const formatYmd = (ymd) => {
    const value = String(Number(ymd || 0));
    if (!/^\d{8}$/.test(value)) return null;
    const year = Number(value.slice(0, 4));
    const monthIndex = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    const dt = new Date(year, monthIndex, day);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatShortYmd = (ymd) => {
    const value = String(Number(ymd || 0));
    if (!/^\d{8}$/.test(value)) return null;
    const year = Number(value.slice(0, 4));
    const monthIndex = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    const dt = new Date(year, monthIndex, day);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  };

  const requestedText = formatYmd(requestedYmd);
  const completeText = formatYmd(completeYmd);

  // coverage_heads is the preferred full list. Keep a small compatibility
  // fallback for older API responses that only expose pending_expenses.
  const displayHeads = heads.length > 0
    ? heads
    : pendingExpenses;

  const hasPending = !isComplete || pendingExpenses.length > 0;

  return (
    <View style={S.coverageCard}>
      <View style={{ flex: 1 }}>
        <Text style={S.coverageKicker}>EXPENSE DATA COVERAGE</Text>
        <Text style={S.coverageTitle}>
          {isComplete
            ? `Entered through ${completeText || requestedText || month.fullLabel}`
            : `Complete through ${completeText || 'No fully complete expense day yet'}`}
        </Text>

        {hasPending ? (
          <View style={S.coverageHeadList}>
            {displayHeads.map((head) => {
              const current = String(head?.status || '').toLowerCase() === 'current';
              const lastText = formatShortYmd(head?.last_entered_ymd);
              const fromText = formatShortYmd(head?.pending_from_ymd);
              const toText = formatShortYmd(head?.pending_to_ymd || requestedYmd);
              const pendingDays = Number(head?.pending_days || 0);

              return (
                <View key={head?.key || head?.label} style={S.coverageHeadRow}>
                  <Text style={S.coverageHeadLabel}>{head?.label || head?.key}</Text>
                  <Text style={current ? S.coverageHeadCurrent : S.coverageHeadPending}>
                    {lastText ? `Entered through ${lastText}` : 'No entry'}
                    {current
                      ? ' · current'
                      : ` · pending ${fromText || '?'}–${toText || '?'} (${pendingDays}d)`}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={S.coverageOk}>
            All required daily expense heads are current through {requestedText || completeText || month.fullLabel}.
          </Text>
        )}
      </View>

      <View style={[
        S.coverageBadge,
        hasPending ? S.coverageBadgeWarn : S.coverageBadgeOk,
      ]}>
        <Text style={S.coverageBadgeText}>{hasPending ? 'PARTIAL' : 'CURRENT'}</Text>
      </View>
    </View>
  );
}

// ── Production block ──────────────────────────────────────────────
function ProductionBlock({ d }) {
  const [series, setSeries] = useState('combined');
  // UI only: measured chart width so the day-wise chart fills wide cards.
  const [chartW, setChartW] = useState(0);
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

      <View
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          setChartW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
        }}
      >
      <InteractiveDailyTrendChart
        data={trend}
        valueKey="meters"
        labelKey="day"
        color={series === 'waterjet' ? '#185FA5' : series === 'rapier' ? '#B77932' : '#0D1B2A'}
        fillColor={series === 'waterjet' ? '#185FA5' : series === 'rapier' ? '#B77932' : '#0D1B2A'}
        height={116}
        pointGap={trend.length > 1 ? Math.max(48, (chartW - 44) / (trend.length - 1)) : 48}
        minWidth={Math.max(320, trend.length * 48, chartW)}
        showBaseline
        valueFormatter={(value) => {
          const n = Number(value || 0);
          if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(2)} L m`;
          if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)} K m`;
          return `${Math.round(n).toLocaleString('en-IN')} m`;
        }}
      />
      </View>

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
  const [trendSheet, setTrendSheet] = useState(null);
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

  // UI only — responsive layout (phone 1 col / tablet 2 / desktop 3).
  const layout = useReportLayout();
  const multi = layout.cols > 1;

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
        fill={multi}
      />
    ),
    "daily-maint": (
      <DailyInputView
        title="Daily maintenance"
        d={d || { daily: [] }}
        onBack={() => setView("report")}
        fill={multi}
        desc="Maintenance & repair spend per day (₹). Enter per shed, or under Common for shared cost — common auto-splits ½ Rapier / ½ Waterjet."
      />
    ),
    "daily-other": (
      <DailyInputView
        title="Daily other expenses"
        d={d || { daily: [] }}
        onBack={() => setView("report")}
        fill={multi}
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
          <ReportContainer onLayout={layout.onLayout} maxWidth={960}>
            {subViews[view]}
          </ReportContainer>
        </ScrollView>
      </View>
    );
  }

  // ── Main report ───────────────────────────────────────────────
  return (
    <View style={S.safe}>
      <DailyTrendSheet open={!!trendSheet} onClose={() => setTrendSheet(null)} d={d || {}} trend={trendSheet} />
      <ScrollView
        style={S.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <ReportContainer onLayout={layout.onLayout}>
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
            <KPIGrid d={d} label={m.fullLabel} cols={layout.cols} />

            {/* Section conversion rates — Client Artifact, LIVE MTD.
                Conversion only = electricity + wages. Overheads are intentionally
                excluded until Maintenance / Other and persistent freezing are proven. */}
            {/* Tablet / desktop: conversion rates | cost composition side by side. */}
            <View style={multi ? { flexDirection: "row", alignItems: "stretch", gap: DASH_GAP } : undefined}>
            {d.conversion_rates && (
              <View style={[{
                backgroundColor: "#fff", borderRadius: 14, borderWidth: 1,
                borderColor: "#e5e7eb", padding: 14, marginBottom: 14,
              }, multi && { flex: 1.3, minWidth: 0, marginBottom: 12 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827" }}>Section conversion rates</Text>
                  <View style={{ backgroundColor: "#FFF7E6", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#B26A00" }}>LIVE MTD</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 10.5, color: "#6b7280", lineHeight: 15, marginBottom: 10 }}>
                  Electricity + wages ÷ Σ(metres × picks). Overheads are not included. Rate is live through {String(d.conversion_rates.calculated_through_ymd || "—")}.
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[
                    ["Rapier · MW + SIP", d.conversion_rates.rapier, "#c2823a"],
                    ["Waterjet", d.conversion_rates.waterjet, "#185FA5"],
                  ].map(([label, x, color]) => (
                    <View key={label} style={{ flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderTopWidth: 4, borderTopColor: color, borderRadius: 10, padding: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: "#111827", marginBottom: 7 }}>{label}</Text>
                      <Text style={{ fontSize: 9.5, color: "#6b7280" }}>Electricity + wages</Text>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: "#111827", marginTop: 2 }}>₹{Number(x?.rate_per_pick_mtr || 0).toFixed(4)}/pk·m</Text>
                      <Text style={{ fontSize: 9.5, color: "#6b7280", marginTop: 4 }}>≈ ₹{Number(x?.approx_per_mtr || 0).toFixed(2)}/m @ {Number(x?.avg_picks || 0).toFixed(1)} picks</Text>
                      <Text style={{ fontSize: 9, color: "#9ca3af", marginTop: 4 }}>{fL(Number(x?.conversion_amount || 0))} conversion</Text>
                    </View>
                  ))}
                </View>
                <Text style={{ fontSize: 9.5, color: "#6b7280", marginTop: 9, lineHeight: 14 }}>
                  Sale freeze and month-close freeze are intentionally not written yet. They will be enabled only after the actual ERP roll-to-sale persistence path is verified.
                </Text>
              </View>
            )}

            {/* Cost composition donut */}
            <View style={[S.compositionCard, multi && { flex: 1, minWidth: 0 }]}>
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
            </View>

            {/* Management summary */}
            <Text style={S.sectionLabel}>MANAGEMENT SUMMARY</Text>
            <ResponsiveGrid cols={multi ? 3 : 1} gap={10}>
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
              onTrend={() => setTrendSheet({ kind: "rapier" })}
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
              onTrend={() => setTrendSheet({ kind: "waterjet" })}
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
              onTrend={() => setTrendSheet({ kind: "total" })}
            />
            </ResponsiveGrid>

            {/* Expense breakdown */}
            <Text style={S.sectionLabel}>EXPENSE BREAKDOWN</Text>
            {/* Tablet / desktop: expense blocks in two columns (same order when stacked). */}
            <SplitPane
              layout={layout}
              gap={10}
              left={<>

            {/* Utilities */}
            <ExpBlock
              icon="⚡"
              iconColor="#185FA5"
              iconBg="#EFF6FF"
              title="Utilities / units consumed"
              sub={`${fN(d.kwh_total)} kWh @ ₹${d.unit_rate}`}
              amt={`${fLn(d.elec_total)} L`}
              editLabel="View daily units ›"
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
                  onTrend={() => setTrendSheet({ kind: "utility", key: row.key, label: row.label })}
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

              </>}
              right={<>
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

              </>}
            />

            {/* Tablet / desktop: comparative chart | efficiency indicators */}
            <SplitPane
              layout={layout}
              ratio={0.58}
              left={<>
            {/* Comparative analytics */}
            <Text style={S.sectionLabel}>COMPARATIVE ANALYTICS · 6 MONTHS</Text>
            <ComparativeChart months={months} states={states} />
              </>}
              right={<>

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
                <View key={l} style={[S.effCard, layout.wide && { width: "31.8%" }]}>
                  <Text style={S.effLabel}>{l}</Text>
                  <Text style={S.effValue}>{v}</Text>
                </View>
              ))}
            </View>
              </>}
            />

            {/* Tablet / desktop: production chart | month settings, splits, MoM */}
            <SplitPane
              layout={layout}
              ratio={0.56}
              left={<>
            {/* Production block */}
            <Text style={[S.sectionLabel, { marginTop: 8, color: "#000" }]}>
              PRODUCTION · FROM PRODUCTION SYSTEM
            </Text>
            <ProductionBlock d={d} />
              </>}
              right={<>

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
              </>}
            />

            {/* Past performance */}
            <Text style={S.sectionLabel}>PAST PERFORMANCE</Text>
            <ResponsiveGrid cols={layout.cols} gap={10}>
            {months.map((mo, i) => (
              <PastRow
                key={mo.key}
                month={mo}
                st={states[mo.key]}
                open={!!pastOpen[i]}
                onToggle={() => togglePast(i)}
              />
            ))}
            </ResponsiveGrid>
          </>
        )}
        </ReportContainer>
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