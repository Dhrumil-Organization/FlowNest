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
// function MiniDonut({ rapierPct, label, size = 90, aLabel = "Rapier", bLabel = "W-Jet", aColor = "#c2823a", bColor = "#185FA5" }) {
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
//             borderColor: aColor,
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
//                 borderColor: bColor,
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
//           <Text style={{ fontSize: 9, color: "#9ca3af" }}>{aLabel}</Text>
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
//               backgroundColor: aColor,
//             }}
//           />
//           <Text style={{ fontSize: 10, color: "#6b7280" }}>
//             {aLabel} {rapierPct.toFixed(1)}%
//           </Text>
//         </View>
//         <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
//           <View
//             style={{
//               width: 7,
//               height: 7,
//               borderRadius: 3.5,
//               backgroundColor: bColor,
//             }}
//           />
//           <Text style={{ fontSize: 10, color: "#6b7280" }}>
//             {bLabel} {wjetPct.toFixed(1)}%
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
//       s: d.section_ab_active ? "Section A + Section B" : "all sheds",
//       c: "#c2823a",
//     },
//     { l: "AVG PICKS", v: f2(d.avg_pick_tot), s: "prod-weighted", c: "#1D9E75" },
//     {
//       l: "PRODUCTION",
//       v: `${f2(d.prod_total_L)} L m`,
//       s: Number(d.days || 0) > 0 ? `${fN(Number(d.prod_total || 0) / Number(d.days) / Number(d.section_machine_counts?.total_section || 126))} m / mc·day` : "month-to-date",
//       c: "#1D9E75",
//     },
//     { l: "COST / MC·DAY", v: `₹${fN(d.cpmc)}`, s: `${Number(d.section_machine_counts?.total_section || 126)} looms`, c: "#534AB7" },
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

// 
// ── Claude Artifact aligned report composition ─────────────────────
function ClaudeInputLink({ icon, title, sub, accent, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.76} style={S.clInputRow}>
      <View style={[S.clInputIcon, { backgroundColor: `${accent}18` }]}>
        <Text style={[S.clInputIconText, { color: accent }]}>{icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={S.clInputTitle}>{title}</Text>
        <Text style={S.clInputSub} numberOfLines={1}>{sub}</Text>
      </View>
      <Text style={S.clEdit}>Edit ›</Text>
    </TouchableOpacity>
  );
}

function ClaudeProductionAuto({ d }) {
  const counts = d.section_machine_counts || {};
  const rows = d.section_ab_active
    ? [
        ['A', 'Section A', 'Waterjet + S. Rapier 230 cm', d.section_a_prod, d.section_a_avg_picks, '#185FA5'],
        ['B', 'Section B', 'Rapier 190 cm', d.section_b_prod, d.section_b_avg_picks, '#534AB7'],
      ]
    : [
        ['R', 'Rapier', 'MW + SIP', d.prod_rapier, d.avg_pick_mw, '#B77932'],
        ['W', 'Waterjet', 'Legacy division', d.prod_wjet, d.avg_pick_wjet, '#185FA5'],
      ];

  return (
    <View style={S.clCard}>
      <View style={S.clTitleRow}>
        <Text style={S.clEyebrow}>PRODUCTION · FROM PRODUCTION SYSTEM</Text>
        <View style={S.clAuto}><Text style={S.clAutoText}>● AUTO</Text></View>
      </View>
      {rows.map(([tag, title, sub, prod, picks, color]) => (
        <View key={tag} style={S.clProdRow}>
          <View style={[S.clTag, { backgroundColor: `${color}14` }]}>
            <Text style={[S.clTagText, { color }]}>{tag}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.clProdTitle}>{title}</Text>
            <Text style={S.clProdSub}>{sub}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[S.clProdValue, { color }]}>{f2(Number(prod || 0) / 1e5)} L m</Text>
            <Text style={S.clProdPicks}>{f2(picks)} pk</Text>
          </View>
        </View>
      ))}
      <View style={S.clProdTotal}>
        <Text style={S.clProdTotalLabel}>Total · {Number(counts.total_section || 126)} machines</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={S.clProdTotalValue}>{f2(Number(d.prod_total || 0) / 1e5)} L m</Text>
          <Text style={S.clProdPicks}>{f2(d.avg_pick_tot)} pk</Text>
        </View>
      </View>
      <Text style={S.clNote}>Metres and picks flow from the production system and roll up to the visible section model.</Text>
    </View>
  );
}

function ClaudeManagementCard({ name, subtitle, accent, prod, picks, elec, sal, store, maintenance = 0, other = 0, cpp, extended, onTrend }) {
  const rows = [
    ['Electricity', elec, '#185FA5'],
    ['Salary', sal, '#C2823A'],
    ['Stores', store, '#1D9E75'],
    ...(extended ? [['Maintenance', maintenance, '#534AB7'], ['Other', other, '#BA7517']] : []),
  ];
  return (
    <View style={[S.clMgmtCard, { borderTopColor: accent }]}>
      <View style={S.clMgmtHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text style={S.clMgmtTitle}>{name}</Text>
            {!!onTrend && (
              <TouchableOpacity onPress={onTrend} style={[S.clTrendPill, { backgroundColor: `${accent}10`, borderColor: `${accent}55` }]}>
                <Text style={[S.clTrendPillText, { color: accent }]}>daily trend ›</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={S.clMgmtSub}>{subtitle}</Text>
        </View>
        <Text style={S.clMgmtMeta}>{f2(Number(prod || 0) / 1e5)} L m · {f2(picks)} pk</Text>
      </View>
      {rows.map(([label, value, color]) => (
        <View key={label} style={S.clMgmtRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={[S.colorDot, { backgroundColor: color }]} />
            <Text style={S.clMgmtLabel}>{label}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.clMgmtValue}>{fINR(value)}</Text>
            <Text style={S.clMgmtPerPick}>₹{f3(safePerPick(value, prod, picks))}/pk</Text>
          </View>
        </View>
      ))}
      <View style={S.clMgmtFoot}>
        <View><Text style={S.clFootLabel}>COST / PICK</Text><Text style={S.clFootCost}>₹{f3(cpp)}</Text></View>
        <View style={{ alignItems: 'flex-end' }}><Text style={S.clFootLabel}>AVG PICKS</Text><Text style={S.clFootPick}>{f2(picks)}</Text></View>
      </View>
    </View>
  );
}

function ClaudeComparativeChart({ months, states }) {
  const data = months.map((mo) => ({
    label: mo.shortLabel,
    prod: Number(states[mo.key]?.data?.prod_total_L || 0),
    cpp: Number(states[mo.key]?.data?.cpp_total || 0),
  })).reverse();
  const maxProd = Math.max(...data.map(x => x.prod), 1);
  const maxCpp = Math.max(...data.map(x => x.cpp), 0.001);
  const left = 54, right = 646, top = 24, bottom = 196;
  const step = (right - left) / Math.max(data.length, 1);
  const barW = Math.min(34, step * 0.42);
  const pts = data.map((row, i) => ({
    x: left + step * i + step / 2,
    y: bottom - (row.cpp / maxCpp) * (bottom - top),
  }));
  return (
    <View style={S.clChartCard}>
      <View style={S.clChartHead}><Text style={S.clCardTitle}>Production vs cost / pick</Text><Text style={S.clChartSub}>last 6 months</Text></View>
      <Svg width="100%" height={232} viewBox="0 0 700 232" preserveAspectRatio="none">
        {[0, .25, .5, .75, 1].map((p) => {
          const y = bottom - p * (bottom - top);
          return <Line key={p} x1={left} x2={right} y1={y} y2={y} stroke="#EEE8DF" strokeWidth="1" />;
        })}
        {data.map((row, i) => {
          const x = left + step * i + step / 2;
          const h = (row.prod / maxProd) * (bottom - top);
          return <Rect key={row.label} x={x - barW/2} y={bottom - h} width={barW} height={Math.max(1,h)} rx="5" fill="#B77932" opacity="0.86" />;
        })}
        <Polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#0D1B2A" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p,i)=><Circle key={i} cx={p.x} cy={p.y} r="4.5" fill="#0D1B2A" stroke="#fff" strokeWidth="2" />)}
        {data.map((row,i)=>{
          const x=left+step*i+step/2;
          return <SvgText key={row.label} x={x} y="220" textAnchor="middle" fontSize="11" fill="#8A8177">{row.label}</SvgText>;
        })}
        <SvgText x="10" y="18" fontSize="10" fill="#8A8177">L m</SvgText>
        <SvgText x="660" y="18" fontSize="10" fill="#8A8177">₹/pk</SvgText>
        <SvgText x="10" y={top+4} fontSize="9" fill="#A69C91">{maxProd.toFixed(1)}</SvgText>
        <SvgText x="654" y={top+4} fontSize="9" fill="#A69C91">{maxCpp.toFixed(3)}</SvgText>
      </Svg>
      <View style={S.clLegend}>
        <View style={S.clLegendItem}><View style={[S.clLegendBox,{backgroundColor:'#B77932'}]}/><Text style={S.clLegendText}>Production (L m)</Text></View>
        <View style={S.clLegendItem}><View style={[S.clLegendDot,{backgroundColor:'#0D1B2A'}]}/><Text style={S.clLegendText}>Cost / pick (₹)</Text></View>
      </View>
    </View>
  );
}

function ClaudeEfficiencyCard({ d }) {
  const machineCount = Number(d.section_machine_counts?.total_section || 126);
  const prodMcDay = Number(d.days || 0) > 0 ? Number(d.prod_total || 0) / machineCount / Number(d.days) : 0;
  const rows = [
    ['Units / metre', `${f2(d.units_per_mtr)} kWh`],
    ['Salary / metre', fINR(d.sal_per_mtr)],
    ['Stores / metre', fINR(d.store_per_mtr)],
    ['Avg picks', f2(d.avg_pick_tot)],
    ['Prod / mc·day', `${fN(prodMcDay)} m`],
    ['Cost / mc·day', fINR(d.cpmc)],
  ];
  return (
    <View style={S.clCard}>
      <Text style={S.clCardTitle}>Efficiency indicators · {d.label}</Text>
      <View style={S.clStatGrid}>{rows.map(([label,value])=><View key={label} style={S.clStat}><Text style={S.clStatLabel}>{label}</Text><Text style={S.clStatValue}>{value}</Text></View>)}</View>
    </View>
  );
}

function ClaudeMonthDelta({ d, prevD }) {
  const delta=(c,p)=>Number(p||0)!==0?(Number(c||0)-Number(p||0))/Math.abs(Number(p))*100:null;
  const rows=[
    ['TOTAL COST',d.total,prevD?.total,(v)=>fINR(v)],
    ['COST / PICK',d.cpp_total,prevD?.cpp_total,(v)=>`₹${f3(v)}`],
    ['PRODUCTION',d.prod_total_L,prevD?.prod_total_L,(v)=>`${f2(v)} L m`],
  ];
  return <View style={S.clCard}><Text style={S.clCardTitle}>Month-on-month</Text><Text style={S.clSmallMuted}>{prevD?`${d.label} vs ${prevD.label}`:'No prior month loaded'}</Text><View style={S.clDeltaGrid}>{rows.map(([label,c,p,fmt])=>{const v=delta(c,p);return <View key={label} style={S.clDeltaItem}><Text style={S.clStatLabel}>{label}</Text><Text style={S.clDeltaValue}>{fmt(c)}</Text><Text style={[S.clDeltaPct,{color:v==null?'#A69C91':v>0?'#B54747':'#2F855A'}]}>{v==null?'—':`${v>0?'▲':'▼'} ${Math.abs(v).toFixed(1)}%`}</Text></View>})}</View></View>;
}


function ExpenseDataIntegrityNotice({ d }) {
  if (!d?.section_ab_active) return null;
  const x = d.data_integrity || {};
  if (x.is_reconciled !== false) return null;
  const parts = [
    ['Production', x.production_difference, 'm'],
    ['Stores', x.stores_difference, '₹'],
    ['Maintenance', x.maintenance_difference, '₹'],
    ['Other', x.other_difference, '₹'],
    ['Summary', x.summary_difference, '₹'],
  ].filter(([, v]) => Math.abs(Number(v || 0)) > 0.01);
  return (
    <View style={S.dataIntegrityWarn}>
      <Text style={S.dataIntegrityTitle}>Data reconciliation needs review</Text>
      <Text style={S.dataIntegrityText}>
        {parts.length
          ? parts.map(([name, value, unit]) => `${name} ${unit === '₹' ? fINR(value) : `${Number(value).toFixed(2)} ${unit}`}`).join(' · ')
          : 'One or more Section A/B controls are not reconciled.'}
      </Text>
    </View>
  );
}

function ClaudeDashboardV4({ d, m, months, states, prevD, isLarge, setView, setTrendSheet, pastOpen, togglePast }) {
  const extended = d.section_ab_active === true;
  const inputCount = (arr) => Array.isArray(arr) ? arr.length : 0;
  return (
    <View style={S.clDashboard}>
      <KPIGrid d={d} label={m.fullLabel} cols={isLarge ? 3 : 1} />
      <ExpenseCompletenessNotice d={d} />
      <ExpenseDataIntegrityNotice d={d} />

      <View style={[S.clPair, isLarge && { flexDirection: 'row' }]}>
        <View style={[S.compositionCard, isLarge && { flex: 1.05, marginBottom: 0 }]}>
          <Text style={S.compositionTitle}>Cost composition · {m.shortLabel} '{m.displayYear}</Text>
          <DonutChart elec={d.elec_total} sal={d.sal_total} stores={d.store_total} maintenance={d.maintenance_total} other={d.other_total} total={d.total} sectionAB={extended} />
        </View>
        <View style={[S.clCard, isLarge && { flex: .95 }]}>
          <Text style={S.clEyebrow}>INPUTS</Text>
          <ClaudeInputLink icon="⚡" title="Daily units consumed" sub={`${(d.daily||[]).length} days · ${fN(d.kwh_total)} kWh`} accent="#185FA5" onPress={()=>setView('daily-units')} />
          <ClaudeInputLink icon="₹" title="Daily salary expenses" sub={`${(d.daily||[]).length} days · ${fINR(d.sal_total)}`} accent="#C2823A" onPress={()=>setView('daily-salary')} />
          {extended && <ClaudeInputLink icon="▦" title="Daily maintenance" sub={`${inputCount(d.maintenance_daily)} days · ${fINR(d.maintenance_total)}`} accent="#534AB7" onPress={()=>setView('daily-maint')} />}
          {extended && <ClaudeInputLink icon="+" title="Daily other expenses" sub={`${inputCount(d.other_daily)} days · ${fINR(d.other_total)}`} accent="#BA7517" onPress={()=>setView('daily-other')} />}
        </View>
      </View>

      <View style={[S.clPair, isLarge && { flexDirection: 'row' }]}>
        <View style={isLarge?{flex:1.2}:undefined}><ClaudeProductionAuto d={d}/></View>
        <View style={isLarge?{flex:.8}:undefined}><MonthSettings d={d}/></View>
      </View>

      <Text style={S.clSectionHeading}>Management summary</Text>
      <View style={[S.clMgmtGrid, isLarge && { flexDirection: 'row' }]}>
        {extended ? <>
          <View style={isLarge?{flex:1}:undefined}><ClaudeManagementCard name={`Section A · ${Number(d.section_machine_counts?.section_a||40)} machines`} subtitle="Waterjet + S. Rapier 230 cm" accent="#185FA5" prod={d.section_a_prod} picks={d.section_a_avg_picks} elec={d.section_a_elec} sal={d.section_a_salary} store={d.section_a_stores} maintenance={d.section_a_maintenance} other={d.section_a_other} cpp={d.section_a_cpp} extended onTrend={()=>setTrendSheet({kind:'section',section:'A',title:'Section A · daily trend'})}/></View>
          <View style={isLarge?{flex:1}:undefined}><ClaudeManagementCard name={`Section B · ${Number(d.section_machine_counts?.section_b||86)} machines`} subtitle="Rapier 190 cm" accent="#534AB7" prod={d.section_b_prod} picks={d.section_b_avg_picks} elec={d.section_b_elec} sal={d.section_b_salary} store={d.section_b_stores} maintenance={d.section_b_maintenance} other={d.section_b_other} cpp={d.section_b_cpp} extended onTrend={()=>setTrendSheet({kind:'section',section:'B',title:'Section B · daily trend'})}/></View>
          <View style={isLarge?{flex:1}:undefined}><ClaudeManagementCard name="Total · Section A + B" subtitle={`${Number(d.section_machine_counts?.total_section||126)} machines`} accent="#0D1B2A" prod={d.prod_total} picks={d.avg_pick_tot} elec={d.elec_total} sal={d.sal_total} store={d.store_total} maintenance={d.maintenance_total} other={d.other_total} cpp={d.cpp_total} extended onTrend={()=>setTrendSheet({kind:'section',section:'T',title:'Total · daily trend'})}/></View>
        </> : <>
          <View style={isLarge?{flex:1}:undefined}><ClaudeManagementCard name="Rapier" subtitle="MW + SIP" accent="#B77932" prod={d.prod_rapier} picks={d.avg_pick_mw} elec={d.elec_rapier} sal={d.sal_rapier} store={d.store_rapier} cpp={d.cpp_rapier}/></View>
          <View style={isLarge?{flex:1}:undefined}><ClaudeManagementCard name="Waterjet" subtitle="Legacy division" accent="#185FA5" prod={d.prod_wjet} picks={d.avg_pick_wjet} elec={d.elec_wjet} sal={d.sal_wjet} store={d.store_wjet} cpp={d.cpp_wjet}/></View>
          <View style={isLarge?{flex:1}:undefined}><ClaudeManagementCard name="Total" subtitle="Rapier + Waterjet" accent="#0D1B2A" prod={d.prod_total} picks={d.avg_pick_tot} elec={d.elec_total} sal={d.sal_total} store={d.store_total} cpp={d.cpp_total}/></View>
        </>}
      </View>

      <Text style={S.clSectionHeading}>Expense breakdown</Text>
      <View style={[S.clBreakGrid, isLarge && { flexDirection:'row' }]}>
        <View style={isLarge?{flex:1}:undefined}>
          <ExpBlock icon="⚡" iconColor="#185FA5" iconBg="#EAF3FB" title="Utilities / units consumed" sub={`${fN(d.kwh_total)} kWh @ ${fINR(d.unit_rate)}`} amt={fINR(d.elec_total)} editLabel="View daily ›" onEdit={()=>setView('daily-units')}>
            <View style={S.clABLine}><Text style={S.clABLabel}>Section A</Text><Text style={S.clABValue}>{fINR(d.section_a_elec)}</Text></View><View style={S.clABLine}><Text style={S.clABLabel}>Section B</Text><Text style={S.clABValue}>{fINR(d.section_b_elec)}</Text></View>
          </ExpBlock>
          <ExpBlock icon="₹" iconColor="#C2823A" iconBg="#FFF4E8" title="Salaries / wages" sub={extended?'Section A + Section B':'Rapier + Waterjet'} amt={fINR(d.sal_total)} editLabel="View daily ›" onEdit={()=>setView('daily-salary')}>
            <View style={S.clABLine}><Text style={S.clABLabel}>{extended?'Section A':'Rapier'}</Text><Text style={S.clABValue}>{fINR(extended?d.section_a_salary:d.sal_rapier)}</Text></View><View style={S.clABLine}><Text style={S.clABLabel}>{extended?'Section B':'Waterjet'}</Text><Text style={S.clABValue}>{fINR(extended?d.section_b_salary:d.sal_wjet)}</Text></View>
          </ExpBlock>
          <ExpBlock icon="▣" iconColor="#1D9E75" iconBg="#EAF8F3" title="Production-linked expenses" sub={extended?'Stores & spares · ERP-derived A/B':'Stores & spares'} amt={fINR(d.store_total)}>
            <View style={S.clABLine}><Text style={S.clABLabel}>{extended?'Section A':'Rapier'}</Text><Text style={S.clABValue}>{fINR(extended?d.section_a_stores:d.store_rapier)}</Text></View><View style={S.clABLine}><Text style={S.clABLabel}>{extended?'Section B':'Waterjet'}</Text><Text style={S.clABValue}>{fINR(extended?d.section_b_stores:d.store_wjet)}</Text></View>
          </ExpBlock>
        </View>
        <View style={isLarge?{flex:1}:undefined}>
          {extended && <ExpBlock icon="🔧" iconColor="#534AB7" iconBg="#F0EDFF" title="Maintenance" sub="Section A · Section B · Common" amt={fINR(d.maintenance_total)} editLabel="Daily entry ›" onEdit={()=>setView('daily-maint')}><View style={S.clABLine}><Text style={S.clABLabel}>Section A</Text><Text style={S.clABValue}>{fINR(d.section_a_maintenance)}</Text></View><View style={S.clABLine}><Text style={S.clABLabel}>Section B</Text><Text style={S.clABValue}>{fINR(d.section_b_maintenance)}</Text></View><Text style={S.clSmallMuted}>Common entered {fINR(d.maintenance_common)}</Text></ExpBlock>}
          {extended && <ExpBlock icon="+" iconColor="#BA7517" iconBg="#FFF6E6" title="Other expenses" sub="Direct / indirect · A/B/Common" amt={fINR(d.other_total)} editLabel="Daily entry ›" onEdit={()=>setView('daily-other')}><View style={S.clABLine}><Text style={S.clABLabel}>Section A</Text><Text style={S.clABValue}>{fINR(d.section_a_other)}</Text></View><View style={S.clABLine}><Text style={S.clABLabel}>Section B</Text><Text style={S.clABValue}>{fINR(d.section_b_other)}</Text></View><Text style={S.clSmallMuted}>Common entered {fINR(d.other_common)}</Text></ExpBlock>}
          <ExpBlock icon="∑" iconColor="#B77932" iconBg="#FFF4E8" title="Final derived costing" sub={`₹${f3(d.cpp_total)}/pick · ${f2(d.avg_pick_tot)} picks`} amt={`₹${f3(d.cpp_total)}/pk`}>
            {[['Electricity',d.elec_total],['Salary',d.sal_total],['Stores',d.store_total],...(extended?[['Maintenance',d.maintenance_total],['Other',d.other_total]]:[])].map(([label,value])=><View key={label} style={S.clABLine}><Text style={S.clABLabel}>{label}</Text><Text style={S.clABValue}>{fINR(value)}</Text></View>)}<View style={[S.clABLine,{borderTopWidth:1,borderTopColor:'#E5DED4',marginTop:4,paddingTop:8}]}><Text style={[S.clABLabel,{fontWeight:'800'}]}>Total cost</Text><Text style={[S.clABValue,{color:'#B77932'}]}>{fINR(d.total)}</Text></View>
          </ExpBlock>
        </View>
      </View>

      <Text style={S.clSectionHeading}>Comparative analytics · 6 months</Text>
      <View style={[S.clPair, isLarge && { flexDirection:'row' }]}>
        <View style={isLarge?{flex:1.35}:undefined}><ClaudeComparativeChart months={months} states={states}/></View>
        <View style={isLarge?{flex:.65}:undefined}><ClaudeEfficiencyCard d={d}/></View>
      </View>

      {extended && <View style={[S.clSplitGrid, isLarge && { flexDirection:'row' }]}>
        <View style={[S.clCard,{flex:1,alignItems:'center'}]}><Text style={S.clSplitTitle}>Production split · A / B</Text><MiniDonut rapierPct={d.prod_total>0?Number(d.section_a_prod||0)/Number(d.prod_total)*100:0} label="Production split" aLabel="A" bLabel="B" aColor="#185FA5" bColor="#534AB7"/><Text style={S.clSmallMuted}>A {(d.prod_total>0?Number(d.section_a_prod||0)/Number(d.prod_total)*100:0).toFixed(1)}% · B {(d.prod_total>0?Number(d.section_b_prod||0)/Number(d.prod_total)*100:0).toFixed(1)}%</Text></View>
        <View style={[S.clCard,{flex:1,alignItems:'center'}]}><Text style={S.clSplitTitle}>Cost split · A / B</Text><MiniDonut rapierPct={d.total>0?Number(d.section_a_total||0)/Number(d.total)*100:0} label="Cost split" aLabel="A" bLabel="B" aColor="#185FA5" bColor="#534AB7"/><Text style={S.clSmallMuted}>A {(d.total>0?Number(d.section_a_total||0)/Number(d.total)*100:0).toFixed(1)}% · B {(d.total>0?Number(d.section_b_total||0)/Number(d.total)*100:0).toFixed(1)}%</Text></View>
      </View>}

      <ClaudeMonthDelta d={d} prevD={prevD}/>
      <Text style={S.clSectionHeading}>Past performance</Text>
      <View style={[S.clPastGrid, isLarge && { flexDirection:'row', flexWrap:'wrap' }]}>{months.slice(1).map((mo,i)=><View key={mo.key} style={isLarge?{width:'32.4%'}:{width:'100%'}}><PastRow month={mo} st={states[mo.key]} open={!!pastOpen[i+1]} onToggle={()=>togglePast(i+1)}/></View>)}</View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────
// 
// ─────────────────────────────────────────────────────────────────────────────
// EXECUTIVE EXPENSE DASHBOARD V3
// Two deliberate presentation plans:
//   • Large screen: executive 3-column / multi-panel dashboard
//   • Mobile: single-column, touch-first stack
// Business calculations stay in useExpenseData / Laravel.
// ─────────────────────────────────────────────────────────────────────────────

const E_COLOR = {
  ink: "#172033",
  muted: "#6B7280",
  faint: "#98A2B3",
  border: "#E5E7EB",
  surface: "#FFFFFF",
  page: "#F5F7FA",
  navy: "#0F2233",
  blue: "#2563EB",
  copper: "#C67C2F",
  green: "#168B68",
  violet: "#6657C8",
  amber: "#C47A12",
  red: "#B54747",
  softBlue: "#EFF6FF",
  softCopper: "#FFF7ED",
  softGreen: "#ECFDF5",
  softViolet: "#F5F3FF",
  softAmber: "#FFF8E8",
};

const pctOf = (value, total) =>
  Number(total || 0) > 0 ? (Number(value || 0) / Number(total || 0)) * 100 : 0;

const trendDelta = (current, previous) => {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;
  return ((c - p) / Math.abs(p)) * 100;
};

function ExecBadge({ text, tone = "neutral" }) {
  const palette = {
    good: { bg: "#ECFDF5", fg: "#067647", bd: "#A7F3D0" },
    warn: { bg: "#FFF7E6", fg: "#A15C00", bd: "#FED7AA" },
    bad: { bg: "#FEF2F2", fg: "#B42318", bd: "#FECACA" },
    neutral: { bg: "#F2F4F7", fg: "#475467", bd: "#E4E7EC" },
    info: { bg: "#EFF8FF", fg: "#175CD3", bd: "#B2DDFF" },
  }[tone] || { bg: "#F2F4F7", fg: "#475467", bd: "#E4E7EC" };

  return (
    <View style={[P.badge, { backgroundColor: palette.bg, borderColor: palette.bd }]}>
      <Text style={[P.badgeText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

function ExecutiveHeader({ d, month, isLarge }) {
  const complete = d.total_cost_complete === true;
  const integrity = d.data_integrity?.is_reconciled !== false;
  const pending = Object.entries(d.total_cost_completeness || {})
    .filter(([, ready]) => ready !== true)
    .map(([key]) => ({
      electricity: "Electricity",
      salary: "Salary",
      stores: "Stores",
      maintenance: "Maintenance",
      other: "Other",
      design_ppi: "Design PPI",
    }[key] || key));

  return (
    <View style={[P.hero, isLarge && P.heroLarge]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={P.heroEyebrow}>PRODUCTION COST CONTROL</Text>
        <Text style={[P.heroTitle, !isLarge && { fontSize: 24 }]}>
          {month?.fullLabel || d.label || "Expense report"}
        </Text>
        <Text style={P.heroSub}>
          Section A/B production cost, operating expenses and month-to-date controls
        </Text>
        <View style={P.heroBadges}>
          <ExecBadge
            text={complete ? "Complete" : "Partial data"}
            tone={complete ? "good" : "warn"}
          />
          <ExecBadge
            text={integrity ? "ERP reconciled" : "Check reconciliation"}
            tone={integrity ? "info" : "bad"}
          />
          {d.section_ab_active && <ExecBadge text="Section A/B model" tone="neutral" />}
        </View>
      </View>

      {!complete && (
        <View style={[P.heroPending, !isLarge && { marginTop: 14, width: "100%" }]}>
          <Text style={P.heroPendingLabel}>PENDING SOURCES</Text>
          <Text style={P.heroPendingValue}>
            {pending.length ? pending.join(" · ") : "One or more source checks"}
          </Text>
          <Text style={P.heroPendingNote}>
            Available amounts are shown, but final costing stays locked until all required sources are ready.
          </Text>
        </View>
      )}
    </View>
  );
}

function ExecutiveKpi({ label, value, sub, accent, hero = false, fullMobile = false }) {
  return (
    <View
      style={[
        P.kpi,
        { borderTopColor: accent || E_COLOR.navy },
        hero && P.kpiHero,
        fullMobile && P.kpiFullMobile,
      ]}
    >
      <Text style={P.kpiLabel}>{label}</Text>
      <Text style={[P.kpiValue, hero && { fontSize: 24 }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={P.kpiSub} numberOfLines={2}>{sub}</Text>
    </View>
  );
}

function ExecutiveKpiGrid({ d, isLarge }) {
  const days = Number(d.days || 0);
  const productionPerMcDay =
    days > 0 ? Number(d.prod_total || 0) / 126 / days : 0;

  const items = [
    {
      label: "TOTAL COST",
      value: fINR(d.total),
      sub: d.total_cost_complete ? "Final for available period" : "Available amount · incomplete",
      accent: E_COLOR.copper,
      hero: true,
    },
    {
      label: "COST / PICK",
      value: `₹${f3(d.cpp_total)}`,
      sub: "Total cost ÷ metres ÷ picks",
      accent: E_COLOR.copper,
    },
    {
      label: "AVG PICKS",
      value: f2(d.avg_pick_tot),
      sub: "Production-weighted",
      accent: E_COLOR.green,
    },
    {
      label: "PRODUCTION",
      value: `${f2(d.prod_total_L)} L m`,
      sub: `${fN(d.prod_total)} metres`,
      accent: E_COLOR.green,
    },
    {
      label: "COST / MC·DAY",
      value: fINR(d.cpmc, 0),
      sub: days > 0 ? `${days} working day${days === 1 ? "" : "s"}` : "Waiting for working-day source",
      accent: E_COLOR.violet,
    },
    {
      label: "ELECTRICITY",
      value: `${fN(d.kwh_total)} kWh`,
      sub: `Unit rate ${fINR(d.unit_rate)}`,
      accent: E_COLOR.blue,
    },
  ];

  return (
    <View style={[P.kpiGrid, isLarge ? P.kpiGridLarge : P.kpiGridMobile]}>
      {items.map((item, i) => (
        <View
          key={item.label}
          style={isLarge
            ? { flex: 1, minWidth: 0 }
            : { width: i === 0 ? "100%" : "48.5%" }}
        >
          <ExecutiveKpi
            {...item}
            fullMobile={!isLarge && i === 0}
          />
        </View>
      ))}
    </View>
  );
}

function SectionCostRow({ color, label, value, total }) {
  const pct = pctOf(value, total);
  return (
    <View style={P.sectionCostRow}>
      <View style={P.sectionCostLabelWrap}>
        <View style={[P.sectionDot, { backgroundColor: color }]} />
        <Text style={P.sectionCostLabel}>{label}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={P.sectionCostValue}>{fINR(value)}</Text>
        <Text style={P.sectionCostPct}>{pct.toFixed(1)}%</Text>
      </View>
    </View>
  );
}

function ExecutiveSectionCard({
  title,
  subtitle,
  accent,
  production,
  picks,
  electricity,
  salary,
  stores,
  maintenance,
  other,
  total,
  cpp,
  extended,
}) {
  const rows = [
    [E_COLOR.blue, "Electricity", electricity],
    [E_COLOR.copper, "Salary", salary],
    [E_COLOR.green, "Stores", stores],
    ...(extended
      ? [
          [E_COLOR.violet, "Maintenance", maintenance],
          [E_COLOR.amber, "Other", other],
        ]
      : []),
  ];

  return (
    <View style={[P.sectionCard, { borderTopColor: accent }]}>
      <View style={P.sectionCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={P.sectionCardTitle}>{title}</Text>
          <Text style={P.sectionCardSub}>{subtitle}</Text>
        </View>
        <View style={P.sectionProdBadge}>
          <Text style={P.sectionProdValue}>{f2(Number(production || 0) / 1e5)} L m</Text>
          <Text style={P.sectionProdLabel}>production</Text>
        </View>
      </View>

      <View style={P.sectionMetricStrip}>
        <View>
          <Text style={P.sectionMetricLabel}>AVG PICKS</Text>
          <Text style={P.sectionMetricValue}>{f2(picks)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={P.sectionMetricLabel}>TOTAL COST</Text>
          <Text style={P.sectionMetricValue}>{fINR(total)}</Text>
        </View>
      </View>

      <View style={P.sectionRows}>
        {rows.map(([color, label, value]) => (
          <SectionCostRow
            key={label}
            color={color}
            label={label}
            value={value}
            total={total}
          />
        ))}
      </View>

      <View style={P.sectionFooter}>
        <Text style={P.sectionFooterLabel}>COST / PICK</Text>
        <Text style={P.sectionFooterValue}>₹{f3(cpp)}</Text>
      </View>
    </View>
  );
}

function ExecutiveSectionSummary({ d, isLarge }) {
  const aCount = Number(d.section_machine_counts?.section_a || 40);
  const bCount = Number(d.section_machine_counts?.section_b || 86);

  const isAB = d.section_ab_active === true;
  const cards = isAB
    ? [
        {
          title: "Section A",
          subtitle: `${aCount} machines · Waterjet + Rapier 230`,
          accent: E_COLOR.blue,
          production: d.section_a_prod,
          picks: d.section_a_avg_picks,
          electricity: d.section_a_elec,
          salary: d.section_a_salary,
          stores: d.section_a_stores,
          maintenance: d.section_a_maintenance,
          other: d.section_a_other,
          total: d.section_a_total,
          cpp: d.section_a_cpp,
          extended: true,
        },
        {
          title: "Section B",
          subtitle: `${bCount} machines · Rapier 190`,
          accent: E_COLOR.violet,
          production: d.section_b_prod,
          picks: d.section_b_avg_picks,
          electricity: d.section_b_elec,
          salary: d.section_b_salary,
          stores: d.section_b_stores,
          maintenance: d.section_b_maintenance,
          other: d.section_b_other,
          total: d.section_b_total,
          cpp: d.section_b_cpp,
          extended: true,
        },
        {
          title: "Total",
          subtitle: `Section A + Section B · ${aCount + bCount} machines`,
          accent: E_COLOR.navy,
          production: d.prod_total,
          picks: d.avg_pick_tot,
          electricity: d.elec_total,
          salary: d.sal_total,
          stores: d.store_total,
          maintenance: d.maintenance_total,
          other: d.other_total,
          total: d.total,
          cpp: d.cpp_total,
          extended: true,
        },
      ]
    : [
        {
          title: "Rapier",
          subtitle: "MW + SIP",
          accent: E_COLOR.copper,
          production: d.prod_rapier,
          picks: d.avg_pick_mw,
          electricity: d.elec_rapier,
          salary: d.sal_rapier,
          stores: d.store_rapier,
          total: d.total_rapier,
          cpp: d.cpp_rapier,
          extended: false,
        },
        {
          title: "Waterjet",
          subtitle: "Legacy division model",
          accent: E_COLOR.blue,
          production: d.prod_wjet,
          picks: d.avg_pick_wjet,
          electricity: d.elec_wjet,
          salary: d.sal_wjet,
          stores: d.store_wjet,
          total: d.total_wjet,
          cpp: d.cpp_wjet,
          extended: false,
        },
        {
          title: "Total",
          subtitle: "Rapier + Waterjet",
          accent: E_COLOR.navy,
          production: d.prod_total,
          picks: d.avg_pick_tot,
          electricity: d.elec_total,
          salary: d.sal_total,
          stores: d.store_total,
          total: d.total,
          cpp: d.cpp_total,
          extended: false,
        },
      ];

  return (
    <View>
      <ExecutiveSectionTitle
        title={isAB ? "Section performance" : "Division performance"}
        meta={isAB ? "A / B / Total" : "Rapier / Waterjet / Total"}
      />
      <View style={[P.sectionCardGrid, isLarge ? P.row : P.column]}>
        {cards.map((card) => (
          <View key={card.title} style={isLarge ? P.flex1 : P.fullWidth}>
            <ExecutiveSectionCard {...card} />
          </View>
        ))}
      </View>
    </View>
  );
}

function ExecutiveSectionTitle({ title, meta, action, onAction }) {
  return (
    <View style={P.blockTitleRow}>
      <View style={{ flex: 1 }}>
        <Text style={P.blockTitle}>{title}</Text>
        {!!meta && <Text style={P.blockMeta}>{meta}</Text>}
      </View>
      {!!action && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.75} style={P.textAction}>
          <Text style={P.textActionText}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ExpenseBreakdownRow({ color, label, value, total, detail, action, onPress }) {
  return (
    <View style={P.expenseRow}>
      <View style={[P.expenseIcon, { backgroundColor: `${color}14` }]}>
        <View style={[P.expenseIconDot, { backgroundColor: color }]} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={P.expenseLabel}>{label}</Text>
        <Text style={P.expenseDetail} numberOfLines={1}>{detail}</Text>
      </View>
      <View style={P.expenseAmountWrap}>
        <Text style={P.expenseAmount}>{fINR(value)}</Text>
        <Text style={P.expensePct}>{pctOf(value, total).toFixed(1)}%</Text>
      </View>
      {!!action && (
        <TouchableOpacity onPress={onPress} style={P.expenseAction} activeOpacity={0.75}>
          <Text style={P.expenseActionText}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function CostStructureCard({ d }) {
  const rows = [
    [E_COLOR.blue, "Electricity", d.elec_total],
    [E_COLOR.copper, "Salary", d.sal_total],
    [E_COLOR.green, "Stores", d.store_total],
    ...(d.section_ab_active
      ? [
          [E_COLOR.violet, "Maintenance", d.maintenance_total],
          [E_COLOR.amber, "Other", d.other_total],
        ]
      : []),
  ];
  const max = Math.max(...rows.map(([, , v]) => Number(v || 0)), 1);

  return (
    <View style={P.panel}>
      <ExecutiveSectionTitle
        title="Cost structure"
        meta={d.total_cost_complete ? "Final composition" : "Available composition · partial"}
      />

      <View style={{ gap: 14 }}>
        {rows.map(([color, label, value]) => {
          const width = Math.max(2, Math.min(100, (Number(value || 0) / max) * 100));
          return (
            <View key={label}>
              <View style={P.structureTop}>
                <Text style={P.structureLabel}>{label}</Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={P.structureValue}>{fINR(value)}</Text>
                  <Text style={P.structurePct}>{pctOf(value, d.total).toFixed(1)}%</Text>
                </View>
              </View>
              <View style={P.structureTrack}>
                <View style={[P.structureFill, { width: `${width}%`, backgroundColor: color }]} />
              </View>
            </View>
          );
        })}
      </View>

      <View style={P.costSummary}>
        <View>
          <Text style={P.costSummaryLabel}>TOTAL</Text>
          <Text style={P.costSummaryValue}>{fINR(d.total)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={P.costSummaryLabel}>COST / PICK</Text>
          <Text style={P.costSummaryValue}>₹{f3(d.cpp_total)}</Text>
        </View>
      </View>
    </View>
  );
}

function ExpenseBreakdownCard({ d, setView }) {
  return (
    <View style={P.panel}>
      <ExecutiveSectionTitle title="Expense breakdown" meta="ERP and controlled management inputs" />
      <View style={P.expenseRows}>
        <ExpenseBreakdownRow
          color={E_COLOR.blue}
          label="Electricity"
          value={d.elec_total}
          total={d.total}
          detail={`${fN(d.kwh_total)} kWh · ${fINR(d.unit_rate)}/unit`}
          action="Daily"
          onPress={() => setView("daily-units")}
        />
        <ExpenseBreakdownRow
          color={E_COLOR.copper}
          label="Salary"
          value={d.sal_total}
          total={d.total}
          detail={d.section_ab_active ? "Section A + Section B" : "Rapier + Waterjet"}
          action="Daily"
          onPress={() => setView("daily-salary")}
        />
        <ExpenseBreakdownRow
          color={E_COLOR.green}
          label="Stores"
          value={d.store_total}
          total={d.total}
          detail={d.section_ab_active ? "ERP-derived A/B" : "Legacy ERP Stores"}
        />
        {d.section_ab_active && (
          <>
            <ExpenseBreakdownRow
              color={E_COLOR.violet}
              label="Maintenance"
              value={d.maintenance_total}
              total={d.total}
              detail={`A ${fINR(d.section_a_maintenance)} · B ${fINR(d.section_b_maintenance)} · Common ${fINR(d.maintenance_common)}`}
              action="Daily"
              onPress={() => setView("daily-maint")}
            />
            <ExpenseBreakdownRow
              color={E_COLOR.amber}
              label="Other expenses"
              value={d.other_total}
              total={d.total}
              detail={`A ${fINR(d.section_a_other)} · B ${fINR(d.section_b_other)} · Common ${fINR(d.other_common)}`}
              action="Daily"
              onPress={() => setView("daily-other")}
            />
          </>
        )}
      </View>
    </View>
  );
}

function TrendLine({ values, color, formatter }) {
  const safe = values.map((v) => Number(v || 0));
  const min = Math.min(...safe, 0);
  const max = Math.max(...safe, 1);
  const range = Math.max(max - min, 1);
  const left = 24;
  const right = 576;
  const top = 18;
  const bottom = 120;
  const points = safe.map((value, i) => {
    const x = safe.length <= 1 ? 300 : left + (i * (right - left)) / (safe.length - 1);
    const y = bottom - ((value - min) / range) * (bottom - top);
    return { x, y, value };
  });

  return (
    <View>
      <Svg width="100%" height={150} viewBox="0 0 600 150" preserveAspectRatio="none">
        {[35, 70, 105].map((y) => (
          <Line key={y} x1="24" x2="576" y1={y} y2={y} stroke="#EEF1F5" strokeWidth="1" />
        ))}
        <Polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 5 : 3.5}
            fill="#FFFFFF"
            stroke={color}
            strokeWidth={i === points.length - 1 ? 3 : 2}
          />
        ))}
      </Svg>
      <View style={P.trendLabels}>
        {values.map((_, i) => (
          <Text key={i} style={P.trendMonthSpacer}> </Text>
        ))}
      </View>
    </View>
  );
}

function PerformanceMetric({ title, value, previous, suffix, data, months, color, formatValue }) {
  const delta = trendDelta(value, previous);
  return (
    <View style={P.trendMetric}>
      <View style={P.trendMetricHead}>
        <View>
          <Text style={P.trendMetricLabel}>{title}</Text>
          <Text style={P.trendMetricValue}>
            {formatValue(value)}{suffix || ""}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[
            P.trendDelta,
            { color: delta == null ? E_COLOR.faint : delta > 0 ? "#B54747" : "#168B68" }
          ]}>
            {delta == null ? "—" : `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}%`}
          </Text>
          <Text style={P.trendDeltaSub}>vs previous month</Text>
        </View>
      </View>
      <TrendLine values={data} color={color} formatter={formatValue} />
      <View style={P.trendMonthRow}>
        {months.map((label) => (
          <Text key={label} style={P.trendMonth}>{label}</Text>
        ))}
      </View>
    </View>
  );
}

function ExecutivePerformance({ months, states, isLarge }) {
  const rows = months
    .map((mo) => ({ mo, d: states[mo.key]?.data || null }))
    .reverse();

  const prod = rows.map(({ d }) => Number(d?.prod_total_L || 0));
  const cpp = rows.map(({ d }) => Number(d?.cpp_total || 0));
  const labels = rows.map(({ mo }) => mo.shortLabel);

  const currentProd = prod[prod.length - 1] || 0;
  const previousProd = prod[prod.length - 2] || 0;
  const currentCpp = cpp[cpp.length - 1] || 0;
  const previousCpp = cpp[cpp.length - 2] || 0;

  return (
    <View style={P.panel}>
      <ExecutiveSectionTitle title="6-month performance" meta="Production and cost trends use separate scales" />
      <View style={[P.performanceGrid, isLarge ? P.row : P.column]}>
        <PerformanceMetric
          title="PRODUCTION"
          value={currentProd}
          previous={previousProd}
          data={prod}
          months={labels}
          color={E_COLOR.green}
          formatValue={(v) => `${Number(v || 0).toFixed(2)} L m`}
        />
        <PerformanceMetric
          title="COST / PICK"
          value={currentCpp}
          previous={previousCpp}
          data={cpp}
          months={labels}
          color={E_COLOR.copper}
          formatValue={(v) => `₹${Number(v || 0).toFixed(3)}`}
        />
      </View>
    </View>
  );
}

function ProductionControlCard({ d }) {
  const aCount = Number(d.section_machine_counts?.section_a || 0);
  const bCount = Number(d.section_machine_counts?.section_b || 0);

  const rows = d.section_ab_active
    ? [
        ["Section A", d.section_a_prod, d.section_a_avg_picks, aCount],
        ["Section B", d.section_b_prod, d.section_b_avg_picks, bCount],
        ["Total", d.prod_total, d.avg_pick_tot, aCount + bCount],
      ]
    : [
        ["Rapier", d.prod_rapier, d.avg_pick_mw, "—"],
        ["Waterjet", d.prod_wjet, d.avg_pick_wjet, "—"],
        ["Total", d.prod_total, d.avg_pick_tot, "—"],
      ];

  return (
    <View style={P.panel}>
      <ExecutiveSectionTitle title="Production control" meta="From verified production system" />
      <View style={P.productionTableHead}>
        <Text style={[P.productionHeadText, { flex: 1.3 }]}>GROUP</Text>
        <Text style={[P.productionHeadText, { flex: 1, textAlign: "right" }]}>METRES</Text>
        <Text style={[P.productionHeadText, { flex: 0.8, textAlign: "right" }]}>AVG PICKS</Text>
        <Text style={[P.productionHeadText, { flex: 0.7, textAlign: "right" }]}>MACHINES</Text>
      </View>
      {rows.map(([label, metres, picks, machines], i) => (
        <View key={label} style={[P.productionTableRow, i === rows.length - 1 && P.productionTableTotal]}>
          <Text style={[P.productionCellStrong, { flex: 1.3 }]}>{label}</Text>
          <Text style={[P.productionCell, { flex: 1, textAlign: "right" }]}>{fN(metres)}</Text>
          <Text style={[P.productionCell, { flex: 0.8, textAlign: "right" }]}>{f2(picks)}</Text>
          <Text style={[P.productionCell, { flex: 0.7, textAlign: "right" }]}>{machines}</Text>
        </View>
      ))}
    </View>
  );
}

function MonthControlCard({ d }) {
  const integrity = d.data_integrity || {};
  const rows = [
    ["Unit rate", fINR(d.unit_rate), "ERP · ExpCosting"],
    ["Working days", String(Number(d.days || 0)), "ERP-derived"],
    ["Stores · Section A", fINR(d.section_a_stores || 0), "ERP-derived"],
    ["Stores · Section B", fINR(d.section_b_stores || 0), "ERP-derived"],
  ];

  return (
    <View style={P.panel}>
      <ExecutiveSectionTitle title="Month controls" meta="Read-only ERP values" />
      <View style={{ gap: 0 }}>
        {rows.map(([label, value, source]) => (
          <View key={label} style={P.controlRow}>
            <View style={{ flex: 1 }}>
              <Text style={P.controlLabel}>{label}</Text>
              <Text style={P.controlSource}>{source}</Text>
            </View>
            <Text style={P.controlValue}>{value}</Text>
          </View>
        ))}
      </View>

      {d.section_ab_active && (
        <View style={P.integrityBox}>
          <View style={P.integrityTop}>
            <Text style={P.integrityTitle}>Reconciliation</Text>
            <ExecBadge
              text={integrity.is_reconciled !== false ? "Reconciled" : "Review"}
              tone={integrity.is_reconciled !== false ? "good" : "bad"}
            />
          </View>
          <Text style={P.integrityText}>
            A + B production difference {Number(integrity.production_difference || 0).toFixed(2)} m ·
            Stores difference {fINR(integrity.stores_difference || 0)} ·
            Maintenance difference {fINR(integrity.maintenance_difference || 0)} ·
            Other difference {fINR(integrity.other_difference || 0)}.
          </Text>
        </View>
      )}
    </View>
  );
}

function EfficiencyStrip({ d, isLarge }) {
  const items = [
    ["Units / metre", `${f2(d.units_per_mtr)} kWh`],
    ["Salary / metre", fINR(d.sal_per_mtr)],
    ["Stores / metre", fINR(d.store_per_mtr)],
    ["Avg picks", f2(d.avg_pick_tot)],
    ["Cost / metre", fINR(d.per_mtr)],
  ];

  return (
    <View style={[P.effStrip, isLarge ? P.row : { flexWrap: "wrap" }]}>
      {items.map(([label, value]) => (
        <View key={label} style={[P.effItem, isLarge ? P.flex1 : { width: "48%" }]}>
          <Text style={P.effItemLabel}>{label}</Text>
          <Text style={P.effItemValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function PastPerformanceCompact({ months, states, isLarge }) {
  const rows = months.map((mo) => ({ mo, st: states[mo.key], d: states[mo.key]?.data || null }));

  return (
    <View style={P.panel}>
      <ExecutiveSectionTitle title="Past performance" meta="Most recent six months" />
      <View style={P.pastHeader}>
        <Text style={[P.pastHead, { flex: 1.2 }]}>MONTH</Text>
        <Text style={[P.pastHead, { flex: 1, textAlign: "right" }]}>PRODUCTION</Text>
        <Text style={[P.pastHead, { flex: 1, textAlign: "right" }]}>TOTAL COST</Text>
        <Text style={[P.pastHead, { flex: 0.8, textAlign: "right" }]}>COST/PICK</Text>
        {isLarge && <Text style={[P.pastHead, { flex: 0.8, textAlign: "right" }]}>STATUS</Text>}
      </View>
      {rows.map(({ mo, st, d }, index) => (
        <View key={mo.key} style={[P.pastCompactRow, index === rows.length - 1 && { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1.2 }}>
            <Text style={P.pastCompactMonth}>{mo.fullLabel}</Text>
            <Text style={P.pastCompactSub}>{d?.section_ab_active ? "Section A/B" : "Legacy"}</Text>
          </View>
          <Text style={[P.pastCompactValue, { flex: 1, textAlign: "right" }]}>
            {d ? `${f2(d.prod_total_L)} L m` : "—"}
          </Text>
          <Text style={[P.pastCompactValue, { flex: 1, textAlign: "right" }]}>
            {d ? fINR(d.total) : st?.status === "loading" ? "Loading…" : "—"}
          </Text>
          <Text style={[P.pastCompactValue, { flex: 0.8, textAlign: "right" }]}>
            {d ? `₹${f3(d.cpp_total)}` : "—"}
          </Text>
          {isLarge && (
            <View style={{ flex: 0.8, alignItems: "flex-end" }}>
              {d ? (
                <ExecBadge
                  text={d.total_cost_complete ? "Complete" : "Partial"}
                  tone={d.total_cost_complete ? "good" : "warn"}
                />
              ) : (
                <Text style={P.pastCompactSub}>—</Text>
              )}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function ProfessionalExpenseDashboard({
  d,
  month,
  months,
  states,
  isLarge,
  setView,
}) {
  return (
    <View style={P.dashboard}>
      <ExecutiveHeader d={d} month={month} isLarge={isLarge} />
      <ExecutiveKpiGrid d={d} isLarge={isLarge} />
      <ExecutiveSectionSummary d={d} isLarge={isLarge} />

      <View>
        <ExecutiveSectionTitle title="Expense control" meta="Five cost heads with operational drill-downs" />
        <View style={[P.twoPanelGrid, isLarge ? P.row : P.column]}>
          <View style={isLarge ? { flex: 1.18 } : P.fullWidth}>
            <ExpenseBreakdownCard d={d} setView={setView} />
          </View>
          <View style={isLarge ? { flex: 0.82 } : P.fullWidth}>
            <CostStructureCard d={d} />
          </View>
        </View>
      </View>

      <ExecutivePerformance months={months} states={states} isLarge={isLarge} />

      <View>
        <ExecutiveSectionTitle title="Operations & controls" meta="Production and ERP-derived month controls" />
        <View style={[P.twoPanelGrid, isLarge ? P.row : P.column]}>
          <View style={isLarge ? { flex: 1.15 } : P.fullWidth}>
            <ProductionControlCard d={d} />
          </View>
          <View style={isLarge ? { flex: 0.85 } : P.fullWidth}>
            <MonthControlCard d={d} />
          </View>
        </View>
      </View>

      <EfficiencyStrip d={d} isLarge={isLarge} />
      <PastPerformanceCompact months={months} states={states} isLarge={isLarge} />
    </View>
  );
}


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
//   safe: { flex: 1, backgroundColor: "#F5F1EA" },
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
//   body: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },

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
//   addDayText: { fontSize: 11.5, fontWeight: "700", color: "#8A8177" },

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

//   subBack: { fontSize: 12, fontWeight: "700", color: "#B77932", marginBottom: 8 },
//   subTitle: {
//     fontSize: 17,
//     fontWeight: "500",
//     marginBottom: 4,
//     color: "#111827",
//   },
//   subDesc: { fontSize: 10.5, color: "#8A8177", marginBottom: 10, lineHeight: 16 },

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

import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  useWindowDimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
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
const fINR = (v, decimals = 2) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

const cleanMoneyInput = (value) => {
  const raw = String(value ?? "").replace(/[^0-9.]/g, "");
  const [whole = "", ...fractionParts] = raw.split(".");
  if (!fractionParts.length) return whole;
  const fraction = fractionParts.join("").slice(0, 2);
  return `${whole || "0"}.${fraction}`;
};

const safePerPick = (amount, production, picks) => {
  const a = Number(amount || 0);
  const p = Number(production || 0);
  const pk = Number(picks || 0);
  return p > 0 && pk > 0 ? a / p / pk : 0;
};

const ymdLabel = (ymd) => {
  const s = String(ymd || "").padStart(8, "0");
  if (!/^\d{8}$/.test(s)) return "";
  const year = Number(s.slice(0, 4));
  const month = Number(s.slice(4, 6));
  const day = Number(s.slice(6, 8));
  const mon = new Date(year, month - 1, 1).toLocaleString("en-US", { month: "short" });
  return `${String(day).padStart(2, "0")}-${mon}`;
};

const nextYmd = (ymd) => {
  const s = String(ymd || "").padStart(8, "0");
  if (!/^\d{8}$/.test(s)) return 0;
  const d = new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
  d.setDate(d.getDate() + 1);
  return Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
};

const monthFirstYmd = (month) =>
  month ? Number(`${month.calYear}${String(Number(month.calMonth) + 1).padStart(2, "0")}01`) : 0;

const monthLastYmd = (month) => {
  if (!month) return 0;
  const d = new Date(Number(month.calYear), Number(month.calMonth) + 1, 0);
  return Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
};

const allocateCommonPreview = (directA, directB, common, counts) => {
  const aCount = Number(counts?.section_a || 0);
  const bCount = Number(counts?.section_b || 0);
  const totalCount = Number(counts?.total_section || (aCount + bCount));
  const a = Number(directA || 0);
  const b = Number(directB || 0);
  const c = Number(common || 0);

  if (totalCount <= 0 || aCount < 0 || bCount < 0) {
    return { ready: false, a, b, total: a + b, commonA: 0, commonB: 0 };
  }

  const commonA = Math.round((c * aCount / totalCount) * 100) / 100;
  const commonB = Math.round((c - commonA) * 100) / 100;

  return {
    ready: true,
    a: a + commonA,
    b: b + commonB,
    total: a + b + c,
    commonA,
    commonB,
  };
};

const buildUtilityRateRows = (d) => {
  if (!d) return [];

  if (d.is_section_ab) {
    const sectionRow = (key, label, kwh, amount, production, picks) => ({
      key, label, kwh: Number(kwh || 0), amount: Number(amount || 0),
      shared: false,
      rate_available: Number(production || 0) > 0,
      pick_rate_available: Number(production || 0) > 0 && Number(picks || 0) > 0,
      cost_per_mtr: Number(production || 0) > 0 ? Number(amount || 0) / Number(production || 0) : 0,
      cost_per_pick: Number(production || 0) > 0 && Number(picks || 0) > 0 ? Number(amount || 0) / Number(production || 0) / Number(picks || 0) : 0,
    });
    return [
      sectionRow('section_a', 'Section A · 40 machines', d.section_a_electricity_kwh, d.section_a_electricity_amount, d.section_a_mtr, d.section_a_avg_picks),
      sectionRow('section_b', 'Section B · 86 machines', d.section_b_electricity_kwh, d.section_b_electricity_amount, d.section_b_mtr, d.section_b_avg_picks),
    ];
  }

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
function DonutChart({
  elec,
  sal,
  stores,
  maintenance = 0,
  other = 0,
  total,
  sectionAB = false,
}) {
  const SIZE = 120;
  const STROKE = 18;

  const values = [
    { color: "#185FA5", label: "Electricity", amount: Number(elec || 0) },
    { color: "#c2823a", label: "Salary", amount: Number(sal || 0) },
    { color: "#1D9E75", label: "Stores", amount: Number(stores || 0) },
  ];

  if (sectionAB) {
    values.push(
      { color: "#534AB7", label: "Maintenance", amount: Number(maintenance || 0) },
      { color: "#BA7517", label: "Other", amount: Number(other || 0) },
    );
  }

  const SEGMENTS = values.map((seg) => ({
    ...seg,
    pct: Number(total || 0) > 0 ? seg.amount / Number(total) : 0,
    value: fL(seg.amount),
  }));

  let cumDeg = -90;

  return (
    <View style={S.donutWrap}>
      <View style={{ width: SIZE, height: SIZE, position: "relative" }}>
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
        {SEGMENTS.map((seg, i) => {
          const startDeg = cumDeg;
          const spanDeg = seg.pct * 360;
          cumDeg += spanDeg;
          if (spanDeg < 1) return null;

          const arcs = spanDeg > 180
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

        <View
          style={[
            StyleSheet.absoluteFill,
            { alignItems: "center", justifyContent: "center" },
          ]}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#c2823a" }}>
            {fCr(total)}
          </Text>
          <Text style={{ fontSize: 10, color: "#9ca3af" }}>
            {sectionAB && !Number(total || 0) ? "available" : "total"}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: "center", paddingLeft: 16, gap: 8 }}>
        {SEGMENTS.map((seg) => (
          <View
            key={seg.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: seg.color,
                }}
              />
              <Text style={{ fontSize: 13, color: "#374151" }}>{seg.label}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}>
                {seg.value}
              </Text>
              <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                {Number(total || 0) > 0 ? (seg.pct * 100).toFixed(1) : "0"}%
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
  const sectionMode = d.is_section_ab === true;
  const totalKwh = sectionMode ? Number(d.section_ab_electricity_total_kwh || 0) : rows.reduce((sum, r) => sum + Number(r.total_kwh || 0), 0);
  const totalAmount = sectionMode ? Number(d.section_ab_electricity_total_amount || 0) : rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
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
      <Text style={S.subTitle}>{sectionMode ? 'Daily units · Section A / Section B' : 'Electricity units'}</Text>
      <Text style={S.subDesc}>
        {sectionMode ? 'Read-only electricity from Expense Costing. Section A = Waterjet + SUD 230; Section B = MW + SUD 190. Shared electricity uses the approved machine ratios.' : 'Read-only daily sub-meter readings from Expense Costing. Tap a day to audit the meter split. No value is entered or saved from this screen.'}
      </Text>

      <View style={{borderWidth:1,borderColor:'#e5e7eb',borderRadius:12,padding:12,marginBottom:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10}}>
        <View style={{flexShrink:1}}><Text style={{fontSize:9,color:'#6b7280',fontWeight:'700'}}>MONTH TO DATE {monthLabel ? `· ${monthLabel}` : ''}</Text><Text style={{fontSize:20,fontWeight:'700',marginTop:3}}>{fN(totalKwh)} <Text style={{fontSize:12,color:'#6b7280'}}>kWh</Text></Text></View>
        <View style={{alignItems:'flex-end'}}><Text style={{fontSize:9,color:'#6b7280'}}>ELECTRICITY COST</Text><Text style={{fontSize:17,fontWeight:'700',color:'#185FA5',marginTop:3}}>{fINR(totalAmount)}</Text></View>
      </View>

      {sectionMode && <View style={{flexDirection:'row',gap:8,marginBottom:10}}>
        {[
          ['SECTION A · 40 MC', d.section_a_electricity_kwh, d.section_a_electricity_amount],
          ['SECTION B · 86 MC', d.section_b_electricity_kwh, d.section_b_electricity_amount],
        ].map(([label,kwh,amount]) => <View key={label} style={{flex:1,borderWidth:1,borderColor:'#e5e7eb',borderRadius:10,padding:10,backgroundColor:'#fff'}}><Text style={{fontSize:9,fontWeight:'800',color:'#6b7280'}}>{label}</Text><Text style={{fontSize:15,fontWeight:'800',marginTop:4}}>{fN(kwh)} kWh</Text><Text style={{fontSize:11,color:'#185FA5',fontWeight:'700',marginTop:3}}>{fINR(amount)}</Text></View>)}
      </View>}

      {rows.length === 0 ? <View style={{padding:18,borderWidth:1,borderColor:'#e5e7eb',borderRadius:10}}><Text style={{fontSize:12,color:'#6b7280'}}>No daily electricity readings are available for this month.</Text></View> : rows.map((r, i) => {
        const open = openDay === i;
        return <View key={`${r.date_ymd}-${i}`} style={{borderWidth:1,borderColor:open?'#cbd5e1':'#e5e7eb',borderRadius:10,marginBottom:7,overflow:'hidden',backgroundColor:'#fff'}}>
          <TouchableOpacity onPress={()=>setOpenDay(open?-1:i)} style={{padding:11,flexDirection:'row',alignItems:'center'}} activeOpacity={0.75}>
            <View style={{width:25,height:25,borderRadius:6,backgroundColor:open?'#185FA5':'#f3f4f6',alignItems:'center',justifyContent:'center',marginRight:9}}><Text style={{fontSize:11,fontWeight:'700',color:open?'#fff':'#6b7280'}}>{Number(r.day || i+1)}</Text></View>
            <View style={{flex:1}}><Text style={{fontSize:12,fontWeight:'700'}}>{fmtDate(r.date_ymd)}</Text><Text style={{fontSize:9.5,color:'#6b7280',marginTop:2}}>{sectionMode ? `A ${fN(r.section_ab?.section_a_kwh)} · B ${fN(r.section_ab?.section_b_kwh)} kWh` : `${fN(r.total_kwh)} kWh`}</Text></View>
            <View style={{alignItems:'flex-end',marginRight:8}}><Text style={{fontSize:11,fontWeight:'700',color:'#185FA5'}}>{fN(r.total_kwh)} kWh</Text><Text style={{fontSize:9.5,color:'#6b7280',marginTop:2}}>{fINR(r.amount || 0)}</Text></View><Text style={{fontSize:11,color:'#6b7280'}}>{open?'⌃':'⌄'}</Text>
          </TouchableOpacity>
          {open && <View style={{borderTopWidth:1,borderTopColor:'#f1f5f9',paddingHorizontal:11,paddingBottom:10}}>
            {sectionMode ? <>
              <View style={{flexDirection:'row',gap:8,paddingVertical:9}}>
                <View style={{flex:1}}><Text style={{fontSize:9,color:'#6b7280',fontWeight:'700'}}>SECTION A</Text><Text style={{fontSize:12,fontWeight:'800'}}>{fN(r.section_ab?.section_a_kwh)} kWh</Text><Text style={{fontSize:10,color:'#185FA5'}}>{fINR(r.section_ab?.section_a_amount)}</Text></View>
                <View style={{flex:1}}><Text style={{fontSize:9,color:'#6b7280',fontWeight:'700'}}>SECTION B</Text><Text style={{fontSize:12,fontWeight:'800'}}>{fN(r.section_ab?.section_b_kwh)} kWh</Text><Text style={{fontSize:10,color:'#185FA5'}}>{fINR(r.section_ab?.section_b_amount)}</Text></View>
              </View>
              {[
                ['Waterjet → A', r.section_ab?.allocation?.waterjet_to_a_kwh], ['SUD 230 → A', r.section_ab?.allocation?.sud_230_to_a_kwh],
                ['SUD Luwa → A (10/48)', r.section_ab?.allocation?.sud_luwa_a_kwh], ['Warping + Misc → A (40/126)', r.section_ab?.allocation?.shared_a_kwh],
                ['MW + MW Luwa → B', r.section_ab?.allocation?.mw_to_b_kwh], ['SUD 190 → B', r.section_ab?.allocation?.sud_190_to_b_kwh],
                ['SUD Luwa → B (38/48)', r.section_ab?.allocation?.sud_luwa_b_kwh], ['Warping + Misc → B (86/126)', r.section_ab?.allocation?.shared_b_kwh],
              ].map(([label,v])=><View key={label} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:6,borderBottomWidth:1,borderBottomColor:'#f8fafc'}}><Text style={{fontSize:10.5,color:'#4b5563',flex:1,paddingRight:8}}>{label}</Text><Text style={{fontSize:10.5,fontWeight:'600'}}>{fN(v)} kWh</Text></View>)}
            </> : <>
              {meterRows(r).map(([label,v])=><View key={label} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:7,borderBottomWidth:1,borderBottomColor:'#f8fafc'}}><Text style={{fontSize:11,color:'#374151'}}>{label}</Text><Text style={{fontSize:11,fontWeight:'600'}}>{fN(v)} kWh</Text></View>)}
              <Text style={{fontSize:9,fontWeight:'700',color:'#6b7280',marginTop:9,marginBottom:2}}>MORE METERS · HUMIDIFICATION, WARPING, MISC</Text>
              {moreRows(r).map(([label,v])=><View key={label} style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:6}}><Text style={{fontSize:10.5,color:'#4b5563'}}>{label}</Text><Text style={{fontSize:10.5,fontWeight:'600'}}>{fN(v)} kWh</Text></View>)}
            </>}
            <View style={{marginTop:6,paddingTop:8,borderTopWidth:1,borderTopColor:'#e5e7eb',flexDirection:'row',justifyContent:'space-between'}}><View><Text style={{fontSize:10,fontWeight:'700'}}>DAY TOTAL</Text><Text style={{fontSize:9,color:'#6b7280',marginTop:2}}>₹{f2(r.unit_rate || d.unit_rate || 0)}/kWh · {(sectionMode ? r.section_ab?.is_reconciled : r.is_reconciled) === false ? `difference ${fN(sectionMode ? r.section_ab?.difference_kwh : r.difference_kwh)} kWh` : 'reconciled'}</Text></View><View style={{alignItems:'flex-end'}}><Text style={{fontSize:13,fontWeight:'700',color:'#185FA5'}}>{fN(r.total_kwh)} kWh</Text><Text style={{fontSize:10,color:'#6b7280',marginTop:2}}>{fINR(r.amount || 0)}</Text></View></View>
          </View>}
        </View>;
      })}
    </View>
  );
}

// ── Daily Salary view ─────────────────────────────────────────────
function DailySalaryView({ d, onBack, fill = false }) {
  const sectionActive = d?.section_ab_active === true;
  const cf = fill ? { flex: 1 } : null;

  const buildRows = () => {
    if (sectionActive && Array.isArray(d.salary_daily)) {
      return d.salary_daily.map((row) => ({
        date: ymdLabel(row.date_ymd),
        values: [
          Number(row.section_a_amount || 0),
          Number(row.section_b_amount || 0),
          Number(row.manual_total || row.total || 0),
        ],
      }));
    }

    return (d.daily || [])
      .filter((r) => Number(r.sal_r || 0) > 0 || Number(r.sal_w || 0) > 0 || Number(r.sal_t || 0) > 0)
      .map((r) => ({
        date: r.date,
        values: [Number(r.sal_r || 0), Number(r.sal_w || 0), Number(r.sal_t || 0)],
      }));
  };

  const rows = buildRows();
  const labels = sectionActive
    ? ["Section A ₹", "Section B ₹", "Total"]
    : ["Rapier ₹", "Waterjet ₹", "Total"];

  const tA = rows.reduce((s, r) => s + Number(r.values[0] || 0), 0);
  const tB = rows.reduce((s, r) => s + Number(r.values[1] || 0), 0);
  const tT = rows.reduce((s, r) => s + Number(r.values[2] || 0), 0);

  return (
    <View>
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 14 }}>
        <Text style={S.subBack}>‹ Back to report</Text>
      </TouchableOpacity>

      <Text style={S.subTitle}>
        {sectionActive ? "Daily salary allocation" : "Daily salary expenses"}
      </Text>

      <Text style={S.subDesc}>
        {sectionActive
          ? "Read-only Section A / Section B allocation from the existing Rapier + Waterjet salary source. Waterjet salary goes to Section A; Rapier salary is split by the active 230 cm / total Rapier machine map."
          : "Read-only view of the existing Rapier / Waterjet salary source."}
      </Text>

      {rows.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={fill ? { flexGrow: 1 } : undefined}
        >
          <View style={fill ? { flex: 1 } : undefined}>
            <View style={S.tableRow}>
              <Text style={[S.th, cf, { minWidth: 82, textAlign: "left" }]}>Date</Text>
              {labels.map((label) => (
                <Text key={label} style={[S.th, cf]}>{label}</Text>
              ))}
            </View>

            {rows.map((row, i) => (
              <View key={`${row.date}-${i}`} style={S.tableRow}>
                <Text style={[S.td, cf, { minWidth: 82, textAlign: "left", fontWeight: "500" }]}>
                  {row.date}
                </Text>
                <Text style={[S.td, cf]}>{fINR(row.values[0])}</Text>
                <Text style={[S.td, cf]}>{fINR(row.values[1])}</Text>
                <Text style={[S.td, cf, { color: "#c2823a", fontWeight: "600" }]}>
                  {fINR(row.values[2])}
                </Text>
              </View>
            ))}

            <View style={[S.tableRow, { borderTopWidth: 1, borderTopColor: "#e5e7eb" }]}>
              <Text style={[S.th, cf, { minWidth: 82, textAlign: "left", color: "#c2823a" }]}>
                TOTAL
              </Text>
              <Text style={[S.th, cf, { color: "#c2823a" }]}>{fINR(tA)}</Text>
              <Text style={[S.th, cf, { color: "#c2823a" }]}>{fINR(tB)}</Text>
              <Text style={[S.th, cf, { color: "#c2823a" }]}>{fINR(tT)}</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={S.emptyDailyCard}>
          <Text style={S.emptyDailyText}>No salary entry is available for this period.</Text>
        </View>
      )}

      {sectionActive && (
        <View style={S.allocCard}>
          <Text style={S.allocLabel}>MONTH TO DATE · SECTION A / B</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 8 }}>
            {[
              ["Section A", d.section_a_salary],
              ["Section B", d.section_b_salary],
              ["Total", d.sal_total],
            ].map(([label, value]) => (
              <View key={label} style={{ alignItems: "center", flex: 1 }}>
                <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 3 }}>{label}</Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#c2823a" }}>
                  {fINR(value)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Daily Maintenance / Other view ────────────────────────────────
function DailySectionExpenseView({
  kind,
  title,
  desc,
  d,
  month,
  onBack,
  onSaved,
  saveExpense,
  deleteExpense,
  fill = false,
}) {
  const sourceRows = kind === "maintenance"
    ? (d.maintenance_daily || [])
    : (d.other_daily || []);

  const fallbackCounts = d.section_machine_counts || {};
  const cf = fill ? { flex: 1 } : null;

  const buildRows = () => {
    const entered = Object.fromEntries(
      sourceRows.map((row) => [Number(row.date_ymd || row.entry_date || 0), row])
    );

    const dateSet = new Set([
      ...(d.daily || []).map((row) => Number(row.date_ymd || 0)),
      ...sourceRows.map((row) => Number(row.date_ymd || row.entry_date || 0)),
    ].filter(Boolean));

    if (dateSet.size === 0) {
      const first = monthFirstYmd(month);
      if (first) dateSet.add(first);
    }

    return Array.from(dateSet)
      .sort((a, b) => a - b)
      .map((ymd) => {
        const row = entered[ymd];
        const counts = row?.machine_counts || fallbackCounts;

        return {
          ymd,
          date: ymdLabel(ymd),
          values: row
            ? [row.section_a_amount, row.section_b_amount, row.common_amount].map((value) => {
                const amount = Number(value || 0);
                return amount === 0 ? "" : String(amount);
              })
            : ["", "", ""],
          remark: row?.remark || "",
          exists: !!row,
          dirty: false,
          machine_counts: counts,
        };
      });
  };

  const [rows, setRows] = useState(buildRows);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  React.useEffect(() => {
    setRows(buildRows());
    setMessage("");
    setError("");
  }, [kind, d, month?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = d.section_groups || {};
  const aCount = Number(fallbackCounts.section_a || 0);
  const bCount = Number(fallbackCounts.section_b || 0);
  const totalCount = Number(fallbackCounts.total_section || (aCount + bCount));
  const waterjetCount = Number(groups.waterjet?.machines || fallbackCounts.waterjet || 0);
  const sud230Count = Number(groups.sud_230?.machines || fallbackCounts.sud_rapier_230 || 0);
  const mwCount = Number(groups.mw?.machines || fallbackCounts.mw_rapier || 0);
  const sud190Count = Number(groups.sud_190?.machines || 0);

  const rowPreview = (row) => allocateCommonPreview(
    Number(row.values[0] || 0),
    Number(row.values[1] || 0),
    Number(row.values[2] || 0),
    row.machine_counts || fallbackCounts,
  );

  const totals = rows.reduce((acc, row) => {
    acc.directA += Number(row.values[0] || 0);
    acc.directB += Number(row.values[1] || 0);
    acc.common += Number(row.values[2] || 0);
    const preview = rowPreview(row);
    acc.allocA += preview.a;
    acc.allocB += preview.b;
    acc.total += preview.total;
    acc.ready = acc.ready && preview.ready;
    return acc;
  }, {
    directA: 0,
    directB: 0,
    common: 0,
    allocA: 0,
    allocB: 0,
    total: 0,
    ready: true,
  });

  const addDay = () => {
    const last = rows.length
      ? Math.max(...rows.map((r) => Number(r.ymd || 0)))
      : monthFirstYmd(month);

    const next = last ? nextYmd(last) : monthFirstYmd(month);
    const monthEnd = monthLastYmd(month);

    if (!next || (monthEnd && next > monthEnd)) {
      setMessage("All dates for this month are already available.");
      return;
    }

    if (rows.some((r) => Number(r.ymd) === next)) return;

    setRows((prev) => [
      ...prev,
      {
        ymd: next,
        date: ymdLabel(next),
        values: ["", "", ""],
        remark: "",
        exists: false,
        dirty: false,
        machine_counts: fallbackCounts,
      },
    ].sort((a, b) => a.ymd - b.ymd));
  };

  const saveChanges = async () => {
    const dirtyRows = rows.filter((row) => row.dirty);

    if (!dirtyRows.length) {
      setMessage("No changes to save.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      for (const row of dirtyRows) {
        await saveExpense({
          kind,
          entryDate: row.ymd,
          sectionAAmount: Number(row.values[0] || 0),
          sectionBAmount: Number(row.values[1] || 0),
          commonAmount: Number(row.values[2] || 0),
          remark: row.remark || "",
          existing: row.exists,
        });
      }

      await onSaved?.();
      setMessage(`${dirtyRows.length} day${dirtyRows.length === 1 ? "" : "s"} saved successfully.`);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Unable to save daily expense.");
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async (row) => {
    if (!row.exists || !deleteExpense) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await deleteExpense({ kind, entryDate: row.ymd });
      await onSaved?.();
      setMessage(`${row.date} entry removed.`);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Unable to remove daily expense.");
    } finally {
      setSaving(false);
    }
  };

  const deleteDay = (row) => {
    if (!row.exists || saving) return;
    const prompt = `Remove the ${title.toLowerCase()} entry for ${row.date}?`;

    if (Platform.OS === "web" && typeof globalThis?.confirm === "function") {
      if (!globalThis.confirm(prompt)) return;
      void performDelete(row);
      return;
    }

    Alert.alert(
      "Remove daily entry?",
      prompt,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => { void performDelete(row); } },
      ],
      { cancelable: true },
    );
  };

  return (
    <View>
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 14 }}>
        <Text style={S.subBack}>‹ Back to report</Text>
      </TouchableOpacity>

      <Text style={S.subTitle}>{title}</Text>
      <Text style={S.subDesc}>{desc}</Text>

      <View style={[S.sectionInfoRow, !fill && { flexDirection: "column" }]}>
        <View style={[S.sectionInfoCard, { borderTopColor: "#185FA5" }]}>
          <Text style={S.sectionInfoTitle}>A · Section A · {aCount} mc</Text>
          <Text style={S.sectionInfoSub}>
            Waterjet ({waterjetCount}) + S. Rapier 230 cm ({sud230Count})
          </Text>
        </View>

        <View style={[S.sectionInfoCard, { borderTopColor: "#534AB7" }]}>
          <Text style={S.sectionInfoTitle}>B · Section B · {bCount} mc</Text>
          <Text style={S.sectionInfoSub}>
            Rapier 190 cm · M Weaves {mwCount} + S. Rapier {sud190Count}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={fill ? { flexGrow: 1 } : undefined}
      >
        <View style={[fill ? { flex: 1 } : undefined, S.dailyEntryTableCard]}>
          <View style={S.tableRow}>
            <Text style={[S.th, cf, { minWidth: 86, textAlign: "left" }]}>Date</Text>
            {["Section A", "Section B", "Common"].map((c) => (
              <Text key={c} style={[S.th, cf]}>{c}</Text>
            ))}
          </View>

          {rows.map((row, ri) => (
            <View key={row.ymd} style={S.tableRow}>
              <View style={[S.tdDateCell, cf, { minWidth: 86 }]}>
                <Text style={{ fontSize: 11, fontWeight: "500", color: "#111827" }}>
                  {row.date}
                </Text>
                {row.exists && (
                  <TouchableOpacity disabled={saving} onPress={() => deleteDay(row)}>
                    <Text style={S.removeEntryText}>remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              {[0, 1, 2].map((ci) => (
                <TextInput
                  key={ci}
                  style={[S.tdInput, cf && { flex: 1, minWidth: 82 }]}
                  value={String(row.values[ci] ?? "")}
                  onChangeText={(v) => {
                    const clean = cleanMoneyInput(v);
                    setRows((prev) => prev.map((r, rr) => {
                      if (rr !== ri) return r;
                      const values = [...r.values];
                      values[ci] = clean;
                      return { ...r, values, dirty: true };
                    }));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#d1d5db"
                />
              ))}
            </View>
          ))}

          <View style={[S.tableRow, { borderTopWidth: 1, borderTopColor: "#e5e7eb" }]}>
            <Text style={[S.th, cf, { minWidth: 86, textAlign: "left", color: "#534AB7" }]}>
              TOTAL
            </Text>
            <Text style={[S.th, cf, { color: "#534AB7" }]}>{fINR(totals.directA)}</Text>
            <Text style={[S.th, cf, { color: "#534AB7" }]}>{fINR(totals.directB)}</Text>
            <Text style={[S.th, cf, { color: "#534AB7" }]}>{fINR(totals.common)}</Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={S.addDayBtn} onPress={addDay} disabled={saving}>
        <Text style={S.addDayText}>+ Add a day</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[S.saveChangesBtn, !fill && { alignSelf: "stretch" }, saving && { opacity: 0.6 }]}
        onPress={saveChanges}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={S.saveChangesText}>Save changes</Text>}
      </TouchableOpacity>

      {!!message && <Text style={S.saveMessage}>{message}</Text>}
      {!!error && <Text style={S.saveError}>{error}</Text>}

      <View style={S.allocCard}>
        <Text style={S.allocLabel}>
          AFTER ALLOCATION · COMMON BY MACHINE COUNT (A {aCount} : B {bCount})
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 8 }}>
          {[
            ["Section A", totals.allocA],
            ["Section B", totals.allocB],
            ["Total", totals.total],
          ].map(([label, value]) => (
            <View key={label} style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 3 }}>{label}</Text>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#c2823a" }}>
                {fINR(value)}
              </Text>
            </View>
          ))}
        </View>

        {!totals.ready && (
          <Text style={S.saveError}>
            Machine-section mapping is not ready; Common is not silently allocated.
          </Text>
        )}

        {totalCount > 0 && (
          <Text style={S.allocHint}>
            Common is split from the active machine map; Section B receives the rounding remainder.
          </Text>
        )}
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
      s: `${label} · ${d.days} days${d.section_ab_active && !d.total_cost_complete ? " · INCOMPLETE" : ""}`,
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

function ExpenseCompletenessNotice({ d }) {
  if (!d?.section_ab_active) return null;

  if (d.total_cost_complete) {
    return (
      <View style={[S.completenessCard, S.completenessOk]}>
        <Text style={S.completenessTitle}>Section A/B cost is complete</Text>
        <Text style={S.completenessText}>
          Electricity, salary, stores, maintenance, other expenses and design-PPI checks are reconciled for the visible period.
        </Text>
      </View>
    );
  }

  const labels = {
    electricity: "Electricity",
    salary: "Salary",
    stores: "Stores",
    maintenance: "Maintenance",
    other: "Other expenses",
    design_ppi: "Design PPI",
  };

  const missing = Object.entries(d.total_cost_completeness || {})
    .filter(([, ready]) => ready !== true)
    .map(([key]) => labels[key] || key);

  return (
    <View style={[S.completenessCard, S.completenessWarn]}>
      <Text style={S.completenessTitle}>Cost is not final yet</Text>
      <Text style={S.completenessText}>
        {missing.length
          ? `Pending / incomplete: ${missing.join(", ")}.`
          : "One or more Section A/B source checks are incomplete."}
        {" "}Current amounts remain visible but should not be treated as final costing.
      </Text>
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
  maintenance = 0,
  other = 0,
  cpp,
  cpmc,
  onTrend,
  extended = false,
}) {
  const rows = [
    ["#185FA5", "Electricity", elec],
    ["#c2823a", "Salary", sal],
    ["#1D9E75", "Stores", store],
  ];

  if (extended) {
    rows.push(
      ["#534AB7", "Maintenance", maintenance],
      ["#BA7517", "Other", other],
    );
  }

  return (
    <View style={[S.mgmtCard, { borderLeftColor: borderColor }]}>
      <View style={S.mgmtHeader}>
        <View style={{ flex: 1 }}>
          <Text style={S.mgmtName}>{name}</Text>
          <Text style={S.mgmtSub}>{f2(prod / 1e5)} L m · {f2(pk)} pk</Text>
        </View>

        {!!onTrend && (
          <TouchableOpacity
            onPress={onTrend}
            activeOpacity={0.72}
            style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, backgroundColor: "#f3f4f6" }}
          >
            <Text style={{ fontSize: 9.5, fontWeight: "700", color: "#6b7280" }}>daily trend ›</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={S.mgmtBody}>
        {rows.map(([c, l, v]) => (
          <View key={l} style={S.mgmtRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={[S.colorDot, { backgroundColor: c }]} />
              <Text style={S.mgmtRowLabel}>{l}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={S.mgmtRowValue}>{fL(v)}</Text>
              <Text style={S.mgmtRowPk}>+₹{f3(safePerPick(v, prod, pk))}/pk</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={S.mgmtFooter}>
        <View style={{ flex: 1 }}>
          <Text style={S.mgmtFootLabel}>COST / PICK</Text>
          <Text style={[S.mgmtFootValue, { color: "#c2823a" }]}>₹{f3(cpp)}</Text>
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

  const componentRows = d
    ? [
        ["#185FA5", "Electricity", d.elec_total],
        ["#c2823a", "Salary", d.sal_total],
        ["#1D9E75", "Stores", d.store_total],
        ...(d.section_ab_active
          ? [
              ["#534AB7", "Maintenance", d.maintenance_total],
              ["#BA7517", "Other", d.other_total],
            ]
          : []),
      ]
    : [];

  return (
    <TouchableOpacity style={S.pastCard} onPress={onToggle} activeOpacity={0.75}>
      <View style={S.pastTop}>
        <View style={{ flex: 1 }}>
          <Text style={S.pastMonth}>{month.fullLabel}</Text>
          <Text style={S.pastSub}>
            {st.status === "loading"
              ? "Loading…"
              : st.status === "error"
                ? "Failed"
                : d
                  ? `${f2(d.prod_total_L)} L m · ${d.days} days${d.section_ab_active ? " · Section A/B" : ""}`
                  : "—"}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 5 }}>
          {st.status === "loading" && (
            <View style={{ width: 70, height: 14, backgroundColor: "#f3f4f6", borderRadius: 4 }} />
          )}

          {st.status === "done" && d && (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#c2823a" }}>{fCr(d.total)}</Text>
              <Text style={{ fontSize: 11, color: "#000", marginTop: 2 }}>₹{f3(d.cpp_total)}/pk</Text>
            </View>
          )}

          {d && <Text style={[S.pastChevron, open && { transform: [{ rotate: "180deg" }] }]}>▾</Text>}
        </View>
      </View>

      {open && d && (
        <View style={S.pastExpanded}>
          {componentRows.map(([c, l, v]) => (
            <View key={l} style={S.pastRow2}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={[S.colorDot, { backgroundColor: c }]} />
                <Text style={{ fontSize: 13, color: "#000" }}>{l}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
                <Text style={{ fontSize: 13 }}>{fL(v)}</Text>
                <Text style={{ fontSize: 11, color: "#000" }}>
                  {d.total > 0 ? ((v / d.total) * 100).toFixed(1) : 0}%
                </Text>
              </View>
            </View>
          ))}

          <View style={S.pastMiniGrid}>
            {(d.section_ab_active
              ? [
                  ["Cost / pick", `₹${f3(d.cpp_total)}`],
                  ["Cost / mc·day", `₹${fN(d.cpmc)}`],
                  ["Section A", `${fLn(d.section_a_total || 0)} · ${d.section_a_pct?.toFixed(1)}%`],
                  ["Section B", `${fLn(d.section_b_total || 0)} · ${d.section_b_pct?.toFixed(1)}%`],
                ]
              : [
                  ["Cost / pick", `₹${f3(d.cpp_total)}`],
                  ["Cost / mc·day", `₹${fN(d.cpmc)}`],
                  ["Rapier", `${fLn(d.total_rapier || 0)} · ${d.rapier_pct?.toFixed(1)}%`],
                  ["W-Jet", `${fLn(d.total_wjet || 0)} · ${d.wjet_pct?.toFixed(1)}%`],
                ]).map(([l, v]) => (
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
function MonthSettings({ d }) {
  const rows = d.section_ab_active
    ? [
        ["Unit rate (₹/kWh)", fINR(d.unit_rate)],
        ["Working days", String(Number(d.days || 0))],
        ["Stores — Section A", fINR(d.section_a_stores)],
        ["Stores — Section B", fINR(d.section_b_stores)],
      ]
    : [
        ["Unit rate (₹/kWh)", fINR(d.unit_rate)],
        ["Working days", String(Number(d.days || 0))],
        ["Stores — Rapier", fINR(d.store_rapier)],
        ["Stores — Waterjet", fINR(d.store_wjet)],
      ];

  return (
    <View style={S.settingsCard}>
      <Text style={S.clEyebrow}>MONTH SETTINGS · ERP DERIVED</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={S.settingsRow}>
          <Text style={S.settingsLabel}>{label}</Text>
          <Text style={S.settingsValue}>{value}</Text>
        </View>
      ))}

      <Text style={S.settingsNote}>
        {d.section_ab_active
          ? "Read-only ERP values. Unit rate and working days come from ExpCosting; Stores A/B are derived from the proven ERP Stores source."
          : "Read-only historical ERP values."}
      </Text>
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
  const sectionMode = d?.is_section_ab === true;
  const [series, setSeries] = useState('combined');
  // UI only: measured chart width so the day-wise chart fills wide cards.
  const [chartW, setChartW] = useState(0);
  const daily = Array.isArray(d?.daily) ? d.daily : [];

  const trend = daily.map((row, index) => {
    const rapier = Number(row?.prod_mw || 0) + Number(row?.prod_sud || 0);
    const waterjet = Number(row?.prod_wj || 0);
    const combined = Number(row?.prod_tot || 0) || (rapier + waterjet);
    const value = sectionMode
      ? (series === 'section_a' ? Number(row?.section_a_mtr || 0) : series === 'section_b' ? Number(row?.section_b_mtr || 0) : combined)
      : (series === 'rapier' ? rapier : series === 'waterjet' ? waterjet : combined);

    return {
      day: String(Number(String(row?.date || index + 1).slice(0, 2)) || index + 1),
      meters: value,
    };
  });

  const total = sectionMode
    ? (series === 'section_a' ? Number(d?.section_a_mtr || 0) : series === 'section_b' ? Number(d?.section_b_mtr || 0) : Number(d?.prod_total || 0))
    : (series === 'rapier' ? Number(d?.prod_rapier || 0) : series === 'waterjet' ? Number(d?.prod_wjet || 0) : Number(d?.prod_total || 0));

  const picks = sectionMode
    ? (series === 'section_a' ? Number(d?.section_a_avg_picks || 0) : series === 'section_b' ? Number(d?.section_b_avg_picks || 0) : Number(d?.avg_pick_tot || 0))
    : (series === 'rapier' ? Number(d?.avg_pick_mw || 0) : series === 'waterjet' ? Number(d?.avg_pick_wjet || 0) : Number(d?.avg_pick_tot || 0));

  const label = sectionMode
    ? (series === 'section_a' ? 'Section A' : series === 'section_b' ? 'Section B' : 'Combined')
    : (series === 'rapier' ? 'Rapier' : series === 'waterjet' ? 'Waterjet' : 'Combined');

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
        {(sectionMode
          ? [['combined', 'Combined'], ['section_a', 'Section A'], ['section_b', 'Section B']]
          : [['combined', 'Combined'], ['rapier', 'Rapier'], ['waterjet', 'Waterjet']]
        ).map(([key, text]) => {
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
        color={(series === 'waterjet' || series === 'section_b') ? '#185FA5' : (series === 'rapier' || series === 'section_a') ? '#B77932' : '#0D1B2A'}
        fillColor={(series === 'waterjet' || series === 'section_b') ? '#185FA5' : (series === 'rapier' || series === 'section_a') ? '#B77932' : '#0D1B2A'}
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
        {sectionMode ? 'Select Combined, Section A or Section B. The chart uses the verified machine-group production feed.' : 'Select Combined, Rapier or Waterjet. The chart always uses the selected month’s day-wise production feed.'}
      </Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function ExpenseScreen({ token, apiBase }) {
  const { width: viewportWidth } = useWindowDimensions();
  const isLargeScreen = viewportWidth >= 1200;
  const isMobileScreen = viewportWidth < 700;

  const appSession = useAppSessionStore((state) => state.appSession);
  const context = appSession?.business_context;
  const {
    months,
    states,
    loadedCount,
    total,
    refresh,
    refreshMonth,
    retryMonth,
    saveDailySectionExpense,
    deleteDailySectionExpense,
  } = useExpenseData({ token, apiBase });
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
        subtitle: "Expense · Production Cost",
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
      <DailySectionExpenseView
        kind="maintenance"
        title="Daily maintenance"
        d={d || { daily: [] }}
        month={m}
        onBack={() => setView("report")}
        onSaved={() => refreshMonth(m.key, true)}
        saveExpense={saveDailySectionExpense}
        deleteExpense={deleteDailySectionExpense}
        fill={multi}
        desc="Maintenance & repair spend per day (₹). Enter direct Section A / Section B values, or Common for shared cost. Common is allocated from the active machine map."
      />
    ),
    "daily-other": (
      <DailySectionExpenseView
        kind="other"
        title="Daily other expenses"
        d={d || { daily: [] }}
        month={m}
        onBack={() => setView("report")}
        onSaved={() => refreshMonth(m.key, true)}
        saveExpense={saveDailySectionExpense}
        deleteExpense={deleteDailySectionExpense}
        fill={multi}
        desc="Other direct / indirect expenses per day (₹). Enter direct Section A / Section B values, or Common for shared cost. Common is allocated from the active machine map."
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
          <ReportContainer onLayout={layout.onLayout} maxWidth={980}>
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
        <ReportContainer onLayout={layout.onLayout} maxWidth={1360}>
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
          <ClaudeDashboardV4
            d={d}
            m={m}
            months={months}
            states={states}
            prevD={prevD}
            isLarge={isLargeScreen}
            setView={setView}
            setTrendSheet={setTrendSheet}
            pastOpen={pastOpen}
            togglePast={togglePast}
          />
        )}
        </ReportContainer>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const S = StyleSheet.create({
  clDashboard: { gap: 12, paddingBottom: 28 },
  dataIntegrityWarn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  dataIntegrityTitle: { fontSize: 11.5, fontWeight: '800', color: '#991B1B' },
  dataIntegrityText: { marginTop: 3, fontSize: 9.5, lineHeight: 14, color: '#7F1D1D' },
  clPair: { gap: 10 },
  clCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5DED4', borderRadius: 10, padding: 14 },
  clEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 0.55, color: '#8A8177', marginBottom: 8 },
  clCardTitle: { fontSize: 12, fontWeight: '800', color: '#111827' },
  clTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 },
  clAuto: { backgroundColor: '#EBF7F0', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  clAutoText: { fontSize: 8.5, fontWeight: '800', color: '#2F855A' },
  clInputRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F1ECE5' },
  clInputIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  clInputIconText: { fontSize: 16, fontWeight: '800' },
  clInputTitle: { fontSize: 12, fontWeight: '800', color: '#111827' },
  clInputSub: { marginTop: 2, fontSize: 10, color: '#8A8177' },
  clEdit: { fontSize: 10.5, fontWeight: '700', color: '#B77932' },
  clTag: { minWidth: 20, height: 20, borderRadius: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  clTagText: { fontSize: 9.5, fontWeight: '800' },
  clProdRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1ECE5' },
  clProdTitle: { fontSize: 11.5, fontWeight: '800', color: '#111827' },
  clProdSub: { marginTop: 2, fontSize: 9.5, color: '#8A8177' },
  clProdValue: { fontSize: 11.5, fontWeight: '800' },
  clProdPicks: { marginTop: 2, fontSize: 9.5, color: '#8A8177' },
  clProdTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  clProdTotalLabel: { fontSize: 11.5, fontWeight: '800', color: '#111827' },
  clProdTotalValue: { fontSize: 12, fontWeight: '800', color: '#111827' },
  clNote: { marginTop: 8, fontSize: 9.5, lineHeight: 14, color: '#8A8177' },
  clSectionHeading: { marginTop: 3, marginHorizontal: 2, marginBottom: 7, fontSize: 10, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase', color: '#8A8177' },
  clMgmtGrid: { gap: 8 },
  clMgmtCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5DED4', borderTopWidth: 3, borderRadius: 10, padding: 12 },
  clMgmtHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  clMgmtTitle: { fontSize: 12.5, fontWeight: '800', color: '#111827' },
  clMgmtSub: { marginTop: 2, fontSize: 9.5, color: '#8A8177' },
  clMgmtMeta: { fontSize: 9.5, color: '#8A8177', textAlign: 'right' },
  clTrendPill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  clTrendPillText: { fontSize: 8.5, fontWeight: '800' },
  clMgmtRow: { minHeight: 37, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F4EFE8' },
  clMgmtLabel: { fontSize: 10.5, color: '#111827' },
  clMgmtValue: { fontSize: 10.5, fontWeight: '700', color: '#111827' },
  clMgmtPerPick: { marginTop: 1, fontSize: 8.5, color: '#8A8177' },
  clMgmtFoot: { marginTop: 9, flexDirection: 'row', justifyContent: 'space-between' },
  clFootLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 0.4, color: '#8A8177' },
  clFootCost: { marginTop: 2, fontSize: 14, fontWeight: '800', color: '#B77932' },
  clFootPick: { marginTop: 2, fontSize: 14, fontWeight: '800', color: '#111827' },
  clBreakGrid: { gap: 10 },
  clABLine: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F1ECE5' },
  clABLabel: { fontSize: 10.5, color: '#111827' },
  clABValue: { fontSize: 10.5, fontWeight: '700', color: '#111827' },
  clSmallMuted: { marginTop: 6, fontSize: 9.5, color: '#8A8177', lineHeight: 14 },
  clChartCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5DED4', borderRadius: 10, padding: 14 },
  clChartHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  clChartSub: { fontSize: 9.5, color: '#8A8177' },
  clLegend: { flexDirection: 'row', gap: 14, marginTop: 2 },
  clLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  clLegendBox: { width: 9, height: 9, borderRadius: 2 },
  clLegendDot: { width: 8, height: 8, borderRadius: 4 },
  clLegendText: { fontSize: 9.5, color: '#8A8177' },
  clStatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  clStat: { width: '31.5%', minHeight: 64, backgroundColor: '#FBF8F3', borderWidth: 1, borderColor: '#EEE8DF', borderRadius: 9, padding: 10 },
  clStatLabel: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.4, color: '#8A8177', textTransform: 'uppercase' },
  clStatValue: { marginTop: 4, fontSize: 13, fontWeight: '800', color: '#111827' },
  clSplitGrid: { gap: 10 },
  clSplitTitle: { marginBottom: 8, fontSize: 10.5, fontWeight: '800', color: '#111827', textAlign: 'center' },
  clDeltaGrid: { flexDirection: 'row', gap: 8, marginTop: 10 },
  clDeltaItem: { flex: 1, backgroundColor: '#FBF8F3', borderWidth: 1, borderColor: '#EEE8DF', borderRadius: 9, padding: 10 },
  clDeltaValue: { marginTop: 3, fontSize: 12.5, fontWeight: '800', color: '#111827' },
  clDeltaPct: { marginTop: 4, fontSize: 10, fontWeight: '800' },
  clPastGrid: { gap: 8 },
  safe: { flex: 1, backgroundColor: "#F5F1EA" },
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
  body: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },

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

  dailyEntryTableCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5DED4", borderRadius: 10, overflow: "hidden" },
  tableRow: { flexDirection: "row" },
  th: {
    fontSize: 10,
    color: "#000",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    padding: 5,
    minWidth: 72,
    textAlign: "right",
    backgroundColor: "#F8F4EE",
    borderBottomWidth: 1,
    borderBottomColor: "#E5DED4",
  },
  td: {
    fontSize: 11,
    padding: 5,
    minWidth: 72,
    textAlign: "right",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  tdInput: { width: 78, height: 29, textAlign: "right", paddingHorizontal: 7, paddingVertical: 3, fontSize: 10.5, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5DED4", borderRadius: 6, color: "#111827" },
  addDayBtn: { backgroundColor: "transparent", borderWidth: 1.5, borderStyle: "dashed", borderColor: "#D9D1C7", borderRadius: 9, paddingVertical: 9, alignItems: "center", marginVertical: 10 },
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
  allocCard: { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginTop: 8, borderWidth: 1, borderColor: "#E5DED4" },
  allocLabel: { fontSize: 8.5, color: "#8A8177", textTransform: "uppercase", letterSpacing: 0.45, fontWeight: "800", marginBottom: 4 },

  subBack: { fontSize: 13, color: "#c2823a", marginBottom: 14 },
  subTitle: { fontSize: 18, lineHeight: 23, fontWeight: "800", marginBottom: 2, color: "#111827" },
  subDesc: { fontSize: 12, color: "#000", marginBottom: 14, lineHeight: 18 },

  sectionInfoRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  sectionInfoCard: { flex: 1, backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderColor: "#E5DED4", borderTopWidth: 3 },
  sectionInfoTitle: { fontSize: 11, fontWeight: "700", color: "#111827" },
  sectionInfoSub: { fontSize: 9.5, lineHeight: 13, color: "#8A8177", marginTop: 3 },
  tdDateCell: {
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
    justifyContent: "center",
  },
  removeEntryText: { fontSize: 9, color: "#b91c1c", fontWeight: "600", marginTop: 2 },
  saveChangesBtn: { backgroundColor: "#0D1B2A", borderRadius: 8, paddingHorizontal: 18, paddingVertical: 9, minWidth: 140, alignSelf: "flex-end", alignItems: "center", justifyContent: "center", marginTop: 2 },
  saveChangesText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  saveMessage: { fontSize: 11, color: "#166534", marginTop: 7 },
  saveError: { fontSize: 11, color: "#991B1B", marginTop: 7, lineHeight: 16 },
  allocHint: { fontSize: 10.5, color: "#6b7280", lineHeight: 15, marginTop: 9 },
  completenessCard: { borderRadius: 10, padding: 11, marginBottom: 10, borderWidth: 1 },
  completenessOk: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  completenessWarn: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  completenessTitle: { fontSize: 12, fontWeight: "700", color: "#111827", marginBottom: 3 },
  completenessText: { fontSize: 10.5, color: "#4b5563", lineHeight: 15 },
  settingsValue: { fontSize: 13, fontWeight: "600", color: "#111827", textAlign: "right" },
  settingsNote: { fontSize: 10.5, color: "#6b7280", lineHeight: 15, marginTop: 8 },
  expNote: { fontSize: 10.5, color: "#6b7280", lineHeight: 15, marginTop: 7 },
  emptyDailyCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    padding: 14,
  },
  emptyDailyText: { fontSize: 11.5, color: "#6b7280" },

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


const P = StyleSheet.create({
  dashboard: {
    gap: 24,
    paddingBottom: 28,
  },
  row: {
    flexDirection: "row",
  },
  column: {
    flexDirection: "column",
  },
  flex1: {
    flex: 1,
    minWidth: 0,
  },
  fullWidth: {
    width: "100%",
  },

  hero: {
    backgroundColor: E_COLOR.surface,
    borderWidth: 1,
    borderColor: E_COLOR.border,
    borderRadius: 18,
    padding: 20,
  },
  heroLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    paddingHorizontal: 26,
    paddingVertical: 24,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: E_COLOR.copper,
  },
  heroTitle: {
    marginTop: 5,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: E_COLOR.ink,
  },
  heroSub: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: E_COLOR.muted,
  },
  heroBadges: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
  },
  heroPending: {
    width: 360,
    backgroundColor: "#FFFAEB",
    borderWidth: 1,
    borderColor: "#FEDF89",
    borderRadius: 14,
    padding: 14,
  },
  heroPendingLabel: {
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "800",
    color: "#B54708",
  },
  heroPendingValue: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: E_COLOR.ink,
  },
  heroPendingNote: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 16,
    color: E_COLOR.muted,
  },

  kpiGrid: {
    gap: 12,
  },
  kpiGridLarge: {
    flexDirection: "row",
  },
  kpiGridMobile: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  kpi: {
    flex: 1,
    minWidth: 0,
    backgroundColor: E_COLOR.surface,
    borderWidth: 1,
    borderColor: E_COLOR.border,
    borderTopWidth: 3,
    borderRadius: 14,
    padding: 14,
  },
  kpiHero: {
    backgroundColor: "#FFFDF9",
  },
  kpiFullMobile: {
    flexBasis: "100%",
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
    color: E_COLOR.muted,
  },
  kpiValue: {
    marginTop: 6,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    color: E_COLOR.ink,
  },
  kpiSub: {
    marginTop: 5,
    fontSize: 10.5,
    lineHeight: 15,
    color: E_COLOR.muted,
  },

  blockTitleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 10,
  },
  blockTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    color: E_COLOR.ink,
  },
  blockMeta: {
    marginTop: 2,
    fontSize: 10.5,
    lineHeight: 15,
    color: E_COLOR.muted,
  },
  textAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F2F4F7",
  },
  textActionText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: E_COLOR.ink,
  },

  sectionCardGrid: {
    gap: 12,
  },
  sectionCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: E_COLOR.surface,
    borderWidth: 1,
    borderColor: E_COLOR.border,
    borderTopWidth: 4,
    borderRadius: 16,
    padding: 16,
  },
  sectionCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  sectionCardTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
    color: E_COLOR.ink,
  },
  sectionCardSub: {
    marginTop: 3,
    fontSize: 10.5,
    lineHeight: 15,
    color: E_COLOR.muted,
  },
  sectionProdBadge: {
    alignItems: "flex-end",
  },
  sectionProdValue: {
    fontSize: 14,
    fontWeight: "800",
    color: E_COLOR.ink,
  },
  sectionProdLabel: {
    marginTop: 2,
    fontSize: 9,
    color: E_COLOR.faint,
  },
  sectionMetricStrip: {
    marginTop: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionMetricLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: E_COLOR.faint,
  },
  sectionMetricValue: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "800",
    color: E_COLOR.ink,
  },
  sectionRows: {
    marginTop: 9,
  },
  sectionCostRow: {
    minHeight: 40,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionCostLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionCostLabel: {
    fontSize: 11.5,
    color: E_COLOR.ink,
  },
  sectionCostValue: {
    fontSize: 11.5,
    fontWeight: "700",
    color: E_COLOR.ink,
  },
  sectionCostPct: {
    marginTop: 1,
    fontSize: 9,
    color: E_COLOR.faint,
  },
  sectionFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: E_COLOR.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionFooterLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: "800",
    color: E_COLOR.muted,
  },
  sectionFooterValue: {
    fontSize: 17,
    fontWeight: "800",
    color: E_COLOR.copper,
  },

  twoPanelGrid: {
    gap: 12,
  },
  panel: {
    flex: 1,
    minWidth: 0,
    backgroundColor: E_COLOR.surface,
    borderWidth: 1,
    borderColor: E_COLOR.border,
    borderRadius: 16,
    padding: 16,
  },
  expenseRows: {
    gap: 2,
  },
  expenseRow: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
    paddingVertical: 8,
  },
  expenseIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseIconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  expenseLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: E_COLOR.ink,
  },
  expenseDetail: {
    marginTop: 3,
    fontSize: 9.5,
    color: E_COLOR.muted,
  },
  expenseAmountWrap: {
    width: 105,
    alignItems: "flex-end",
  },
  expenseAmount: {
    fontSize: 12,
    fontWeight: "800",
    color: E_COLOR.ink,
  },
  expensePct: {
    marginTop: 2,
    fontSize: 9,
    color: E_COLOR.faint,
  },
  expenseAction: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F2F4F7",
  },
  expenseActionText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: E_COLOR.ink,
  },

  structureTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  structureLabel: {
    fontSize: 11.5,
    color: E_COLOR.ink,
  },
  structureValue: {
    fontSize: 11.5,
    fontWeight: "700",
    color: E_COLOR.ink,
  },
  structurePct: {
    marginTop: 1,
    fontSize: 9,
    color: E_COLOR.faint,
  },
  structureTrack: {
    marginTop: 6,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#F1F3F5",
    overflow: "hidden",
  },
  structureFill: {
    height: "100%",
    borderRadius: 999,
  },
  costSummary: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: E_COLOR.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  costSummaryLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: E_COLOR.muted,
  },
  costSummaryValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "800",
    color: E_COLOR.ink,
  },

  performanceGrid: {
    gap: 14,
  },
  trendMetric: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#FAFBFC",
    borderWidth: 1,
    borderColor: "#EEF0F2",
    borderRadius: 12,
    padding: 14,
  },
  trendMetricHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  trendMetricLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
    color: E_COLOR.muted,
  },
  trendMetricValue: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: "800",
    color: E_COLOR.ink,
  },
  trendDelta: {
    fontSize: 11,
    fontWeight: "800",
  },
  trendDeltaSub: {
    marginTop: 2,
    fontSize: 8.5,
    color: E_COLOR.faint,
  },
  trendMonthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 3,
    marginTop: -5,
  },
  trendMonth: {
    flex: 1,
    textAlign: "center",
    fontSize: 9,
    color: E_COLOR.muted,
  },
  trendLabels: {
    display: "none",
  },
  trendMonthSpacer: {
    flex: 1,
  },

  productionTableHead: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
  },
  productionHeadText: {
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: E_COLOR.muted,
  },
  productionTableRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F2",
  },
  productionTableTotal: {
    backgroundColor: "#FAFBFC",
  },
  productionCell: {
    fontSize: 11.5,
    color: E_COLOR.ink,
  },
  productionCellStrong: {
    fontSize: 11.5,
    fontWeight: "700",
    color: E_COLOR.ink,
  },

  controlRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F2",
  },
  controlLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: E_COLOR.ink,
  },
  controlSource: {
    marginTop: 2,
    fontSize: 9,
    color: E_COLOR.faint,
  },
  controlValue: {
    fontSize: 12,
    fontWeight: "800",
    color: E_COLOR.ink,
  },
  integrityBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
  },
  integrityTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  integrityTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: E_COLOR.ink,
  },
  integrityText: {
    marginTop: 7,
    fontSize: 9.5,
    lineHeight: 15,
    color: E_COLOR.muted,
  },

  effStrip: {
    gap: 10,
    backgroundColor: E_COLOR.surface,
    borderWidth: 1,
    borderColor: E_COLOR.border,
    borderRadius: 14,
    padding: 12,
  },
  effItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  effItemLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: E_COLOR.muted,
  },
  effItemValue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "800",
    color: E_COLOR.ink,
  },

  pastHeader: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
  },
  pastHead: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: E_COLOR.muted,
  },
  pastCompactRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F2",
  },
  pastCompactMonth: {
    fontSize: 11.5,
    fontWeight: "700",
    color: E_COLOR.ink,
  },
  pastCompactSub: {
    marginTop: 2,
    fontSize: 8.5,
    color: E_COLOR.faint,
  },
  pastCompactValue: {
    fontSize: 11,
    color: E_COLOR.ink,
  },
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