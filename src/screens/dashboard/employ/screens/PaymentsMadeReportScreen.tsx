import { AmountDisplayModeControl, useDashboardAmountMode } from '@/src/components/dashboard/AmountDisplayModeControl';
import { usePermission } from '@/src/core/permissions';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { api, formatAmount } from '../api/api';
import PaymentsMadeDateField from '../components/PaymentsMadeDateField';

type Party = { prpcode:string;party_code:string;party_name:string;amount:number;payment_count:number;latest_date:number };
type Payment = { payment_uid:string;payment_srno:number;prpcode:string;party_code:string;party_name:string;
 voucher_no:string;entry_date:number;amount:number;bill_count:number;allocated_amount:number;
 payment_method:string;reference:string;cheque_name:string;paid_date:number;clear_date:number;remark:string };
type Bill = {sub_srno:number;bill_no:string;bill_date:number;settled_amount:number;tds_amount:number;source_type:string;source_resolved:boolean};
type Report = { from_date:number;to_date:number;fy_label:string;total:number;party_count:number;payment_count:number;
 parties:Party[];payments:Payment[];bill_rows:Bill[];selected_party?:Party | null };

type Period = 'today'|'yesterday'|'month'|'custom'|'fy'|'day';
const C = {nav:'#0E1C2C',copper:'#91492D',ink:'#17212F',muted:'#A29389',line:'#E8DED5',bg:'#F7F5F2',white:'#FFFFFF',pill:'#EEE9E4',green:'#326B51'};
const parse = (v:any) => {
  const s=String(v||'').trim().replace(/[^0-9]/g,'');
  if(!/^\d{8}$/.test(s)) return '';
  let y=Number(s.slice(0,4)),m=Number(s.slice(4,6)),d=Number(s.slice(6,8));
  if(y<2000 || y>2100 || m<1 || m>12 || d<1 || d>31) return '';
  const dt=new Date(y,m-1,d);
  return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:'';
};
const dateText=(v:any) => {
  const s=parse(v);if(!s) return '';
  const d=new Date(Number(s.slice(0,4)),Number(s.slice(5,7))-1,Number(s.slice(8,10)));
  return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
};
const offset=(s:string,days:number) => {
  const d=new Date(Number(s.slice(0,4)),Number(s.slice(5,7))-1,Number(s.slice(8,10)));
  d.setDate(d.getDate()+days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const yearStart=(s:string) => `${Number(s.slice(0,4))-(Number(s.slice(5,7))<4?1:0)}-04-01`;
const financialYearRoute = (prptype:string, date:string, partyCode:string, voucher:{uid:string;srno:string;entryDate:string}|null) => ({
  pathname: '/new/payments-made-fy',
  params: {
    view: 'owner', prptype, date,
    ...(partyCode ? {party_code:partyCode} : {}),
    ...(voucher ? {voucher_uid:voucher.uid,voucher_srno:voucher.srno,...(voucher.entryDate ? {day:voucher.entryDate} : {})} : {}),
  },
});
const initials=(s:string) => (s||'?').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]?.toUpperCase()).join('');

export default function PaymentsMadeReportScreen() {
  const router=useRouter();const params=useLocalSearchParams();const {width}=useWindowDimensions();
  const {canAccess}=usePermission();const {mode:amountMode,setMode:setAmountMode}=useDashboardAmountMode();
  const prptype=String(params.prptype||'');
  const anchor=parse(params.date) || parse(new Date().toISOString().slice(0,10)) || '';
  const initial=String(params.period||'month');
  const [period,setPeriod]=useState<Period>((['today','yesterday','month','custom','fy','day'].includes(initial)?initial:'month') as Period);
  const [customFrom,setCustomFrom]=useState(`${anchor.slice(0,7)}-01`);
  const [customTo,setCustomTo]=useState(anchor);
  const [appliedCustom,setAppliedCustom]=useState<{from:string;to:string}|null>(null);
  const [search,setSearch]=useState('');
  const [party,setParty]=useState(String(params.party_code||''));
  const [partyContext,setPartyContext]=useState<Party|null>(null);
  const [payment,setPayment]=useState<{uid:string;srno:string;entryDate:string}|null>(params.voucher_uid ?
    {uid:String(params.voucher_uid),srno:String(params.voucher_srno||''),entryDate:parse(params.day)} : null);
  const [report,setReport]=useState<Report|null>(null);
  const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  const [validation,setValidation]=useState('');
  const [shareNotice,setShareNotice]=useState('');
  const money=(amount:number) => formatAmount(amount,amountMode);
  // Same card-driven Owner View access as the existing Sales/Production/Payment cards.
  const canView=canAccess('dashboard')&&canAccess('dashboard.payments_made_detail');
  const dates=useMemo(()=>{
    const base = period==='day' ? (parse(params.day)||anchor) : anchor;
    if(period==='today'||period==='day') return {from:base,to:base};
    if(period==='yesterday') {const d=offset(anchor,-1); return {from:d,to:d};}
    if(period==='month') return {from:`${anchor.slice(0,7)}-01`,to:anchor};
    if(period==='fy') return {from:yearStart(anchor),to:anchor};
    return appliedCustom || {from:`${anchor.slice(0,7)}-01`,to:anchor};
  },[anchor,period,appliedCustom,params.day]);

  // Keep the selected party/voucher when the period changes. A voucher outside
  // the new period is not requested from Laravel because the server correctly
  // rejects out-of-range voucher IDs. Returning to its period reopens it.
  const voucherInPeriod=!!payment && !!payment.entryDate && payment.entryDate>=dates.from && payment.entryDate<=dates.to;
  const refresh=useCallback(async()=>{
    if(initial==='fy' || !canView || !prptype||!anchor||!dates.from||!dates.to) return;
    setLoading(true);setError('');
    try{
      const asOf=dates.to; // DB selection must follow selected FY, including Yesterday on 1 April.
      const res=await api.getOwnerPaymentsMade({
        prptype,date:asOf,level:voucherInPeriod?'voucher':party?'party':'report',
        from_date:dates.from,to_date:dates.to,
        ...(party?{party_code:party}:{}),
        ...(voucherInPeriod&&payment?{voucher_uid:payment.uid,voucher_srno:payment.srno}:{})
      });
      if(!res?.success||!res?.data?.report) throw new Error(res?.message||'Payment report unavailable');
      setReport(res.data.report);
    }catch(e:any){setReport(null);setError(e?.message||'Unable to load payment report');}
    finally{setLoading(false);}
  },[anchor,canView,prptype,dates.from,dates.to,party,payment,voucherInPeriod,initial]);
  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{
    if (party && report?.selected_party) setPartyContext(report.selected_party);
    if (payment && !payment.entryDate && report?.payments?.length) {
      const match=report.payments.find(p=>p.payment_uid===payment.uid&&String(p.payment_srno)===payment.srno);
      if (match) setPayment(prev=>prev && !prev.entryDate ? {...prev,entryDate:parse(match.entry_date)} : prev);
    }
  },[party,report,payment]);
  const selectedPayment=useMemo(()=>report?.payments.find(p=>p.payment_uid===payment?.uid&&String(p.payment_srno)===payment?.srno),[report,payment]);
  const filteredParties=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return (report?.parties||[]).filter(p=>!q||`${p.party_name} ${p.party_code} ${p.prpcode}`.toLowerCase().includes(q));
  },[report?.parties,search]);
  const selectPeriod=(next:Period)=>{
    setPeriod(next);setError('');setValidation('');
    // Navigation stays on the current party / voucher stage, including Custom.
  };
  const applyCustom=()=>{
    const from=parse(customFrom),to=parse(customTo);
    if(!from||!to||from>to||to>anchor||yearStart(from)!==yearStart(to)){
      setValidation('Enter valid DD-MM-YYYY dates within one financial year, up to the dashboard date.');return;
    }
    setValidation('');setAppliedCustom({from,to});
  };
  // On local HTTP web builds navigator.share and navigator.clipboard may be unavailable.
  // Use a real clipboard fallback, and never report success before copying succeeds.
  const copyOnWeb = async (value:string):Promise<boolean> => {
    if (Platform.OS !== 'web') return false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch { /* Insecure HTTP / browser policy: use synchronous selection fallback. */ }
    if (typeof document === 'undefined') return false;
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus(); area.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { copied = false; }
    document.body.removeChild(area);
    return copied;
  };
  const shareVoucher=async()=>{
    if(!selectedPayment) return;
    setShareNotice('');
    const text=`Payment advice\nParty: ${selectedPayment.party_name}\nVoucher: ${selectedPayment.voucher_no}\nDate: ${dateText(selectedPayment.entry_date)}\nAmount: ${money(selectedPayment.amount)}\n${selectedPayment.reference?'Reference: '+selectedPayment.reference+'\n':''}`+
      (report?.bill_rows||[]).map(b=>`\nBill ${b.bill_no||'Unresolved'}: ${money(b.settled_amount)}`).join('');
    if (Platform.OS === 'web') {
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          await navigator.share({title:'Payment advice',text});
          setShareNotice('Payment advice shared.');
          return;
        }
      } catch (e:any) {
        // User cancellation is not an error. A web share failure falls back to copy.
        if (e?.name === 'AbortError') return;
      }
      if (await copyOnWeb(text)) {
        setShareNotice('Payment advice copied. Paste it into WhatsApp, email, or your preferred app.');
      } else {
        // Fallback for browsers blocking clipboard in insecure local-network origins.
        if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
          window.prompt('Copy payment advice (Ctrl+C, then Enter):', text);
        }
        setShareNotice('If automatic copying is blocked, select and copy the advice from the dialog.');
      }
      return;
    }
    try {await Share.share({message:text});} catch {setShareNotice('Sharing is unavailable on this device.');}
  };
  const copyVoucher=async()=>{
    if(!selectedPayment) return;
    setShareNotice('');
    const value = selectedPayment.voucher_no;
    try {
      if (Platform.OS === 'web') {
        if (!await copyOnWeb(value)) throw new Error('No clipboard');
      } else { await Clipboard.setStringAsync(value); }
      setShareNotice('Voucher number copied.');
    } catch {setShareNotice('Clipboard is unavailable in this browser.');}
  };
  const openFY = () => router.push(financialYearRoute(prptype,anchor,party,payment) as any);
  // Old saved report links with period=fy must open the standalone FY experience.
  // This does not affect day/month/custom filtering or the current drilldown stage.
  useEffect(() => {
    if (initial !== 'fy' || !canView || !prptype || !anchor) return;
    router.replace(financialYearRoute(prptype,anchor,party,payment) as any);
  }, [initial,canView,prptype,anchor,party,payment,router]);
  if(!canView) return <View style={s.center}><Text style={s.error}>Payments Made permission is required.</Text></View>;

  return <ScrollView style={s.screen} contentContainerStyle={s.container}>
    <View style={s.pageTop}>
      <TouchableOpacity onPress={()=>router.back()} style={s.back}><Text style={s.backText}>‹</Text></TouchableOpacity>
      <Text style={s.breadcrumb}>Owner › <Text style={s.crumbStrong}>Payments made</Text></Text>
      <View style={{flex:1}}/><AmountDisplayModeControl compact mode={amountMode} onChange={setAmountMode}/>
    </View>
    <View style={[s.columns,width<760&&s.mobileColumns]}>
      <View style={s.side}>
        <View style={s.filtersCard}>
          <View style={s.chips}>
            {([['today','Today'],['yesterday','Yesterday'],['month','This month'],['custom','Custom'],['fy','FY '+(report?.fy_label||'').replace(/^FY\s*/,'')]] as [Period,string][]).map(([key,label])=>(
              <TouchableOpacity key={key} onPress={()=>key==='fy'?openFY():selectPeriod(key)} style={[s.chip,(period===key||(period==='day'&&key==='today'))&&s.chipActive]}>
                <Text style={[s.chipText,(period===key||(period==='day'&&key==='today'))&&s.chipActiveText]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {period==='custom'&&<View style={s.customInputRow}>
            <PaymentsMadeDateField label="From" value={customFrom} minDate={yearStart(anchor)} maxDate={anchor} onChange={setCustomFrom}/>
            <PaymentsMadeDateField label="To" value={customTo} minDate={yearStart(anchor)} maxDate={anchor} onChange={setCustomTo}/>
            <TouchableOpacity onPress={applyCustom} style={s.applyBtn}><Text style={{color:'#fff',fontWeight:'900'}}>Apply</Text></TouchableOpacity>
          </View>}
          {validation?<Text style={s.warning}>{validation}</Text>:null}
          <View style={s.rangeLine}><Text style={s.range}>{dateText(dates.from)} – {dateText(dates.to)} · {report?.payment_count||0} payments · {report?.party_count||0} parties</Text>
          <Text style={s.rangeTotal}>{money(report?.total||0)}</Text></View>
        </View>
      </View>
      <View style={s.main}>
        {party ? (
          <View style={s.wrap}>
            <TouchableOpacity onPress={()=>{setParty('');setPayment(null);setPartyContext(null);}}><Text style={s.goBack}>‹ All parties</Text></TouchableOpacity>
            <Text style={s.crumbStrong}> › {report?.selected_party?.party_name||partyContext?.party_name||party}</Text>
          </View>
        ) : null}
        {!party ? <>
          <TextInput style={s.search} placeholder="Search party, head or city..." value={search} onChangeText={setSearch}/>
          <View style={s.tableCard}>
            <View style={s.tableHeader}><Text style={s.tableHeaderText}>{filteredParties.length} parties　{report?.fy_label||''}</Text><Text style={s.tableHeaderText}>paid {money(report?.total||0)}</Text></View>
            <ScrollView nestedScrollEnabled style={s.rows}>
              {filteredParties.map((p,index)=><TouchableOpacity key={`${p.prpcode}-${p.party_code}-${index}`} onPress={()=>{setParty(p.party_code);setPartyContext(p);setPayment(null);}} style={s.partyRow}>
                <View style={s.avatar}><Text style={s.avatarText}>{initials(p.party_name)}</Text></View>
                <View style={s.rowMain}><Text style={s.partyName} numberOfLines={1}>{p.party_name}</Text><Text style={s.meta}>{p.prpcode} · latest {dateText(p.latest_date)}</Text></View>
                <View style={s.rowAmt}><Text style={s.amount}>{money(p.amount)}</Text><Text style={s.meta}>{p.payment_count} {p.payment_count===1?'payment':'payments'}</Text></View><Text style={s.arrow}>›</Text>
              </TouchableOpacity>)}
              {!loading&&!filteredParties.length&&<Text style={s.empty}>No payments in this period</Text>}
            </ScrollView>
          </View>
          <Text style={s.footnote}>Parties paid in the period with the cumulative amount and their latest payment. Tap a party for its payments; each payment opens the bills it covered. Figures are recorded by accounts, amounts in ₹.</Text>
        </> : <>
          <View style={s.partyPanel}>
            <View style={s.partyPanelTop}><View style={s.avatar}><Text style={s.avatarText}>{initials(report?.selected_party?.party_name||partyContext?.party_name||party)}</Text></View>
              <View style={{flex:1}}><Text style={s.partyTitle}>{report?.selected_party?.party_name||partyContext?.party_name||party}</Text><Text style={s.meta}>{report?.selected_party?.prpcode||partyContext?.prpcode||''} · {report?.fy_label||''}</Text></View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open Payments Made financial-year report" onPress={openFY} style={s.fyBadge}><Text style={s.fyBadgeText}>{report?.fy_label||''} ›</Text></TouchableOpacity>
            </View>
            <View style={s.stats}><View style={s.stat}><Text style={s.statLabel}>PAID · SELECTED PERIOD</Text><Text style={s.statValue}>{money(report?.selected_party?.amount||0)}</Text><Text style={s.meta}>{report?.selected_party?.payment_count||0} payments</Text></View>
              <View style={s.stat}><Text style={s.statLabel}>AVG DAYS TO PAY</Text><Text style={s.statValue}>—</Text><Text style={s.meta}>Requires verified bill dates</Text></View>
              <View style={s.stat}><Text style={s.statLabel}>BILLS OPEN NOW</Text><Text style={s.statValue}>—</Text><Text style={s.meta}>Not supplied by this report</Text></View>
            </View>
          </View>
          <Text style={s.sectionCaption}>PAYMENTS · {dateText(dates.from)} – {dateText(dates.to)} · TAP ONE FOR ITS BILLS</Text>
          {payment && !voucherInPeriod && payment.entryDate ? (
            <Text style={s.voucherOutside}>Selected voucher is outside this period ({dateText(payment.entryDate)}). Party view is preserved. Select a period containing that date to reopen it.</Text>
          ) : null}
          {(report?.payments||[]).map((p,index)=>{
            const open=payment?.uid===p.payment_uid && payment?.srno===String(p.payment_srno);
            return <View key={`${p.payment_uid}-${p.payment_srno}-${index}`} style={[s.voucher,open&&s.voucherOpen]}>
              <TouchableOpacity onPress={()=>setPayment(open?null:{uid:p.payment_uid,srno:String(p.payment_srno),entryDate:parse(p.entry_date)})} style={s.voucherRow}>
                <View style={{flex:1,minWidth:0}}><Text style={s.voucherNo}>{p.voucher_no||p.payment_uid} <Text style={s.meta}>{dateText(p.entry_date)}　{p.payment_method||'Recorded'}</Text></Text>
                  <Text style={s.meta}>{p.bill_count} bills · {p.reference||'Reference unavailable'}</Text></View><Text style={s.amount}>{money(p.amount)}</Text><Text style={s.arrow}>{open?'⌄':'›'}</Text>
              </TouchableOpacity>
              {open&&<View style={s.voucherDetail}>
                <Text style={s.sectionCaption}>BILL-WISE ADJUSTMENT</Text>
                {(report?.bill_rows||[]).map((bill,i)=><View style={s.billRow} key={`${bill.sub_srno}-${i}`}>
                  <View style={{flex:1}}><Text style={s.billTitle}>{bill.bill_no||'Unresolved bill'}</Text><Text style={s.meta}>{dateText(bill.bill_date)} · {bill.source_type==='PRIOR_FY'?'Opening bill':'Current FY'} {bill.source_resolved?'':' · Source unavailable'}</Text></View>
                  <View><Text style={s.amount}>{money(bill.settled_amount)}</Text>{bill.tds_amount>0&&<Text style={s.meta}>TDS {money(bill.tds_amount)}</Text>}</View>
                </View>)}
                {!loading&&!(report?.bill_rows||[]).length&&<Text style={s.meta}>No purchase-bill adjustments recorded for this payment</Text>}
                <View style={s.voucherInfo}><View><Text style={s.statLabel}>VOUCHER NO.</Text><Text style={s.voucherValue}>{p.voucher_no}</Text></View><View><Text style={s.statLabel}>PAID ON</Text><Text style={s.voucherValue}>{dateText(p.entry_date)}</Text></View>
                <View><Text style={s.statLabel}>MODE</Text><Text style={s.voucherValue}>{p.payment_method||'Not specified'}</Text></View><View><Text style={s.statLabel}>UTR / REFERENCE</Text><Text style={s.voucherValue}>{p.reference||'Not recorded'}</Text></View></View>
                <Text style={s.meta}>{p.remark||''}</Text>
                <View style={s.actionRow}><TouchableOpacity style={s.shareBtn} onPress={shareVoucher}><Text style={s.shareText}>Share payment advice</Text></TouchableOpacity><TouchableOpacity style={s.copyBtn} onPress={copyVoucher}><Text style={s.copyText}>Copy voucher no.</Text></TouchableOpacity></View>
                {shareNotice ? <Text style={s.shareNotice}>{shareNotice}</Text> : null}
              </View>}
            </View>;
          })}
          {!loading&&!(report?.payments||[]).length&&<Text style={s.empty}>No vouchers in this period</Text>}
          <Text style={s.footnote}>One card per payment, with every recorded bill adjustment. Amounts are gross recorded payments, not confirmation of bank clearance.</Text>
        </>}
      </View>
    </View>
    {loading&&<View style={s.loader}><ActivityIndicator color={C.copper}/><Text style={s.meta}>Loading payment report…</Text></View>}
    {error?<TouchableOpacity onPress={()=>void refresh()} style={s.errorCard}><Text style={s.error}>{error} · Tap to retry</Text></TouchableOpacity>:null}
  </ScrollView>;
}

const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:C.bg},container:{width:'100%',maxWidth:1050,alignSelf:'center',padding:16,paddingBottom:100},
  pageTop:{flexDirection:'row',alignItems:'center',marginBottom:10,gap:10},back:{width:31,height:31,alignItems:'center',justifyContent:'center',backgroundColor:'#fff',borderColor:C.line,borderWidth:1,borderRadius:8},backText:{fontWeight:'900',fontSize:21,color:C.nav},breadcrumb:{fontSize:11,color:C.copper},crumbStrong:{fontWeight:'900',color:C.ink},
  columns:{flexDirection:'row',gap:16,alignItems:'flex-start'},mobileColumns:{flexDirection:'column'},side:{flex:1,minWidth:0},main:{flex:1,minWidth:0,width:'100%'},
  filtersCard:{backgroundColor:C.white,borderWidth:1,borderColor:C.line,borderRadius:14,padding:10,marginBottom:14},chips:{flexDirection:'row',flexWrap:'wrap',gap:4},chip:{backgroundColor:C.pill,paddingHorizontal:11,paddingVertical:7,borderRadius:18},chipActive:{backgroundColor:C.nav},chipText:{fontSize:10,fontWeight:'700',color:'#8F7666'},chipActiveText:{color:'#fff',fontWeight:'900'},
  customInputRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'flex-end',gap:7,marginTop:10},applyBtn:{backgroundColor:C.copper,paddingHorizontal:12,height:35,justifyContent:'center',borderRadius:6},
  voucherOutside:{backgroundColor:'#FFF5EC',padding:9,borderRadius:7,fontSize:10,color:C.copper,marginBottom:8},
  rangeLine:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:10,gap:5,flexWrap:'wrap'},range:{fontSize:10,color:C.muted,flexShrink:1},rangeTotal:{fontSize:14,fontWeight:'900',color:C.copper},
  search:{backgroundColor:'#fff',borderColor:C.line,borderWidth:1,borderRadius:7,padding:10,fontSize:11,marginBottom:9},
  tableCard:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:12,overflow:'hidden'},tableHeader:{backgroundColor:C.nav,padding:10,flexDirection:'row',justifyContent:'space-between'},tableHeaderText:{color:'#fff',fontWeight:'900',fontSize:10},
  rows:{maxHeight:470},partyRow:{minHeight:48,paddingHorizontal:10,paddingVertical:8,borderBottomWidth:1,borderColor:'#F1EDE7',flexDirection:'row',gap:9,alignItems:'center'},avatar:{width:30,height:30,borderRadius:20,backgroundColor:'#E5ECE9',alignItems:'center',justifyContent:'center'},avatarText:{fontSize:10,color:'#24634E',fontWeight:'900'},rowMain:{flex:1,minWidth:0},partyName:{fontWeight:'900',fontSize:11,color:C.ink},meta:{fontSize:9,color:C.muted,marginTop:3},rowAmt:{alignItems:'flex-end'},amount:{fontSize:12,color:C.ink,fontWeight:'900'},arrow:{fontSize:17,color:C.muted,marginLeft:4},footnote:{fontSize:10,color:'#AD9789',lineHeight:16,marginTop:10},empty:{padding:16,textAlign:'center',color:C.muted,fontSize:11},
  wrap:{flexDirection:'row',alignItems:'center',marginBottom:8,gap:5,flexWrap:'wrap'},goBack:{fontSize:11,color:C.copper,fontWeight:'800'},partyPanel:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,padding:10,borderRadius:12,marginBottom:12},partyPanelTop:{flexDirection:'row',alignItems:'center',gap:9,marginBottom:10},partyTitle:{fontSize:12,fontWeight:'900',color:C.ink},fyBadge:{borderColor:C.copper,borderRadius:10,borderWidth:1,padding:7},fyBadgeText:{color:C.copper,fontSize:10,fontWeight:'900'},stats:{flexDirection:'row',gap:6},stat:{flex:1,backgroundColor:C.bg,borderWidth:1,borderColor:'#ECE5DE',padding:8,borderRadius:9,minWidth:0},statLabel:{fontSize:8,color:C.muted,fontWeight:'800'},statValue:{fontSize:14,color:C.ink,fontWeight:'900',marginTop:4},
  sectionCaption:{fontSize:8,color:C.muted,letterSpacing:0.2,fontWeight:'900',marginBottom:5},voucher:{backgroundColor:'#fff',borderColor:C.line,borderWidth:1,borderRadius:12,overflow:'hidden',marginBottom:7},voucherOpen:{borderColor:'#D6AD9A'},voucherRow:{flexDirection:'row',alignItems:'center',padding:12,gap:8},voucherNo:{fontWeight:'900',fontSize:11,color:C.ink},voucherDetail:{backgroundColor:'#FBF9F7',padding:10,borderTopWidth:1,borderColor:'#EDE1D9'},billRow:{flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,borderColor:C.line,paddingVertical:9},billTitle:{fontSize:10,fontWeight:'800',color:C.ink},voucherInfo:{borderTopWidth:1,borderColor:C.line,marginTop:9,paddingTop:9,flexDirection:'row',flexWrap:'wrap',gap:16},voucherValue:{fontSize:10,fontWeight:'800',color:C.ink},actionRow:{flexDirection:'row',gap:6,marginTop:11,flexWrap:'wrap'},shareBtn:{borderRadius:6,padding:10,backgroundColor:C.copper},shareText:{color:'#fff',fontSize:10,fontWeight:'800'},copyBtn:{borderRadius:6,padding:10,backgroundColor:'#fff',borderWidth:1,borderColor:C.line},copyText:{color:C.ink,fontSize:10,fontWeight:'800'},
  shareNotice:{fontSize:10,color:C.green,marginTop:8,lineHeight:15},
  loader:{padding:8,flexDirection:'row',alignItems:'center',gap:8},warning:{color:'#AE5E18',fontSize:10,marginTop:8},errorCard:{padding:12,backgroundColor:'#FEF1E8',borderRadius:6},error:{color:'#9B402D',fontSize:11},center:{flex:1,padding:40,alignItems:'center',justifyContent:'center'}
});
