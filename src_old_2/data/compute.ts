import type { MainDesign } from '../types';

const IN_PER_M = 39.3701;

const MI_MAP: Record<string, { cnt: number; sys: 'Lea' | 'Ne' | 'Den'; price: number }> = {
    Y01: { cnt: 20, sys: 'Lea', price: 550 },
    Y02: { cnt: 30, sys: 'Lea', price: 620 },
    Y03: { cnt: 40, sys: 'Lea', price: 700 },
    Y04: { cnt: 60, sys: 'Lea', price: 850 },
    Y05: { cnt: 80, sys: 'Lea', price: 1050 },
    Y06: { cnt: 30, sys: 'Ne', price: 480 },
    Y07: { cnt: 40, sys: 'Ne', price: 540 },
    Y08: { cnt: 60, sys: 'Ne', price: 640 },
    Y09: { cnt: 30, sys: 'Ne', price: 420 },
    Y10: { cnt: 40, sys: 'Ne', price: 470 },
    Y11: { cnt: 20, sys: 'Ne', price: 250 },
    Y12: { cnt: 40, sys: 'Ne', price: 310 },
    Y13: { cnt: 60, sys: 'Ne', price: 380 },
    Y14: { cnt: 75, sys: 'Den', price: 170 },
    Y15: { cnt: 30, sys: 'Ne', price: 240 },
};

function gpm(miId: string): number {
    const m = MI_MAP[miId];
    if (!m) return 0;
    if (m.sys === 'Lea') return 1.6535 / m.cnt;
    if (m.sys === 'Ne') return 0.5905 / m.cnt;
    if (m.sys === 'Den') return m.cnt / 9000;
    return 0;
}

export function yKey(y: { miId: string; br: string | null }): string {
    return `${y.miId}|${y.br ?? ''}`;
}

export function yarnName(y: { miId: string; br: string | null }): string {
    const m = MI_MAP[y.miId];
    const base = m ? (
        m.sys === 'Lea' ? `${m.cnt} Lea` :
            m.sys === 'Den' ? `${m.cnt}D` :
                `${m.cnt}s`
    ) : y.miId;
    return y.br ? `${base} ${y.br}` : base;
}

export interface CostRow {
    y: { miId: string; br: string | null };
    key: string;
    g: number;
    kg: number;
    price: number;
    dye: number;
    rate: number;
    cost: number;
}

export interface ComputeResult {
    ppiLoom: number;
    ppiTable: number;
    greigeWidth: number;
    warpRows: CostRow[];
    weftRows: CostRow[];
    warpCost: number;
    weftCost: number;
    selvCost: number;
    wasteCost: number;
    rm: number;
    weavingCost: number;
    greigeMfg: number;
    greigeBrokAmt: number;
    greigePrice: number;
    rmPct: number;
    weavePct: number;
    prodDay: number;
    greigeGLM: number;
    greigeKg: number;
    hasFin: boolean;
    finishedPrice: number;
    finishedKg: number;
    finGLM: number;
    dyeingProc: number;
    shrinkImpact: number;
    finBrokAmt: number;
    cutPack: number;
}

export function computeCosting(
    d: MainDesign,
    priceMap: Record<string, number>,
    dyeMap: Record<string, number>,
    P: {
        weavingRate: number; rpm: number; eff: number;
        greigeBrok: number; dyeingProc: number; finishedBrok: number; cutPack: number;
    }
): ComputeResult {
    const s = (d.warpShrink ?? 0) / 100;
    const gf = (d.gfShrink ?? 0) / 100;
    const reed = d.reedSpace ?? 0;
    const isYD = d.type === 'YD';
    const warpY = d.warpYarns ?? [];
    const weftY = d.weftYarns ?? [];

    const ppiLoom = weftY.reduce((a, y) => a + y.ppi, 0);
    const ppiTable = ppiLoom ? ppiLoom + 2 : 0;
    const greigeWidth = reed * (1 - s);

    const wf = ppiLoom ? ppiTable / ppiLoom : 1;

    const warpRows = warpY.map(y => {
        const k = yKey(y);
        const g = y.epi * reed * gpm(y.miId);
        const price = priceMap[k] ?? MI_MAP[y.miId]?.price ?? 0;
        const dye = isYD ? (dyeMap[k] ?? 0) : 0;
        const rate = price + dye;
        return { y, key: k, g, kg: g / 1000, price, dye, rate, cost: (g / 1000) * rate };
    });

    const weftRows = weftY.map(y => {
        const k = yKey(y);
        const g = y.ppi * wf * greigeWidth * gpm(y.miId);
        const price = priceMap[k] ?? MI_MAP[y.miId]?.price ?? 0;
        const dye = isYD ? (dyeMap[k] ?? 0) : 0;
        const rate = price + dye;
        return { y, key: k, g, kg: g / 1000, price, dye, rate, cost: (g / 1000) * rate };
    });

    const warpCost = warpRows.reduce((a, r) => a + r.cost, 0);
    const weftCost = weftRows.reduce((a, r) => a + r.cost, 0);
    const selvCost = 0;
    const wasteCost = 0;
    const rm = warpCost + weftCost + selvCost + wasteCost;

    const weavingCost = P.weavingRate * ppiTable;
    const greigeMfg = rm + weavingCost;
    const greigeBrokAmt = greigeMfg * P.greigeBrok / 100;
    const greigePrice = greigeMfg + greigeBrokAmt;
    const rmPct = greigeMfg ? rm / greigeMfg * 100 : 0;
    const weavePct = greigeMfg ? weavingCost / greigeMfg * 100 : 0;

    const eff = P.eff / 100;
    const prodDay = ppiLoom ? (P.rpm * 24 * 60 * eff) / (39.37 * ppiLoom) : 0;

    const greigeGLM = warpRows.reduce((a, r) => a + r.g, 0) + weftRows.reduce((a, r) => a + r.g, 0);
    const greigeKg = greigeGLM > 0 ? greigePrice / (greigeGLM / 1000) : 0;

    const hasFin = d.finishLocked && (d.finWidth ?? 0) > 0;
    let finishedPrice = 0, finishedKg = 0, finGLM = 0, dyeingProc = 0, shrinkImpact = 0, finBrokAmt = 0, cutPack = 0;

    if (hasFin) {
        const finBase = greigeMfg / (1 - gf);
        shrinkImpact = finBase - greigeMfg;
        dyeingProc = P.dyeingProc;
        const sub2 = finBase + dyeingProc;
        finBrokAmt = sub2 * P.finishedBrok / 100;
        cutPack = P.cutPack;
        finishedPrice = sub2 + finBrokAmt + cutPack;
        finGLM = greigeGLM / (1 - gf);
        finishedKg = finGLM > 0 ? finishedPrice / (finGLM / 1000) : 0;
    }

    return {
        ppiLoom, ppiTable, greigeWidth,
        warpRows, weftRows,
        warpCost, weftCost, selvCost, wasteCost, rm,
        weavingCost, greigeMfg, greigeBrokAmt, greigePrice,
        rmPct, weavePct, prodDay,
        greigeGLM, greigeKg,
        hasFin, finishedPrice, finishedKg, finGLM,
        dyeingProc, shrinkImpact, finBrokAmt, cutPack,
    };
}