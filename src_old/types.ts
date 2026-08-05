export interface YarnMaster {
    id: string;
    name: string;
    tag: string;
    cnt: number;
    sys: 'Lea' | 'Ne' | 'Den';
    price: number;
    den?: boolean;
}

export interface WarpYarn {
    miId: string;
    br: string | null;
    epi: number;
}

export interface WeftYarn {
    miId: string;
    br: string | null;
    ppi: number;
}

export type Category = 'Linen Shirting' | 'Sportswear' | 'Linen Suiting';
export type DyeType = 'YD' | 'PD';

export interface MainDesign {
    id: string;
    code: string;
    category: Category;
    type: DyeType;
    weave: string;
    warpYarns: WarpYarn[];
    weftYarns: WeftYarn[];
    reedSpace: number;
    warpShrink: number;
    finWidth: number;
    gfShrink: number;
    finishLocked: boolean;
    note?: string;
}

export interface SubDesign {
    id: string;
    mdId: string;
    code: string;
    commercialName?: string;
    warpColors?: ColorEntry[];
    weftColors?: ColorEntry[];
    warpPattern?: PatternBand[];
    weftPattern?: PatternBand[];
}

export interface ColorEntry {
    miId: string;
    br: string | null;
    shade: string | null;
    name: string | null;
    hex: string | null;
}

export interface PatternBand {
    miId?: string;
    br?: string | null;
    c: string;
    hex?: string;
    n: number;
}

export interface CostingRecord {
    id: string;
    ts: string;
    mdId: string;
    code: string;
    category: string;
    type: DyeType;
    demo?: boolean;
    inputs: CostInputs;
    snap: CostSnap;
}

export interface CostInputs {
    priceMap: Record<string, number>;
    dyeMap: Record<string, number>;
    weavingRate: number;
    rpm: number;
    eff: number;
    greigeBrok: number;
    dyeingProc: number;
    finishedBrok: number;
    cutPack: number;
}

export interface CostSnap {
    greigePrice: number;
    finishedPrice: number;
    greigeKg: number;
    finishedKg: number;
    rm: number;
    weavingCost: number;
    greigeMfg: number;
    hasFin: boolean;
    finalCost: number;
}

export interface OrderColor {
    color: string;
    sdId?: string;
    qty: number;
    pendingQty: number;
}

export type FabricType = 'greige' | 'finished';
export type OrderStatus = 'pending_auth' | 'authorized' | 'rejected';

export interface SalesOrder {
    soNumber: string;
    customer: string;
    salesExec: string;
    mdId: string;
    fabricType: FabricType;
    price: number;
    date: string;
    deliveryDate: string;
    status: OrderStatus;
    colors: OrderColor[];
}

export interface Customer {
    id: string;
    name: string;
    exec: string;
    city: string;
}

export type RoleId =
    | 'owner' | 'planthead' | 'prodhead' | 'planner'
    | 'designer' | 'sales' | 'erpop';

export interface UserAccount {
    role: RoleId;
    name: string;
    exec?: string;
    glyph: string;
    sub: string;
}
