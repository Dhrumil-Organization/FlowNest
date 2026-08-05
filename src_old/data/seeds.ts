import type { MainDesign, SubDesign, SalesOrder, Customer, UserAccount } from '../types';

export const CUSTOMERS: Customer[] = [
    { id: 'CU01', name: 'Bombay Garments Ltd', exec: 'Rahul Mehta', city: 'Mumbai' },
    { id: 'CU02', name: 'Delhi Textile House', exec: 'Priya Shah', city: 'Delhi' },
    { id: 'CU03', name: 'Ahmedabad Fabrics Co', exec: 'Amit Joshi', city: 'Ahmedabad' },
    { id: 'CU04', name: 'Surat Export House', exec: 'Sneha Patel', city: 'Surat' },
    { id: 'CU05', name: 'Tirupur Knitwear', exec: 'Rahul Mehta', city: 'Tirupur' },
];

export const SEED_MAINS: MainDesign[] = [
    {
        id: 'MD01', code: 'Passat', category: 'Linen Shirting', type: 'YD',
        weave: 'Dobby — fine dobby',
        warpYarns: [{ miId: 'Y03', br: null, epi: 56 }, { miId: 'Y07', br: '70/30', epi: 40 }],
        weftYarns: [{ miId: 'Y07', br: '70/30', ppi: 52 }],
        reedSpace: 64, warpShrink: 6, finWidth: 58, gfShrink: 5, finishLocked: true,
        note: 'Classic linen-blend shirting base.',
    },
    {
        id: 'MD02', code: 'Oxford', category: 'Linen Shirting', type: 'YD',
        weave: 'Oxford weave',
        warpYarns: [{ miId: 'Y04', br: null, epi: 80 }],
        weftYarns: [{ miId: 'Y04', br: null, ppi: 48 }],
        reedSpace: 63, warpShrink: 7, finWidth: 57, gfShrink: 6, finishLocked: true,
        note: 'Two-up two-down oxford structure.',
    },
    {
        id: 'MD03', code: 'Milano', category: 'Linen Shirting', type: 'PD',
        weave: 'Dobby — diamond motif',
        warpYarns: [{ miId: 'Y04', br: null, epi: 100 }],
        weftYarns: [{ miId: 'Y04', br: null, ppi: 54 }],
        reedSpace: 64, warpShrink: 6, finWidth: 58, gfShrink: 5, finishLocked: true,
        note: 'Fine count piece-dye quality.',
    },
    {
        id: 'MD04', code: 'Active Grid', category: 'Sportswear', type: 'YD',
        weave: 'Dobby — grid texture',
        warpYarns: [{ miId: 'Y12', br: null, epi: 80 }, { miId: 'Y14', br: null, epi: 50 }],
        weftYarns: [{ miId: 'Y14', br: null, ppi: 68 }],
        reedSpace: 65, warpShrink: 8, finWidth: 56, gfShrink: 8, finishLocked: true,
        note: 'Poly-cotton performance grid.',
    },
    {
        id: 'MD05', code: 'Mesh Track', category: 'Sportswear', type: 'PD',
        weave: 'Dobby — open mesh',
        warpYarns: [{ miId: 'Y14', br: null, epi: 84 }],
        weftYarns: [{ miId: 'Y14', br: null, ppi: 44 }],
        reedSpace: 63, warpShrink: 6, finWidth: 58, gfShrink: 4, finishLocked: true,
        note: 'Lightweight piece-dye mesh.',
    },
    {
        id: 'MD06', code: 'Monaco', category: 'Linen Suiting', type: 'PD',
        weave: 'Plain — suiting',
        warpYarns: [{ miId: 'Y06', br: '50/50', epi: 84 }],
        weftYarns: [{ miId: 'Y06', br: '50/50', ppi: 56 }],
        reedSpace: 62, warpShrink: 7, finWidth: 56, gfShrink: 6, finishLocked: true,
        note: 'Linen-blend suiting base, piece dyed.',
    },
];

export const SEED_SUBS: SubDesign[] = [
    {
        id: 'SD01', mdId: 'MD01', code: 'Passat 1',
        warpPattern: [{ c: 'Navy', hex: '#1B2A4A', n: 4 }, { c: 'White', hex: '#EFEFEF', n: 2 }],
        weftPattern: [{ c: 'Navy', hex: '#1B2A4A', n: 1 }],
    },
    {
        id: 'SD02', mdId: 'MD01', code: 'Passat 16',
        warpPattern: [{ c: 'Sky Blue', hex: '#5AACD9', n: 2 }, { c: 'White', hex: '#EFEFEF', n: 2 }],
        weftPattern: [{ c: 'White', hex: '#EFEFEF', n: 1 }],
    },
    {
        id: 'SD05', mdId: 'MD03', code: 'Milano Natural', commercialName: 'Natural',
    },
    {
        id: 'SD06', mdId: 'MD03', code: 'Milano Sage', commercialName: 'Sage',
    },
];

export const SEED_ORDERS: SalesOrder[] = [
    {
        soNumber: 'SO-20260510-001', customer: 'CU01', salesExec: 'Rahul Mehta',
        mdId: 'MD01', fabricType: 'finished', price: 262,
        date: '2026-05-10', deliveryDate: '2026-06-12', status: 'authorized',
        colors: [
            { color: 'Passat 1', sdId: 'SD01', qty: 1500, pendingQty: 0 },
            { color: 'Passat 16', sdId: 'SD02', qty: 1000, pendingQty: 0 },
        ],
    },
    {
        soNumber: 'SO-20260514-002', customer: 'CU02', salesExec: 'Priya Shah',
        mdId: 'MD04', fabricType: 'finished', price: 108,
        date: '2026-05-14', deliveryDate: '2026-06-20', status: 'authorized',
        colors: [{ color: 'Active Grid 1', qty: 1800, pendingQty: 900 }],
    },
    {
        soNumber: 'SO-20260522-003', customer: 'CU04', salesExec: 'Sneha Patel',
        mdId: 'MD02', fabricType: 'greige', price: 165,
        date: '2026-05-22', deliveryDate: '2026-06-18', status: 'pending_auth',
        colors: [{ color: 'Oxford 1', qty: 1500, pendingQty: 1500 }],
    },
    {
        soNumber: 'SO-20260525-004', customer: 'CU05', salesExec: 'Rahul Mehta',
        mdId: 'MD06', fabricType: 'finished', price: 128,
        date: '2026-05-25', deliveryDate: '2026-06-02', status: 'authorized',
        colors: [
            { color: 'Burgundy', qty: 700, pendingQty: 500 },
            { color: 'Ecru', qty: 500, pendingQty: 300 },
        ],
    },
];

export const ACCOUNTS: UserAccount[] = [
    { role: 'owner', name: 'Owner', glyph: '♚', sub: 'Full access — orders, costing, production, expense' },
    { role: 'designer', name: 'Designer', glyph: '◳', sub: 'Designs & costing' },
    { role: 'sales', name: 'Rahul Mehta', glyph: '▤', sub: 'Delhi / North sales executive', exec: 'Rahul Mehta' },
    { role: 'sales', name: 'Priya Shah', glyph: '▤', sub: 'Mumbai / West sales executive', exec: 'Priya Shah' },
    { role: 'erpop', name: 'ERP Operator', glyph: '⌗', sub: 'Master data — designs, yarn, costing' },
];