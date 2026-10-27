import React, {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import Svg, {Polyline,Line,Circle} from 'react-native-svg';
import {useLocalSearchParams,useRouter,usePathname} from 'expo-router';
import {api} from '@/src/screens/dashboard/employ/api/api';

type Row={code:string;name:string;amount:number};
type Month={label:string;date:string;amount:number|null;target?:number|null;targetSource?:string;targetError?:string;rows:Row[];receiptCount?:number|null;error?:string};
type ReceiptItem={receipt_uid:string;receipt_srno:string;voucher_no?:string|null;payment_reference?:string|null;bank_name?:string|null;payment_mode?:string|null;amount:number;allocation_count:number};
type ReceiptDay={date:string;label:string;amount:number;entries:number;receipts:ReceiptItem[]};
const NAMES=['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
const INK='#162334',DARK='#0D1B2A',GREEN='#176F58',BG='#F5F2EE',BORDER='#E7DFD5',MUTED='#827B73';
const str=(v:any)=>Array.isArray(v)?String(v[0]??''):String(v??'');
const num=(v:any)=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const fyOf=(d:string)=>Number(d.slice(0,4))-(Number(d.slice(5,7))<4?1:0);
const fyName=(y:number)=>`FY ${String(y).slice(-2)}–${String(y+1).slice(-2)}`;
const endOf=(y:number,i:number)=>{const yr=y+(i>=9?1:0),m=i<9?i+4:i-8;return `${yr}-${String(m).padStart(2,'0')}-${String(new Date(yr,m,0).getDate()).padStart(2,'0')}`;};
const amount=(v:number|null)=>v===null?'—':(v<0?'-':'')+'₹'+Math.abs(v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const compact=(v:number|null)=>v===null?'—':Math.abs(v)>=10000000?`${v<0?'-':''}₹${(Math.abs(v)/10000000).toFixed(2)} Cr`:Math.abs(v)>=100000?`${v<0?'-':''}₹${(Math.abs(v)/100000).toFixed(2)} L`:amount(v);
const normalize=(r:any):Row[]=>Array.isArray(r)?r.map((x:any)=>({code:String(x.code??''),name:String(x.name??'Unassigned'),amount:Number(x.amount??0)})).filter(x=>Number.isFinite(x.amount)):[];
// Read the same Collection benchmark delivered alongside each month's actual.
// An old due-outstanding snapshot is deliberately NOT a historical Collection target.
const extractMonthTarget=(report:any):{target:number|null;targetSource:string;targetError?:string}=>{
 const card=report?.collection_target;
 const source=String(report?.target_source??card?.target_source??'');
 const configured=report?.target_configured??card?.target_configured??false;
 const target=num(report?.target??report?.total?.target??card?.target);
 if(configured===true&&source==='AUTO_OPENING_OUTSTANDING_AS_ON'&&target!==null&&target>=0)
   return {target,targetSource:source};
 return {target:null,targetSource:source,targetError:configured===false?'Monthly opening target unavailable':source!=='AUTO_OPENING_OUTSTANDING_AS_ON'?'Opening outstanding source not confirmed':'Monthly target is missing or invalid'};
};
const sumRows=(list:Row[]):number=>Math.round(list.reduce((sum,row)=>sum+row.amount,0)*100)/100;
const monthAchievement=(actual:number|null,target:number|null):number|null=>
 actual!==null&&target!==null&&target>0?actual/target*100:null;
const buildTargetSummary=(rows:Month[]|undefined,upto:number)=>{
 const limit=Math.min(11,Math.max(0,upto));
 const missing:string[]=[];
 let collected=0,target=0,verified=0;
 for(let i=0;i<=limit;i++){
   const m=rows?.[i];
   if(!m||m.amount===null||m.target===null||m.target===undefined){missing.push(NAMES[i]);continue;}
   collected+=m.amount;target+=m.target;verified++;
 }
 const complete=missing.length===0;
 return {collected:complete?Math.round(collected*100)/100:null,
  target:complete?Math.round(target*100)/100:null,
  achievement:complete?monthAchievement(collected,target):null,
  verified,expected:limit+1,missing};
};
function AmountTotal({label,total,count,secondary,format}:{label:string;total:number;count:number;secondary?:string;format:(v:number|null)=>string}){
 return <View style={{backgroundColor:'#F5F2EE',borderRadius:9,borderWidth:1,borderColor:BORDER,paddingHorizontal:12,paddingVertical:10,marginVertical:9}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
    <Text style={{fontSize:11,color:GREEN,fontWeight:'800',flexShrink:1}}>{label} · {count.toLocaleString('en-IN')}</Text>
    <Text accessibilityLabel={`Total ${amount(total)}`} style={{fontSize:14,color:INK,fontWeight:'900'}}>{format(total)}</Text>
   </View>
   {secondary?<Text style={{fontSize:10,color:MUTED,marginTop:5}}>{secondary}</Text>:null}
  </View>;
}

const merge=(lists:Row[][]):Row[]=>{const m=new Map<string,Row>();for(const list of lists)for(const r of (Array.isArray(list)?list:[])){const old=m.get(r.code);m.set(r.code,{code:r.code,name:r.name||old?.name||'Unassigned',amount:Math.round(((old?.amount||0)+r.amount)*100)/100});}return [...m.values()].sort((a,b)=>b.amount-a.amount);};
export default function FyPaymentCollectionScreen(){
 const router=useRouter(),pathname=usePathname(),p=useLocalSearchParams(),{width}=useWindowDimensions();
 const raw=str(p.date),today=/^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:new Date().toLocaleDateString('en-CA');
 const activeFY=fyOf(today),prptype=(str(p.prptype)||'S').toUpperCase(),view=(str(p.view)||'owner').toLowerCase();
 const requestEpoch=useRef(0);
 const [fy,setFy]=useState(activeFY),[months,setMonths]=useState<Month[]>([]),[busy,setBusy]=useState(true);
 const [amountMode,setAmountMode]=useState<'compact'|'actual'>('compact');
 const displayAmount=(value:number|null):string=>amountMode==='compact'?compact(value):amount(value);
 const [targetBreakdownOpen,setTargetBreakdownOpen]=useState(false);
 const [month,setMonth]=useState<number|null>(null),[executive,setExecutive]=useState<Row|null>(null),[customers,setCustomers]=useState<Row[]>([]),[loadingDetail,setLoadingDetail]=useState(false);
 const [search,setSearch]=useState(''),[ascending,setAscending]=useState(false),[detailError,setDetailError]=useState(''),[selectedKpi,setSelectedKpi]=useState<string|null>(null);
 const years=[activeFY,activeFY-1,activeFY-2];
 const [history,setHistory]=useState<Record<number,Month[]>>({});
 const [billedByFY,setBilledByFY]=useState<Record<number,(number|null)[]>>({});
 const [billingReady,setBillingReady]=useState(false);
 // Opening Collection targets are bundled with the *same* monthly Collection
 // actual requests below, for all three FYs. No second/competing target API.
 const [historyReady,setHistoryReady]=useState(false);
 const [sparkPoint,setSparkPoint]=useState<number|null>(null);
 const [chartPoint,setChartPoint]=useState<number|null>(null);
 const [chartMonth,setChartMonth]=useState<number|null>(null);
 const [paymentMode,setPaymentMode]=useState<string|null>(null);
 const [customer,setCustomer]=useState<Row|null>(null),[receiptDays,setReceiptDays]=useState<ReceiptDay[]>([]),[loadingReceipts,setLoadingReceipts]=useState(false),[receiptError,setReceiptError]=useState(''),[expandedReceipt,setExpandedReceipt]=useState<string|null>(null);
 const fetchReport=useCallback(async(date:string,level:'executives'|'parties',executiveCode?:string)=>{
   const response:any=await api.getOwnerCardReport({date,prptype,view,report_type:'collection',level,...(executiveCode?{executive_code:executiveCode}:{})});
   if(!response?.success||!response?.data?.report)throw Error(response?.message||'Collection report unavailable');
   const report=response.data.report;const history=Array.isArray(report.history)?report.history:null;const receiptCount=history?history.reduce((sum:number,d:any)=>sum+Math.max(0,Number(d.entry_count||0)),0):null;return {amount:num(report?.total?.amount),...extractMonthTarget(report),rows:normalize(report?.rows),receiptCount};
 },[prptype,view]);
 useEffect(()=>{let cancelled=false;setBusy(true);setMonths([]);setCustomers([]);setReceiptDays([]);setDetailError('');setReceiptError('');
   (async()=>{const result:Month[]=[];for(let i=0;i<12;i++){
     const last=endOf(fy,i),start=i===0?`${fy}-04-01`:endOf(fy,i-1);
     if(last<start || last>today&&start>=today){result.push({label:NAMES[i],date:last,amount:null,rows:[]});continue;}
     const date=last>today?today:last;
     try{const report=await fetchReport(date,'executives');result.push({label:NAMES[i],date,amount:report.amount,target:report.target,targetSource:report.targetSource,targetError:report.targetError,rows:report.rows,receiptCount:report.receiptCount,error:report.amount===null?'Missing total':undefined});}
     catch(e:any){result.push({label:NAMES[i],date,amount:null,rows:[],error:e?.message||'Unavailable'});}
     if(cancelled)return;
   }if(!cancelled){setMonths(result);setBusy(false);}})();return()=>{cancelled=true};
 },[fy,today,fetchReport]);
 useEffect(()=>{let cancelled=false;setHistoryReady(false);setHistory({});
   (async()=>{
     // Historical requests run in bounded batches instead of serially for 36 months.
     // Publish the comparison atomically; never reveal partially loaded FY values.
     const loaded:Record<number,Month[]>={};
     const jobs=years.filter(y=>y!==fy).flatMap(y=>NAMES.map((label,i)=>({y,i,label,end:endOf(y,i)})));
     for(let offset=0;offset<jobs.length;offset+=6){
       const batch=jobs.slice(offset,offset+6);
       const results=await Promise.all(batch.map(async job=>{
         const monthStart=job.i===0?`${job.y}-04-01`:endOf(job.y,job.i-1);
         if(monthStart>=today)return {...job,date:job.end,amount:null,rows:[]} as Month & {y:number;i:number};
         const date=job.end>today?today:job.end;
         try{const result=await fetchReport(date,'executives');return {...job,date,amount:result.amount,target:result.target,targetSource:result.targetSource,targetError:result.targetError,rows:result.rows,receiptCount:result.receiptCount} as Month & {y:number;i:number};}
         catch(e:any){return {...job,date,amount:null,rows:[],error:e?.message||'Unavailable'} as Month & {y:number;i:number};}
       }));
       if(cancelled)return;
       for(const item of results){if(!loaded[item.y])loaded[item.y]=[];loaded[item.y][item.i]={label:item.label,date:item.date,amount:item.amount,target:item.target,targetSource:item.targetSource,targetError:item.targetError,rows:item.rows,receiptCount:item.receiptCount,error:item.error};}
     }
     if(!cancelled){setHistory(loaded);setHistoryReady(true);}
   })();return()=>{cancelled=true};
 },[fy,activeFY,today,fetchReport]);
 // Each financial year has its own request queue. Historical FYs cannot be
 // starved by the current FY, and a failed month is never converted to zero.
 const [billingErrors,setBillingErrors]=useState<Record<number,string[]>>({});
 const [billingLoading,setBillingLoading]=useState<Record<number,boolean>>({});
 useEffect(()=>{
   let cancelled=false;
   setBillingReady(false);setBilledByFY({});setBillingErrors({});
   setBillingLoading(Object.fromEntries(years.map(y=>[y,true])));
   const fetchYear=async(y:number)=>{
     const values:(number|null)[]=Array(12).fill(null);
     const errors:string[]=[];
     const finalMonth=y===activeFY?today:endOf(y,11);
     try{
       const response:any=await api.getOwnerCardReport({
         date:finalMonth,prptype,view,report_type:'sales',level:'fy_monthly_totals'
       });
       const report=response?.data?.report;
       if(!response?.success||report?.type!=='sales'||report?.level!=='fy_monthly_totals'||Number(report?.fy_start)!==y||!report?.months||typeof report.months!=='object'){
         throw Error(String(response?.message||report?.message||'FY monthly billing response unavailable'));
       }
       NAMES.forEach((label,i)=>{
         const end=endOf(y,i);
         if(end.slice(0,7)>today.slice(0,7))return;
         const key=end.slice(0,7).replace('-','');
         // The legacy SQL date field can be numeric with a decimal scale.
         // Accept both canonical YYYYMM totals and legacy YYYYMM.DD0000 daily
         // keys, summing all matching days without double-counting a month.
         const monthEntries=Object.entries(report.months as Record<string,unknown>);
         const canonical=Object.prototype.hasOwnProperty.call(report.months,key);
         const daily=monthEntries.filter(([k])=>new RegExp(`^${key}\\.\\d{2}(?:0+)?$`).test(k));
         const raw=canonical?[report.months[key]]:daily.map(([,v])=>v);
         const parsed=raw.map(v=>num(v));
         const value=parsed.some(v=>v===null)?null:parsed.reduce((total,v)=>total+(v||0),0);
         if(value===null)errors.push(`${label}: invalid billed amount`);
         values[i]=value;
       });
     }catch(e:any){errors.push(String(e?.message||'FY Sales billing request failed'));}
     if(cancelled)return;
     setBilledByFY(prev=>({...prev,[y]:values}));
     setBillingErrors(prev=>({...prev,[y]:errors}));
     setBillingLoading(prev=>({...prev,[y]:false}));
   };
   void Promise.all(years.map(fetchYear)).then(()=>{if(!cancelled)setBillingReady(true);});
   return()=>{cancelled=true;};
 },[activeFY,prptype,view,today]);
 const billedMetric=(y:number)=>{
   const source=y===fy?months:history[y],billing=billedByFY[y];
   if(!source?.length||!billing?.length)return null;
   const last=y===activeFY?comparableIndex:11;
   const entries=source.slice(0,last+1);
   if(entries.length!==last+1||entries.some((m,i)=>m.amount===null||billing[i]===null||billing[i]===undefined))return null;
   const collected=entries.reduce((sum,m)=>sum+(m.amount||0),0);
   const billed=billing.slice(0,last+1).reduce((sum,v)=>sum+(v||0),0);
   return billed>0?collected/billed*100:null;
 };
 const comparisonBusy=busy||!historyReady;

 const fySum=(y:number,upto=11)=>{const list=y===fy?months:history[y];if(!list?.length)return null;const subset=list.slice(0,upto+1);return subset.some(m=>m.amount===null)?null:subset.reduce((a,m)=>a+(m.amount||0),0);};
 const cum=(y:number)=>{const list=y===fy?months:history[y];let sum=0,broken=false;return NAMES.map((_,i)=>{const m=list?.[i];if(!m||m.amount===null)broken=true;if(broken)return null;sum+=m.amount||0;return sum;});};
 const comparableIndex=Math.min(11,Math.max(0,(Number(today.slice(0,4))-activeFY)*12+Number(today.slice(5,7))-4));
 const yearCurrent=fySum(fy,fy===activeFY?comparableIndex:11),yearPrior=fySum(fy-1,fy===activeFY?comparableIndex:11);
 const yoy=yearCurrent!==null&&yearPrior!==null&&yearPrior!==0?(yearCurrent/yearPrior-1)*100:null;
 const historyYears=[activeFY-2,activeFY-1,activeFY];
 const curves=historyYears.map(y=>({y,values:cum(y)}));
 const graphMax=Math.max(1,...curves.flatMap(c=>c.values.filter((v):v is number=>v!==null)));
 const plotW=650,plotH=176;
 const points=(vals:(number|null)[])=>vals.map((v,i)=>v===null?null:`${20+i*(plotW-40)/11},${plotH-18-(v/graphMax)*(plotH-36)}`).filter(Boolean).join(' ');
 const available=months.filter(x=>x.amount!==null),total=available.length?available.reduce((a,x)=>a+(x.amount||0),0):null;
 const currentMonth=months.findIndex(x=>x.date===today),lastAvailable=available.length?available[available.length-1]:null;
 const peak=available.length?available.reduce((a,b)=>(b.amount||0)>(a.amount||0)?b:a):null;
 const avg=total===null?null:total/available.length;
 const receiptCount=available.length&&available.every(m=>m.receiptCount!==null&&m.receiptCount!==undefined)?available.reduce((sum,m)=>sum+(m.receiptCount||0),0):null;
 const averageReceipt=receiptCount!==null&&receiptCount>0&&total!==null?total/receiptCount:null;
 const priorFull=fySum(fy-1,11);
 const monthsRemaining=fy===activeFY?Math.max(0,11-comparableIndex):0;
 const requiredPace=priorFull!==null&&yearCurrent!==null&&monthsRemaining>0?Math.max(0,priorFull-yearCurrent)/monthsRemaining:null;
 const topExecutive=merge(available.map(x=>Array.isArray(x?.rows)?x.rows:[]))[0]||null;
 const topShare=topExecutive&&total&&total>0?topExecutive.amount/total*100:null;
 const rows=useMemo(()=>merge((month===null?available:(months[month] && months[month].amount!==null)?[months[month]]:[]).map(x=>Array.isArray(x?.rows)?x.rows:[])),[months,month]);
 const selectedRows=executive?(Array.isArray(customers)?customers:[]):rows;
 const visible=useMemo(()=>selectedRows.filter(x=>(x.name+' '+x.code).toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>ascending?a.amount-b.amount:b.amount-a.amount),[selectedRows,search,ascending]);
 const pickExecutive=useCallback(async(r:Row,retainCustomer=false)=>{const epoch=++requestEpoch.current;setExecutive(r);setCustomers([]);if(!retainCustomer)setSearch('');setDetailError('');setLoadingDetail(true);
   const sources=month===null?available:(months[month]?[months[month]]:[]),lists:Row[][]=[];
   for(const m of sources){if(m?.amount===null)continue;try{const d=await fetchReport(m.date,'parties',r.code);lists.push(d.rows);}catch(e:any){setDetailError(e?.message||'Some customer details are unavailable');}}
   if(epoch!==requestEpoch.current)return;setCustomers(merge(lists));setLoadingDetail(false);
 },[available,month,months,fetchReport]);
 const pickCustomer=useCallback(async(r:Row,executiveOverride?:Row)=>{
   const currentExecutive=executiveOverride||executive;if(!currentExecutive)return;const epoch=requestEpoch.current;
   setCustomer(r);setPaymentMode(null);setReceiptDays([]);setReceiptError('');setExpandedReceipt(null);setLoadingReceipts(true);
   const sources=month===null?available:(months[month]?[months[month]]:[]);const byDate=new Map<string,ReceiptDay>();let failures=0;
   for(const m of sources){if(!m||m.amount===null)continue;
     try{const response:any=await api.getOwnerCardReport({date:m.date,prptype,view,report_type:'collection',level:'parties',executive_code:currentExecutive.code,executive_name:currentExecutive.name,party_code:r.code,party_name:r.name});
       if(!response?.success||!response?.data?.report)throw Error(response?.message||'Receipt history unavailable');
       const report=response.data.report;
       for(const item of (Array.isArray(report.history)?report.history:[])){
         const date=String(item.date_ymd||'');if(!date)continue;
         const existing=byDate.get(date);const amt=Number(item.amount||0);
         byDate.set(date,{date,label:String(item.date_label||date),amount:(existing?.amount||0)+amt,entries:(existing?.entries||0)+Number(item.entry_count||0),receipts:[...(existing?.receipts||[]),...((item.parties||[]).flatMap((party:any)=>party.receipts||[]) as ReceiptItem[])]});
       }
     }catch{failures++;}
   }
   if(epoch!==requestEpoch.current)return;setReceiptDays([...byDate.values()].sort((a,b)=>b.date.localeCompare(a.date)));
   if(failures)setReceiptError(`${failures} period(s) of receipt history unavailable; totals may be incomplete.`);
   setLoadingReceipts(false);
 },[executive,month,available,months,prptype,view]);
 // Preserve the drilldown path across financial-year changes. Refetch the selected
 // executive and customer using their stable codes rather than resetting to overview.
 const lastLoadedFY=useRef<number|null>(null);
 useEffect(()=>{
   if(busy||months.length!==12||lastLoadedFY.current===fy)return;
   lastLoadedFY.current=fy;
   if(!executive)return;
   const previousCustomer=customer;
   const currentExecutive=executive;
   (async()=>{
     const epoch=++requestEpoch.current;
     setLoadingDetail(true);setCustomers([]);setDetailError('');
     const sources=month===null?months.filter(m=>m.amount!==null):(months[month]?[months[month]]:[]);
     const lists:Row[][]=[];let failures=0;
     for(const m of sources){if(!m||m.amount===null)continue;
       try{const d=await fetchReport(m.date,'parties',currentExecutive.code);lists.push(d.rows);}
       catch{failures++;}
     }
     if(epoch!==requestEpoch.current)return;
     const updated=merge(lists);setCustomers(updated);setLoadingDetail(false);
     if(failures)setDetailError(`${failures} period(s) unavailable`);
     if(previousCustomer){
       const matched=updated.find(r=>r.code===previousCustomer.code);
       if(matched){setCustomer(matched);setReceiptDays([]);setLoadingReceipts(true);setReceiptError('');
         const byDate=new Map<string,ReceiptDay>();let receiptFailures=0;
         for(const m of sources){if(!m||m.amount===null)continue;
           try{const response:any=await api.getOwnerCardReport({date:m.date,prptype,view,report_type:'collection',level:'parties',executive_code:currentExecutive.code,executive_name:currentExecutive.name,party_code:matched.code,party_name:matched.name});
             if(!response?.success||!response?.data?.report)throw Error('Unavailable');
             for(const item of (Array.isArray(response.data.report.history)?response.data.report.history:[])){
               const date=String(item.date_ymd||'');if(!date)continue;
               const old=byDate.get(date);
               byDate.set(date,{date,label:String(item.date_label||date),amount:(old?.amount||0)+Number(item.amount||0),entries:(old?.entries||0)+Number(item.entry_count||0),receipts:[...(old?.receipts||[]),...((item.parties||[]).flatMap((party:any)=>party.receipts||[]) as ReceiptItem[])]});
             }
           }catch{receiptFailures++;}
         }
         if(epoch!==requestEpoch.current)return;
         setReceiptDays([...byDate.values()].sort((a,b)=>b.date.localeCompare(a.date)));
         if(receiptFailures)setReceiptError(`${receiptFailures} period(s) of receipt history unavailable`);
         setLoadingReceipts(false);
       }else{
         setCustomer({...previousCustomer,amount:0});setReceiptDays([]);setLoadingReceipts(false);
         setReceiptError('No collection records for this customer in the selected FY.');
       }
     }
   })();
 },[fy,busy,months]);
 const changeFY=(next:number)=>{
   if(next===fy)return;
   ++requestEpoch.current;
   lastLoadedFY.current=null;
   // A selected historical month must not become a future-month drilldown.
   if(next===activeFY&&month!==null&&endOf(next,month).slice(0,7)>today.slice(0,7))setMonth(null);
   setLoadingDetail(!!executive);setLoadingReceipts(!!customer);
   setReceiptDays([]);setExpandedReceipt(null);setDetailError('');setReceiptError('');
   // Open monthly details straight away for completed years, so older FY
   // figures are easy to find rather than hidden behind another disclosure.
   setTargetBreakdownOpen(next!==activeFY);
   setFy(next);
 };
 const exitReport=()=>{router.replace('/new' as any);};
 const toOverview=()=>{setPaymentMode(null);setCustomer(null);setReceiptDays([]);setExpandedReceipt(null);setExecutive(null);setCustomers([]);setMonth(null);setSearch('');setDetailError('');setReceiptError('');};
 const toExecutive=()=>{setPaymentMode(null);setCustomer(null);setReceiptDays([]);setExpandedReceipt(null);setReceiptError('');};
 const toExecutives=()=>{toExecutive();setExecutive(null);setCustomers([]);setSearch('');setDetailError('');};
 const back=()=>{if(paymentMode){setPaymentMode(null);return;}if(customer){toExecutive();return;}if(executive){toExecutives();return;}if(month!==null){setMonth(null);return;}exitReport();};
 const chooseMonth=(i:number)=>{if(months[i]?.amount===null)return;setMonth(month===i?null:i);setPaymentMode(null);setExecutive(null);setCustomer(null);setCustomers([]);setSearch('');};
 const modeGroups=useMemo(()=>{const groups=new Map<string,{mode:string;amount:number;receipts:(ReceiptItem & {dateLabel:string;date:string})[]}>();const seen=new Set<string>();for(const d of receiptDays)for(const r of d.receipts){const key=`${d.date}:${r.receipt_uid}:${r.receipt_srno}`;if(seen.has(key))continue;seen.add(key);const mode=r.payment_mode||'Unclassified';const g=groups.get(mode)||{mode,amount:0,receipts:[]};g.amount+=Number(r.amount||0);g.receipts.push({...r,dateLabel:d.label,date:d.date});groups.set(mode,g);}return [...groups.values()].sort((a,b)=>b.amount-a.amount);},[receiptDays]);
 const allReceipts=useMemo(()=>modeGroups.flatMap(g=>g.receipts.map(r=>({...r,groupMode:g.mode}))).sort((a,b)=>b.date.localeCompare(a.date)),[modeGroups]);
 const selectedReceipts=paymentMode==='ALL_RECEIPTS'?allReceipts:(modeGroups.find(g=>g.mode===paymentMode)?.receipts||[]);
 const selectedReceiptAmount=paymentMode==='ALL_RECEIPTS'?modeGroups.reduce((sum,g)=>sum+g.amount,0):(modeGroups.find(g=>g.mode===paymentMode)?.amount??0);
 const modeTotal=modeGroups.reduce((a,g)=>a+g.amount,0);
 const modeCount=modeGroups.reduce((a,g)=>a+g.receipts.length,0);
 const previousAvailable=(history[fy-1]||[]).filter(m=>m?.amount!==null);
 const previousAverage=previousAvailable.length?previousAvailable.reduce((a,m)=>a+(m.amount||0),0)/previousAvailable.length:null;
 const peakPrior=previousAvailable.length?Math.max(...previousAvailable.map(m=>m.amount||0)):null;
 const kpiCompare=(value:number|null,prior:number|null)=>value!==null&&prior!==null&&prior!==0?`${value>=prior?'▲':'▼'} ${Math.abs((value/prior-1)*100).toFixed(1)}% vs ${fyName(fy-1)}`:'Prior FY comparison unavailable';
 // All FY achievement percentages use additive MONTHLY opening Collection
 // targets. Only compare months with both verified Actual and verified Target.
 // For the current FY exclude the future months completely.
 const targetSummary=(y:number,compareAtStage=false)=>{
   const source=y===fy?months:history[y];
   const last=compareAtStage||y===activeFY?comparableIndex:11;
   return buildTargetSummary(source,last);
 };
 const targetMetric=(y:number,compareAtStage=false):number|null=>targetSummary(y,compareAtStage).achievement;
 const missingTargetLabel=(y:number,atStage=false):string=>{
   const result=targetSummary(y,atStage);
   if(!result.missing.length)return result.target===0?'No opening balance / zero target':'Target unavailable';
   return `${result.verified}/${result.expected} months verified · missing ${result.missing.slice(0,3).join(', ')}${result.missing.length>3?` +${result.missing.length-3} more`:''}`;
 };
 // A selected completed FY has twelve historical months. The three-year
 // comparison below remains an apples-to-apples window through today's FY
 // stage; do not let that seven-month comparison hide five historical months.
 const selectedFullTargetSummary=targetSummary(fy,false);
 const selectedStageTargetSummary=targetSummary(fy,true);
 const historicalFullYearVerified=fy!==activeFY&&selectedFullTargetSummary.achievement!==null;
 const selectedTargetSummary=fy===activeFY||historicalFullYearVerified
   ?selectedFullTargetSummary:selectedStageTargetSummary;
 const selectedTargetPeriod=fy===activeFY?'YEAR TO DATE':historicalFullYearVerified?'FULL FINANCIAL YEAR':'COMPARABLE STAGE ONLY';
 const targetCurrentAchievement=selectedTargetSummary.achievement;
 const targetPreviousAchievement=targetMetric(fy-1,fy===activeFY||!historicalFullYearVerified);
 const targetPreviousChange=targetCurrentAchievement!==null&&targetPreviousAchievement!==null&&targetPreviousAchievement>0
   ?(targetCurrentAchievement/targetPreviousAchievement-1)*100:null;
 // No year-on-year change exists before the earliest FY shown. Display the
 // actual and target regardless; the absence of a prior year is not missing data.
 const targetPreviousLabel=targetPreviousChange===null
   ?''
   :`${targetPreviousChange>=0?'▲':'▼'} ${Math.abs(targetPreviousChange).toFixed(1)}% vs ${fyName(fy-1)}`;
 const selectedTotal=sumRows(selectedRows);
 const visibleTotal=sumRows(visible);
 const searchActive=search.trim().length>0;
 const listKind=executive?'CUSTOMERS':'EXECUTIVES';
 const selectedPeriod=month===null?'all available months':`${NAMES[month]} ${fy+(month>=9?1:0)}`;
 const periodRowTotal=month===null?total:months[month]?.amount??null;
 const executiveRowDifference=!executive&&!searchActive&&periodRowTotal!==null?Math.round((selectedTotal-periodRowTotal)*100)/100:0;
 const customerRowDifference=executive&&!searchActive&&!loadingDetail?Math.round((selectedTotal-(rows.find(r=>r.code===executive.code)?.amount??executive.amount))*100)/100:0;
 const listDifference=!executive?executiveRowDifference:customerRowDifference;
 const listSecondary=searchActive?`Matching ${visible.length} of ${selectedRows.length} ${listKind.toLowerCase()} · overall ${displayAmount(selectedTotal)}`:
  `${selectedPeriod} · ${selectedRows.length} ${listKind.toLowerCase()}${Math.abs(listDifference)>0.02?' · breakdown differs from the parent total by '+displayAmount(Math.abs(listDifference)):''}`;

 const tiles=[
  {key:'avg',label:'MONTHLY AVERAGE',value:avg,sub:kpiCompare(avg,previousAverage),info:'Collection divided by months with verified data.',series:available.map(m=>m.amount||0)},
  {key:'peak',label:'BEST MONTH',value:peak?.amount??null,sub:peak?.label||'No data',info:kpiCompare(peak?.amount??null,peakPrior),series:[]},
  {key:'receipts',label:'RECEIPTS',value:receiptCount,sub:receiptCount===null?'Receipt history unavailable':'Distinct receipt entries',info:'Counts distinct receipt UID + SrNo from the same monthly collection history; D2 allocations are not counted as separate receipts.',series:[]},
  {key:'receiptAvg',label:'AVG RECEIPT',value:averageReceipt,sub:averageReceipt===null?'Receipt count unavailable':'Collected ÷ distinct receipts',info:'Collection total divided by verified distinct receipt entries from the same available months.',series:[]},
  {key:'billed',label:'COLLECTED VS BILLED',value:billedMetric(fy),sub:billedMetric(fy)===null?(billingErrors[fy]?.length?`Sales unavailable: ${billingErrors[fy].slice(0,2).join('; ')}`:billingLoading[fy]?'Loading billed sales…':'Billing total unavailable'):'Collection ÷ billed sales',info:'Collection divided by billed sales from the Sales report for the same financial-year months and property.',series:[]},
  {key:'target',label:'ACHIEVEMENT VS TARGET',value:targetCurrentAchievement,sub:comparisonBusy?'Loading collection targets…':targetCurrentAchievement===null?missingTargetLabel(fy,fy===activeFY):targetPreviousLabel,info:'',series:[]}
 ];
 const max=Math.max(1,...months.map(x=>Math.max(0,x.amount||0)));
  // A fixed-position web overlay must never survive after the URL changes.
  // Expo Router may retain the outgoing screen during navigation transitions.
  // A tab route can remain mounted after navigation; never paint its fixed overlay off-route.
  if (Platform.OS === 'web' && !pathname.replace(/\/$/, '').endsWith('/reports/financial-year')) return null;
  return <View style={[s.root,Platform.OS==='web'&&s.webOverlay]}>
  <View style={s.header}><Pressable onPress={back} style={s.headerButton}><Text style={s.headerIcon}>‹</Text></Pressable><View style={{flex:1}}><Text style={s.headerTitle}>💰 Payment Collection</Text><Text style={s.headerSub}>{fyName(fy)} · Apr {fy}–Mar {fy+1} · {fy===activeFY?`Through ${today}`:'Full year'}{month!==null?' › '+NAMES[month]:''}{executive?' › '+executive.name:''}{customer?' › '+customer.name:''}{paymentMode?' › '+paymentMode:''}</Text></View><Pressable onPress={exitReport} style={s.headerButton}><Text style={s.headerIcon}>×</Text></Pressable></View>
  <ScrollView contentContainerStyle={s.outer}><View style={s.content}>
   {(month!==null||executive!==null)&&!customer&&<View style={s.breadcrumbs} accessibilityRole="navigation">
    <Pressable accessibilityRole="button" accessibilityLabel="Back to FY Payment Collection overview" onPress={toOverview} style={s.crumbPress}><Text style={s.crumbLink}>{fyName(fy)}</Text></Pressable>
    {month!==null&&<><Text style={s.crumbSeparator}>›</Text><Pressable accessibilityRole="button" accessibilityLabel={`Back to ${NAMES[month]} collection`} onPress={()=>{toExecutives();}} style={s.crumbPress}><Text style={executive||customer?s.crumbLink:s.crumbCurrent}>{NAMES[month]} {fy+(month>=9?1:0)}</Text></Pressable></>}
    {executive&&<><Text style={s.crumbSeparator}>›</Text><Pressable accessibilityRole="button" accessibilityLabel={`Back to customers of ${executive.name}`} onPress={toExecutive} style={s.crumbPress}><Text style={customer?s.crumbLink:s.crumbCurrent} numberOfLines={1}>{executive.name}</Text></Pressable></>}
    {customer&&<><Text style={s.crumbSeparator}>›</Text><Pressable onPress={()=>setPaymentMode(null)} style={s.crumbPress}><Text style={paymentMode?s.crumbLink:s.crumbCurrent} numberOfLines={2}>{customer.name}</Text></Pressable></>}{paymentMode&&<><Text style={s.crumbSeparator}>›</Text><Text style={s.crumbCurrent}>{paymentMode}</Text></>}
   </View>}
   <View style={{flexDirection:'row',justifyContent:'flex-end',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
     <Text style={s.eyebrow}>AMOUNT DISPLAY</Text>
     <View accessibilityRole="radiogroup" accessibilityLabel="Amount display mode" style={{flexDirection:'row',padding:3,borderRadius:9,borderWidth:1,borderColor:BORDER,backgroundColor:'#FFFFFF',gap:3}}>
       {(['compact','actual'] as const).map(opt=><Pressable key={opt} accessibilityRole="radio" accessibilityState={{checked:amountMode===opt}} accessibilityLabel={opt==='compact'?'Compact amounts in crore and lakh':'Actual amounts in rupees and paise'} onPress={()=>setAmountMode(opt)} style={{paddingVertical:7,paddingHorizontal:12,borderRadius:6,backgroundColor:amountMode===opt?DARK:'#FFFFFF'}}><Text style={{fontSize:11,fontWeight:'800',color:amountMode===opt?'#FFFFFF':INK}}>{opt==='compact'?'Compact':'Actual'}</Text></Pressable>)}
     </View>
   </View>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{years.map((y,i)=><Pressable key={y} onPress={()=>changeFY(y)} style={[s.chip,fy===y&&s.chipActive]}><Text style={[s.chipLabel,fy===y&&s.white]}>{fyName(y)}{i===0?' · current':''}</Text></Pressable>)}</ScrollView>
   {comparisonBusy?<Text style={[s.note,{marginBottom:12}]}>Loading FY comparison…</Text>:null}
   {!busy&&months.length>0&&available.length===0?<View style={s.warning}><Text style={s.warningText}>Collection data is unavailable for {fyName(fy)}. No amounts have been estimated.</Text></View>:null}
   {comparisonBusy&&!executive?<OverviewSkeleton width={width}/>:!executive?<>
    <View style={s.hero}><View style={{flex:1,minWidth:220}}><Text style={s.eyebrow}>COLLECTED · {fyName(fy)} · {fy===activeFY?'TO DATE':'FULL YEAR'}</Text><Text style={[s.heroValue,amountMode==='actual'&&{fontSize:21}]}>{busy?'Loading…':displayAmount(fy===activeFY?yearCurrent:total)}</Text><Text style={[s.note,{color:yoy!==null&&yoy<0?'#B6402B':GREEN,fontWeight:'700'}]}>{yoy===null?'Comparable previous FY data unavailable':`${yoy>=0?'▲':'▼'} ${Math.abs(yoy).toFixed(1)}% vs ${fyName(fy-1)} at this stage`}</Text><Text style={s.note}>{fy===activeFY?`Collected through ${today}`:'Full-year collection'}</Text></View><View style={[s.heroAside,{backgroundColor:'#F5F2EE',padding:12,borderRadius:10}]}><Text style={s.heroAsideText}>{yearCurrent!==null&&yearPrior!==null?`${yearCurrent>=yearPrior?'Ahead of':'Behind'} ${fyName(fy-1)} by ${displayAmount(Math.abs(yearCurrent-yearPrior))} at the comparable stage`:'Previous FY comparison unavailable'}</Text><Text style={s.heroAsideText}>{requiredPace!==null?`${displayAmount(requiredPace)} per remaining month needed to pass ${fyName(fy-1)} full-year collection`:'Required pace unavailable until the prior FY is fully loaded'}</Text><Text style={s.heroAsideText}>{topShare!==null?`${topExecutive?.name} accounts for ${topShare.toFixed(1)}% of available collections`:'Executive concentration unavailable'}</Text></View><View style={{width:'100%',flexDirection:'row',gap:6,flexWrap:'wrap'}}>{historyYears.map(y=><Pressable key={y} onPress={()=>changeFY(y)} style={[s.yearCard,fy===y&&s.yearCardActive]}><Text style={[s.eyebrow,fy===y&&s.white]}>{fyName(y)} {y===activeFY?'· to date':''}</Text><Text style={[s.tileValue,fy===y&&s.white]}>{busy&&y===fy?'Loading…':displayAmount(fySum(y,comparableIndex))}</Text><Text style={[s.note,fy===y&&s.white]}>At comparable stage</Text></Pressable>)}</View></View>
    <View style={[s.tiles,{flexDirection:'row',flexWrap:'wrap',alignItems:'flex-start'}]}>{tiles.map(t=>{
      const expanded=selectedKpi===t.key;
      const tileWidth=expanded?'100%':width>740?'19%':width>470?'32%':'48%';
      const metricFor=(y:number):number|null=>{
        // The selected FY lives in `months`, not `history`. Preserve that
        // distinction for every expanded KPI, including the active FY.
        const source=y===fy?months:history[y];
        if(!source?.length)return null;
        const comparable=y!==fy && fy===activeFY;
        const rows=source.slice(0,comparable?comparableIndex+1:12).filter(m=>m?.amount!==null&&m?.amount!==undefined);
        if(!rows.length)return null;
        const collected=rows.reduce((sum,m)=>sum+(m.amount||0),0);
        if(t.key==='avg')return collected/rows.length;
        if(t.key==='peak')return Math.max(...rows.map(m=>m.amount||0));
        if(t.key==='receipts'||t.key==='receiptAvg'){
          if(rows.some(m=>m.receiptCount===null||m.receiptCount===undefined))return null;
          const count=rows.reduce((sum,m)=>sum+(m.receiptCount||0),0);
          return t.key==='receipts'?count:count>0?collected/count:null;
        }
        if(t.key==='billed')return billedMetric(y);
        if(t.key==='target')return targetMetric(y,true);
        return null;
      };
      const metricDisplay=(value:number|null)=>t.key==='receipts'?(value===null?'—':Math.round(value).toLocaleString('en-IN')):t.key==='billed'||t.key==='target'?(value===null?'—':`${value.toFixed(1)}%`):displayAmount(value);
      return <Pressable key={t.key} accessibilityRole="button" accessibilityLabel={`${t.label} ${expanded?'collapse':'expand'} breakdown`} onPress={()=>setSelectedKpi(expanded?null:t.key)} style={[s.tile,{width:tileWidth,minHeight:expanded?185:119,overflow:'hidden',borderColor:expanded?'#23658A':BORDER,borderWidth:expanded?1.5:1}]}>
        <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={[s.eyebrow,{flex:1}]}>{t.label}</Text><Text style={{fontSize:10,color:MUTED}}>{expanded?'⌃':'⌄'}</Text></View>
        <Text style={[s.tileValue,amountMode==='actual'&&t.key!=='target'&&t.key!=='billed'&&t.key!=='receipts'&&{fontSize:13}]}>{metricDisplay(t.value)}</Text>
        {t.sub?<Text style={[s.note,{color:t.sub.startsWith('▼')?'#B6402B':t.sub.startsWith('▲')?GREEN:MUTED}]}>{t.sub}</Text>:null}
        {t.key==='target'&&selectedTargetSummary.achievement!==null?<Text style={s.note}>Collected {displayAmount(selectedTargetSummary.collected)} · Target {displayAmount(selectedTargetSummary.target)} · {fy===activeFY?'Apr–'+NAMES[comparableIndex]:'Apr–Mar'}</Text>:null}
        {t.series.length>1?<View style={{height:24,flexDirection:'row',alignItems:'flex-end',gap:3,marginTop:8}}>{t.series.map((v,i)=><Pressable key={i} accessibilityLabel={`${available[i]?.label||NAMES[i]}: ${displayAmount(v)}`} onHoverIn={()=>setSparkPoint(i)} onPress={(event)=>{event.stopPropagation();setSparkPoint(sparkPoint===i?null:i);}} style={{flex:1,height:'100%',justifyContent:'flex-end'}}><View style={{height:`${Math.max(5,v/Math.max(1,...t.series)*100)}%` as any,backgroundColor:sparkPoint===i?'#176F58':'#9CBBCB'}}/></Pressable>)}</View>:null}
        {t.series.length>1&&sparkPoint!==null&&t.series[sparkPoint]!==undefined?<Text style={[s.note,{color:INK,fontWeight:'700'}]}>{available[sparkPoint]?.label||NAMES[sparkPoint]}: {displayAmount(t.series[sparkPoint])} · tap a bar to compare</Text>:null}
         {expanded?<View style={{marginTop:12,borderTopWidth:1,borderTopColor:BORDER,paddingTop:10}}>
           <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:7}}>
             <Text style={s.eyebrow}>YEAR</Text>
             <View style={{flexDirection:'row',alignItems:'center',gap:18}}>
               <Text style={s.eyebrow}>{t.label}</Text>
               {t.key==='target'?<Text style={s.eyebrow}>CHANGE</Text>:null}
             </View>
           </View>
           {historyYears.map((y,idx)=>{
             const value=metricFor(y);
             const previous=idx>0?metricFor(historyYears[idx-1]):null;
             const yearChange=t.key==='target'&&value!==null&&previous!==null&&previous>0?(value/previous-1)*100:null;
             const compared=t.key==='target'?targetSummary(y,true):null;
             const fullYear=t.key==='target'&&y!==activeFY?targetSummary(y,false):null;
             const fullCollected=t.key==='target'&&y!==activeFY?fySum(y,11):null;
             return <Pressable key={y} accessibilityRole="button" accessibilityLabel={`View ${fyName(y)} Payment Collection and monthly amounts`} onPress={(event)=>{event.stopPropagation?.();changeFY(y);}} style={{paddingVertical:10,borderBottomWidth:1,borderBottomColor:BORDER}}>
               <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8}}>
                 <Text style={[s.note,{flex:1,fontWeight:'800'},y===fy&&{color:'#23658A'}]}>{fyName(y)} {y===activeFY?'· to date':'· Apr–'+NAMES[comparableIndex]} ›</Text>
                 <Text style={[s.note,{fontWeight:'900',color:INK,textAlign:'right',minWidth:56}]}>{metricDisplay(value)}</Text>
                 {t.key==='target'?<Text style={[s.note,{fontWeight:'800',color:yearChange===null?MUTED:yearChange>=0?GREEN:'#B6402B',textAlign:'right',width:100}]}>{idx===0?'—':yearChange===null?'—':`${yearChange>=0?'▲':'▼'} ${Math.abs(yearChange).toFixed(1)}%`}</Text>:null}
               </View>
               {compared&&compared.achievement!==null?<Text style={[s.note,{marginTop:5}]}>Collected {displayAmount(compared.collected)} · Target {displayAmount(compared.target)}</Text>:null}
               {t.key==='target'&&y!==activeFY?<View style={{marginTop:7,padding:8,backgroundColor:'#F5F2EE',borderRadius:6}}>
                 <Text style={[s.note,{fontWeight:'800',color:INK}]}>Full FY {fyName(y)}{fullYear?.achievement!==null&&fullYear?.achievement!==undefined?` · ${fullYear.achievement.toFixed(1)}%`:''}</Text>
                 <Text style={[s.note,{marginTop:3}]}>Collected {displayAmount(fullCollected)} · Target {fullYear?.target!==null&&fullYear?.target!==undefined?displayAmount(fullYear.target):'—'}</Text>
                 {y!==fy?<Text style={[s.link,{marginTop:4}]}>View full year ›</Text>:null}
               </View>:null}
               {t.key==='target'&&value===null?<Text style={[s.note,{marginTop:3,color:'#9D5011'}]}>{comparisonBusy?'Loading…':missingTargetLabel(y,true)}</Text>:null}
             </Pressable>;
           })}
           {t.info?<Text style={[s.note,{marginTop:8}]}>{t.info}</Text>:null}
           {t.key==='peak'&&peak?<Text style={[s.note,{marginTop:5}]}>Best available month: {peak.label}. Select the month in the monthly breakdown below.</Text>:null}
           {t.key==='target'?<>
             <Pressable accessibilityRole="button" accessibilityLabel={targetBreakdownOpen?'Hide monthly achievement breakdown':'Show full monthly achievement breakdown'} onPress={(event)=>{event.stopPropagation?.();setTargetBreakdownOpen(open=>!open);}} style={{alignSelf:'flex-start',paddingVertical:10,paddingRight:16,marginTop:2}}><Text style={s.link}>{targetBreakdownOpen?'Hide months ⌃':'View monthly details ›'}</Text></Pressable>
             {targetBreakdownOpen?<View style={{marginTop:4}}>
               <Text style={[s.eyebrow,{marginBottom:6}]}>MONTH BY MONTH · {fyName(fy)}</Text>
               {fy!==activeFY&&!historicalFullYearVerified?<Text style={[s.note,{color:'#9D5011',marginBottom:8}]}>Some months are unavailable. Showing the amounts we have.</Text>:null}
               {months.slice(0,fy===activeFY?comparableIndex+1:12).map((m,i)=>{
                 const percent=monthAchievement(m?.amount??null,m?.target??null);
                 return <View key={`${fy}-${i}`} style={{paddingVertical:7,borderBottomWidth:1,borderBottomColor:BORDER}}>
                   <View style={{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap',gap:6}}>
                     <Text style={[s.rankName,{minWidth:34}]}>{NAMES[i]}</Text>
                     <Text style={[s.note,{fontWeight:'700'}]}>Target {displayAmount(m?.target??null)}</Text>
                     <Text style={[s.note,{fontWeight:'700'}]}>Collected {displayAmount(m?.amount??null)}</Text>
                     <Text style={{fontSize:11,fontWeight:'800',color:percent===null?MUTED:percent>=100?GREEN:INK}}>{percent===null?'—':`${percent.toFixed(1)}%`}</Text>
                   </View>
                   {m?.targetError?<Text style={[s.note,{color:'#9D5011'}]}>{m.targetError}</Text>:null}
                 </View>;
               })}
               {selectedTargetSummary.achievement!==null?<AmountTotal format={displayAmount} label={`TOTAL TARGET · ${fy===activeFY?'TO DATE':'FULL YEAR'}`} count={selectedTargetSummary.verified} total={selectedTargetSummary.target||0} secondary={`Collected: ${displayAmount(selectedTargetSummary.collected)} · Achievement: ${selectedTargetSummary.achievement.toFixed(2)}%`}/>:<Text style={[s.note,{marginTop:8,color:'#9D5011'}]}>{comparisonBusy?'Loading monthly reports…':missingTargetLabel(fy,fy===activeFY)}</Text>}
             </View>:null}
           </>:null}
         </View>:null}
      </Pressable>;
    })}</View>
    <View style={s.sectionHeading}><Text style={s.sectionTitle}>CUMULATIVE · THE CHASE</Text><Text style={s.note}>Tap a point for FY values · dashed reference at current stage</Text></View>
    <View style={s.panel}><View style={{width:'100%',alignItems:'center'}}><Svg viewBox={`0 0 ${plotW} ${plotH}`} width="100%" height={210}>
      <Line x1={20+comparableIndex*(plotW-40)/11} y1={0} x2={20+comparableIndex*(plotW-40)/11} y2={plotH} stroke="#9B938B" strokeDasharray="4 4" strokeWidth="1"/>
      {curves.map((c,i)=><Polyline key={c.y} points={points(c.values)} fill="none" stroke={['#B8B0A8','#77726E','#176F58'][i]} strokeWidth={i===2?3:2}/>) }
      {curves.map((c,i)=>c.values.map((v,j)=>v===null?null:<Circle key={`${c.y}-${j}`} cx={20+j*(plotW-40)/11} cy={plotH-18-(v/graphMax)*(plotH-36)} r={chartPoint===j?6:4} onPress={()=>setChartPoint(j)} fill={['#B8B0A8','#77726E','#176F58'][i]}/>))}
    </Svg></View><View style={{flexDirection:'row',justifyContent:'space-between'}}>{NAMES.map((n,i)=><Pressable key={n} onPress={()=>setChartPoint(i)} style={{paddingVertical:8,flex:1,alignItems:'center'}}><Text style={[s.note,chartPoint===i&&{fontWeight:'900',color:GREEN}]}>{n}</Text></Pressable>)}</View>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:14,marginTop:7}}>{historyYears.map((y,i)=><Text key={y} style={{fontSize:11,color:['#B8B0A8','#77726E','#176F58'][i],fontWeight:'800'}}>{fyName(y)} · {displayAmount(fySum(y,chartPoint??comparableIndex))}</Text>)}</View>
    {chartPoint!==null?<Text style={s.note}>{NAMES[chartPoint]} cumulative values · tap another month to compare</Text>:null}
    </View>
    <View style={[s.panel,{marginTop:0}]}><Text style={s.eyebrow}>COLLECTION PACE · VERIFIED RECEIPTS</Text><Text style={s.note}>{requiredPace!==null?`To exceed ${fyName(fy-1)} full-year collection (${displayAmount(priorFull)}), ${displayAmount(requiredPace)} per remaining month is required over ${monthsRemaining} months. Current average: ${displayAmount(avg)} per available month.`:'Pace comparison is shown only when complete previous-year receipt data is available.'}</Text><Text style={s.note}>Achievement vs Target sums verified opening-outstanding monthly Collection targets from the same Collection reports; percentages are withheld when a required month is unavailable.</Text></View>
    <View style={s.sectionHeading}><Text style={s.sectionTitle}>Month by Month · Three Years</Text><Text style={s.note}>Hover or tap a bar for all three FY amounts</Text></View>
    <View style={s.panel}>
     <View style={{flexDirection:'row',justifyContent:'flex-end',gap:14,flexWrap:'wrap',marginBottom:14}}>{historyYears.map((y,yi)=><View key={y} style={{flexDirection:'row',alignItems:'center',gap:5}}><View style={{height:9,width:9,backgroundColor:['#C6B7A5','#859DA8',GREEN][yi],borderRadius:2}}/><Text style={s.note}>{fyName(y)}</Text></View>)}</View>
     <View style={{flexDirection:'row',alignItems:'flex-end',height:215,gap:3}}>{NAMES.map((name,i)=>{const values=historyYears.map(y=>(y===fy?months:history[y])?.[i]?.amount??null);const maxV=Math.max(1,...historyYears.flatMap(y=>(y===fy?months:history[y]||[]).map(m=>m?.amount||0)));return <Pressable key={name} onPress={()=>setChartMonth(chartMonth===i?null:i)} onHoverIn={()=>setChartMonth(i)} style={{flex:1,alignItems:'center',justifyContent:'flex-end',height:'100%'}} accessibilityLabel={`${name}: ${values.map((v,j)=>fyName(historyYears[j])+' '+displayAmount(v)).join(', ')}`}><View style={{flex:1,width:'100%',flexDirection:'row',alignItems:'flex-end',justifyContent:'center',gap:2}}>{values.map((v,j)=><View key={j} style={{width:'29%',maxWidth:13,height:v===null?0:`${Math.max(2,v/maxV*100)}%` as any,backgroundColor:['#C6B7A5','#859DA8',GREEN][j],borderTopLeftRadius:2,borderTopRightRadius:2}}/>)}</View><Text style={{fontSize:10,color:INK,marginTop:8}}>{name}</Text></Pressable>;})}</View>
     <View style={{marginTop:12,borderTopWidth:1,borderTopColor:BORDER,paddingTop:10,gap:5}}><Text style={s.eyebrow}>FINANCIAL-YEAR COLLECTION TOTALS</Text>{historyYears.map(y=>{const source=y===fy?months:history[y];const valid=source?.filter(m=>m.amount!==null)||[];return <View key={y} style={{flexDirection:'row',justifyContent:'space-between',gap:6}}><Text style={s.note}>{fyName(y)} · {valid.length} months</Text><Text style={[s.note,{fontWeight:'800',color:INK}]}>{valid.length>0?displayAmount(valid.reduce((sum,m)=>sum+(m.amount||0),0)): '—'}{valid.length<(y===activeFY?comparableIndex+1:12)?' · incomplete':''}</Text></View>;})}</View>
     {chartMonth!==null?<View style={{backgroundColor:'#F5F2EE',padding:12,borderRadius:8,marginTop:12}}><Text style={s.rankName}>{NAMES[chartMonth]} · Three-FY comparison</Text>{historyYears.map(y=>{const m=(y===fy?months:history[y])?.[chartMonth];return <Text key={y} style={s.note}>{fyName(y)}: {m?.amount===null||m?.amount===undefined?"Not available":displayAmount(m.amount)} · {m?.rows?.length??0} executive rows</Text>;})}<Pressable onPress={()=>chooseMonth(chartMonth)} style={{paddingVertical:9}}><Text style={s.link}>Open {NAMES[chartMonth]} collection ›</Text></Pressable></View>:null}
    </View>
    {month!==null?<View style={s.monthPanel}><Text style={s.sectionTitle}>{NAMES[month]} {fy+(month>=9?1:0)}</Text><Text style={s.tileValue}>{displayAmount(months[month]?.amount??null)}</Text><Text style={s.note}>Monthly Collection total · {displayAmount(months[month]?.amount??null)} · {months[month]?.rows?.length??0} executives</Text><Pressable onPress={()=>setMonth(null)}><Text style={s.link}>Show full FY ›</Text></Pressable></View>:null}
   </>:null}
   {executive&&!customer?<View style={{marginTop:12,marginBottom:12}}><Text style={s.eyebrow}>PERIOD · {month===null?'ALL MONTHS':NAMES[month].toUpperCase()}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:8}}>{[{label:'All Months',i:null as number|null},...NAMES.map((label,i)=>({label,i}))].map(x=><Pressable key={x.label} onPress={()=>{if(month===x.i||(x.i!==null&&months[x.i]?.amount===null))return;setMonth(x.i);setPaymentMode(null);setReceiptDays([]);setCustomers([]);setExpandedReceipt(null);setSearch('');const currentExecutive=executive;const currentCustomer=customer;if(currentExecutive){const epoch=++requestEpoch.current;setLoadingDetail(true);setLoadingReceipts(!!currentCustomer);(async()=>{const source=x.i===null?months.filter(m=>m.amount!==null):(months[x.i]?[months[x.i]]:[]);const lists:Row[][]=[];const days=new Map<string,ReceiptDay>();let errors=0;for(const m of source){if(!m||m.amount===null)continue;try{const result=await fetchReport(m.date,'parties',currentExecutive.code);lists.push(result.rows);if(currentCustomer){const response:any=await api.getOwnerCardReport({date:m.date,prptype,view,report_type:'collection',level:'parties',executive_code:currentExecutive.code,party_code:currentCustomer.code});if(!response?.success)throw Error('Receipt details unavailable');for(const d of response?.data?.report?.history||[]){const key=String(d.date_ymd);const old=days.get(key);days.set(key,{date:key,label:String(d.date_label||key),amount:(old?.amount||0)+Number(d.amount||0),entries:(old?.entries||0)+Number(d.entry_count||0),receipts:[...(old?.receipts||[]),...((d.parties||[]).flatMap((party:any)=>party.receipts||[]) as ReceiptItem[])]});}}}catch{errors++;}}if(epoch!==requestEpoch.current)return;const next=merge(lists);setCustomers(next);setLoadingDetail(false);if(currentCustomer){setCustomer(next.find(r=>r.code===currentCustomer.code)||currentCustomer);setReceiptDays([...days.values()].sort((a,b)=>b.date.localeCompare(a.date)));setLoadingReceipts(false);}setDetailError(errors?`${errors} month(s) unavailable`:'' );})();}}} style={{paddingHorizontal:10,paddingVertical:8,borderRadius:7,backgroundColor:month===x.i?DARK:'#FFFFFF',borderWidth:1,borderColor:BORDER}}><Text style={{fontSize:11,fontWeight:'700',color:month===x.i?'#FFFFFF':INK}}>{x.label}</Text></Pressable>)}</View></View>:null}
   {customer?<View style={[s.panel,{padding:0,overflow:'hidden'}]}>
     <View style={{backgroundColor:'#205D7D',padding:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
       <View style={{flex:1,flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:5}} accessibilityRole="navigation">
         <Pressable accessibilityRole="button" accessibilityLabel="Back to FY collection overview" onPress={toOverview} style={{paddingVertical:6,paddingHorizontal:3}}><Text style={{fontSize:12,color:'#FFFFFF',fontWeight:'800',textDecorationLine:'underline'}}>{fyName(fy)}</Text></Pressable>
         <Text style={{color:'#FFFFFF'}}>›</Text>
         <Pressable accessibilityRole="button" accessibilityLabel={`Back to ${executive?.name} customers`} onPress={toExecutive} style={{paddingVertical:6,paddingHorizontal:3}}><Text style={{fontSize:12,color:'#FFFFFF',fontWeight:'800',textDecorationLine:'underline'}}>{executive?.name}</Text></Pressable>
         <Text style={{color:'#FFFFFF'}}>›</Text>
         {paymentMode?<Pressable accessibilityRole="button" accessibilityLabel={`Back to ${customer.name} payment modes`} onPress={()=>{setPaymentMode(null);setExpandedReceipt(null);}} style={{paddingVertical:6,paddingHorizontal:3}}><Text style={{fontSize:12,color:'#FFFFFF',fontWeight:'800',textDecorationLine:'underline'}}>{customer.name}</Text></Pressable>:<Text style={{fontSize:12,color:'#FFFFFF',fontWeight:'800'}}>{customer.name}</Text>}
         {paymentMode?<><Text style={{color:'#FFFFFF'}}>›</Text><Text style={{fontSize:12,color:'#FFFFFF',fontWeight:'800'}}>{paymentMode==='ALL_RECEIPTS'?'All Receipts':paymentMode}</Text></>:null}
       </View>
       <Text style={{fontSize:13,color:'#FFFFFF',fontWeight:'800'}}>{displayAmount(paymentMode?selectedReceiptAmount:customer.amount)} · {paymentMode?selectedReceipts.length:modeCount} receipts</Text>
     </View>
     <View style={{padding:12}}>
   {customer?<View style={{marginTop:12,marginBottom:12}}><Text style={s.eyebrow}>PERIOD · {month===null?'ALL MONTHS':NAMES[month].toUpperCase()}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:8}}>{[{label:'All Months',i:null as number|null},...NAMES.map((label,i)=>({label,i}))].map(x=><Pressable key={x.label} onPress={()=>{if(month===x.i||(x.i!==null&&months[x.i]?.amount===null))return;setMonth(x.i);setPaymentMode(null);setReceiptDays([]);setCustomers([]);setExpandedReceipt(null);setSearch('');const currentExecutive=executive;const currentCustomer=customer;if(currentExecutive){const epoch=++requestEpoch.current;setLoadingDetail(true);setLoadingReceipts(!!currentCustomer);(async()=>{const source=x.i===null?months.filter(m=>m.amount!==null):(months[x.i]?[months[x.i]]:[]);const lists:Row[][]=[];const days=new Map<string,ReceiptDay>();let errors=0;for(const m of source){if(!m||m.amount===null)continue;try{const result=await fetchReport(m.date,'parties',currentExecutive.code);lists.push(result.rows);if(currentCustomer){const response:any=await api.getOwnerCardReport({date:m.date,prptype,view,report_type:'collection',level:'parties',executive_code:currentExecutive.code,party_code:currentCustomer.code});if(!response?.success)throw Error('Receipt details unavailable');for(const d of response?.data?.report?.history||[]){const key=String(d.date_ymd);const old=days.get(key);days.set(key,{date:key,label:String(d.date_label||key),amount:(old?.amount||0)+Number(d.amount||0),entries:(old?.entries||0)+Number(d.entry_count||0),receipts:[...(old?.receipts||[]),...((d.parties||[]).flatMap((party:any)=>party.receipts||[]) as ReceiptItem[])]});}}}catch{errors++;}}if(epoch!==requestEpoch.current)return;const next=merge(lists);setCustomers(next);setLoadingDetail(false);if(currentCustomer){setCustomer(next.find(r=>r.code===currentCustomer.code)||currentCustomer);setReceiptDays([...days.values()].sort((a,b)=>b.date.localeCompare(a.date)));setLoadingReceipts(false);}setDetailError(errors?`${errors} month(s) unavailable`:'' );})();}}} style={{paddingHorizontal:10,paddingVertical:8,borderRadius:7,backgroundColor:month===x.i?DARK:'#FFFFFF',borderWidth:1,borderColor:BORDER}}><Text style={{fontSize:11,fontWeight:'700',color:month===x.i?'#FFFFFF':INK}}>{x.label}</Text></Pressable>)}</View></View>:null}
       {loadingReceipts?<SkeletonLines count={6}/>:null}
       {receiptError?<Text style={s.warningText}>{receiptError}</Text>:null}
       {!loadingReceipts&&receiptDays.length>0&&Math.abs(modeTotal-customer.amount)>0.02?<Text style={s.warningText}>Receipt breakdown differs from customer summary by {displayAmount(Math.abs(modeTotal-customer.amount))}. Check incomplete periods or source allocation.</Text>:null}
       {!paymentMode?<>
         <Text style={[s.note,{marginBottom:10}]}>BY PAYMENT MODE · {month===null?'All available months':`${NAMES[month]} ${fy+(month>=9?1:0)}`} · {modeCount} receipt entries</Text>
         <View style={{flexDirection:'row',justifyContent:'space-between',borderBottomWidth:1,borderColor:BORDER,paddingBottom:7}}><Text style={s.eyebrow}>MODE</Text><Text style={s.eyebrow}>RECEIPTS       COLLECTED</Text></View>
         {modeGroups.map(g=><Pressable key={g.mode} onPress={()=>setPaymentMode(g.mode)} style={s.rankRow}><View style={{flex:1}}><Text style={s.rankName}>{g.mode}</Text><View style={[s.rankTrack,{marginRight:16}]}><View style={[s.rankFill,{width:`${modeTotal>0?Math.min(100,g.amount/modeTotal*100):0}%` as any}]}/></View></View><Text style={s.note}>{g.receipts.length}     </Text><Text style={s.rankAmount}>{displayAmount(g.amount)} ›</Text></Pressable>)}
         {!loadingReceipts?<AmountTotal format={displayAmount} label="RECEIPTS ACROSS MODES" count={modeCount} total={modeTotal} secondary={`${modeGroups.length} modes · receipt-level amounts (distinct UID + SrNo)`}/>:null}
         {modeGroups.length>0?<Pressable onPress={()=>setPaymentMode('ALL_RECEIPTS')} style={{paddingVertical:12}}><Text style={s.link}>Show {modeCount} receipt entries ›</Text></Pressable>:null}
       </>:<>
         <Pressable onPress={()=>setPaymentMode(null)}><Text style={s.link}>‹ All payment modes</Text></Pressable>
         <View style={{flexDirection:'row',justifyContent:'space-between',paddingVertical:8,borderBottomWidth:1,borderColor:BORDER}}><Text style={s.eyebrow}>RECEIPTS · {paymentMode==='ALL_RECEIPTS'?'ALL MODES':paymentMode}</Text><Text style={s.eyebrow}>COLLECTED</Text></View>
         {!loadingReceipts?<AmountTotal format={displayAmount} label="SELECTED RECEIPTS" count={selectedReceipts.length} total={selectedReceiptAmount} secondary={paymentMode==='ALL_RECEIPTS'?'All payment modes':'Payment mode '+String(paymentMode||'')}/>:null}
         {selectedReceipts.map((r,i)=>{const key=`${r.date}:${r.receipt_uid}:${r.receipt_srno}`;return <View key={key+'-'+i}><Pressable onPress={()=>setExpandedReceipt(expandedReceipt===key?null:key)} style={s.rankRow}><View style={{flex:1}}><Text style={s.rankName}>{r.voucher_no||'Voucher not recorded'} · {paymentMode==='ALL_RECEIPTS'?(('groupMode' in r)?r.groupMode:'Unclassified'):paymentMode}</Text><Text style={s.note}>{r.dateLabel} · Ref {r.payment_reference||'—'}</Text></View><Text style={s.rankAmount}>{displayAmount(r.amount)} {expandedReceipt===key?'⌃':'⌄'}</Text></Pressable>{expandedReceipt===key?<View style={{padding:10,backgroundColor:BG,borderRadius:7}}><Text style={s.note}>Voucher: {r.voucher_no||'—'} · Receipt UID: {r.receipt_uid} · SrNo: {r.receipt_srno}</Text><Text style={s.note}>Reference: {r.payment_reference||'—'} · Bank: {r.bank_name||'Not recorded'}</Text><Text style={s.note}>Allocations: {r.allocation_count} · Amount: {displayAmount(r.amount)}</Text></View>:null}</View>;})}
         {!loadingReceipts?<AmountTotal format={displayAmount} label="RECEIPTS TOTAL" count={selectedReceipts.length} total={selectedReceiptAmount}/>:null}
       </>}
       {!loadingReceipts&&!receiptDays.length?<Text style={s.note}>No receipt history returned for this customer in the selected period.</Text>:null}
     </View>
   </View>:<><View style={s.sectionHeading}><Text style={s.sectionTitle}>{executive?'Customer collections':month===null?'Top executives · '+fyName(fy):'Executives · '+NAMES[month]}</Text><Pressable onPress={()=>setAscending(x=>!x)}><Text style={s.link}>Amount {ascending?'↑':'↓'}</Text></Pressable></View>
   <View style={s.panel}><TextInput style={s.search} placeholder={executive?'Search customer':'Search executive'} value={search} onChangeText={setSearch}/>
    {!busy&&!loadingDetail?<AmountTotal format={displayAmount} label={`${searchActive?'MATCHING ':'TOTAL '}${listKind}`} count={visible.length} total={visibleTotal} secondary={listSecondary}/>:null}
    {executive?<Pressable onPress={()=>{setExecutive(null);setCustomers([]);setSearch('')}}><Text style={s.link}>‹ All executives</Text></Pressable>:null}
    {loadingDetail?<SkeletonLines count={8}/>:null}{detailError?<Text style={s.warningText}>{detailError}</Text>:null}
    {!loadingDetail&&visible.map((r,i)=><Pressable key={`${r.code}-${i}`} style={s.rankRow} onPress={()=>{if(!executive){void pickExecutive(r);}else{void pickCustomer(r);}}}><Text style={s.rank}>{i+1}</Text><View style={{flex:1}}><Text numberOfLines={1} style={s.rankName}>{r.name}</Text><View style={s.rankTrack}><View style={[s.rankFill,{width:`${Math.min(100,Math.max(0,r.amount)/(Math.max(1,...selectedRows.map(x=>x.amount)))*100)}%` as any}]}/></View></View><Text style={s.rankAmount}>{displayAmount(r.amount)} ›</Text></Pressable>)}
    {!busy&&!loadingDetail&&visible.length===0?<Text style={s.note}>No matching records.</Text>:null}
    {!busy&&!loadingDetail&&visible.length>0?<AmountTotal format={displayAmount} label={`${searchActive?'FILTERED ':'LIST '}TOTAL · ${listKind}`} count={visible.length} total={visibleTotal} secondary={searchActive?`Overall ${selectedRows.length} records · ${displayAmount(selectedTotal)}`:Math.abs(listDifference)>0.02?`Parent total difference ${displayAmount(Math.abs(listDifference))} · check source allocation`:'Matches all displayed records'}/>:null}
    {executive?<Text style={s.note}>Select a customer to view receipt history within FY Payment Collection.</Text>:null}
   </View></>}
  </View></ScrollView>
 </View>;
}
function Skeleton({width='100%',height=14,radius=6}: {width?:number|string;height?:number;radius?:number}) {return <View accessibilityLabel="Loading content" style={{width:width as any,height,backgroundColor:'#EAE5DF',borderRadius:radius,opacity:0.9}}/>;}
function SkeletonLines({count=5,kind='rows'}:{count?:number;kind?:'rows'|'chart'}){return <View style={{gap:14,paddingVertical:10}}>{Array.from({length:count},(_,i)=><View key={i} style={{flexDirection:'row',alignItems:'center',gap:12,minHeight:kind==='chart'?27:39}}><Skeleton width={kind==='chart'?32:25} height={11}/><View style={{flex:1,gap:7}}><Skeleton width={`${Math.max(28,90-i*9)}%`} height={kind==='chart'?13:12}/>{kind==='rows'?<Skeleton width={`${Math.max(20,52-i*4)}%`} height={7}/>:null}</View><Skeleton width={kind==='chart'?75:68} height={12}/></View>)}</View>;}
function OverviewSkeleton({width}:{width:number}){return <View accessibilityLabel="Loading FY collection overview"><View style={{backgroundColor:'#fff',borderRadius:13,padding:13,borderLeftWidth:3,borderLeftColor:'#D5D0C9',marginBottom:14,gap:14}}><Skeleton width={190} height={10}/><Skeleton width={210} height={30}/><Skeleton width={250} height={12}/><View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{[0,1,2].map(i=><View key={i} style={{flex:1,minWidth:145,backgroundColor:'#F5F2EE',borderRadius:9,padding:12,gap:10}}><Skeleton width={80} height={10}/><Skeleton width={115} height={19}/><Skeleton width={100} height={10}/></View>)}</View></View><View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginBottom:18}}>{[0,1,2,3].map(i=><View key={i} style={{width:width>740?'24%':'48%',backgroundColor:'#fff',padding:14,borderRadius:10,gap:12,minHeight:100}}><Skeleton width="75%" height={10}/><Skeleton width="80%" height={22}/><Skeleton width="60%" height={10}/></View>)}</View><Skeleton width={190} height={16}/><View style={{backgroundColor:'#fff',borderRadius:12,padding:16,marginTop:10,marginBottom:20}}><SkeletonLines kind="chart" count={7}/></View><Skeleton width={210} height={16}/><View style={{backgroundColor:'#fff',borderRadius:12,padding:16,marginTop:10}}><SkeletonLines kind="chart" count={7}/></View></View>;}
const s=StyleSheet.create({breadcrumbs:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:7,backgroundColor:'#FFFFFF',borderRadius:9,borderWidth:1,borderColor:'#E7DFD5',paddingHorizontal:12,paddingVertical:9,marginBottom:12},crumbPress:{paddingVertical:5,paddingHorizontal:3,maxWidth:'100%'},crumbLink:{fontSize:12,fontWeight:'800',color:'#176F58'},crumbCurrent:{fontSize:12,fontWeight:'800',color:'#162334',flexShrink:1},crumbSeparator:{fontSize:17,color:'#827B73'},webOverlay:{position:'fixed' as any,top:0,right:0,bottom:0,left:0,zIndex:9999},yearCard:{backgroundColor:'#F5F2EE',borderRadius:9,padding:10,flexGrow:1,minWidth:150},yearCardActive:{backgroundColor:'#205D7D'},root:{flex:1,backgroundColor:BG},header:{backgroundColor:DARK,padding:10,paddingTop:10,flexDirection:'row',alignItems:'center',gap:12},headerButton:{padding:4},headerIcon:{color:'#fff',fontSize:30},headerTitle:{color:'#fff',fontWeight:'800',fontSize:17},headerSub:{color:'#B9C5D0',fontSize:11,marginTop:4},outer:{padding:16,paddingBottom:60},content:{width:'100%',maxWidth:718,alignSelf:'center'},chips:{gap:8,marginBottom:15},chip:{backgroundColor:'#fff',borderRadius:9,borderWidth:1,borderColor:BORDER,paddingVertical:10,paddingHorizontal:13},chipActive:{backgroundColor:DARK},chipLabel:{fontSize:12,fontWeight:'700',color:INK},white:{color:'#fff'},hero:{backgroundColor:'#fff',borderRadius:13,padding:13,borderLeftWidth:3,borderLeftColor:'#205D7D',marginBottom:10,flexDirection:'row',flexWrap:'wrap',gap:14},eyebrow:{fontSize:10,color:MUTED,fontWeight:'800',letterSpacing:.5},heroValue:{fontSize:27,color:INK,fontWeight:'900',marginTop:8},note:{fontSize:11,color:MUTED,marginTop:5},heroAside:{flex:1,minWidth:190,justifyContent:'center',gap:8},heroAsideText:{fontSize:11,color:INK},tiles:{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:12},tile:{backgroundColor:'#fff',borderRadius:11,padding:10,minHeight:105},tileValue:{fontSize:17,color:INK,fontWeight:'800',marginTop:8},expand:{color:GREEN,alignSelf:'flex-end'},sectionHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,marginTop:12,marginBottom:10},sectionTitle:{fontSize:15,color:INK,fontWeight:'800',flexShrink:1},panel:{backgroundColor:'#fff',borderRadius:12,padding:14,marginBottom:12},chart:{gap:3},chartRow:{flexDirection:'row',alignItems:'center',paddingVertical:8,gap:10},monthName:{width:29,color:INK,fontSize:12},track:{height:14,backgroundColor:'#EEE9E4',borderRadius:5,flex:1,overflow:'hidden'},trackSelected:{borderWidth:1,borderColor:GREEN},fill:{height:'100%',backgroundColor:GREEN},monthAmount:{width:100,textAlign:'right',fontSize:11,fontWeight:'700',color:INK},monthPanel:{backgroundColor:'#E9F3EF',borderRadius:10,padding:14,marginBottom:12},link:{color:GREEN,fontSize:12,fontWeight:'800',marginVertical:5},search:{borderWidth:1,borderColor:BORDER,borderRadius:8,padding:10,marginBottom:10,fontSize:13},rankRow:{flexDirection:'row',gap:12,alignItems:'center',paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#F0ECE7'},rank:{width:18,color:MUTED,fontSize:12},rankName:{color:INK,fontSize:12,fontWeight:'700'},rankTrack:{height:5,backgroundColor:'#EEE9E4',borderRadius:5,marginTop:8},rankFill:{height:5,backgroundColor:GREEN,borderRadius:5},rankAmount:{fontSize:12,fontWeight:'800',color:GREEN},warning:{backgroundColor:'#FFF3E4',padding:12,borderRadius:8,marginBottom:10},warningText:{fontSize:12,color:'#9D5011'}});
