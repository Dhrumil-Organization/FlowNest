/** Independent Owner Dashboard Beam Shortage adapter. No legacy report imports. */
export type OwnerBeam={id:string;prpcode:string;beamuid:string;dsncode:string;beamNo:string;loom:string;status:string;date:string;warped:number;actual:number;takas?:never[]};
export type OwnerDesign={id:string;prpcode:string;dsncode:string;name:string;category:string;beams:OwnerBeam[]};
const num=(v:any)=>{const n=Number(v);return Number.isFinite(n)?n:0};
export const fyStartOf=(s:string)=>{const y=Number(s.slice(0,4)),m=Number(s.slice(5,7));return `${m<4?y-1:y}-04-01`};
export const fyStartFromYearName=(name:any)=>{const m=String(name||'').match(/(20\d{2})/);return m?`${m[1]}-04-01`:''};
export const yearNoFor=(_from:string,yearNo:any,_fy:string)=>Number(yearNo);
export function parseOwnerReport(res:any):OwnerDesign[]{
 const data=res?.data?.report??res?.report??res?.data?.data?.report;
 if(!data||!Array.isArray(data.designs))throw Error('Beam shortage report data is unavailable');
 const out:OwnerDesign[]=[];let beamCount=0;let warped=0;let produced=0;
 for(const [designIndex,d] of data.designs.entries()){
   if(!Array.isArray(d.beams))throw Error('Beam details are missing from the Owner Dashboard response');
   const prpcode=String(d.prpcode||d.beams.find((b:any)=>b.prpcode)?.prpcode||'').trim();
   const dsncode=String(d.design_code??d.beams.find((b:any)=>b.design_code)?.design_code??'').trim();
   const name=String(d.design_name||dsncode||'Unnamed design').trim();
   // A few valid Owner Dashboard allocations have no DsnCode. Retain their metres
   // with a distinct display-only key; never send a fabricated DsnCode to ERP APIs.
   const designId=dsncode?`${prpcode}|${dsncode}`:`${prpcode}|unmapped|${designIndex}|${name}`;
   if(!prpcode)throw Error('Beam property is missing');
   const beams:OwnerBeam[]=d.beams.map((b:any)=>{
    const property=String(b.prpcode||prpcode),uid=String(b.beam_uid??'');
    if(!property||!uid)throw Error('Beam identity is missing');
    const w=num(b.warped_metres),a=num(b.produced_metres);warped+=w;produced+=a;beamCount++;
    return {id:`${property}|${uid}|${designId}`,prpcode:property,beamuid:uid,dsncode,beamNo:String(b.beam_no||uid),loom:String(b.machine_label||''),status:'Closed',date:String(b.last_checking_date||''),warped:w,actual:a};
   });
   out.push({id:designId,prpcode,dsncode,name,category:String(d.category_name??d.categoryName??d.category??d.item_category_name??'').trim(),beams});
 }
 // The source may represent multi-design beams as multiple allocations; preserve rows,
 // and check total metres instead of incorrectly discarding them.
 const summary=data.summary||{};
 if(Math.abs(warped-num(summary.warped_metres))>1 || Math.abs(produced-num(summary.produced_metres))>1)
   throw Error('Beam detail totals do not reconcile with the Owner Dashboard summary');
 return out;
}
