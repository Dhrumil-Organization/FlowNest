export type FabricQrData = {
    raw: string;
    PrpCode?: string;
    YearNo?: string;
    PUId?: string | number;
    PSrNo?: string | number;
    PSubSr?: string | number;
    TranType?: string | number;
    CartNo?: string;
    ItmCode?: string | number;
    DsnCode?: string | number;
    ShdCode?: string | number;
    Qty?: string | number;
    StkType?: string;
};

const valueOf = (obj: any, ...keys: string[]) => {
    for (const key of keys) {
        if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== '') {
            return obj[key];
        }
    }
    return undefined;
};

export const parseFabricQr = (input: string): FabricQrData => {
    const raw = String(input || '').trim();
    if (!raw) throw new Error('Empty QR code.');

    try {
        const json = JSON.parse(raw);
        if (json && typeof json === 'object') {
            return {
                raw,
                PrpCode: valueOf(json, 'PrpCode', 'prpcode', 'prpCode'),
                YearNo: valueOf(json, 'YearNo', 'yearno', 'yearNo'),
                PUId: valueOf(json, 'PUId', 'puid', 'UId', 'uid'),
                PSrNo: valueOf(json, 'PSrNo', 'psrno', 'SrNo', 'srno'),
                PSubSr: valueOf(json, 'PSubSr', 'psubsr', 'SubSr', 'subsr'),
                TranType: valueOf(json, 'TranType', 'trantype'),
                CartNo: String(valueOf(json, 'CartNo', 'cartNo', 'TakaNo', 'takaNo', 'rollNo') ?? ''),
                ItmCode: valueOf(json, 'ItmCode', 'itmcode'),
                DsnCode: valueOf(json, 'DsnCode', 'dsncode'),
                ShdCode: valueOf(json, 'ShdCode', 'shdcode'),
                Qty: valueOf(json, 'Qty', 'qty', 'Wt', 'wt', 'NetWt', 'netWt', 'GrossWt', 'GrsWt'),
                StkType: valueOf(json, 'StkType', 'stktype'),
            };
        }
    } catch (_) {
        // ERP QR formats below.
    }

    const parts = raw.split('~');

    // Fabric/Grey QR: UID~SrNo~SubSr~TranType~TakaNo~ItmCode~DsnCode~Qty~
    // Example: 370001939~1~10~31~166~23576~513~100.000~
    if (parts.length >= 8) {
        const looksLikeReferenceQr = /^\d+(?:\.0+)?$/.test(parts[0] || '') && parts[4] !== '';
        if (looksLikeReferenceQr) {
            return {
                raw,
                PUId: parts[0] || '',
                PSrNo: parts[1] || '',
                PSubSr: parts[2] || '',
                TranType: parts[3] || '',
                CartNo: parts[4] || '',
                ItmCode: parts[5] || '',
                DsnCode: parts[6] || '',
                Qty: parts[7] || '',
            };
        }
    }

    // Fallback: plain taka/roll number.
    return { raw, CartNo: raw };
};

const same = (a: any, b: any) => String(a ?? '').trim() === String(b ?? '').trim();

export const findFabricStockRow = (rows: any[], qr: FabricQrData) => {
    const source = Array.isArray(rows) ? rows : [];
    const cartNo = String(qr.CartNo ?? '').trim();

    if (!cartNo) return null;

    const referenceMatch = source.find((row: any) =>
        same(row?.CartNo, cartNo)
        && qr.PUId !== undefined && same(row?.PUId, qr.PUId)
        && qr.PSrNo !== undefined && same(row?.PSrNo, qr.PSrNo)
        && qr.PSubSr !== undefined && same(row?.PSubSr, qr.PSubSr)
        && qr.TranType !== undefined && same(row?.TranType, qr.TranType)
    );

    if (referenceMatch) return referenceMatch;

    const propertyMatch = source.find((row: any) =>
        same(row?.CartNo, cartNo)
        && (!qr.PrpCode || same(row?.PrpCode, qr.PrpCode))
    );

    return propertyMatch || null;
};
