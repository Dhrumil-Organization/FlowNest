import { BeamShortageData, BeamLine } from './beamShortage/beamShortageModel';

const n=(v:any)=>{const x=Number(v);return Number.isFinite(x)?x:0;};
export function normalizeOwnerBeamShortage(response:any):BeamShortageData {
 const payload=response?.data?.report ?? response?.report ?? response?.data?.data?.report;
 if (!payload || !Array.isArray(payload.designs)) throw new Error('Unexpected Owner Dashboard Beam Shortage response');
 const lines:BeamLine[]=[];
 for(const design of payload.designs){
  if(!Array.isArray(design.beams)) throw new Error('Beam details are missing from the report');
  for(const b of design.beams){
   const property=String(b.prpcode ?? design.prpcode ?? '');
   const uid=String(b.beam_uid ?? '');
   const code=String(b.design_code ?? design.design_code ?? '');
   if(!property || !uid) throw new Error('Beam identity is missing from the report');
   const warped=n(b.warped_metres),produced=n(b.produced_metres),shortage=n(b.shortage_metres);
   lines.push({
    key:`${property}|${uid}|${code}`,designKey:`${property}|${code}`,
    dsnCode:code,dsnName:String(b.design_name ?? design.design_name ?? code),
    item:'',type:'',beamNo:String(b.beam_no ?? ''),beamUId:uid,
    yearNo:'',machine:String(b.machine_label ?? ''),warpDate:String(b.beam_date ?? ''),
    gaitDate:'',doneDate:String(b.last_checking_date ?? ''),status:'STOCK',
    warped,produced,shortage,shared:false
   });
  }
 }
 return {lines,summaryOnly:[]};
}
