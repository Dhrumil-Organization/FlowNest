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

/** Filter design recipe rows to the ones that use this carton's main item. */
export const recipeRowsForCarton = (rows: any[], mitmcode: string) => {
    if (!mitmcode) return rows; // main item unknown: show all, user picks
    return rows.filter(r => String(r.mitmcode ?? r.MItmCode ?? '').trim() === String(mitmcode).trim());
};
