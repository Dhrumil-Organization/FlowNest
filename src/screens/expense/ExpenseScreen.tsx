// ExpenseScreen.jsx — Madhusudhan Fabrics (React Native)
// Complete rebuild matching all 14 screenshots

import { T } from '@/common/utils/theme';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { useExpenseData } from '../useExpenseData';

import { useExpenseData } from '@/src/hooks/useExpenseData';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Formatters ────────────────────────────────────────────────────
const fCr = v => { const L = v / 1e5; return L >= 100 ? `₹${(L / 100).toFixed(2)} Cr` : `₹${L.toFixed(2)} L`; };
const fL = v => `₹${(v / 1e5).toFixed(2)} L`;
const fLn = v => `${(v / 1e5).toFixed(2)} L`;
const f2 = v => Number(v || 0).toFixed(2);
const f3 = v => Number(v || 0).toFixed(3);
const fN = v => Math.round(v || 0).toLocaleString('en-IN');
const arrow = (c, p) => {
  if (!p) return '—';
  const d = ((c - p) / p) * 100;
  return d > 0 ? `▲ ${d.toFixed(1)}%` : `▼ ${Math.abs(d).toFixed(1)}%`;
};

// ── Skeleton ──────────────────────────────────────────────────────
function Skeleton({ h = 80 }) {
  return <View style={[SK.box, { height: h }]} />;
}
const SK = StyleSheet.create({
  box: { backgroundColor: '#f3f4f6', borderRadius: 12, marginBottom: 8 },
});

// ── Month tab ─────────────────────────────────────────────────────
function MonthTab({ label, active, status, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}
      style={[S.monthTab, active && S.monthTabActive]}>
      <Text style={[S.monthTabText, active && S.monthTabTextActive]}>{label}</Text>
      {status === 'loading' && !active && <View style={S.loadingRing} />}
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
    { pct: ePct, color: '#185FA5', label: 'Electricity', value: fL(elec) },
    { pct: sPct, color: '#c2823a', label: 'Salary', value: fL(sal) },
    { pct: stPct, color: '#1D9E75', label: 'Stores', value: fL(stores) },
  ];

  // Build arc segments using border trick
  let cumDeg = -90;

  return (
    <View style={S.donutWrap}>
      {/* Chart left */}
      <View style={{ width: SIZE, height: SIZE, position: 'relative' }}>
        {/* Background ring */}
        <View style={{
          position: 'absolute', width: SIZE, height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: STROKE, borderColor: '#f3f4f6',
        }} />
        {/* Segments drawn as overlapping arcs using conic approximation */}
        {SEGMENTS.map((seg, i) => {
          const startDeg = cumDeg;
          const spanDeg = seg.pct * 360;
          cumDeg += spanDeg;
          if (spanDeg < 1) return null;
          // Split arcs > 180° into two halves
          const arcs = spanDeg > 180
            ? [{ start: startDeg, span: 180 }, { start: startDeg + 180, span: spanDeg - 180 }]
            : [{ start: startDeg, span: spanDeg }];
          return arcs.map((arc, j) => (
            <View key={`${i}-${j}`} style={{
              position: 'absolute', width: SIZE, height: SIZE,
              overflow: 'hidden',
              transform: [{ rotate: `${arc.start}deg` }],
            }}>
              <View style={{
                position: 'absolute', width: SIZE, height: SIZE / 2,
                overflow: 'hidden',
                transform: [{ rotate: `${Math.min(arc.span, 180)}deg` }],
                transformOrigin: `${SIZE / 2}px ${SIZE / 2}px`,
              }}>
                <View style={{
                  width: SIZE, height: SIZE,
                  borderRadius: SIZE / 2,
                  borderWidth: STROKE,
                  borderColor: seg.color,
                  borderTopColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderBottomColor: 'transparent',
                }} />
              </View>
            </View>
          ));
        })}
        {/* Center label */}
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#c2823a' }}>{fCr(total)}</Text>
          <Text style={{ fontSize: 10, color: '#9ca3af' }}>total</Text>
        </View>
      </View>

      {/* Legend right */}
      <View style={{ flex: 1, justifyContent: 'center', paddingLeft: 16, gap: 8 }}>
        {SEGMENTS.map(seg => (
          <View key={seg.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: seg.color }} />
              <Text style={{ fontSize: 13, color: '#374151' }}>{seg.label}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{seg.value}</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af' }}>
                {total > 0 ? ((seg.pct) * 100).toFixed(1) : '0'}%
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
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, position: 'relative', marginBottom: 8 }}>
        <View style={{
          position: 'absolute', width: size, height: size,
          borderRadius: size / 2, borderWidth: STROKE, borderColor: '#c2823a',
        }} />
        {/* Waterjet arc overlay */}
        {wjetPct > 0 && (
          <View style={{
            position: 'absolute', width: size, height: size,
            overflow: 'hidden',
            transform: [{ rotate: `${-90 + rapierPct * 3.6}deg` }],
          }}>
            <View style={{
              width: size, height: size, borderRadius: size / 2,
              borderWidth: STROKE,
              borderColor: '#185FA5',
              borderTopColor: 'transparent', borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              transform: [{ rotate: `${Math.min(wjetPct * 3.6, 180)}deg` }],
            }} />
          </View>
        )}
        {/* Center */}
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{rapierPct.toFixed(1)}%</Text>
          <Text style={{ fontSize: 9, color: '#9ca3af' }}>Rapier</Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151', marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#c2823a' }} />
          <Text style={{ fontSize: 10, color: '#6b7280' }}>Rapier {rapierPct.toFixed(1)}%</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#185FA5' }} />
          <Text style={{ fontSize: 10, color: '#6b7280' }}>W-Jet {wjetPct.toFixed(1)}%</Text>
        </View>
      </View>
    </View>
  );
}

// ── Bar chart (Comparative analytics) ───────────────────────────
function ComparativeChart({ months, states }) {
  const chartData = months.map(mo => {
    const d = states[mo.key]?.data;
    return { label: mo.label, shortLabel: mo.shortLabel, prod: d?.prod_total_L || 0, cpp: d?.cpp_total || 0 };
  }).reverse(); // oldest first

  const maxProd = Math.max(...chartData.map(x => x.prod), 1);
  const maxCpp = Math.max(...chartData.map(x => x.cpp), 1);
  const BAR_W = 32;
  const CHART_H = 120;

  const [tooltip, setTooltip] = useState(null);

  return (
    <View style={S.chartCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text style={S.chartTitle}>Production vs cost / pick</Text>
        <Text style={S.chartSub}>last 6 months</Text>
      </View>

      <View style={{ position: 'relative', marginTop: 8, overflow: 'hidden', height: CHART_H }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <View key={pct} style={{
            position: 'absolute', left: 0, right: 0,
            top: CHART_H * (1 - pct), height: 0.5, backgroundColor: '#f3f4f6',
          }} />
        ))}

        {/* Bars + line */}
        <View style={{ height: CHART_H, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' }}>
          {chartData.map((item, i) => (
            <TouchableOpacity key={i} onPress={() => setTooltip(tooltip === i ? null : i)}
              style={{ alignItems: 'center', width: BAR_W + 10, height: CHART_H, justifyContent: 'flex-end' }}>
              <View style={{
                width: BAR_W, backgroundColor: '#c2823a',
                height: maxProd > 0 ? Math.max((item.prod / maxProd) * CHART_H, 2) : 2,
                borderTopLeftRadius: 3, borderTopRightRadius: 3,
                opacity: tooltip !== null && tooltip !== i ? 0.5 : 1,
              }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Cost/pick line overlay */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: CHART_H, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' }}>
          {chartData.map((item, i) => {
            const y = CHART_H - (maxCpp > 0 ? (item.cpp / maxCpp) * CHART_H : 0);
            return (
              <View key={i} style={{ width: BAR_W + 10, alignItems: 'center', position: 'relative' }}>
                <View style={{
                  position: 'absolute', top: y - 4, width: 8, height: 8,
                  borderRadius: 4, backgroundColor: '#0f172a',
                  borderWidth: 1.5, borderColor: '#fff',
                }} />
              </View>
            );
          })}
        </View>

        {/* Tooltip */}
        {tooltip !== null && chartData[tooltip] && (
          <View style={S.tooltip}>
            <Text style={S.tooltipMonth}>{chartData[tooltip].label}</Text>
            <Text style={S.tooltipLine}>Prod (L m): {f2(chartData[tooltip].prod)}</Text>
            <Text style={S.tooltipLine}>Cost/pick ₹: {f3(chartData[tooltip].cpp)}</Text>
          </View>
        )}
      </View>

      {/* X axis labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 6 }}>
        {chartData.map((item, i) => (
          <Text key={i} style={{ fontSize: 10, color: '#9ca3af', width: BAR_W + 10, textAlign: 'center' }}>
            {item.shortLabel}
          </Text>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#c2823a' }} />
          <Text style={{ fontSize: 11, color: '#6b7280' }}>Production (L m)</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0f172a' }} />
          <Text style={{ fontSize: 11, color: '#6b7280' }}>Cost / pick (₹)</Text>
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

function ExpenseUtilityTrends({ d }) {
  const expenseRows = d.expense_daily_trend || [];
  const utilityRows = d.utility_daily_trend || [];
  const utilityDefs = d.utility_rates || [];
  const [expenseIndex, setExpenseIndex] = useState(Math.max(0, expenseRows.length - 1));
  const [utilityKey, setUtilityKey] = useState(utilityDefs[0]?.key || 'mw_rapier_looms');
  const [utilityIndex, setUtilityIndex] = useState(0);

  if (!expenseRows.length && !utilityRows.length) return null;
  const er = expenseRows[Math.min(expenseIndex, Math.max(0, expenseRows.length - 1))] || {};
  const selectedUtilityRows = utilityRows.filter(r => r.key === utilityKey);
  const ur = selectedUtilityRows[Math.min(utilityIndex, Math.max(0, selectedUtilityRows.length - 1))] || {};
  const avgExpense = expenseRows.length ? expenseRows.reduce((a,r)=>a+Number(r.cost_per_pick||0),0)/expenseRows.length : 0;
  const utilPositive = selectedUtilityRows.map(r=>Number(r.cost_per_mtr||0)).filter(v=>v>0);
  const avgUtil = utilPositive.length ? utilPositive.reduce((a,v)=>a+v,0)/utilPositive.length : 0;

  return (
    <View>
      <Text style={S.sectionLabel}>DAILY EXPENSE TREND</Text>
      <View style={[S.chartCard, { paddingBottom: 12 }]}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
          <View style={{ flex:1 }}>
            <Text style={S.chartTitle}>Cost / pick vs checked production</Text>
            <Text style={S.chartSub}>tap a day for cost composition</Text>
          </View>
          <View style={{ alignItems:'flex-end' }}>
            <Text style={{ fontSize:10, color:'#9ca3af' }}>MONTH AVG</Text>
            <Text style={{ fontSize:14, fontWeight:'700', color:'#0f172a' }}>₹{f3(avgExpense)}/pk</Text>
          </View>
        </View>
        <TrendBars rows={expenseRows} valueKey="cost_per_pick" valueFormatter={v=>`₹${f3(v)}`} selected={expenseIndex} onSelect={setExpenseIndex} />
        {!!er.date_ymd && <View style={{ backgroundColor:'#f8fafc', borderRadius:10, padding:10, marginTop:6 }}>
          <Text style={{ fontSize:12, fontWeight:'700', color:'#111827', marginBottom:5 }}>Day {er.day} · {fN(er.production_mtr)} m checked</Text>
          <Text style={{ fontSize:11, color:'#4b5563', lineHeight:17 }}>
            Electricity {fL(er.electricity)} · Wages {fL(er.salary)} · Stores allocated {fL(er.stores_allocated)}\n
            Total {fL(er.total_cost)} · ₹{f2(er.cost_per_mtr)}/m · ₹{f3(er.cost_per_pick)}/pick
          </Text>
        </View>}
      </View>

      <Text style={S.sectionLabel}>UTILITY TREND</Text>
      <View style={[S.chartCard, { paddingBottom: 12 }]}>
        <Text style={S.chartTitle}>Electricity cost / metre</Text>
        <Text style={S.chartSub}>same-day utility cost against the production it feeds</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:6, paddingVertical:10 }}>
          {utilityDefs.map(u => <TouchableOpacity key={u.key} onPress={()=>{setUtilityKey(u.key);setUtilityIndex(0);}}
            style={{ paddingHorizontal:10, paddingVertical:7, borderRadius:16, backgroundColor:utilityKey===u.key?'#0f172a':'#f3f4f6' }}>
            <Text style={{ fontSize:10, fontWeight:'600', color:utilityKey===u.key?'#fff':'#4b5563' }}>{u.label}</Text>
          </TouchableOpacity>)}
        </ScrollView>
        <View style={{ flexDirection:'row', gap:14, marginBottom:4 }}>
          <Text style={{ fontSize:11, color:'#6b7280' }}>Month avg <Text style={{fontWeight:'700',color:'#111827'}}>₹{f3(avgUtil)}/m</Text></Text>
          {!!ur.date_ymd && <Text style={{ fontSize:11, color:'#6b7280' }}>Selected <Text style={{fontWeight:'700',color:'#111827'}}>{fN(ur.kwh)} kWh</Text></Text>}
        </View>
        <TrendBars rows={selectedUtilityRows} valueKey="cost_per_mtr" valueFormatter={v=>`₹${f3(v)}`} selected={utilityIndex} onSelect={setUtilityIndex} barColor="#185FA5" />
        {!!ur.date_ymd && <Text style={{ fontSize:11, color:'#4b5563', lineHeight:17, marginTop:6 }}>
          Day {ur.day}: {fN(ur.kwh)} kWh · {fL(ur.amount)} electricity · {fN(ur.production_mtr)} m production · ₹{f3(ur.cost_per_mtr)}/m · ₹{Number(ur.cost_per_pick||0).toFixed(4)}/pick
        </Text>}
      </View>
    </View>
  );
}

function DailyTrendSheet({ open, onClose, d, trend }) {
  if (!open || !trend) return null;
  const isUtility = trend.kind === 'utility';
  const isRapier = trend.kind === 'rapier';
  const isWaterjet = trend.kind === 'waterjet';
  const rows = isUtility
    ? (d.utility_daily_trend || []).filter(r => r.key === trend.key)
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
  React.useEffect(() => { setSelected(Math.max(0, rows.length - 1)); }, [trend?.kind, trend?.key, rows.length]);
  const row = rows[Math.min(selected, Math.max(0, rows.length - 1))] || {};
  const title = isUtility ? (trend.label || 'Utility') : isRapier ? 'Rapier' : isWaterjet ? 'Waterjet' : 'Total (Rapier + Waterjet)';
  const prod = r => isUtility ? Number(r.production_mtr || 0) : isRapier ? Number(r.rapier_mtr || 0) : isWaterjet ? Number(r.waterjet_mtr || 0) : Number(r.production_mtr || 0);
  const picks = r => isRapier ? Number(r.rapier_avg_picks || 0) : isWaterjet ? Number(r.waterjet_avg_picks || 0) : Number(r.avg_picks || 0);
  const cost = r => isUtility ? Number(r.amount || 0) : isRapier ? Number(r.rapier_total_cost || 0) : isWaterjet ? Number(r.waterjet_total_cost || 0) : Number(r.total_cost || 0);
  return <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
    <View style={{flex:1,backgroundColor:'rgba(15,23,42,0.38)',justifyContent:'center',padding:18}}>
      <View style={{backgroundColor:'#fff',borderRadius:16,maxHeight:'88%',padding:14}}>
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

function ExpBlock({ icon, iconColor, iconBg, title, sub, amt, editLabel, onEdit, children }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={S.expBlock}>
      <TouchableOpacity style={S.expHeader} onPress={() => setOpen(p => !p)} activeOpacity={0.7}>
        <View style={[S.expIcon, { backgroundColor: iconBg }]}>
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.expTitle}>{title}</Text>
          <Text style={S.expSub}>{sub}</Text>
        </View>
        <Text style={[S.expAmt, { color: iconColor }]}>{amt}</Text>
        {!!editLabel && (
          <TouchableOpacity onPress={e => { onEdit?.(); }} style={{ paddingHorizontal: 4 }}>
            <Text style={S.editLabel}>{editLabel}</Text>
          </TouchableOpacity>
        )}
        <Text style={[S.expChevron, open && { transform: [{ rotate: '180deg' }] }]}>▾</Text>
      </TouchableOpacity>
      {open && <View style={S.expBody}>{children}</View>}
    </View>
  );
}

// ── Bar row (electricity sub-meter) ──────────────────────────────
function BarRow({ label, kwh, cost, pct, costPct, onTrend }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <TouchableOpacity disabled={!onTrend} onPress={onTrend} style={{flexDirection:'row',alignItems:'center',gap:5}}><Text style={{ fontSize: 12, color: '#374151' }}>{label}</Text>{!!onTrend && <Text style={{fontSize:9,fontWeight:'700',color:'#185FA5'}}>daily ›</Text>}</TouchableOpacity>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: '#374151' }}>
            {fN(kwh)} kWh · {fL(cost)}
          </Text>
          <Text style={{ fontSize: 11, color: '#9ca3af' }}>{costPct?.toFixed(1)}%</Text>
        </View>
      </View>
      <View style={{ height: 5, backgroundColor: '#f3f4f6', borderRadius: 3 }}>
        <View style={{ width: `${Math.min(pct, 100)}%`, height: 5, backgroundColor: '#185FA5', borderRadius: 3 }} />
      </View>
    </View>
  );
}

// ── Shed detail row ───────────────────────────────────────────────
function ShedRow({ label, value, pk }) {
  return (
    <View style={S.shedRow}>
      <Text style={S.shedLabel}>{label}</Text>
      <View style={{ alignItems: 'flex-end' }}>
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
          <Text style={[S.th, { minWidth: 70, textAlign: 'left' }]}>Date</Text>
          {cols.map(c => <Text key={c} style={S.th}>{c}</Text>)}
        </View>
        {/* Data rows */}
        {rows.map((row, ri) => (
          <View key={ri} style={S.tableRow}>
            <Text style={[S.td, { minWidth: 70, textAlign: 'left', fontWeight: '500' }]}>{row.date}</Text>
            {cols.map((c, ci) => (
              <TextInput
                key={ci}
                style={S.tdInput}
                value={String(row.values[ci] || '')}
                onChangeText={v => {
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
        <View style={[S.tableRow, { borderTopWidth: 1, borderTopColor: '#e5e7eb' }]}>
          <Text style={[S.th, { minWidth: 70, textAlign: 'left', color: '#c2823a' }]}>TOTAL</Text>
          {cols.map((c, ci) => {
            const tot = rows.reduce((sum, r) => sum + (Number(r.values[ci]) || 0), 0);
            return <Text key={ci} style={[S.th, { color: '#c2823a' }]}>{fN(tot)}</Text>;
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ── Daily Units view ──────────────────────────────────────────────

function DailyUnitsView({ d, onBack }) {
  const COLS = ['MW Loom', 'MW Luwa', 'Sud Loom', 'Sud Luwa', 'WJet Loom', 'Warp', 'M'];
  const initRows = (d.daily || []).map(r => ({
    date: r.date,
    values: [r.mw_looms, r.mw_luwa, r.sd_looms, r.sd_luwa, r.wj_looms, r.warping, r.misc],
  }));
  const [rows, setRows] = useState(initRows);
  const totalKwh = rows.reduce((s, r) => s + r.values.reduce((a, v) => a + (Number(v) || 0), 0), 0);

  const addDay = () => {
    const nextDate = `${String(rows.length + 1).padStart(2, '0')}-${rows[0]?.date?.split('-')[1] || 'Jun'}`;
    setRows(prev => [...prev, { date: nextDate, values: Array(COLS.length).fill('') }]);
  };

  return (
    <View>
      <TouchableOpacity onPress={onBack} style={{ marginBottom: 14 }}>
        <Text style={S.subBack}>‹ Back to report</Text>
      </TouchableOpacity>
      <Text style={S.subTitle}>Daily units consumed</Text>
      <Text style={S.subDesc}>Sub-meter readings in kWh per day. "Misc" is the unmetered residual. Monthly totals flow straight into the dashboard and electricity cost.</Text>

      <DayInputTable days={d.days} cols={COLS} rows={rows} setRows={setRows} onAddDay={addDay} />

      <TouchableOpacity style={S.addDayBtn} onPress={addDay}>
        <Text style={S.addDayText}>+ Add a day</Text>
      </TouchableOpacity>

      <View style={S.footCard}>
        <View>
          <Text style={S.footLabel}>TOTAL UNITS</Text>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>
            {fN(totalKwh)} <Text style={{ fontSize: 13, color: '#9ca3af' }}>kWh</Text>
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={S.footLabel}>ELECTRICITY @ ₹{d.unit_rate}</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#c2823a' }}>{fL(d.elec_total)}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Daily Salary view ─────────────────────────────────────────────
function DailySalaryView({ d, onBack }) {
  const COLS = ['Rapier ₹', 'Waterjet ₹', 'Total'];
  const initRows = (d.daily || []).map(r => ({
    date: r.date, values: [r.sal_r, r.sal_w, r.sal_t],
  }));
  const [rows, setRows] = useState(initRows);

  const addDay = () => {
    const nextDate = `${String(rows.length + 1).padStart(2, '0')}-${rows[0]?.date?.split('-')[1] || 'Jun'}`;
    setRows(prev => [...prev, { date: nextDate, values: ['', '', ''] }]);
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
      <Text style={S.subDesc}>Daily wage cost per shed (₹). Kept separate from utilities. Monthly totals flow into the dashboard.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={S.tableRow}>
            <Text style={[S.th, { minWidth: 70, textAlign: 'left' }]}>Date</Text>
            {COLS.map(c => <Text key={c} style={S.th}>{c}</Text>)}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={S.tableRow}>
              <Text style={[S.td, { minWidth: 70, textAlign: 'left', fontWeight: '500' }]}>{row.date}</Text>
              {[0, 1].map(ci => (
                <TextInput key={ci} style={S.tdInput}
                  value={String(row.values[ci] || '')}
                  onChangeText={v => {
                    setRows(rows.map((r, rr) => {
                      if (rr !== ri) return r;
                      const vals = [...r.values];
                      vals[ci] = v;
                      vals[2] = String((Number(vals[0]) || 0) + (Number(vals[1]) || 0));
                      return { ...r, values: vals };
                    }));
                  }}
                  keyboardType="numeric" placeholder="0" placeholderTextColor="#d1d5db" />
              ))}
              <Text style={[S.td, { color: '#c2823a', fontWeight: '500' }]}>{fN(Number(row.values[2]) || 0)}</Text>
            </View>
          ))}
          <View style={[S.tableRow, { borderTopWidth: 1, borderTopColor: '#e5e7eb' }]}>
            <Text style={[S.th, { minWidth: 70, textAlign: 'left', color: '#c2823a' }]}>TOTAL</Text>
            <Text style={[S.th, { color: '#c2823a' }]}>₹{fN(tR)}</Text>
            <Text style={[S.th, { color: '#c2823a' }]}>₹{fN(tW)}</Text>
            <Text style={[S.th, { color: '#c2823a' }]}>₹{fN(tT)}</Text>
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
  const COLS = ['Rapier', 'Waterjet', 'Common'];
  const initRows = (d.daily || []).map(r => ({ date: r.date, values: ['', '', ''] }));
  const [rows, setRows] = useState(initRows);

  const addDay = () => {
    const nextDate = `${String(rows.length + 1).padStart(2, '0')}-${rows[0]?.date?.split('-')[1] || 'Jun'}`;
    setRows(prev => [...prev, { date: nextDate, values: ['', '', ''] }]);
  };

  const totals = COLS.map((_, ci) => rows.reduce((s, r) => s + (Number(r.values[ci]) || 0), 0));
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
            <Text style={[S.th, { minWidth: 70, textAlign: 'left' }]}>Date</Text>
            {COLS.map(c => <Text key={c} style={S.th}>{c}</Text>)}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={S.tableRow}>
              <Text style={[S.td, { minWidth: 70, textAlign: 'left', fontWeight: '500' }]}>{row.date}</Text>
              {COLS.map((c, ci) => (
                <TextInput key={ci} style={S.tdInput}
                  value={String(row.values[ci] || '')}
                  onChangeText={v => {
                    setRows(rows.map((r, rr) => {
                      if (rr !== ri) return r;
                      const vals = [...r.values]; vals[ci] = v;
                      return { ...r, values: vals };
                    }));
                  }}
                  keyboardType="numeric" placeholder="0" placeholderTextColor="#d1d5db" />
              ))}
            </View>
          ))}
          <View style={[S.tableRow, { borderTopWidth: 1, borderTopColor: '#e5e7eb' }]}>
            <Text style={[S.th, { minWidth: 70, textAlign: 'left', color: '#534AB7' }]}>TOTAL</Text>
            {totals.map((t, i) => (
              <Text key={i} style={[S.th, { color: '#534AB7' }]}>₹{fN(t)}</Text>
            ))}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={S.addDayBtn} onPress={addDay}>
        <Text style={S.addDayText}>+ Add a day</Text>
      </TouchableOpacity>

      <View style={S.allocCard}>
        <Text style={S.allocLabel}>AFTER ½ : ½ ALLOCATION</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 }}>
          {[['Rapier', rapier], ['Waterjet', waterjet], ['Total', total]].map(([l, v]) => (
            <View key={l} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: '#0000', marginBottom: 3 }}>{l}</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#c2823a' }}>₹{fN(v)}</Text>
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
    { l: 'TOTAL COST', v: fCr(d.total), s: `${label} · ${d.days} days`, c: '#c2823a' },
    { l: 'COST / PICK', v: `₹${f3(d.cpp_total)}`, s: 'all sheds', c: '#c2823a' },
    { l: 'AVG PICKS', v: f2(d.avg_pick_tot), s: 'prod-weighted', c: '#1D9E75' },
    { l: 'PRODUCTION', v: `${f2(d.prod_total_L)} L m`, s: `${fN(d.prod_total / d.days)} m / mc·day`, c: '#1D9E75' },
    { l: 'COST / MC·DAY', v: `₹${fN(d.cpmc)}`, s: '126 looms', c: '#534AB7' },
    { l: 'UNITS', v: `${Math.round(d.kwh_total / 1000)}K kWh`, s: `@ ₹${d.unit_rate}/unit`, c: '#BA7517' },
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
function MgmtCard({ name, borderColor, prod, pk, elec, sal, store, cpp, cpmc, onTrend }) {
  return (
    <View style={[S.mgmtCard, { borderLeftColor: borderColor }]}>
      <View style={S.mgmtHeader}>
        <View><Text style={S.mgmtName}>{name}</Text><Text style={S.mgmtSub}>{f2(prod / 1e5)} L m · {f2(pk)} pk</Text></View>{!!onTrend && <TouchableOpacity onPress={onTrend} style={{paddingHorizontal:8,paddingVertical:5,borderRadius:12,backgroundColor:'#f3f4f6'}}><Text style={{fontSize:9.5,fontWeight:'700',color:'#6b7280'}}>daily trend ›</Text></TouchableOpacity>}
      </View>
      <View style={S.mgmtBody}>
        {[['#185FA5', 'Electricity', elec], ['#c2823a', 'Salary', sal], ['#1D9E75', 'Stores', store]].map(([c, l, v]) => (
          <View key={l} style={S.mgmtRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[S.colorDot, { backgroundColor: c }]} />
              <Text style={S.mgmtRowLabel}>{l}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={S.mgmtRowValue}>{fL(v)}</Text>
              <Text style={S.mgmtRowPk}>+₹{f3(v / prod / pk)}/pk</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={S.mgmtFooter}>
        <View style={{ flex: 1 }}>
          <Text style={S.mgmtFootLabel}>COST / PICK</Text>
          <Text style={[S.mgmtFootValue, { color: '#c2823a' }]}>₹{f3(cpp)}</Text>
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
    <TouchableOpacity style={S.pastCard} onPress={onToggle} activeOpacity={0.75}>
      <View style={S.pastTop}>
        <View style={{ flex: 1 }}>
          <Text style={S.pastMonth}>{month.fullLabel}</Text>
          <Text style={S.pastSub}>
            {st.status === 'loading' ? 'Loading…'
              : st.status === 'error' ? 'Failed'
                : d ? `${f2(d.prod_total_L)} L m · ${d.days} days` : '—'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
          {st.status === 'loading' && <View style={{ width: 70, height: 14, backgroundColor: '#f3f4f6', borderRadius: 4 }} />}
          {st.status === 'done' && d && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#c2823a' }}>{fCr(d.total)}</Text>
              <Text style={{ fontSize: 11, color: '#000', marginTop: 2 }}>₹{f3(d.cpp_total)}/pk</Text>
            </View>
          )}
          {d && <Text style={[S.pastChevron, open && { transform: [{ rotate: '180deg' }] }]}>▾</Text>}
        </View>
      </View>

      {open && d && (
        <View style={S.pastExpanded}>
          {[['#185FA5', 'Electricity', d.elec_total], ['#c2823a', 'Salary', d.sal_total], ['#1D9E75', 'Stores', d.store_total]].map(([c, l, v]) => (
            <View key={l} style={S.pastRow2}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[S.colorDot, { backgroundColor: c }]} />
                <Text style={{ fontSize: 13, color: '#000' }}>{l}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                <Text style={{ fontSize: 13 }}>{fL(v)}</Text>
                <Text style={{ fontSize: 11, color: '#000' }}>{d.total > 0 ? (v / d.total * 100).toFixed(1) : 0}%</Text>
              </View>
            </View>
          ))}
          <View style={S.pastMiniGrid}>
            {[['Cost / pick', `₹${f3(d.cpp_total)}`], ['Cost / mc·day', `₹${fN(d.cpmc)}`],
            ['Rapier', `${fLn(d.total_rapier || 0)} · ${d.rapier_pct?.toFixed(1)}%`],
            ['W-Jet', `${fLn(d.total_wjet || 0)} · ${d.wjet_pct?.toFixed(1)}%`]].map(([l, v]) => (
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
      await AsyncStorage.setItem(`month_settings_${monthKey}`, JSON.stringify({ unitRate, days, storeR, storeW }));
    } catch (_) { }
  };

  return (
    <View style={S.settingsCard}>
      {[
        ['Unit rate (₹/kWh)', unitRate, setUnitRate],
        ['Working days', days, setDays],
        ['Stores — Rapier (₹/mo)', storeR, setStoreR],
        ['Stores — Waterjet (₹/mo)', storeW, setStoreW],
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

// ── Production block ──────────────────────────────────────────────
function ProductionBlock({ d }) {
  return (
    <View style={S.prodBlock}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 10, color: '#000', textTransform: 'uppercase', letterSpacing: 0.7 }}>
          Production · from production system
        </Text>
        <View style={{ backgroundColor: '#E1F5EE', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
          <Text style={{ fontSize: 10, color: '#0F6E56', fontWeight: '600' }}>AUTO</Text>
        </View>
      </View>
      {[['Rapier', d.prod_rapier, d.avg_pick_mw], ['Waterjet', d.prod_wjet, d.avg_pick_wjet]].map(([l, p, pk]) => (
        <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
          <Text style={{ fontSize: 13, fontWeight: '500' }}>{l}</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 13, fontWeight: '600' }}>{f2(p / 1e5)} L m</Text>
            <Text style={{ fontSize: 11, color: '#000' }}>{pk} pk</Text>
          </View>
        </View>
      ))}
      <Text style={{ fontSize: 11, color: '#000', marginTop: 4 }}>
        Meters & picks flow in from the loom production feed — read-only here.
      </Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function ExpenseScreen({ token, apiBase }) {
  const { months, states, loadedCount, total, refresh, retryMonth } =
    useExpenseData({ token, apiBase });

  const [activeTab, setActiveTab] = useState(0);
  const [view, setView] = useState('report');
  const [pastOpen, setPastOpen] = useState({});
  const [trendSheet, setTrendSheet] = useState(null);
  const scrollRef = useRef<ScrollView>(null);

  const m = months[activeTab];
  const st = states[m?.key];
  const d = st?.data;

  const prevM = months[activeTab + 1];
  const prevD = prevM ? states[prevM?.key]?.data : null;

  const togglePast = useCallback(i => setPastOpen(p => ({ ...p, [i]: !p[i] })), []);

  if (!m) return null;

  // ── Sub-views ─────────────────────────────────────────────────
  const subViews = {
    'daily-units': <DailyUnitsView d={d || { daily: [] }} onBack={() => setView('report')} />,
    'daily-salary': <DailySalaryView d={d || { daily: [] }} onBack={() => setView('report')} />,
    'daily-maint': <DailyInputView title="Daily maintenance" d={d || { daily: [] }} onBack={() => setView('report')}
      desc="Maintenance & repair spend per day (₹). Enter per shed, or under Common for shared cost — common auto-splits ½ Rapier / ½ Waterjet." />,
    'daily-other': <DailyInputView title="Daily other expenses" d={d || { daily: [] }} onBack={() => setView('report')}
      desc="Other direct / indirect expenses per day (₹). Enter per shed, or under Common for shared cost — common auto-splits ½ Rapier / ½ Waterjet." />,
  };

  if (subViews[view]) {
    return (
      <SafeAreaView style={S.safe} edges={['top']}>
        <View style={S.header}>
          <Text style={S.eyebrow}>MADHUSUDHAN FABRICS</Text>
          <Text style={S.title}>Expense</Text>
          {/* <Text style={S.sub}>Demo data</Text> */}
        </View>
        <ScrollView ref={scrollRef} style={S.body} contentContainerStyle={{ paddingBottom: 32 }}>
          {subViews[view]}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Main report ───────────────────────────────────────────────
  return (
    <>
      {/* <SafeAreaView style={S.safe} edges={['top']}> */}
      <SafeAreaView style={{ flex: 0, backgroundColor: T.nav }} edges={['top']} />
      <StatusBar style="light" backgroundColor={T.nav} />
      <DailyTrendSheet open={!!trendSheet} onClose={()=>setTrendSheet(null)} d={d || {}} trend={trendSheet} />
      <View style={S.header}>
        <Text style={S.eyebrow}>MADHUSUDHAN FABRICS</Text>
        <View style={S.headerRow}>
          <Text style={S.title}>Expense</Text>
          <TouchableOpacity onPress={refresh} style={S.refreshBtn} activeOpacity={0.7}>
            <Text style={S.refreshText}>↻</Text>
          </TouchableOpacity>
        </View>
        {/* <Text style={S.sub}>Demo data</Text> */}
      </View>

      <ScrollView style={S.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Month tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {months.map((mo, i) => (
              <MonthTab key={mo.key} label={mo.label}
                active={activeTab === i} status={states[mo.key]?.status}
                onPress={() => { setActiveTab(i); setView('report'); }} />
            ))}
          </View>
        </ScrollView>

        {/* Loading */}
        {st?.status === 'loading' && (
          <View><Skeleton h={140} /><Skeleton h={80} /><Skeleton h={80} /><Skeleton h={80} /></View>
        )}

        {/* Error */}
        {st?.status === 'error' && (
          <View style={S.errorBox}>
            <Text style={S.errorText}>Failed to load {m.fullLabel}</Text>
            <TouchableOpacity onPress={() => retryMonth(m.key)} style={S.retryBtn}>
              <Text style={S.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Data */}
        {st?.status === 'done' && d && (
          <>
            <KPIGrid d={d} label={m.fullLabel} />

            {/* Cost composition donut */}
            <View style={S.compositionCard}>
              <Text style={S.compositionTitle}>Cost composition · {m.shortLabel} '{m.yearno}</Text>
              <DonutChart elec={d.elec_total} sal={d.sal_total} stores={d.store_total} total={d.total} />
            </View>

            {/* Management summary */}
            <Text style={S.sectionLabel}>MANAGEMENT SUMMARY</Text>
            <MgmtCard name="Rapier" borderColor="#c2823a" prod={d.prod_rapier} pk={d.avg_pick_mw} elec={d.elec_rapier} sal={d.sal_rapier} store={d.store_rapier} cpp={d.cpp_rapier} cpmc={d.cpmc_rapier || 0} onTrend={()=>setTrendSheet({kind:'rapier'})} />
            <MgmtCard name="Waterjet" borderColor="#185FA5" prod={d.prod_wjet} pk={d.avg_pick_wjet} elec={d.elec_wjet} sal={d.sal_wjet} store={d.store_wjet} cpp={d.cpp_wjet} cpmc={d.cpmc_wjet || 0} onTrend={()=>setTrendSheet({kind:'waterjet'})} />
            <MgmtCard name="Total" borderColor="#e5e7eb" prod={d.prod_total} pk={d.avg_pick_tot} elec={d.elec_total} sal={d.sal_total} store={d.store_total} cpp={d.cpp_total} cpmc={d.cpmc} onTrend={()=>setTrendSheet({kind:'total'})} />

            {/* Expense breakdown */}
            <Text style={S.sectionLabel}>EXPENSE BREAKDOWN</Text>

            {/* Utilities */}
            <ExpBlock icon="⚡" iconColor="#185FA5" iconBg="#EFF6FF" title="Utilities / units consumed"
              sub={`${fN(d.kwh_total)} kWh @ ₹${d.unit_rate}`} amt={`${fLn(d.elec_total)} L`}
              editLabel="Edit ›" onEdit={() => setView('daily-units')}>
              {[
                ['mw_rapier_looms', 'MW Rapier — Looms', d.kwh_mw_looms, d.elec_mw_looms],
                ['mw_rapier_luwa', 'MW Rapier — Luwa (humid.)', d.kwh_mw_luwa, d.elec_mw_luwa],
                ['sip_rapier_looms', 'Sud Rapier — Looms', d.kwh_sd_looms, d.elec_sd_looms],
                ['sip_rapier_luwa', 'Sud Rapier — Luwa (humid.)', d.kwh_sd_luwa, d.elec_sd_luwa],
                ['sip_waterjet_looms', 'Sud W-Jet — Looms', d.kwh_wj_looms, d.elec_wj_looms],
                ['warping_shared', 'Warping (shared)', d.kwh_warping, d.elec_warping],
                ['misc_shared', 'Miscellaneous (shared)', d.kwh_misc, d.elec_misc],
              ].map(([key, label, kwh, cost]) => (
                <BarRow key={key} label={label} kwh={kwh} cost={cost}
                  pct={d.kwh_total > 0 ? (kwh / d.kwh_total) * 100 : 0}
                  costPct={d.elec_total > 0 ? (cost / d.elec_total) * 100 : 0}
                  onTrend={()=>setTrendSheet({kind:'utility',key,label})} />
              ))}
              <Text style={{ fontSize: 11, color: '#000', marginTop: 4 }}>
                Warping + Misc are shared — allocated ⅔ Rapier, ⅓ Waterjet in costing.
              </Text>
            </ExpBlock>

            {/* Salaries */}
            <ExpBlock icon="₹" iconColor="#c2823a" iconBg="#FDF3E8" title="Salaries / wages"
              sub="Rapier + Waterjet" amt={`${fLn(d.sal_total)} L`}
              editLabel="Edit ›"
              // onEdit={() => setView('daily-salary')}
              onEdit={() => {
                setView('daily-salary');

                setTimeout(() => {
                  scrollRef.current?.scrollTo({
                    y: 0,
                    animated: false,
                  });
                }, 50);
              }}
            >
              <ShedRow label="Rapier shed" value={d.sal_rapier} pk={d.sal_rapier / d.prod_rapier / d.avg_pick_mw} />
              <ShedRow label="Waterjet shed" value={d.sal_wjet} pk={d.sal_wjet / d.prod_wjet / d.avg_pick_wjet} />
              <View style={S.shedTotal}>
                <Text style={[S.shedLabel, { fontWeight: '600' }]}>Total</Text>
                <Text style={[S.shedValue, { fontWeight: '600' }]}>{fL(d.sal_total)} · +₹{f3(d.sal_total / d.prod_total / d.avg_pick_tot)}/pk</Text>
              </View>
            </ExpBlock>

            {/* Stores */}
            <ExpBlock icon="📦" iconColor="#1D9E75" iconBg="#E1F5EE" title="Production-linked expenses"
              sub="Stores & spares" amt={`${fLn(d.store_total)} L`}>
              <ShedRow label="Rapier stores" value={d.store_rapier} pk={d.store_rapier / d.prod_rapier / d.avg_pick_mw} />
              <ShedRow label="Waterjet stores" value={d.store_wjet} pk={d.store_wjet / d.prod_wjet / d.avg_pick_wjet} />
              <View style={S.shedTotal}>
                <Text style={[S.shedLabel, { fontWeight: '600' }]}>Total</Text>
                <Text style={[S.shedValue, { fontWeight: '600' }]}>{fL(d.store_total)} · +₹{f3(d.store_total / d.prod_total / d.avg_pick_tot)}/pk</Text>
              </View>
            </ExpBlock>

            {/* Maintenance */}
            <ExpBlock icon="🔧" iconColor="#534AB7" iconBg="#EEEDFE" title="Maintenance"
              sub="Rapier · Waterjet · common (½½)" amt="₹0"
              editLabel="Edit ›" onEdit={() => setView('daily-maint')}>
              {[['Rapier', 0], ['Waterjet', 0], ['Total', 0]].map(([l, v]) => (
                <View key={l} style={S.shedRow}>
                  <Text style={S.shedLabel}>{l}</Text>
                  <Text style={S.shedValue}>₹{fN(v)} · +₹0.000/pk</Text>
                </View>
              ))}
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                Common maintenance auto-splits ½ Rapier / ½ Waterjet. Enter day-wise via the input module above.
              </Text>
            </ExpBlock>

            {/* Other */}
            <ExpBlock icon="+" iconColor="#BA7517" iconBg="#FAEEDA" title="Other expenses"
              sub="Direct / indirect" amt="₹0"
              editLabel="Edit ›" onEdit={() => setView('daily-other')}>
              {[['Rapier', 0], ['Waterjet', 0], ['Total', 0]].map(([l, v]) => (
                <View key={l} style={S.shedRow}>
                  <Text style={S.shedLabel}>{l}</Text>
                  <Text style={S.shedValue}>₹{fN(v)} · +₹0.000/pk</Text>
                </View>
              ))}
              <Text style={{ fontSize: 11, color: '#000', marginTop: 6 }}>
                Common items auto-split ½ Rapier / ½ Waterjet. Enter day-wise via the input module above.
              </Text>
            </ExpBlock>

            {/* Final derived costing */}
            <ExpBlock icon="Σ" iconColor="#c2823a" iconBg="#FDF3E8" title="Final derived costing"
              sub={`₹${f3(d.cpp_total)}/pick · ${f2(d.avg_pick_tot)} picks`}
              amt={`₹${f3(d.cpp_total)}/pk`}>
              {[['#185FA5', 'Electricity', d.elec_total], ['#c2823a', 'Salary', d.sal_total], ['#1D9E75', 'Stores', d.store_total]].map(([c, l, v]) => (
                <View key={l} style={S.finalRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[S.colorDot, { backgroundColor: c }]} />
                    <Text style={{ fontSize: 13 }}>{l}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: '500', fontSize: 13 }}>{fL(v)}</Text>
                    <Text style={{ fontSize: 11, color: '#000' }}>+₹{f3(v / d.prod_total / d.avg_pick_tot)}/pk</Text>
                  </View>
                </View>
              ))}
              <View style={S.finalTotal}>
                <Text style={{ fontWeight: '500' }}>Total cost</Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#c2823a' }}>{fCr(d.total)}</Text>
              </View>
              <View style={S.miniGrid}>
                {[['COST / PICK', `₹${f3(d.cpp_total)}`], ['AVG PICKS', f2(d.avg_pick_tot)], ['COST / MC·DAY', `₹${fN(d.cpmc)}`]].map(([l, v]) => (
                  <View key={l} style={S.miniCard}>
                    <Text style={S.miniLabel}>{l}</Text>
                    <Text style={S.miniValue}>{v}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ fontSize: 11, color: '#000', marginTop: 8 }}>
                Cost / pick = total cost ÷ production metres ÷ avg picks ({f2(d.avg_pick_tot)}).
              </Text>
            </ExpBlock>

            {/* Comparative analytics */}
            <Text style={S.sectionLabel}>COMPARATIVE ANALYTICS · 6 MONTHS</Text>
            <ComparativeChart months={months} states={states} />

            {/* Efficiency indicators */}
            <Text style={S.sectionLabel}>EFFICIENCY INDICATORS · {m.fullLabel.toUpperCase()}</Text>
            <View style={S.effGrid}>
              {[['UNITS / METRE', `${f2(d.units_per_mtr)} kWh`], ['SALARY / METRE', `₹${f2(d.sal_per_mtr)}`],
              ['STORES / METRE', `₹${f2(d.store_per_mtr)}`], ['AVG PICKS', f2(d.avg_pick_tot)],
              ['PROD / MC·DAY', `${fN(d.prod_total / d.days)} m`], ['COST / MC·DAY', `₹${fN(d.cpmc)}`]].map(([l, v]) => (
                <View key={l} style={S.effCard}>
                  <Text style={S.effLabel}>{l}</Text>
                  <Text style={S.effValue}>{v}</Text>
                </View>
              ))}
            </View>

            {/* Production block */}
            <Text style={[S.sectionLabel, { marginTop: 8, color: '#000' }]}>PRODUCTION · FROM PRODUCTION SYSTEM</Text>
            <ProductionBlock d={d} />

            {/* Month settings */}
            <Text style={[S.sectionLabel, { marginTop: 8 }]}>MONTH SETTINGS · (ongoing month)</Text>
            <MonthSettings d={d} monthKey={m.key} />

            {/* Production / Cost split donuts */}
            <View style={S.donutRow}>
              <View style={S.donutHalf}>
                <MiniDonut
                  rapierPct={d.prod_total > 0 ? (d.prod_rapier / d.prod_total) * 100 : 0}
                  label="Production split"
                />
              </View>
              <View style={S.donutHalf}>
                <MiniDonut
                  rapierPct={d.rapier_pct || 0}
                  label="Cost split"
                />
              </View>
            </View>

            {/* Month-on-month */}
            <View style={S.momCard}>
              <Text style={S.momTitle}>Month-on-month</Text>
              <Text style={S.momSub}>{prevD ? `vs ${prevM.fullLabel}` : 'no prior month'}</Text>
              <View style={S.miniGrid}>
                {[['TOTAL COST', fCr(d.total), d.total, prevD?.total],
                ['COST / PICK', `₹${f3(d.cpp_total)}`, d.cpp_total, prevD?.cpp_total],
                ['PRODUCTION', `${f2(d.prod_total_L)} L m`, d.prod_total_L, prevD?.prod_total_L]].map(([l, v, c, p]) => (
                  <View key={l} style={S.miniCard}>
                    <Text style={S.miniLabel}>{l}</Text>
                    <Text style={S.miniValue}>{v}</Text>
                    <Text style={{ fontSize: 11, marginTop: 1, color: (c > (p || 0)) ? '#ef4444' : '#1D9E75' }}>
                      {prevD ? arrow(c, p) : '—'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Past performance */}
            <Text style={S.sectionLabel}>PAST PERFORMANCE</Text>
            {months.map((mo, i) => (
              <PastRow key={mo.key} month={mo} st={states[mo.key]}
                open={!!pastOpen[i]} onToggle={() => togglePast(i)} />
            ))}
          </>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={{ flex: 0, backgroundColor: '#fff' }} />
      {/* </SafeAreaView> */}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#13879A', },
  header: { backgroundColor: '#13879A', padding: 16, paddingBottom: 18, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  eyebrow: { fontSize: 10, color: '#fff', letterSpacing: 1, marginBottom: 3 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '500', color: '#fff' },
  sub: { fontSize: 11, color: '#fff', marginTop: 2 },
  refreshBtn: { width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  refreshText: { color: '#fff', fontSize: 18 },
  body: { flex: 1, paddingHorizontal: 12, paddingTop: 14 },

  monthTab: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', flexShrink: 0, position: 'relative' },
  monthTabActive: { backgroundColor: '#13879A', borderColor: '#13879A' },
  monthTabText: { fontSize: 13, color: '#000' },
  monthTabTextActive: { color: '#fff' },
  loadingRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20, borderWidth: 1.5, borderColor: '#c2823a' },

  sectionLabel: { fontSize: 10, color: '#000', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 14, marginBottom: 8 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpiCard: { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 12, borderTopWidth: 2.5, borderWidth: 0.5, borderColor: '#e5e7eb' },
  kpiLabel: { fontSize: 10, color: '#000', letterSpacing: 0.7, marginBottom: 5 },
  kpiValue: { fontSize: 17, fontWeight: '500', color: '#000', marginBottom: 2 },
  kpiSub: { fontSize: 11, color: '#000' },

  compositionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: '#e5e7eb' },
  compositionTitle: { fontSize: 13, fontWeight: '500', color: '#000', marginBottom: 12 },
  donutWrap: { flexDirection: 'row', alignItems: 'center' },

  mgmtCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden', borderWidth: 0.5, borderColor: '#e5e7eb', borderLeftWidth: 3 },
  mgmtHeader: { padding: 13, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6' },
  mgmtName: { fontSize: 14, fontWeight: '500', color: '#000' },
  mgmtSub: { fontSize: 11, color: '#000' },
  mgmtBody: { padding: 8 },
  mgmtRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  mgmtRowLabel: { fontSize: 13, color: '#000' },
  mgmtRowValue: { fontSize: 13, fontWeight: '500' },
  mgmtRowPk: { fontSize: 11, color: '#000' },
  mgmtFooter: { flexDirection: 'row', padding: 13, borderTopWidth: 0.5, borderTopColor: '#f3f4f6', backgroundColor: '#fafafa' },
  mgmtFootLabel: { fontSize: 10, color: '#000', textTransform: 'uppercase', letterSpacing: 0.6 },
  mgmtFootValue: { fontSize: 15, fontWeight: '500', marginTop: 2 },
  colorDot: { width: 8, height: 8, borderRadius: 2 },

  expBlock: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden', borderWidth: 0.5, borderColor: '#e5e7eb' },
  expHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13 },
  expIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  expTitle: { fontSize: 13, fontWeight: '500', color: '#000' },
  expSub: { fontSize: 11, color: '#000' },
  editLabel: { fontSize: 12, color: '#c2823a' },
  expAmt: { fontSize: 14, fontWeight: '600', marginRight: 2 },
  expChevron: { fontSize: 13, color: '#000' },
  expBody: { borderTopWidth: 0.5, borderTopColor: '#f3f4f6', padding: 13 },

  shedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6' },
  shedTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 0.5, borderTopColor: '#e5e7eb', marginTop: 4 },
  shedLabel: { fontSize: 13, color: '#000' },
  shedValue: { fontSize: 13, fontWeight: '500' },
  shedPk: { fontSize: 11, color: '#000' },

  finalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6' },
  finalTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: '#e5e7eb', marginTop: 4 },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  miniCard: { flex: 1, minWidth: '30%', backgroundColor: '#f8f7f4', borderRadius: 8, padding: 9 },
  miniLabel: { fontSize: 10, color: '#000', textTransform: 'uppercase', letterSpacing: 0.5 },
  miniValue: { fontSize: 13, fontWeight: '500', marginTop: 3 },

  chartCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: '#e5e7eb' },
  chartTitle: { fontSize: 13, fontWeight: '500', color: '#000' },
  chartSub: { fontSize: 11, color: '#000' },
  tooltip: { position: 'absolute', top: 4, left: 8, backgroundColor: '#0f172a', borderRadius: 8, padding: 8, zIndex: 10 },
  tooltipMonth: { fontSize: 12, fontWeight: '600', color: '#fff', marginBottom: 3 },
  tooltipLine: { fontSize: 11, color: '#000' },

  effGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  effCard: { width: '48%', backgroundColor: '#f8f7f4', borderRadius: 8, padding: 10 },
  effLabel: { fontSize: 10, color: '#000', textTransform: 'uppercase', letterSpacing: 0.5 },
  effValue: { fontSize: 14, fontWeight: '500', marginTop: 3 },

  prodBlock: { backgroundColor: '#f8f7f4', borderRadius: 12, padding: 13, marginBottom: 10, borderWidth: 0.5, borderColor: '#e5e7eb' },

  settingsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: '#e5e7eb' },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6' },
  settingsLabel: { fontSize: 13, color: '#000', flex: 1 },
  settingsInput: { width: 90, textAlign: 'right', borderWidth: 0.5, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 13, backgroundColor: '#f9fafb', color: '#111827' },

  donutRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 0.5, borderColor: '#e5e7eb' },
  donutHalf: { flex: 1, alignItems: 'center' },

  momCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 0.5, borderColor: '#e5e7eb' },
  momTitle: { fontSize: 14, fontWeight: '500', marginBottom: 3 },
  momSub: { fontSize: 11, color: '#000', marginBottom: 10 },

  pastCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 7, borderWidth: 0.5, borderColor: '#e5e7eb' },
  pastTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pastMonth: { fontSize: 14, fontWeight: '500', color: '#000' },
  pastSub: { fontSize: 11, color: '#000', marginTop: 2 },
  pastChevron: { fontSize: 13, color: '#000', marginTop: 2 },
  pastExpanded: { marginTop: 10, borderTopWidth: 0.5, borderTopColor: '#f3f4f6', paddingTop: 8 },
  pastRow2: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  pastMiniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  pastMiniCard: { flex: 1, minWidth: '45%', backgroundColor: '#f8f7f4', borderRadius: 8, padding: 9 },
  pastMiniLabel: { fontSize: 10, color: '#000', textTransform: 'uppercase', letterSpacing: 0.5 },
  pastMiniValue: { fontSize: 13, fontWeight: '500', marginTop: 2 },

  tableRow: { flexDirection: 'row' },
  th: { fontSize: 10, color: '#000', textTransform: 'uppercase', letterSpacing: 0.5, padding: 5, minWidth: 72, textAlign: 'right', backgroundColor: '#f9fafb', borderBottomWidth: 0.5, borderBottomColor: '#d1d5db' },
  td: { fontSize: 11, padding: 5, minWidth: 72, textAlign: 'right', borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6' },
  tdInput: { width: 72, textAlign: 'right', padding: 4, fontSize: 11, backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#e5e7eb', borderRadius: 4, color: '#000' },
  addDayBtn: { backgroundColor: '#f8f7f4', borderWidth: 0.5, borderColor: '#d1d5db', borderRadius: 10, padding: 12, alignItems: 'center', marginVertical: 10 },
  addDayText: { fontSize: 13, color: '#000' },

  footCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderWidth: 0.5, borderColor: '#e5e7eb' },
  footLabel: { fontSize: 10, color: '#000', textTransform: 'uppercase', letterSpacing: 0.7 },
  allocCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 8, borderWidth: 0.5, borderColor: '#e5e7eb' },
  allocLabel: { fontSize: 10, color: '#000', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4 },

  subBack: { fontSize: 13, color: '#c2823a', marginBottom: 14 },
  subTitle: { fontSize: 17, fontWeight: '500', marginBottom: 4, color: '#111827' },
  subDesc: { fontSize: 12, color: '#000', marginBottom: 14, lineHeight: 18 },

  errorBox: { alignItems: 'center', padding: 24 },
  errorText: { color: '#000', marginBottom: 12 },
  retryBtn: { backgroundColor: '#13879A', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  retryText: { color: '#fff', fontWeight: '600' },
});
