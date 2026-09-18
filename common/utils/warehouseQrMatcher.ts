/**
 * Warehouse QR identity matcher.
 *
 * IMPORTANT:
 * QR labels contain many descriptive/weight fields that may change between
 * label versions. Stock matching must use only the stable business identity:
 * itmcode + mercode + grdcode + shdcode + cartno.
 *
 * Old (~) label positions:
 *   itmcode=0, mercode=1, grdcode=2, shdcode=3, cartno=6
 *
 * New CSV-style label positions:
 *   itmcode=0, shdcode=2, grdcode=4, mercode=6, cartno=15
 */

export type WarehouseQrIdentity = {
  itmcode: string;
  mercode: string;
  grdcode: string;
  shdcode: string;
  cartno: string;
};

const cleanValue = (value: unknown): string =>
  String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .replace(/\t/g, "")
    .trim();

const normalizeField = (value: unknown): string => {
  const text = cleanValue(value)
    .replace(/^"+|"+$/g, "")
    .trim();

  if (!text) return "";

  // Preserve text codes, while treating numeric representations such as
  // 001 / 1 / 1.0 consistently (same behaviour as the existing scanner).
  const numberValue = Number(text);
  if (!Number.isNaN(numberValue)) return numberValue.toString();

  return text.toUpperCase();
};

const normalizeCart = (value: unknown): string =>
  cleanValue(value)
    .replace(/^"+|"+$/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();

export const isSameWarehouseCart = (a: unknown, b: unknown): boolean => {
  const c1 = normalizeCart(a);
  const c2 = normalizeCart(b);

  if (!c1 || !c2) return false;
  if (c1 === c2) return true;

  // Preserve existing warehouse compatibility for carton labels where one
  // side may contain the historical leading "O" prefix.
  return c1 === `O${c2}` || c2 === `O${c1}`;
};

const splitOldQr = (raw: string): string[] =>
  raw
    .split("~")
    .map(part => cleanValue(part).replace(/^"+|"+$/g, "").trim());

const splitNewQr = (raw: string): string[] => {
  const cleaned = raw
    .replace(/\\"/g, '"')
    .replace(/\\+/g, "")
    .replace(/^\s*"+|"+\s*$/g, "")
    .replace(/^\s*\{|\}\s*$/g, "")
    .trim();

  return cleaned
    .split(",")
    .map(part =>
      cleanValue(part)
        .replace(/^"+|"+$/g, "")
        .replace(/^\{|\}$/g, "")
        .trim()
    );
};

export const parseWarehouseQrIdentity = (
  value: unknown
): WarehouseQrIdentity | null => {
  const raw = cleanValue(value);
  if (!raw) return null;

  if (raw.includes("~")) {
    const parts = splitOldQr(raw);

    // Highest required old-format identity index is cartno at index 6.
    if (parts.length <= 6) return null;

    const identity: WarehouseQrIdentity = {
      itmcode: normalizeField(parts[0]),
      mercode: normalizeField(parts[1]),
      grdcode: normalizeField(parts[2]),
      shdcode: normalizeField(parts[3]),
      cartno: normalizeCart(parts[6]),
    };

    return Object.values(identity).every(Boolean) ? identity : null;
  }

  const parts = splitNewQr(raw);

  // Highest required new-format identity index is cartno at index 15.
  if (parts.length <= 15) return null;

  const identity: WarehouseQrIdentity = {
    itmcode: normalizeField(parts[0]),
    mercode: normalizeField(parts[6]),
    grdcode: normalizeField(parts[4]),
    shdcode: normalizeField(parts[2]),
    cartno: normalizeCart(parts[15]),
  };

  return Object.values(identity).every(Boolean) ? identity : null;
};

export const isWarehouseQrMatch = (
  stockQr: unknown,
  scannedQr: unknown
): boolean => {
  const stock = parseWarehouseQrIdentity(stockQr);
  const scanned = parseWarehouseQrIdentity(scannedQr);

  if (!stock || !scanned) return false;

  return (
    stock.itmcode === scanned.itmcode &&
    stock.mercode === scanned.mercode &&
    stock.grdcode === scanned.grdcode &&
    stock.shdcode === scanned.shdcode &&
    isSameWarehouseCart(stock.cartno, scanned.cartno)
  );
};

/**
 * Match rank used when more than one stock row can represent the same base
 * carton. Exact carton text always wins over the historical O-prefix fallback.
 *
 * 2 = exact identity + exact carton
 * 1 = exact identity + O-prefix equivalent carton
 * 0 = not a match
 */
export const getWarehouseQrMatchRank = (
  stockQr: unknown,
  scannedQr: unknown,
  stockCartNo?: unknown
): 0 | 1 | 2 => {
  const stock = parseWarehouseQrIdentity(stockQr);
  const scanned = parseWarehouseQrIdentity(scannedQr);

  if (!stock || !scanned) return 0;

  const sameBusinessIdentity =
    stock.itmcode === scanned.itmcode &&
    stock.mercode === scanned.mercode &&
    stock.grdcode === scanned.grdcode &&
    stock.shdcode === scanned.shdcode;

  if (!sameBusinessIdentity) return 0;

  // Prefer the stock-result CartNo when supplied. The QR itself does not carry
  // ZUId/ZSrNo/ZSubSr, so the matched stock row remains authoritative.
  const effectiveStockCart = normalizeCart(
    stockCartNo !== undefined && stockCartNo !== null && stockCartNo !== ""
      ? stockCartNo
      : stock.cartno
  );

  if (effectiveStockCart === scanned.cartno) return 2;
  return isSameWarehouseCart(effectiveStockCart, scanned.cartno) ? 1 : 0;
};
