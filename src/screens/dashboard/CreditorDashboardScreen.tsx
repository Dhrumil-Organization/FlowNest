import { SubScreenHeader } from '@/src/components/layout/SubScreenHeader';
import { T } from '@/src/theme';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, formatAmountActual, formatAmountShort } from './employ/api/api';

const one = (v: any) => Array.isArray(v) ? v[0] : (v || '');
const n = (v: any) => Number(v || 0);
const qty = (v: any) => Math.max(0, n(v)).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const ymOfDisplay = (d: any) => {
  const m = String(d || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}${m[2]}` : '';
};
const monthName = (ym: string) => {
  if (!/^\d{6}$/.test(ym)) return ym;
  return new Date(Number(ym.slice(0,4)), Number(ym.slice(4,6))-1, 1)
    .toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

function Chip({label, active, onPress, disabled=false}: any) {
  return <TouchableOpacity disabled={disabled} onPress={onPress}
    style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>;
}
function Chips({children}: any) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.chips}>{children}</ScrollView>;
}
function Metric({label,value,light=false}: any) {
  return <View style={styles.metric}>
    <Text style={[styles.metricLabel,light&&styles.metricLabelLight]}>{label}</Text>
    <Text numberOfLines={1} style={[styles.metricValue,light&&styles.metricValueLight]}>{value}</Text>
  </View>;
}
function Section({title,subtitle,children}: any) {
  return <View style={styles.card}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    {children}
  </View>;
}
function Empty({text='No records for this selection.'}: any) {
  return <Text style={styles.empty}>{text}</Text>;
}
function LoadingRow() {
  return <View style={styles.inlineLoading}><ActivityIndicator size="small" color={T.nav}/><Text style={styles.muted}>Loading detail…</Text></View>;
}

const rateMonthLabel=(value:any)=>{
  const m=String(value||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!m) return String(value||'—');
  const names=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[Math.max(0,Math.min(11,Number(m[2])-1))]} ${m[3].slice(2)}`;
};

function LatestRateChart({detail,money}:any) {
  const rows=(Array.isArray(detail?.transactions)?detail.transactions:[]).slice(0,5).reverse();
  if(!rows.length) return <Empty text="No rate history for this item."/>;

  const rates=rows.map((r:any)=>n(r?.unit_rate));
  const min=Math.min(...rates), max=Math.max(...rates), span=max-min;
  const points=rows.map((r:any)=>({
    ...r,_rate:n(r?.unit_rate),
    _height:span===0?55:22+((n(r?.unit_rate)-min)/span)*68,
    _month:rateMonthLabel(r?.date),
  }));

  return <View style={styles.rateChartCard}>
    <View style={styles.rateChartHeader}>
      <View style={{flex:1}}>
        <Text style={styles.rateChartTitle}>Latest Rate Comparison · Item {detail?.item_code}</Text>
        <Text style={styles.rateChartSubtitle}>Last {points.length} actual rates · oldest → newest</Text>
      </View>
      <View style={styles.rateLatest}>
        <Text style={styles.rateLatestLabel}>LATEST</Text>
        <Text style={styles.rateLatestValue}>{money(detail?.latest_rate)}</Text>
      </View>
    </View>
    <View style={styles.ratePlot}>
      {points.map((pt:any,i:number)=><View key={`${pt.uid}-${pt.sr_no}-${i}`} style={styles.ratePoint}>
        <Text style={styles.rateValue}>{money(pt._rate)}</Text>
        <View style={styles.rateTrack}><View style={[styles.rateBar,{height:`${pt._height}%`}]} /></View>
        <Text style={styles.rateMonth}>{pt._month}</Text>
        <Text style={styles.rateRef} numberOfLines={1}>{pt.bill_no||pt.inward_no||'—'}</Text>
      </View>)}
    </View>
    <View style={styles.rateFooter}>
      <Text style={styles.rateFooterText}>Previous {money(detail?.previous_rate)}</Text>
      <Text style={styles.rateFooterText}>Change {n(detail?.change)>=0?'+':''}{money(detail?.change)}
        {detail?.change_percent!==null&&detail?.change_percent!==undefined
          ? ` · ${n(detail.change_percent)>=0?'+':''}${n(detail.change_percent).toFixed(2)}%`:''}</Text>
    </View>
  </View>;
}

export default function CreditorDashboardScreen() {
  const params = useLocalSearchParams();
  const prptype = one(params.prptype) || 'S';
  const partycode = one(params.partycode);
  const partyname = one(params.partyname) || `Party ${partycode}`;
  const date = one(params.date) || new Date().toISOString().slice(0,10);

  const [data,setData] = useState<any>(null);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [error,setError] = useState('');
  const [amountMode,setAmountMode] = useState<'actual'|'compact'>('compact');

  const [paymentMode,setPaymentMode] = useState<'summary'|'payments'>('summary');
  const [paymentRows,setPaymentRows] = useState<any[]|null>(null);
  const [settlements,setSettlements] = useState<any[]|null>(null);
  const [paymentFilter,setPaymentFilter] = useState<'all'|'cleared'|'to_clear'|'on_account'>('all');
  const [expandedPayment,setExpandedPayment] = useState('');

  const [poMode,setPoMode] = useState<'month'|'item'>('month');
  const [poAnalytics,setPoAnalytics] = useState<any>(null);
  const [poRows,setPoRows] = useState<any[]|null>(null);
  const [poMonth,setPoMonth] = useState('');
  const [poStore,setPoStore] = useState('ALL');

  const [purchaseMode,setPurchaseMode] = useState<'month'|'item'>('month');
  const [dateBasis,setDateBasis] = useState<'inward_date'|'bill_date'>('inward_date');
  const [purchaseRows,setPurchaseRows] = useState<any[]|null>(null);
  const [purchaseAnalytics,setPurchaseAnalytics] = useState<any>(null);
  const [purchaseMonth,setPurchaseMonth] = useState('');
  const [purchaseStore,setPurchaseStore] = useState('ALL');
  const [rateDetail,setRateDetail] = useState<any>(null);
  const [detailLoading,setDetailLoading] = useState('');

  const money = useCallback((v:any) =>
    amountMode === 'actual' ? formatAmountActual(n(v)) : formatAmountShort(n(v)),
    [amountMode]);

  const load = useCallback(async(refresh=false)=>{
    if(!partycode){ setError('Party code is missing.'); setLoading(false); return; }
    try{
      refresh ? setRefreshing(true) : setLoading(true);
      setError('');
      const r=await api.getCreditorDashboardSummary(prptype,partycode,date,{dateBasis});
      if(!r?.success) throw new Error('Unable to load creditor dashboard.');
      setData(r.data);
    }catch(e:any){ setError(e?.message||'Unable to load creditor dashboard.'); }
    finally{ setLoading(false); setRefreshing(false); }
  },[date,dateBasis,partycode,prptype]);

  useEffect(()=>{ void load(false); },[load]);

  const position=data?.creditor_position||{}, finalPosition=position?.final||{};
  const opening=position?.opening||{}, currentFy=position?.current_fy||{};
  const outstanding=data?.outstanding?.summary||{}, payment=data?.payment?.summary||{};
  const po=data?.purchase_order||{}, months=data?.purchase?.last_6_months||[];
  const sixMonthPurchase=useMemo(()=>months.reduce((s:number,r:any)=>s+n(r?.value),0),[months]);

  const monthKeys=useMemo(()=>months.map((m:any)=>String(m.ym)),[months]);

  const ensurePayments=async()=>{
    setPaymentMode('payments');
    try{
      setDetailLoading('payment');
      if(paymentRows===null){
        const r=await api.getCreditorPayments(prptype,partycode,date,500);
        setPaymentRows(r?.success ? (r.data||[]) : []);
      }
    }finally{ setDetailLoading(''); }
  };

  const paymentKey=(r:any)=>`${String(r?.prpcode||'')}-${String(r?.payment_uid||'')}-${String(r?.payment_srno||'')}`;

  const filteredPayments=useMemo(()=> (paymentRows||[]).filter((r:any)=>{
    const clearStatus=String(r?.clear_status||'').trim().toUpperCase();
    if(paymentFilter==='cleared') return clearStatus==='CLEARED';
    if(paymentFilter==='to_clear') return clearStatus==='TO CLEAR' || clearStatus==='TO_CLEAR';
    if(paymentFilter==='on_account') return n(r?.on_account_amount)>0;
    return true;
  }),[paymentRows,paymentFilter]);

  const togglePaymentAllocation=async(r:any)=>{
    const key=paymentKey(r);
    if(expandedPayment===key){
      setExpandedPayment('');
      return;
    }
    setExpandedPayment(key);
    if(!r?.has_d2_allocation || settlements!==null) return;
    try{
      setDetailLoading('settlement');
      const x=await api.getCreditorPaymentSettlements(prptype,partycode,date,500);
      setSettlements(x?.success ? (x.data||[]) : []);
    }finally{ setDetailLoading(''); }
  };

  const ensurePO=async()=>{
    try{
      setDetailLoading('po');
      const [a,p]=await Promise.all([
        poAnalytics ? Promise.resolve({success:true,data:poAnalytics}) : api.getCreditorPurchaseOrderAnalytics(prptype,partycode,date),
        poRows ? Promise.resolve({success:true,data:poRows}) : api.getCreditorPendingPurchaseOrders(prptype,partycode,date,500),
      ]);
      if(a?.success) setPoAnalytics(a.data||{});
      if(p?.success) setPoRows(p.data||[]);
    }finally{ setDetailLoading(''); }
  };

  const purchaseMonthRange=(ym:string)=>{
    if(!ym || !/^\d{6}$/.test(ym)) return {fromdate:null,todate:null};
    const y=Number(ym.slice(0,4)), m=Number(ym.slice(4,6));
    const lastDay=new Date(y,m,0).getDate();
    const fromdate=Number(`${ym}01`);
    const monthEnd=Number(`${ym}${String(lastDay).padStart(2,'0')}`);
    const asOn=Number(String(date||'').replace(/\D/g,'').slice(0,8));
    return {fromdate,todate:asOn>=fromdate&&asOn<monthEnd?asOn:monthEnd};
  };

  const ensurePurchases=async(
    monthOverride?:string,
    basisOverride?:'inward_date'|'bill_date'
  )=>{
    const ym=monthOverride!==undefined ? monthOverride : purchaseMonth;
    const basis=basisOverride!==undefined ? basisOverride : dateBasis;
    const range=purchaseMonthRange(ym);
    try{
      setDetailLoading('purchase');
      const [a,t]=await Promise.all([
        api.getCreditorPurchaseAnalytics(prptype,partycode,date,basis,range.fromdate,range.todate),
        api.getCreditorPurchaseTransactions(
          prptype,partycode,date,basis,basis==='bill_date'?'bill_no':'inward_no',500
        ),
      ]);
      setPurchaseAnalytics(a?.success?a.data||{}:{});
      setPurchaseRows(t?.success?t.data||[]:[]);
    }finally{ setDetailLoading(''); }
  };

  const changePurchaseDateBasis=(
    nextBasis:'inward_date'|'bill_date'
  )=>{
    if(nextBasis===dateBasis) return;

    // Keep the user's selected month, but immediately recalculate the
    // drill-down with the NEW basis. Passing nextBasis explicitly avoids
    // React's asynchronous setState/stale-closure problem.
    setDateBasis(nextBasis);
    setPurchaseStore('ALL');
    setRateDetail(null);

    if(purchaseMonth || purchaseRows!==null || purchaseAnalytics!==null){
      void ensurePurchases(purchaseMonth,nextBasis);
    }else{
      setPurchaseRows(null);
      setPurchaseAnalytics(null);
    }
  };

  const poStores=useMemo(()=>{
    const rows=poAnalytics?.store_wise||[];
    return Array.from(new Set(rows.map((r:any)=>String(r.store_code||'')).filter(Boolean))) as string[];
  },[poAnalytics]);
  const purchaseStores=useMemo(()=>{
    const rows=purchaseAnalytics?.store_wise||[];
    return Array.from(new Set(rows.map((r:any)=>String(r.store_code||'')).filter(Boolean))) as string[];
  },[purchaseAnalytics]);

  const filteredPO=useMemo(()=> (poRows||[]).filter((r:any)=>{
    const okStore=poStore==='ALL'||String(r.store_code)===poStore;
    const ym=ymOfDisplay(r.po_date);
    const okMonth=!poMonth||ym===poMonth;
    return okStore&&okMonth;
  }),[poRows,poStore,poMonth]);

  const filteredPurchases=useMemo(()=> (purchaseRows||[]).filter((r:any)=>{
    const d=dateBasis==='bill_date'?r.bill_date:r.inward_date;
    return !purchaseMonth||ymOfDisplay(d)===purchaseMonth;
  }),[purchaseRows,purchaseMonth,dateBasis]);

  if(loading&&!data) return <View style={styles.root}><SubScreenHeader backLabel="Back" title="Creditor Dashboard"/>
    <View style={styles.center}><ActivityIndicator size="large" color={T.nav}/><Text style={styles.muted}>Loading creditor position…</Text></View></View>;

  return <View style={styles.root}>
    <SubScreenHeader backLabel="Back" title="Creditor Dashboard"/>
    <SafeAreaView style={styles.safe} edges={['bottom','left','right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void load(true)} tintColor={T.nav}/>}>
        <View style={styles.partyCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{partyname.trim().slice(0,1).toUpperCase()}</Text></View>
          <View style={styles.partyInfo}>
            <Text style={styles.partyName}>{partyname}</Text>
            <Text style={styles.partyMeta}>Code {partycode} · As on {position?.as_on_date||data?.context?.as_on_date||date}</Text>
            <Text style={styles.partyMeta}>Properties {(data?.context?.prpcodes||[]).join(', ')||'—'}</Text>
          </View>
          <View style={styles.amountToggle}>
            <Chip label="₹ Full" active={amountMode==='actual'} onPress={()=>setAmountMode('actual')}/>
            <Chip label="₹ Compact" active={amountMode==='compact'} onPress={()=>setAmountMode('compact')}/>
          </View>
        </View>

        {!!error && <TouchableOpacity style={styles.errorCard} onPress={()=>void load(false)}>
          <Text style={styles.errorTitle}>Could not refresh dashboard</Text><Text style={styles.muted}>{error} Tap to retry.</Text>
        </TouchableOpacity>}

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>NET PAYABLE</Text>
          <Text style={styles.heroAmount}>{money(finalPosition.net_payable_amount)}</Text>
          <Text style={styles.heroHint}>Final accounting position as on selected date</Text>
          <View style={styles.heroDivider}/>
          <View style={styles.metricRow}><Metric label="TOTAL BILLS" value={money(finalPosition.bill_amount)} light/>
            <Metric label="ON ACCOUNT" value={money(finalPosition.on_account_amount)} light/></View>
          <View style={styles.positionStrip}><Text style={styles.positionText}>Opening {money(opening.net_amount)}</Text>
            <Text style={styles.positionDot}>•</Text><Text style={styles.positionText}>Current FY {money(currentFy.net_amount)}</Text></View>
        </View>

        <Section title="Outstanding / Payables" subtitle="Accounting drill-down by payable source">
          <Chips><Chip label="Purchase" active onPress={()=>{}}/><Chip label="Jobwork" disabled/><Chip label="Other" disabled/></Chips>
          <View style={styles.bigRow}><View><Text style={styles.bigAmount}>{money(outstanding.outstanding_amount)}</Text>
            <Text style={styles.muted}>{n(outstanding.bill_count)} open purchase bills</Text></View>
            <Text style={styles.sourceNote}>Jobwork/other sources appear only after backend source validation</Text></View>
          {(data?.outstanding?.ageing||[]).filter((r:any)=>n(r.outstanding_amount)>0).map((r:any)=>
            <View key={r.key} style={styles.lineRow}><Text style={styles.lineLabel}>{r.label} days</Text><Text style={styles.lineValue}>{money(r.outstanding_amount)}</Text></View>)}
        </Section>

        <Section title="Payments" subtitle="Payment activity, clearing and bill allocation">
          <View style={styles.metricRow}><Metric label="PAID" value={money(payment.payment_amount)}/><Metric label="CLEARED" value={money(payment.cleared_amount)}/></View>
          <View style={styles.metricRow}><Metric label="ON ACCOUNT" value={money(payment.on_account_amount)}/><Metric label="TO CLEAR" value={money(payment.to_clear_amount)}/></View>
          <Chips><Chip label="Summary" active={paymentMode==='summary'} onPress={()=>setPaymentMode('summary')}/>
            <Chip label="Payments" active={paymentMode==='payments'} onPress={()=>void ensurePayments()}/></Chips>
          {detailLoading==='payment' && <LoadingRow/>}
          {paymentMode==='summary' && <>
            <View style={styles.lineRow}><Text style={styles.lineLabel}>Adjusted to bills</Text><Text style={styles.lineValue}>{money(payment.allocated_amount)}</Text></View>
            <View style={styles.lineRow}><Text style={styles.lineLabel}>Unadjusted / on account</Text><Text style={styles.lineValue}>{n(payment.unadjusted_count)} payments</Text></View></>}
          {paymentMode==='payments' && <>
            <Text style={styles.controlLabel}>FILTER</Text>
            <Chips>
              <Chip label="All" active={paymentFilter==='all'} onPress={()=>setPaymentFilter('all')}/>
              <Chip label="Cleared" active={paymentFilter==='cleared'} onPress={()=>setPaymentFilter('cleared')}/>
              <Chip label="To Clear" active={paymentFilter==='to_clear'} onPress={()=>setPaymentFilter('to_clear')}/>
              <Chip label="On Account" active={paymentFilter==='on_account'} onPress={()=>setPaymentFilter('on_account')}/>
            </Chips>
            <View style={styles.paymentListFrame}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator contentContainerStyle={styles.paymentListContent}>
                {filteredPayments.length===0 ? <Empty text="No payments for this filter."/> : filteredPayments.map((r:any)=>{
                  const key=paymentKey(r);
                  const expanded=expandedPayment===key;
                  const allocations=(settlements||[]).filter((s:any)=>
                    String(s?.prpcode||'')===String(r?.prpcode||'') &&
                    String(s?.payment_uid||'')===String(r?.payment_uid||'') &&
                    String(s?.payment_srno||'')===String(r?.payment_srno||'')
                  );
                  return <View key={key} style={styles.paymentItem}>
                    <TouchableOpacity style={styles.paymentRow} activeOpacity={r?.has_d2_allocation?0.7:1}
                      onPress={()=>r?.has_d2_allocation ? void togglePaymentAllocation(r) : undefined}>
                      <View style={styles.detailMain}>
                        <Text style={styles.detailTitle}>{r.voucher_no||'Payment'} · {r.entry_date||''}</Text>
                        <Text style={styles.detailMeta}>
                          Sr {r.payment_srno||'—'}
                          {r.cheque_no ? ` · Ref ${r.cheque_no}` : ''}
                        </Text>
                        <Text style={styles.detailMeta}>{r.clear_status||''} · {r.adjustment_status||''}</Text>
                        {!!r?.clear_status && String(r.clear_status).trim().toUpperCase()==='CLEARED' && r?.clear_date
                          ? <Text style={styles.paymentDateMeta}>Cleared {r.clear_date}</Text>
                          : r?.cheque_date
                            ? <Text style={styles.paymentDateMeta}>Cheque date {r.cheque_date}</Text>
                            : null}
                        {r?.has_d2_allocation
                          ? <Text style={styles.allocationLink}>{expanded?'Hide bill allocation':'View bill allocation ›'}</Text>
                          : n(r?.on_account_amount)>0
                            ? <Text style={styles.onAccountText}>On Account {money(r.on_account_amount)}</Text>
                            : null}
                      </View>
                      <View style={styles.detailRight}>
                        <Text style={styles.detailAmount}>{money(r.amount)}</Text>
                        {n(r?.on_account_amount)>0 && r?.has_d2_allocation
                          ? <Text style={styles.detailMeta}>On acct {money(r.on_account_amount)}</Text>
                          : null}
                      </View>
                    </TouchableOpacity>
                    {expanded && <View style={styles.allocationBox}>
                      <Text style={styles.allocationHeading}>ADJUSTED AGAINST</Text>
                      {detailLoading==='settlement' && settlements===null ? <LoadingRow/> :
                        allocations.length===0 ? <Empty text="No bill-allocation rows returned for this payment."/> :
                        allocations.map((s:any)=><View key={`${key}-${s.settlement_subsr}`} style={styles.allocationRow}>
                          <View style={styles.detailMain}>
                            <Text style={styles.detailTitle}>{s.bill_no||s.source_key||'Bill'}</Text>
                            <Text style={styles.detailMeta}>{s.bill_date||'—'} · {s.source_type==='BROUGHT_FORWARD_OUTSTANDING'?'Brought forward':'Current FY'}</Text>
                          </View>
                          <Text style={styles.detailAmount}>{money(s.settled_amount)}</Text>
                        </View>)}
                    </View>}
                  </View>;
                })}
              </ScrollView>
            </View>
            <Text style={styles.listHint}>{filteredPayments.length} payment{filteredPayments.length===1?'':'s'} · scroll inside this card</Text>
          </>}
        </Section>

        <Section title="Purchase Orders" subtitle="Month, store and item analysis · negative pending is displayed as zero">
          <View style={styles.metricRow}><Metric label="ORDERED QTY" value={qty(po.ordered_qty)}/><Metric label="RECEIVED QTY" value={qty(po.received_qty)}/></View>
          <View style={styles.metricRow}><Metric label="PENDING QTY" value={qty(po.pending_qty)}/><Metric label="PENDING VALUE" value={money(po.pending_value)}/></View>
          <Chips><Chip label="Month" active={poMode==='month'} onPress={()=>{setPoMode('month');void ensurePO();}}/>
            <Chip label="Itemwise" active={poMode==='item'} onPress={()=>{setPoMode('item');void ensurePO();}}/></Chips>
          {poAnalytics && <><Text style={styles.controlLabel}>STORE</Text><Chips>
            <Chip label="All" active={poStore==='ALL'} onPress={()=>setPoStore('ALL')}/>
            {poStores.map(s=><Chip key={s} label={prptype==='S'&&s==='002'?'Yarn · 002':prptype==='S'&&s==='012'?'Grey · 012':s}
              active={poStore===s} onPress={()=>setPoStore(s)}/>)}</Chips></>}
          {poMode==='month' && poAnalytics && <><Text style={styles.controlLabel}>MONTH</Text><Chips>
            <Chip label="All" active={!poMonth} onPress={()=>setPoMonth('')}/>
            {monthKeys.map(ym=><Chip key={ym} label={monthName(ym)} active={poMonth===ym} onPress={()=>setPoMonth(ym)}/>)}</Chips>
            <View style={styles.sectionListFrame}><ScrollView nestedScrollEnabled showsVerticalScrollIndicator contentContainerStyle={styles.sectionListContent}>
              {filteredPO.length===0?<Empty/>:filteredPO.map((r:any)=>
                <View key={`${r.uid}-${r.sr_no}`} style={styles.detailRow}>
                  <View style={styles.detailMain}><Text style={styles.detailTitle}>{r.po_no} · {r.po_date}</Text>
                    <Text style={styles.detailMeta}>Store {r.store_code} · Item {r.item_code} · Rate {money(r.unit_rate)}</Text></View>
                  <View style={styles.detailRight}><Text style={styles.detailAmount}>Pending {qty(r.pending_qty)}</Text>
                    <Text style={styles.detailMeta}>Order {qty(r.ordered_qty)} · Rec {qty(r.received_qty)}</Text></View>
                </View>)}
            </ScrollView></View><Text style={styles.listHint}>{filteredPO.length} PO line{filteredPO.length===1?'':'s'} · scroll inside this card</Text></>}
          {poMode==='item' && poAnalytics && <><View style={styles.sectionListFrame}><ScrollView nestedScrollEnabled showsVerticalScrollIndicator contentContainerStyle={styles.sectionListContent}>
            {(poAnalytics.item_wise||[]).filter((r:any)=>Math.max(0,n(r.pending_qty))>0).map((r:any)=>
              <View key={r.item_code} style={styles.detailRow}><View style={styles.detailMain}>
                <Text style={styles.detailTitle}>{r.item_name||r.item_code}</Text><Text style={styles.detailMeta}>{r.item_code} · {r.uom||''} · {n(r.po_count)} PO</Text></View>
                <View style={styles.detailRight}><Text style={styles.detailAmount}>Pending {qty(r.pending_qty)}</Text>
                  <Text style={styles.detailMeta}>{money(r.pending_value)}</Text></View></View>)}
          </ScrollView></View></>}
          {detailLoading==='po'&&<LoadingRow/>}
        </Section>

        <Section title="Purchases" subtitle="Verified register totals · drill down by month or item">
          <View style={styles.bigRow}><View><Text style={styles.bigAmount}>{money(sixMonthPurchase)}</Text><Text style={styles.muted}>6-month purchase value</Text></View>
            <View style={styles.detailRight}><Text style={styles.controlLabel}>THIS MONTH</Text><Text style={styles.detailAmount}>{money(data?.purchase?.current_month?.value)}</Text></View></View>
          <Text style={styles.controlLabel}>DATE BASIS</Text><Chips>
            <Chip label="Inward Date" active={dateBasis==='inward_date'} onPress={()=>changePurchaseDateBasis('inward_date')}/>
            <Chip label="Bill Date" active={dateBasis==='bill_date'} onPress={()=>changePurchaseDateBasis('bill_date')}/></Chips>
          <Chips><Chip label="Month" active={purchaseMode==='month'} onPress={()=>{setPurchaseMode('month');void ensurePurchases();}}/>
            <Chip label="Itemwise" active={purchaseMode==='item'} onPress={()=>{setPurchaseMode('item');void ensurePurchases(purchaseMonth);}}/></Chips>
          {purchaseAnalytics && <><Text style={styles.controlLabel}>STORE SUMMARY</Text><Chips>
            <Chip label="All" active={purchaseStore==='ALL'} onPress={()=>setPurchaseStore('ALL')}/>
            {purchaseStores.map(s=><Chip key={s} label={prptype==='S'&&s==='002'?'Yarn · 002':prptype==='S'&&s==='012'?'Grey · 012':s}
              active={purchaseStore===s} onPress={()=>setPurchaseStore(s)}/>)}</Chips>
            {purchaseStore!=='ALL' && (purchaseAnalytics.store_wise||[]).filter((r:any)=>String(r.store_code)===purchaseStore).map((r:any)=>
              <View key={r.store_code} style={styles.storeSummary}><Metric label="STORE QTY" value={qty(r.qty)}/><Metric label="STORE VALUE" value={money(r.amount)}/><Metric label="BILLS" value={n(r.bill_count)}/></View>)}</>}
          {purchaseMode==='month' && <><Text style={styles.controlLabel}>MONTH</Text><Chips>
            <Chip label="All" active={!purchaseMonth} onPress={()=>{setPurchaseMonth('');void ensurePurchases('');}}/>
            {months.map((m:any)=><Chip key={m.ym} label={`${String(m.label).split(' ')[0]} · ${money(m.value)}`}
              active={purchaseMonth===String(m.ym)} onPress={()=>{const ym=String(m.ym);setPurchaseMonth(ym);void ensurePurchases(ym);}}/>)}</Chips>
            <View style={styles.sectionListFrame}><ScrollView nestedScrollEnabled showsVerticalScrollIndicator contentContainerStyle={styles.sectionListContent}>
              {purchaseRows===null ? months.map((m:any)=><TouchableOpacity key={m.ym} style={styles.monthRow} onPress={()=>{const ym=String(m.ym);setPurchaseMonth(ym);void ensurePurchases(ym);}}>
                <Text style={styles.monthLabel}>{m.label}</Text><Text style={styles.monthBills}>{n(m.bill_count)} bills</Text><Text style={styles.monthValue}>{money(m.value)} ›</Text></TouchableOpacity>)
              : filteredPurchases.length===0?<Empty/>:filteredPurchases.map((r:any)=>
                <View key={`${r.prpcode}-${r.uid}`} style={styles.detailRow}><View style={styles.detailMain}>
                  <Text style={styles.detailTitle}>Inw {r.inward_no||'—'} · {r.inward_date||'—'}</Text>
                  <Text style={styles.detailMeta}>Bill {r.bill_no||'—'} · {r.bill_date||'—'} · {r.prpcode}</Text></View>
                  <Text style={styles.detailAmount}>{money(r.net_amount)}</Text></View>)}
            </ScrollView></View>
            <Text style={styles.listHint}>{purchaseRows===null?months.length:filteredPurchases.length} row{(purchaseRows===null?months.length:filteredPurchases.length)===1?'':'s'} · scroll inside this card</Text></>}
          {purchaseMode==='item' && purchaseAnalytics && <><View style={styles.sectionListFrame}><ScrollView nestedScrollEnabled showsVerticalScrollIndicator contentContainerStyle={styles.sectionListContent}>
            {(purchaseAnalytics.item_wise||[]).map((r:any)=>
              <TouchableOpacity key={r.item_code} style={styles.detailRow} onPress={async()=>{
                try{setDetailLoading('rate'); const x=await api.getCreditorPurchaseRateComparison(prptype,partycode,r.item_code,date,dateBasis);
                  setRateDetail(x?.success?x.data:null);}finally{setDetailLoading('');}}}>
                <View style={styles.detailMain}><Text style={styles.detailTitle}>{r.item_name||r.item_code}</Text>
                  <Text style={styles.detailMeta}>Qty {qty(r.qty)} · {n(r.bill_count)} bills · tap for last rates</Text></View>
                <View style={styles.detailRight}><Text style={styles.detailAmount}>{money(r.amount)}</Text>
                  <Text style={styles.detailMeta}>Latest {money(r.latest_purchase?.unit_rate)}</Text></View></TouchableOpacity>)}
          </ScrollView></View></>}
          {detailLoading==='purchase'&&<LoadingRow/>}
          {detailLoading==='rate'&&<LoadingRow/>}
          {!!rateDetail && <LatestRateChart detail={rateDetail} money={money}/>} 
        </Section>

        <View style={styles.infoCard}><Text style={styles.infoTitle}>Reconciliation rule</Text>
          <Text style={styles.infoText}>Net Payable remains accounting-derived. Purchase, PO and payment sections are activity drill-downs and are not added again to the payable figure.</Text></View>
      </ScrollView>
    </SafeAreaView>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:T.bg},safe:{flex:1},content:{padding:14,paddingBottom:40,gap:12},
  center:{flex:1,alignItems:'center',justifyContent:'center'}, muted:{color:T.muted,fontSize:10,fontWeight:'600'},
  partyCard:{backgroundColor:'#fff',borderRadius:16,padding:14,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:T.border},
  avatar:{width:44,height:44,borderRadius:14,backgroundColor:T.nav,alignItems:'center',justifyContent:'center'},avatarText:{color:'#fff',fontSize:18,fontWeight:'900'},
  partyInfo:{flex:1},partyName:{color:T.ink,fontSize:16,fontWeight:'900'},partyMeta:{marginTop:3,color:T.muted,fontSize:10,fontWeight:'600'},
  amountToggle:{flexDirection:'row',gap:5,flexWrap:'wrap',justifyContent:'flex-end'},
  errorCard:{backgroundColor:'#FFF3F1',borderRadius:14,padding:13,borderWidth:1,borderColor:'#F3C2BC'},errorTitle:{color:'#A63A2B',fontSize:12,fontWeight:'900'},
  hero:{backgroundColor:T.nav,borderRadius:20,padding:18},heroLabel:{color:'rgba(255,255,255,.72)',fontSize:10,fontWeight:'900',letterSpacing:1.2},
  heroAmount:{color:'#fff',fontSize:30,fontWeight:'900',marginTop:5},heroHint:{color:'rgba(255,255,255,.70)',fontSize:10,marginTop:4},
  heroDivider:{height:1,backgroundColor:'rgba(255,255,255,.16)',marginVertical:14},metricRow:{flexDirection:'row',gap:10,marginTop:10},
  metric:{flex:1,minWidth:0},metricLabel:{color:T.muted,fontSize:8,fontWeight:'900',letterSpacing:.5},metricValue:{color:T.ink,fontSize:14,fontWeight:'900',marginTop:4},
  metricLabelLight:{color:'rgba(255,255,255,.65)'},metricValueLight:{color:'#fff'},
  positionStrip:{marginTop:14,paddingTop:11,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.16)',flexDirection:'row',alignItems:'center',gap:7},
  positionText:{color:'rgba(255,255,255,.82)',fontSize:10,fontWeight:'700'},positionDot:{color:'rgba(255,255,255,.45)'},
  card:{backgroundColor:'#fff',borderRadius:17,padding:15,borderWidth:1,borderColor:T.border},sectionTitle:{color:T.ink,fontSize:14,fontWeight:'900'},
  sectionSubtitle:{color:T.muted,fontSize:9,fontWeight:'600',marginTop:2},chips:{gap:7,paddingVertical:10,paddingRight:10},
  chip:{borderWidth:1,borderColor:T.border,borderRadius:999,paddingHorizontal:11,paddingVertical:7,backgroundColor:'#fff'},
  chipActive:{backgroundColor:T.nav,borderColor:T.nav},chipDisabled:{opacity:.35},chipText:{fontSize:9,fontWeight:'800',color:T.ink},chipTextActive:{color:'#fff'},
  bigRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10,marginTop:8},bigAmount:{color:T.ink,fontSize:21,fontWeight:'900'},
  sourceNote:{maxWidth:220,textAlign:'right',color:T.muted,fontSize:8,lineHeight:12},lineRow:{flexDirection:'row',justifyContent:'space-between',paddingTop:9,marginTop:7,borderTopWidth:1,borderTopColor:T.border},
  lineLabel:{color:T.muted,fontSize:10,fontWeight:'700'},lineValue:{color:T.ink,fontSize:10,fontWeight:'900'},
  controlLabel:{color:T.muted,fontSize:8,fontWeight:'900',letterSpacing:.7,marginTop:10},
  detailRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,paddingVertical:10,borderTopWidth:1,borderTopColor:T.border},
  detailMain:{flex:1,minWidth:0},detailRight:{alignItems:'flex-end'},detailTitle:{color:T.ink,fontSize:10,fontWeight:'900'},detailMeta:{color:T.muted,fontSize:8,fontWeight:'600',marginTop:3},
  detailAmount:{color:T.ink,fontSize:11,fontWeight:'900'},inlineLoading:{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:12},
  empty:{color:T.muted,fontSize:10,fontWeight:'600',paddingVertical:14,textAlign:'center'},storeSummary:{flexDirection:'row',gap:10,backgroundColor:'#F6F8FA',padding:10,borderRadius:12},
  monthRow:{minHeight:42,flexDirection:'row',alignItems:'center',borderTopWidth:1,borderTopColor:T.border,paddingVertical:9},
  monthLabel:{width:82,color:T.ink,fontSize:10,fontWeight:'800'},monthBills:{flex:1,color:T.muted,fontSize:9,fontWeight:'600'},monthValue:{color:T.ink,fontSize:10,fontWeight:'900'},
  paymentListFrame:{maxHeight:390,borderWidth:1,borderColor:T.border,borderRadius:12,overflow:'hidden',backgroundColor:'#fff'},
  paymentListContent:{paddingHorizontal:10,paddingBottom:4},
  sectionListFrame:{maxHeight:390,borderWidth:1,borderColor:T.border,borderRadius:12,overflow:'hidden',backgroundColor:'#fff'},
  sectionListContent:{paddingHorizontal:10,paddingBottom:4},
  paymentItem:{borderBottomWidth:1,borderBottomColor:T.border},
  paymentRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,paddingVertical:10},
  allocationLink:{color:T.nav,fontSize:8,fontWeight:'900',marginTop:5},
  paymentDateMeta:{color:T.muted,fontSize:8,fontWeight:'700',marginTop:2},
  onAccountText:{color:T.nav,fontSize:8,fontWeight:'900',marginTop:5},
  allocationBox:{backgroundColor:'#F6F8FA',borderRadius:10,paddingHorizontal:10,paddingVertical:8,marginBottom:10},
  allocationHeading:{color:T.muted,fontSize:8,fontWeight:'900',letterSpacing:.6,marginBottom:2},
  allocationRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,paddingVertical:8,borderTopWidth:1,borderTopColor:T.border},
  listHint:{color:T.muted,fontSize:8,fontWeight:'600',textAlign:'right',marginTop:6},
  rateChartCard:{backgroundColor:'#fff',borderRadius:12,padding:12,marginTop:10,borderWidth:1,borderColor:T.border},
  rateChartHeader:{flexDirection:'row',alignItems:'flex-start',gap:10,marginBottom:10},
  rateChartTitle:{color:T.ink,fontSize:11,fontWeight:'900'},
  rateChartSubtitle:{color:T.muted,fontSize:8,fontWeight:'700',marginTop:2},
  rateLatest:{alignItems:'flex-end'},rateLatestLabel:{color:T.muted,fontSize:7,fontWeight:'900'},
  rateLatestValue:{color:T.nav,fontSize:13,fontWeight:'900',marginTop:2},
  ratePlot:{height:175,flexDirection:'row',alignItems:'stretch',gap:8,paddingTop:6},
  ratePoint:{flex:1,minWidth:0,alignItems:'center'},rateValue:{color:T.ink,fontSize:8,fontWeight:'900',height:18},
  rateTrack:{height:105,width:'72%',maxWidth:48,borderRadius:7,backgroundColor:T.bg,justifyContent:'flex-end',overflow:'hidden'},
  rateBar:{width:'100%',backgroundColor:T.nav,borderRadius:7},rateMonth:{color:T.ink,fontSize:8,fontWeight:'900',marginTop:5},
  rateRef:{color:T.muted,fontSize:7,fontWeight:'700',marginTop:2,maxWidth:90},
  rateFooter:{flexDirection:'row',justifyContent:'space-between',gap:10,borderTopWidth:1,borderTopColor:T.border,paddingTop:8,marginTop:4},
  rateFooterText:{color:T.muted,fontSize:8,fontWeight:'800'},
  rateBox:{backgroundColor:'#F6F8FA',borderRadius:12,padding:11,marginTop:8},infoCard:{backgroundColor:'#F3F7FA',borderRadius:14,padding:13},
  infoTitle:{color:T.ink,fontSize:10,fontWeight:'900'},infoText:{color:T.muted,fontSize:9,lineHeight:14,marginTop:4},
});
