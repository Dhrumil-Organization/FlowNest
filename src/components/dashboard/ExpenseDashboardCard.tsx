// import React, { memo, useCallback, useEffect, useState } from 'react';
// import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import { ExpenseDashboardData, fetchExpenseDashboardCard } from '../../services/Dashboard/expenseDashboardApi';

// type Props = {
//   token:string; prptype?:string; yearno:number|string; monthno:number|string;
//   date?:string; prpcodes?:string[]|string; isConnected?:boolean|null;
//   onPress?:(data:ExpenseDashboardData)=>void;
// };

// const n = (v:unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;
// const money = (v:unknown, d=0) => `₹${n(v).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d})}`;
// const num = (v:unknown, d=0) => n(v).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d});

// const ExpenseDashboardCard:React.FC<Props> = ({
//   token, prptype='S', yearno, monthno, date, prpcodes, isConnected=true, onPress
// }) => {
//   const [data,setData] = useState<ExpenseDashboardData|null>(null);
//   const [loading,setLoading] = useState(true);
//   const [refreshing,setRefreshing] = useState(false);
//   const [error,setError] = useState('');

//   const load = useCallback(async(force=false)=>{
//     if (isConnected === false) {
//       setError('No internet connection.'); setLoading(false); setRefreshing(false); return;
//     }
//     force ? setRefreshing(true) : setLoading(true);
//     setError('');
//     try {
//       setData(await fetchExpenseDashboardCard({token,prptype,yearno,monthno,date,prpcodes,refresh:force}));
//     } catch(e) {
//       setError(e instanceof Error ? e.message : 'Unable to load production cost.');
//     } finally {
//       setLoading(false); setRefreshing(false);
//     }
//   },[token,prptype,yearno,monthno,date,prpcodes,isConnected]);

//   useEffect(()=>{ load(false); },[load]);

//   if (loading && !data) {
//     return <View style={[s.card,s.center]}><ActivityIndicator color="#7A5B24"/><Text style={s.state}>Loading production cost…</Text></View>;
//   }

//   if (error && !data) {
//     return <View style={[s.card,s.errorRow]}>
//       <Icon name="error-outline" size={22} color="#A5463D"/>
//       <View style={{flex:1,marginHorizontal:12}}>
//         <Text style={s.errorTitle}>Production cost unavailable</Text>
//         <Text style={s.errorText}>{error}</Text>
//       </View>
//       <TouchableOpacity onPress={()=>load(true)} style={s.roundBtn}><Icon name="refresh" size={20} color="#7A5B24"/></TouchableOpacity>
//     </View>;
//   }

//   if (!data) return null;
//   const {summary,period,composition,production} = data;

//   return <TouchableOpacity activeOpacity={onPress?0.92:1} disabled={!onPress} onPress={()=>onPress?.(data)} style={s.card}>
//     <View style={s.header}>
//       <View>
//         <Text style={s.eyebrow}>THIS MONTH · PRODUCTION COST</Text>
//         <View style={s.periodRow}>
//           <Text style={s.period}>{period.label}</Text>
//           {period.ongoing && <View style={s.live}><View style={s.dot}/><Text style={s.liveText}>LIVE</Text></View>}
//         </View>
//       </View>
//       <TouchableOpacity disabled={refreshing} onPress={()=>load(true)} style={s.roundBtn}>
//         {refreshing?<ActivityIndicator size="small" color="#7A5B24"/>:<Icon name="refresh" size={20} color="#7A5B24"/>}
//       </TouchableOpacity>
//     </View>

//     <View style={s.hero}>
//       <Text style={s.heroLabel}>TOTAL COST</Text>
//       <Text style={s.heroValue}>{money(summary.total_cost)}</Text>
//       <Text style={s.heroMeta}>{num(period.working_days)} working days · {num(summary.costing_looms)} costing looms</Text>
//     </View>

//     <View style={s.grid}>
//       <Metric label="Cost / Pick" value={money(summary.cost_per_pick,3)} icon="show-chart"/>
//       <Metric label="Avg Picks" value={num(summary.avg_picks,1)} icon="grain"/>
//       <Metric label="Production" value={`${num(summary.production_mtr)} m`} icon="precision-manufacturing"/>
//       <Metric label="Cost / MC·Day" value={money(summary.cost_per_machine_day,2)} icon="calendar-month"/>
//       <Metric label="Units" value={num(summary.units)} icon="electric-meter"/>
//       <Metric label="Unit Rate" value={money(summary.unit_rate,2)} icon="currency-rupee"/>
//     </View>

//     <View style={s.divider}/>
//     <View style={s.composition}>
//       <Part label="Electricity" value={composition.electricity} icon="bolt"/>
//       <Part label="Salary" value={composition.salary} icon="groups"/>
//       <Part label="Stores" value={composition.stores} icon="inventory-2"/>
//     </View>

//     <View style={s.footer}>
//       <Text style={s.footerText}>Rapier {num(production.rapier_total_mtr)} m · Waterjet {num(production.sip_waterjet_mtr)} m</Text>
//       {onPress && <Icon name="chevron-right" size={22} color="#8A8175"/>}
//     </View>
//     {!!error && <Text style={s.inlineError}>{error}</Text>}
//   </TouchableOpacity>;
// };

// const Metric = memo(({label,value,icon}:{label:string;value:string;icon:string})=>
//   <View style={s.metric}><View style={s.metricTop}><Icon name={icon} size={15} color="#8A6A2E"/><Text style={s.metricLabel}>{label}</Text></View><Text numberOfLines={1} style={s.metricValue}>{value}</Text></View>
// );
// const Part = ({label,value,icon}:{label:string;value:number;icon:string})=>
//   <View style={s.part}><View style={s.partIcon}><Icon name={icon} size={16} color="#7A5B24"/></View><Text style={s.partLabel}>{label}</Text><Text style={s.partValue}>{money(value)}</Text></View>;

// const s=StyleSheet.create({
//   card:{marginHorizontal:16,marginVertical:8,padding:16,borderRadius:22,backgroundColor:'#FFFDF9',borderWidth:1,borderColor:'#EAE2D6',shadowColor:'#332A20',shadowOffset:{width:0,height:7},shadowOpacity:.08,shadowRadius:15,elevation:4},
//   center:{minHeight:150,alignItems:'center',justifyContent:'center'},state:{marginTop:10,color:'#756C61',fontSize:13,fontWeight:'600'},
//   errorRow:{minHeight:104,flexDirection:'row',alignItems:'center'},errorTitle:{color:'#3B332B',fontSize:14,fontWeight:'800'},errorText:{marginTop:3,color:'#857A6F',fontSize:12},
//   roundBtn:{width:38,height:38,borderRadius:19,backgroundColor:'#F4EBDD',alignItems:'center',justifyContent:'center'},
//   header:{flexDirection:'row',justifyContent:'space-between'},eyebrow:{color:'#8A6A2E',fontSize:10,letterSpacing:1.3,fontWeight:'800'},
//   periodRow:{marginTop:5,flexDirection:'row',alignItems:'center'},period:{color:'#2B2723',fontSize:17,fontWeight:'800'},
//   live:{marginLeft:8,paddingHorizontal:7,paddingVertical:3,borderRadius:10,flexDirection:'row',alignItems:'center',backgroundColor:'#EDF5EA'},
//   dot:{width:6,height:6,marginRight:4,borderRadius:3,backgroundColor:'#5C8A4B'},liveText:{color:'#527943',fontSize:9,fontWeight:'900'},
//   hero:{marginTop:18,padding:16,borderRadius:17,backgroundColor:'#292622'},heroLabel:{color:'#BEB4A7',fontSize:10,letterSpacing:1.2,fontWeight:'800'},
//   heroValue:{marginTop:5,color:'#FFF',fontSize:29,fontWeight:'900'},heroMeta:{marginTop:6,color:'#CFC6BB',fontSize:11,fontWeight:'600'},
//   grid:{marginTop:12,flexDirection:'row',flexWrap:'wrap',marginHorizontal:-4},metric:{width:'50%',padding:4},metricTop:{flexDirection:'row',alignItems:'center'},
//   metricLabel:{marginLeft:5,color:'#82786D',fontSize:11,fontWeight:'700'},metricValue:{marginTop:5,color:'#342E28',fontSize:16,fontWeight:'800'},
//   divider:{height:1,marginVertical:14,backgroundColor:'#ECE5DB'},composition:{flexDirection:'row'},part:{flex:1,alignItems:'center'},
//   partIcon:{width:29,height:29,borderRadius:15,backgroundColor:'#F4EBDD',alignItems:'center',justifyContent:'center'},
//   partLabel:{marginTop:6,color:'#877C70',fontSize:10,fontWeight:'700'},partValue:{marginTop:3,color:'#37312B',fontSize:12,fontWeight:'800'},
//   footer:{marginTop:15,paddingTop:12,borderTopWidth:1,borderTopColor:'#EFE8DF',flexDirection:'row',alignItems:'center'},
//   footerText:{flex:1,color:'#756B60',fontSize:11,fontWeight:'600'},inlineError:{marginTop:10,color:'#A5463D',fontSize:10},
// });

// export default memo(ExpenseDashboardCard);

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {
  ExpenseDashboardData,
  fetchExpenseDashboardCard,
} from '../../services/Dashboard/expenseDashboardApi';
import { formatDashboardAmount, useDashboardAmountMode } from './AmountDisplayModeControl';

type Props = {
  token: string;
  prptype?: string;
  yearno: number | string;
  monthno: number | string;
  date?: string;
  prpcodes?: string[] | string;
  isConnected?: boolean | null;
  onPress?: (data: ExpenseDashboardData) => void;
};

const numberValue = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCompactMoney = (value: unknown): string => {
  const amount = numberValue(value);
  const absolute = Math.abs(amount);

  if (absolute >= 10_000_000) {
    return `₹${(amount / 10_000_000).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Cr`;
  }

  if (absolute >= 100_000) {
    return `₹${(amount / 100_000).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} L`;
  }

  if (absolute >= 1_000) {
    return `₹${(amount / 1_000).toLocaleString('en-IN', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} K`;
  }

  return `₹${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
};

const formatMoney = (value: unknown, digits = 0): string =>
  `₹${numberValue(value).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;

const formatNumber = (value: unknown, digits = 0): string =>
  numberValue(value).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const formatMetres = (value: unknown): string => {
  const metres = numberValue(value);
  const absolute = Math.abs(metres);

  if (absolute >= 100_000) {
    return `${(metres / 100_000).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} L m`;
  }

  if (absolute >= 1_000) {
    return `${(metres / 1_000).toLocaleString('en-IN', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} K m`;
  }

  return `${metres.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })} m`;
};

const formatYmdShort = (value: unknown): string => {
  const raw = String(value ?? '').replace(/\D/g, '');
  if (raw.length !== 8) return '';

  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6));
  const day = Number(raw.slice(6, 8));
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
};

const RING_SIZE = 126;
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type RingSegment = {
  value: number;
  color: string;
};

const CostRing = memo(
  ({
    total,
    periodLabel,
    segments,
    amountMode,
  }: {
    total: number;
    periodLabel: string;
    segments: RingSegment[];
    amountMode: 'compact' | 'actual';
  }) => {
    const safeTotal = total > 0 ? total : 1;
    let cumulative = 0;

    return (
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke="#EFE8DF"
            strokeWidth={RING_STROKE}
            fill="none"
          />

          {segments.map((segment, index) => {
            const fraction = Math.max(0, segment.value) / safeTotal;
            const dash = Math.min(RING_CIRCUMFERENCE, fraction * RING_CIRCUMFERENCE);
            const offset = -cumulative * RING_CIRCUMFERENCE;
            cumulative += fraction;

            if (dash <= 0) {
              return null;
            }

            return (
              <Circle
                key={`${segment.color}-${index}`}
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={segment.color}
                strokeWidth={RING_STROKE}
                strokeLinecap="butt"
                strokeDasharray={`${dash} ${RING_CIRCUMFERENCE - dash}`}
                strokeDashoffset={offset}
                fill="none"
                rotation="-90"
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            );
          })}
        </Svg>

        <View pointerEvents="none" style={styles.ringCenter}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.ringValue}>
            {formatDashboardAmount(total, amountMode)}
          </Text>
          <Text numberOfLines={1} style={styles.ringPeriod}>
            {periodLabel}
          </Text>
        </View>
      </View>
    );
  },
);

const ExpenseDashboardCard: React.FC<Props> = ({
  token,
  prptype = 'S',
  yearno,
  monthno,
  date,
  prpcodes,
  isConnected = true,
  onPress,
}) => {
  const [data, setData] = useState<ExpenseDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const { mode: amountMode } = useDashboardAmountMode();

  const load = useCallback(
    async (force = false) => {
      if (isConnected === false) {
        setError('No internet connection.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      force ? setRefreshing(true) : setLoading(true);
      setError('');

      try {
        const response = await fetchExpenseDashboardCard({
          token,
          prptype,
          yearno,
          monthno,
          date,
          prpcodes,
          refresh: force,
        });

        setData(response);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load production cost.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, prptype, yearno, monthno, date, prpcodes, isConnected],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const ringSegments = useMemo<RingSegment[]>(() => {
    if (!data) {
      return [];
    }

    const total = Math.max(0, numberValue(data.summary.total_cost));
    const electricity = Math.max(0, numberValue(data.composition.electricity));
    const salary = Math.max(0, numberValue(data.composition.salary));
    const stores = Math.max(0, numberValue(data.composition.stores));
    const used = electricity + salary + stores;
    const other = Math.max(0, total - used);

    return [
      { value: electricity, color: '#C96E16' },
      { value: salary, color: '#355D94' },
      { value: stores, color: '#607A62' },
      { value: other, color: '#A84C08' },
    ];
  }, [data]);

  if (loading && !data) {
    return (
      <View style={[styles.card, styles.stateCard]}>
        <ActivityIndicator color="#C96E16" />
        <Text style={styles.stateText}>Loading production cost…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.card, styles.errorRow]}>
        <Icon name="error-outline" size={22} color="#A5463D" />
        <View style={styles.errorCopy}>
          <Text style={styles.errorTitle}>Production cost unavailable</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Retry production cost"
          onPress={() => void load(true)}
          style={styles.retryButton}
        >
          <Icon name="refresh" size={20} color="#C96E16" />
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return null;
  }

  const { summary, period } = data;
  const pendingExpenses = Array.isArray(period.pending_expenses)
    ? period.pending_expenses
    : [];
  const coverageIncomplete = pendingExpenses.length > 0;
  const coverageEnd = period.complete_through_ymd || period.upto_date_ymd;
  const requestedEnd = period.requested_upto_ymd || period.upto_date_ymd;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.92 : 1}
      disabled={!onPress}
      onPress={() => onPress?.(data)}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>THIS MONTH · PRODUCTION COST</Text>
          <Text style={styles.periodLine}>
            {period.label}
            {period.ongoing ? ' · LIVE' : ''}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={onPress ? 'Open full production cost report' : 'Refresh'}
          disabled={refreshing}
          onPress={(event) => {
            event.stopPropagation();

            if (onPress) {
              onPress(data);
              return;
            }

            void load(true);
          }}
          style={styles.fullReportButton}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#C96E16" />
          ) : (
            <>
              <Text style={styles.fullReportText}>
                {onPress ? 'Full report' : 'Refresh'}
              </Text>
              <Icon
                name={onPress ? 'chevron-right' : 'refresh'}
                size={16}
                color="#C96E16"
              />
            </>
          )}
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.coverageBox,
          coverageIncomplete ? styles.coverageWarn : styles.coverageOk,
        ]}
      >
        <View style={styles.coverageCopy}>
          <Text style={styles.coverageTitle}>
            {coverageIncomplete ? 'Expense data complete through' : 'Expense data entered through'}{' '}
            {formatYmdShort(coverageEnd) || period.label}
          </Text>
          <Text style={styles.coverageText}>
            {period.display_range || `${formatYmdShort(period.month_start_ymd)} – ${formatYmdShort(coverageEnd)}`}
          </Text>
          {coverageIncomplete ? (
            <View style={styles.coveragePendingList}>
              {pendingExpenses.map((item, index) => {
                const lastEntered = item?.last_entered_ymd
                  ? formatYmdShort(item.last_entered_ymd)
                  : '';
                const pendingFrom = formatYmdShort(item?.pending_from_ymd);
                const pendingTo = formatYmdShort(item?.pending_to_ymd || requestedEnd);
                const days = Number(item?.pending_days || 0);

                return (
                  <Text
                    key={`${String(item?.key || item?.label || 'expense')}-${index}`}
                    style={styles.coveragePending}
                  >
                    {String(item?.label || 'Expense')}: {' '}
                    {lastEntered ? `entered through ${lastEntered}` : 'no entry this month'}
                    {pendingFrom && pendingTo
                      ? ` · pending ${pendingFrom}–${pendingTo}${days > 0 ? ` (${days}d)` : ''}`
                      : ''}
                  </Text>
                );
              })}
            </View>
          ) : null}
        </View>
        <Icon
          name={coverageIncomplete ? 'schedule' : 'check-circle'}
          size={20}
          color={coverageIncomplete ? '#B86A16' : '#2F855A'}
        />
      </View>

      <View style={styles.contentRow}>
        <CostRing
          total={numberValue(summary.total_cost)}
          periodLabel={period.label}
          segments={ringSegments}
          amountMode={amountMode}
        />

        <View style={styles.metricsArea}>
          <View style={styles.metricsColumn}>
            <CompactMetric
              label="COST / PICK"
              value={formatDashboardAmount(summary.cost_per_pick, amountMode, undefined, 3)}
              accent
            />
            <CompactMetric
              label="PRODUCTION"
              value={formatMetres(summary.production_mtr)}
            />
          </View>

          <View style={styles.metricsColumn}>
            <CompactMetric
              label="AVG PICKS"
              value={formatNumber(summary.avg_picks, 1)}
            />
            <CompactMetric
              label="COST / MC-DAY"
              value={formatDashboardAmount(summary.cost_per_machine_day, amountMode, undefined, 2)}
            />
          </View>
        </View>
      </View>

      {!!error && <Text style={styles.inlineError}>{error}</Text>}
    </TouchableOpacity>
  );
};

const CompactMetric = memo(
  ({
    label,
    value,
    accent = false,
  }: {
    label: string;
    value: string;
    accent?: boolean;
  }) => (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.metricValue, accent && styles.metricValueAccent]}
      >
        {value}
      </Text>
    </View>
  ),
);

const styles = StyleSheet.create({
  card: {
    // marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 16,
    borderRadius: 22,
    backgroundColor: '#FFFEFC',
    borderWidth: 1,
    borderColor: '#E8E0D6',
    borderLeftWidth: 4,
    borderLeftColor: '#CF7423',
    shadowColor: '#31271E',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 11,
    elevation: 3,
  },
  stateCard: {
    minHeight: 154,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    marginTop: 10,
    color: '#756C61',
    fontSize: 13,
    fontWeight: '600',
  },
  errorRow: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorCopy: {
    flex: 1,
    marginHorizontal: 12,
  },
  errorTitle: {
    color: '#3B332B',
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    marginTop: 3,
    color: '#857A6F',
    fontSize: 12,
  },
  retryButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5ECE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    paddingRight: 10,
  },
  eyebrow: {
    color: '#8A8177',
    fontSize: 10,
    letterSpacing: 1.15,
    fontWeight: '900',
  },
  periodLine: {
    marginTop: 4,
    color: '#8E857A',
    fontSize: 11,
    fontWeight: '700',
  },
  fullReportButton: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  fullReportText: {
    color: '#C96E16',
    fontSize: 11,
    fontWeight: '900',
  },
  coverageBox: {
    marginTop: 11,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  coverageOk: {
    backgroundColor: '#F0F8F3',
    borderColor: '#CBE5D3',
  },
  coverageWarn: {
    backgroundColor: '#FFF7EB',
    borderColor: '#EBCB9E',
  },
  coverageCopy: {
    flex: 1,
    paddingRight: 10,
  },
  coverageTitle: {
    color: '#3B332B',
    fontSize: 11,
    fontWeight: '900',
  },
  coverageText: {
    marginTop: 2,
    color: '#756C61',
    fontSize: 10,
    fontWeight: '700',
  },
  coveragePendingList: {
    marginTop: 4,
  },
  coveragePending: {
    marginTop: 2,
    color: '#A75D13',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
  },
  contentRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    left: RING_STROKE + 6,
    right: RING_STROKE + 6,
    top: RING_STROKE + 12,
    bottom: RING_STROKE + 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    width: '100%',
    textAlign: 'center',
    color: '#171A1F',
    fontSize: 17,
    fontWeight: '900',
  },
  ringPeriod: {
    marginTop: 2,
    color: '#A0978D',
    fontSize: 8,
    fontWeight: '700',
  },
  metricsArea: {
    flex: 1,
    marginLeft: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricsColumn: {
    flex: 1,
  },
  metric: {
    minHeight: 53,
    justifyContent: 'center',
    paddingRight: 5,
  },
  metricLabel: {
    color: '#8B8379',
    fontSize: 9,
    letterSpacing: 0.65,
    fontWeight: '900',
  },
  metricValue: {
    marginTop: 5,
    color: '#151A22',
    fontSize: 16,
    fontWeight: '900',
  },
  metricValueAccent: {
    color: '#C96E16',
  },
  inlineError: {
    marginTop: 8,
    color: '#A5463D',
    fontSize: 10,
  },
});

export default memo(ExpenseDashboardCard);
