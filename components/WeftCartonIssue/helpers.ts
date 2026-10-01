// Small pure helpers used by the carton-first weft issue screen.

export const r3 = (n: any) => Math.round((Number(n) || 0) * 1000) / 1000;
export const f2 = (n: any) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
export const f3 = (n: any) => (Math.round((Number(n) || 0) * 1000) / 1000).toFixed(3);

const p2 = (n: number) => String(n).padStart(2, '0');

/** Date -> 20260928 (what the backend stores in IssDate) */
export const toYmd = (d: Date) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`;
/** Date -> 28-09-2026 (what the existing help APIs expect) */
export const toDmy = (d: Date) => `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}`;
/** 20260928 -> 28-09-2026 */
export const ymdShow = (y: any) => {
    const s = String(y || '');
    return s.length === 8 ? `${s.slice(6, 8)}-${s.slice(4, 6)}-${s.slice(0, 4)}` : s;
};
export const isToday = (d: Date) => toYmd(d) === toYmd(new Date());

/** RFC4122-ish id, good enough for an idempotency key (no extra package needed). */
export const makeClientRef = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });

/**
 * Carton label parser. Same formats as WeftIssueItemDrawer.handleBarCodeScanned,
 * plus a plain carton number (handheld scanner or typed).
 * Returns hint fields; balance and master data always come from the server.
 */
export const parseCartonCode = (raw: string): { CartNo: string; PUId?: any; PSrNo?: any; PSubSr?: any; TranType?: any } | null => {
    const value = String(raw || '').trim();
    if (!value) return null;

    const parts = value.split('~');
    if (parts.length === 1) return { CartNo: value };

    if (parts.length === 16) {
        return { PUId: parts[0], PSrNo: parts[1], PSubSr: parts[2], TranType: parts[3], CartNo: (parts[4] || '').trim() };
    }
    if (parts.length >= 13) {
        return { PUId: parts[1], PSrNo: parts[2], PSubSr: parts[3], TranType: parts[4], CartNo: (parts[5] || '').trim() };
    }
    if (parts.length >= 11) {
        return { PUId: parts[0], PSrNo: parts[1], PSubSr: parts[2], TranType: parts[3], CartNo: (parts[4] || '').trim() };
    }
    return null;
};

/**
 * Full QR parser. Same 3 label formats as the old WeftIssueItemDrawer.handleBarCodeScanned.
 * The QR already carries carton, item, shade, grade, weight and chees, so no search / browse
 * call is needed after a scan. A plain carton number (no "~") returns only CartNo.
 */
export type ParsedQr = {
    CartNo: string; PUId?: any; PSrNo?: any; PSubSr?: any; TranType?: any;
    ItmCode?: any; ItmName?: string; MerCode?: any; MerName?: string;
    GrdCode?: any; GrdName?: string; ShdCode?: any; ShdName?: string;
    Denier?: any; Wt?: any; Chees?: any;
};

export const parseCartonQr = (raw: string): ParsedQr | null => {
    const value = String(raw || '').trim();
    if (!value) return null;
    const p = value.split('~');
    const g = (i: number) => (p[i] ?? '').toString().trim();

    if (p.length === 1) return { CartNo: value };

    if (p.length === 16) {
        return {
            PUId: g(0), PSrNo: g(1), PSubSr: g(2), TranType: g(3), CartNo: g(4),
            ItmCode: g(5), ItmName: g(6), MerCode: g(7), MerName: g(8),
            GrdCode: g(9), GrdName: g(10), ShdCode: g(11), ShdName: g(12),
            Wt: g(13) || 0, Chees: g(14) || 0,
        };
    }
    if (p.length >= 13) {
        return {
            PUId: g(1), PSrNo: g(2), PSubSr: g(3), TranType: g(4), CartNo: g(5),
            ItmCode: g(6), MerCode: g(7), GrdCode: g(8), ShdCode: g(9), Denier: g(10),
            Wt: g(11) || 0, Chees: g(12) || 0,
        };
    }
    if (p.length >= 11) {
        return {
            PUId: g(0), PSrNo: g(1), PSubSr: g(2), TranType: g(3), CartNo: g(4),
            ItmCode: g(5), MerCode: g(6), GrdCode: g(7), ShdCode: g(8), Denier: g(9),
            Wt: g(10) || 0, Chees: 0,
        };
    }
    return null;
};

/** Flag reader: design help API / browse can return isnewdesign in different casings or as number/bool. Returns '1' or '0'. */
export const flagOf = (o: any, ...extra: any[]): '1' | '0' => {
    const keys = ['isnewdesign', 'IsNewDesign', 'isNewDesign', 'ISNEWDESIGN'];
    for (const src of [o, ...extra]) {
        if (!src) continue;
        for (const k of keys) {
            const v = src[k];
            if (v !== undefined && v !== null && v !== '') return (v === true || String(v) === '1' || String(v).toLowerCase() === 'true') ? '1' : '0';
        }
    }
    return '0';
};
/** Browse line: type comes from ExpProdQtyType (line -> group -> issue). Returns '1' or '0'. */
export const typeOf = (...srcs: any[]): '1' | '0' => {
    for (const src of srcs) {
        if (!src) continue;
        for (const k of ['ExpProdQtyType', 'ExpQtyType']) {
            const v = src[k];
            if (v !== undefined && v !== null && v !== '') return String(v) === '1' || v === true ? '1' : '0';
        }
    }
    return '0';
};
