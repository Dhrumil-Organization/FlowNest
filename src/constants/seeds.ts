export const MI_MAP: Record<string, any> = {
  Y01:{ name:'20 Lea Linen',  sys:'Lea', cnt:20, price:550 },
  Y02:{ name:'30 Lea Linen',  sys:'Lea', cnt:30, price:620 },
  Y03:{ name:'40 Lea Linen',  sys:'Lea', cnt:40, price:700 },
  Y04:{ name:'60 Lea Linen',  sys:'Lea', cnt:60, price:850 },
  Y06:{ name:'30 Ne L/C',     sys:'Ne',  cnt:30, price:480 },
  Y07:{ name:'40 Ne L/C',     sys:'Ne',  cnt:40, price:540 },
  Y12:{ name:'40s Cotton',    sys:'Ne',  cnt:40, price:310 },
  Y14:{ name:'75D Polyester', sys:'Den', cnt:75, price:170 },
  Y16:{ name:'150 Mestre',    sys:'Den', cnt:150,price:120 },
  Y19:{ name:'75/72FD Roto HIM',sys:'Den',cnt:75,price:155 },
}

export const SEED_MAINS = [
  { id:'MD01', code:'Passat',    category:'Linen Shirting', type:'YD', weave:'Dobby — fine dobby',
    warpYarns:[{miId:'Y03',epi:56},{miId:'Y07',epi:40}], weftYarns:[{miId:'Y07',ppi:52}],
    reedSpace:64, warpShrink:6, finWidth:58, gfShrink:5, finishLocked:true },
  { id:'MD02', code:'Oxford',    category:'Linen Shirting', type:'YD', weave:'Oxford weave',
    warpYarns:[{miId:'Y04',epi:80}], weftYarns:[{miId:'Y04',ppi:48}],
    reedSpace:63, warpShrink:7, finWidth:57, gfShrink:6, finishLocked:true },
  { id:'MD03', code:'Milano',    category:'Linen Shirting', type:'PD', weave:'Dobby — diamond motif',
    warpYarns:[{miId:'Y04',epi:100}], weftYarns:[{miId:'Y04',ppi:54}],
    reedSpace:64, warpShrink:6, finWidth:58, gfShrink:5, finishLocked:true },
  { id:'MD04', code:'Active Grid',category:'Sportswear',    type:'YD', weave:'Dobby — grid texture',
    warpYarns:[{miId:'Y12',epi:80},{miId:'Y14',epi:50}], weftYarns:[{miId:'Y14',ppi:68}],
    reedSpace:65, warpShrink:8, finWidth:56, gfShrink:8, finishLocked:true },
  { id:'MD07', code:'8228',      category:'Sportswear',     type:'PD', weave:'Dobby — twill',
    warpYarns:[{miId:'Y19',epi:96}], weftYarns:[{miId:'Y16',ppi:66}],
    reedSpace:90, warpShrink:5, finWidth:58, gfShrink:17, finishLocked:true },
]

export const SEED_ORDERS = [
  { soNumber:'SO-20260510-001', customer:'CU01', salesExec:'Rahul Mehta', mdId:'MD01',
    fabricType:'finished', price:262, date:'2026-05-10', deliveryDate:'2026-06-12', status:'authorized',
    colors:[{color:'Passat 1',qty:1500,pendingQty:0},{color:'Passat 16',qty:1000,pendingQty:0}] },
  { soNumber:'SO-20260514-002', customer:'CU02', salesExec:'Priya Shah', mdId:'MD04',
    fabricType:'finished', price:108, date:'2026-05-14', deliveryDate:'2026-06-20', status:'authorized',
    colors:[{color:'Active Grid 1',qty:1800,pendingQty:900}] },
  { soNumber:'SO-20260522-004', customer:'CU04', salesExec:'Sneha Patel', mdId:'MD02',
    fabricType:'greige', price:165, date:'2026-05-22', deliveryDate:'2026-06-18', status:'pending_auth',
    colors:[{color:'Oxford 1',qty:1500,pendingQty:1500}] },
]

export const CUSTOMERS: Record<string,any> = {
  CU01:{ name:'Bombay Garments Ltd',  city:'Mumbai' },
  CU02:{ name:'Delhi Textile House',  city:'Delhi' },
  CU04:{ name:'Surat Export House',   city:'Surat' },
}

export const CATS = ['Linen Shirting','Sportswear','Linen Suiting']