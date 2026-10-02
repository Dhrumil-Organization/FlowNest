// eventExcelBuilder.js
// Builds the "Event Report Details" Excel workbook (real .xlsx, fully styled)
// for ONE user of ONE event — exactly the data shown on the drill-down screen.
//
// Pure JavaScript, no native modules and no extra npm package:
//   buildEventReportModel()  -> plain "sheet model" (rows / cells / styles)
//   modelToXlsxBytes()       -> Uint8Array of a valid .xlsx file
//   bytesToBase64()          -> for writing the file on Android / iOS
//
// The SAME model drives the on-screen preview (EnquiryExcelPreview.js), so the
// preview and the downloaded file can never disagree.

/* ------------------------------------------------------------------ */
/* Palette (NEW ERP theme, hex without #)                              */
/* ------------------------------------------------------------------ */
const C = {
  nav: '0D1B2A',
  copper: 'C87533',
  copperDark: '9A4A10',
  copperSoft: 'FBEFE3',
  green: '2A6044',
  greenSoft: 'E4F0E9',
  blue: '3A568A',
  blueSoft: 'E6EBF4',
  ink: '1A1514',
  muted: '6F6A65',
  white: 'FFFFFF',
  zebra: 'F8F5F1',
  label: 'F0EDE8',
  line: 'D9D2CA',
};

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */
const txt = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return s === 'null' || s === 'undefined' ? '' : s;
};
const dash = (v) => txt(v) || '—';

// "45.00" / ".00" / 45 -> number, anything non numeric -> null
const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};

// Some API payloads have keys with stray trailing spaces ("item_unit ").
const getField = (obj, key) => {
  if (!obj) return undefined;
  if (obj[key] !== undefined) return obj[key];
  const k = Object.keys(obj).find((x) => x.trim() === key);
  return k ? obj[k] : undefined;
};

const truthy = (v) => v === true || v === 1 || v === '1' || String(v).trim().toLowerCase() === 'true';

export const prpLabel = (p) =>
  p === 'S' ? 'WEAVING' : p === 'K' ? 'KNITTING' : p === 'V' ? 'VENTURE' : p === 'R' ? 'YARN' : txt(p) || '—';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const p2 = (n) => String(n).padStart(2, '0');

// Device independent: 02-Oct-2026 04:35 PM
export const formatDateTime = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return txt(value);
  const h = d.getHours();
  return `${p2(d.getDate())}-${MONTHS[d.getMonth()]}-${d.getFullYear()} ${p2(h % 12 || 12)}:${p2(d.getMinutes())} ${h >= 12 ? 'PM' : 'AM'}`;
};

// username can be a plain name or a JSON string of the user record
const cleanUserName = (u) => {
  const s = txt(u);
  if (!s) return '';
  if (s[0] === '{') {
    try {
      const o = JSON.parse(s);
      return txt(o.name || o.username || o.user_name || o.full_name) || '';
    } catch {
      return '';
    }
  }
  return s;
};

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
// style = { bg, fg, bold, italic, sz, h, v, wrap, border, fmt }
const ST = {
  title: { bg: C.nav, fg: C.white, bold: true, sz: 16, h: 'left', v: 'center' },
  titleRight: { bg: C.nav, fg: 'C9D1DB', bold: true, sz: 9, h: 'right', v: 'center' },
  event: { bg: C.copper, fg: C.white, bold: true, sz: 12, h: 'left', v: 'center' },
  eventRight: { bg: C.copper, fg: C.white, bold: true, sz: 10, h: 'right', v: 'center' },
  metaLabel: { bg: C.label, fg: C.muted, bold: true, sz: 9, h: 'left', v: 'center', border: true },
  metaValue: { bg: C.white, fg: C.ink, bold: true, sz: 10, h: 'left', v: 'center', border: true, wrap: true },
  kpiLabel: (soft) => ({ bg: soft, fg: C.muted, bold: true, sz: 9, h: 'center', v: 'center', border: true }),
  kpiValue: (soft, fg, fmt) => ({ bg: soft, fg, bold: true, sz: 16, h: 'center', v: 'center', border: true, fmt }),
  section: { bg: C.white, fg: C.nav, bold: true, sz: 11, h: 'left', v: 'center' },
  th: { bg: C.nav, fg: C.white, bold: true, sz: 10, h: 'center', v: 'center', wrap: true, border: true },
  td: (alt, o = {}) => ({
    bg: alt ? C.zebra : C.white,
    fg: C.ink,
    sz: 10,
    h: 'left',
    v: 'center',
    wrap: true,
    border: true,
    ...o,
  }),
  total: (o = {}) => ({ bg: C.copperSoft, fg: C.copperDark, bold: true, sz: 10, h: 'left', v: 'center', border: true, ...o }),
  note: { bg: C.white, fg: C.muted, italic: true, sz: 9, h: 'left', v: 'center' },
  blank: { bg: C.white },
};

// '#,##0.##' shows a stray dot for whole numbers in Excel ("5,000."), so pick per value.
const QTY_FMT = '#,##0.##';
const qf = (v) => (typeof v === 'number' && !Number.isInteger(v) ? QTY_FMT : INT_FMT);
const RATE_FMT = '#,##0.00';
const INT_FMT = '#,##0';

const cell = (v, s, span = 1) => ({ v, s, span });

const group = (intPart) => intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
/** Text a cell shows in Excel (used by the in-app preview). */
export function displayValue(c) {
  const v = c?.v;
  if (typeof v !== 'number') return v === null || v === undefined ? '' : String(v);
  const fmt = c?.s?.fmt;
  if (fmt === '0') return String(Math.round(v));
  const fixed = fmt === RATE_FMT ? v.toFixed(2) : fmt === QTY_FMT ? String(Math.round(v * 100) / 100) : String(Math.round(v));
  const [i, d] = fixed.split('.');
  return (i.startsWith('-') ? '-' + group(i.slice(1)) : group(i)) + (d ? '.' + d : '');
}

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */
/**
 * @param {object} p
 * @param {Array}  p.enquiries     enquiries exactly as loaded by the drill-down screen
 * @param {string} p.eventName     selected event name (from the first screen)
 * @param {string} p.eventCode     selected event id
 * @param {string} p.userName      user whose card was tapped
 * @param {string} p.userRole
 * @param {string} p.generatedBy   logged-in user
 * @param {string} p.yearNo        financial year used for the API call
 * @param {Date}   p.now
 */
export function buildEventReportModel({
  enquiries = [],
  eventName,
  eventCode,
  userName,
  userRole,
  generatedBy,
  yearNo,
  now = new Date(),
}) {
  const list = Array.isArray(enquiries) ? enquiries : [];
  const evName = txt(eventName) || (txt(eventCode) && txt(eventCode) !== 'all' ? `Event ${txt(eventCode)}` : 'All Events');
  const uName = txt(userName) || '—';
  const uRole = txt(userRole) || '—';
  const genOn = formatDateTime(now);
  const genBy = cleanUserName(generatedBy) || '—';

  // ---- flatten items / designs (one Excel row per design, or per item) ----
  const lines = [];
  let totalItems = 0;
  let totalDesigns = 0;
  list.forEach((e, eIdx) => {
    const items = Array.isArray(e?.items) ? e.items : [];
    totalItems += items.length;
    const base = {
      eIdx,
      id: e?.id,
      party: dash(e?.party_name),
      contact: dash(e?.contact_name),
      prp: prpLabel(e?.prptype),
    };
    if (items.length === 0) {
      lines.push({ ...base, empty: true });
      return;
    }
    items.forEach((it) => {
      const isNewItem = it && (it.is_new === true || truthy(getField(it, 'is_new_item')));
      const itemBase = {
        ...base,
        itemCode: dash(it?.item_code),
        itemName: dash(it?.item_name),
        itemType: isNewItem ? 'NEW ITEM' : 'Existing',
        itemNew: !!isNewItem,
      };
      const designs = Array.isArray(it?.designs) ? it.designs : [];
      totalDesigns += designs.length;
      if (designs.length === 0) {
        lines.push({
          ...itemBase,
          dsnCode: '—',
          dsnName: '—',
          qty: num(getField(it, 'item_qty')),
          unit: dash(getField(it, 'item_unit')),
          rate: num(getField(it, 'item_rate')),
          remark: dash(getField(it, 'item_remark')),
          status: '—',
        });
        return;
      }
      designs.forEach((d) => {
        const isNew = d && (d.is_new === true || truthy(getField(d, 'is_new_item')));
        lines.push({
          ...itemBase,
          dsnCode: dash(d?.dsn_code),
          dsnName: dash(d?.dsn_name),
          qty: num(d?.dsn_qty),
          unit: dash(d?.unit),
          rate: num(d?.dsn_rate),
          remark: dash(d?.remark),
          status: isNew ? 'NEW' : 'Existing',
          dsnNew: !!isNew,
        });
      });
    });
  });

  const totalQty = list.reduce((n, e) => n + (num(e?.qty_required) || 0), 0);
  const properties = Array.from(new Set(list.map((e) => prpLabel(e?.prptype)).filter((x) => x && x !== '—')));

  /* ======================= Sheet 1 : Enquiry Summary ======================= */
  const s1Cols = [6, 11, 21, 32, 24, 18, 16, 30, 42, 20, 13, 9, 18]; // 13 columns
  const N1 = s1Cols.length;
  const s1 = [];

  s1.push({ h: 34, cells: [cell('EVENT ENQUIRY REPORT', ST.title, 9), cell('Madhusudhan ERP  ·  Event Report Details', ST.titleRight, 4)] });
  s1.push({ h: 26, cells: [cell(evName, ST.event, 9), cell(yearNo ? `Year : ${txt(yearNo)}` : '', ST.eventRight, 4)] });
  s1.push({ h: 8, cells: [cell('', ST.blank, N1)] });

  const metaRow = (l1, v1, l2, v2) => ({
    h: 22,
    cells: [cell(l1, ST.metaLabel, 2), cell(v1, ST.metaValue, 5), cell(l2, ST.metaLabel, 2), cell(v2, ST.metaValue, 4)],
  });
  s1.push(metaRow('USER', uName, 'ROLE', uRole));
  s1.push(metaRow('EVENT', evName, 'PROPERTY', properties.join(', ') || '—'));
  s1.push(metaRow('GENERATED ON', genOn, 'GENERATED BY', genBy));
  s1.push({ h: 8, cells: [cell('', ST.blank, N1)] });

  s1.push({
    h: 18,
    cells: [
      cell('ENQUIRIES', ST.kpiLabel(C.copperSoft), 3),
      cell('TOTAL QTY (m)', ST.kpiLabel(C.greenSoft), 4),
      cell('ITEMS', ST.kpiLabel(C.blueSoft), 3),
      cell('DESIGNS', ST.kpiLabel(C.label), 3),
    ],
  });
  s1.push({
    h: 30,
    cells: [
      cell(list.length, ST.kpiValue(C.copperSoft, C.copperDark, INT_FMT), 3),
      cell(totalQty, ST.kpiValue(C.greenSoft, C.green, qf(totalQty)), 4),
      cell(totalItems, ST.kpiValue(C.blueSoft, C.blue, INT_FMT), 3),
      cell(totalDesigns, ST.kpiValue(C.label, C.nav, INT_FMT), 3),
    ],
  });
  s1.push({ h: 8, cells: [cell('', ST.blank, N1)] });

  const s1HeaderIdx = s1.length; // 0-based row index of the table header
  s1.push({
    h: 30,
    cells: [
      'Sr', 'Enquiry #', 'Date & Time', 'Party Name', 'Contact Name', 'Designation', 'Mobile',
      'Email', 'Address', 'GST No.', 'Property', 'Items', 'Qty Required (m)',
    ].map((t) => cell(t, ST.th)),
  });

  list.forEach((e, i) => {
    const alt = i % 2 === 1;
    const itemCount = Array.isArray(e?.items) ? e.items.length : 0;
    const id = num(e?.id);
    s1.push({
      cells: [
        cell(i + 1, ST.td(alt, { h: 'center', fmt: INT_FMT })),
        cell(id !== null ? id : dash(e?.id), ST.td(alt, { h: 'center', fmt: '0' })),
        cell(formatDateTime(e?.created_at) || '—', ST.td(alt, { h: 'center' })),
        cell(dash(e?.party_name), ST.td(alt, { bold: true })),
        cell(dash(e?.contact_name), ST.td(alt)),
        cell(dash(e?.designation), ST.td(alt)),
        cell(dash(e?.mobile), ST.td(alt, { h: 'center' })),
        cell(dash(e?.email), ST.td(alt)),
        cell(dash(e?.address), ST.td(alt)),
        cell(dash(e?.gst_no), ST.td(alt, { h: 'center' })),
        cell(prpLabel(e?.prptype), ST.td(alt, { h: 'center', bold: true, fg: C.blue })),
        cell(itemCount, ST.td(alt, { h: 'center', fmt: INT_FMT })),
        cell(num(e?.qty_required) || 0, ST.td(alt, { h: 'right', bold: true, fg: C.copperDark, fmt: qf(num(e?.qty_required) || 0) })),
      ],
    });
  });

  if (list.length === 0) {
    s1.push({ h: 24, cells: [cell('No enquiries from this user for this event.', ST.td(false, { h: 'center', italic: true, fg: C.muted }), N1)] });
  } else {
    s1.push({
      h: 24,
      cells: [
        cell(`TOTAL  ·  ${list.length} enquir${list.length === 1 ? 'y' : 'ies'}`, ST.total({ h: 'right' }), 11),
        cell(totalItems, ST.total({ h: 'center', fmt: INT_FMT })),
        cell(totalQty, ST.total({ h: 'right', fmt: qf(totalQty) })),
      ],
    });
  }

  /* =================== Sheet 2 : Item & Design Details ==================== */
  const s2Cols = [6, 11, 30, 22, 13, 13, 30, 13, 13, 30, 12, 9, 12, 30, 13]; // 15 columns
  const N2 = s2Cols.length;
  const s2 = [];
  s2.push({ h: 34, cells: [cell('ITEM & DESIGN DETAILS', ST.title, 10), cell('Madhusudhan ERP  ·  Event Report Details', ST.titleRight, 5)] });
  s2.push({ h: 26, cells: [cell(evName, ST.event, 10), cell(yearNo ? `Year : ${txt(yearNo)}` : '', ST.eventRight, 5)] });
  s2.push({ h: 8, cells: [cell('', ST.blank, N2)] });
  s2.push({
    h: 22,
    cells: [
      cell('USER', ST.metaLabel, 2), cell(uName, ST.metaValue, 3),
      cell('ROLE', ST.metaLabel, 1), cell(uRole, ST.metaValue, 2),
      cell('GENERATED ON', ST.metaLabel, 2), cell(genOn, ST.metaValue, 2),
      cell('BY', ST.metaLabel, 1), cell(genBy, ST.metaValue, 2),
    ],
  });
  s2.push({ h: 8, cells: [cell('', ST.blank, N2)] });

  const s2HeaderIdx = s2.length;
  s2.push({
    h: 30,
    cells: [
      'Sr', 'Enquiry #', 'Party Name', 'Contact Name', 'Property', 'Item Code', 'Item Name', 'Item Type',
      'Design Code', 'Design Name', 'Qty', 'Unit', 'Rate', 'Remark', 'Design Status',
    ].map((t) => cell(t, ST.th)),
  });

  let lineQty = 0;
  lines.forEach((l, i) => {
    const alt = l.eIdx % 2 === 1; // zebra per enquiry, so each enquiry reads as one block
    const id = num(l.id);
    const head = [
      cell(i + 1, ST.td(alt, { h: 'center', fmt: INT_FMT })),
      cell(id !== null ? id : dash(l.id), ST.td(alt, { h: 'center', fmt: '0' })),
      cell(l.party, ST.td(alt, { bold: true })),
      cell(l.contact, ST.td(alt)),
      cell(l.prp, ST.td(alt, { h: 'center', bold: true, fg: C.blue })),
    ];
    if (l.empty) {
      s2.push({ cells: [...head, cell('No items added for this enquiry.', ST.td(alt, { italic: true, fg: C.muted }), N2 - head.length)] });
      return;
    }
    lineQty += l.qty || 0;
    s2.push({
      cells: [
        ...head,
        cell(l.itemCode, ST.td(alt, { h: 'center' })),
        cell(l.itemName, ST.td(alt, { bold: true })),
        cell(l.itemType, ST.td(alt, l.itemNew ? { h: 'center', bold: true, fg: C.green, bg: C.greenSoft } : { h: 'center', fg: C.muted })),
        cell(l.dsnCode, ST.td(alt, { h: 'center' })),
        cell(l.dsnName, ST.td(alt)),
        cell(l.qty === null ? '—' : l.qty, ST.td(alt, { h: 'right', bold: true, fg: C.copperDark, fmt: qf(l.qty) })),
        cell(l.unit, ST.td(alt, { h: 'center' })),
        cell(l.rate === null ? '—' : l.rate, ST.td(alt, { h: 'right', fmt: RATE_FMT })),
        cell(l.remark, ST.td(alt)),
        cell(l.status, ST.td(alt, l.dsnNew ? { h: 'center', bold: true, fg: C.green, bg: C.greenSoft } : { h: 'center', fg: C.muted })),
      ],
    });
  });

  if (lines.length === 0) {
    s2.push({ h: 24, cells: [cell('No items to show.', ST.td(false, { h: 'center', italic: true, fg: C.muted }), N2)] });
  } else {
    s2.push({
      h: 24,
      cells: [
        cell(`TOTAL  ·  ${totalItems} item${totalItems === 1 ? '' : 's'}  ·  ${totalDesigns} design${totalDesigns === 1 ? '' : 's'}`, ST.total({ h: 'right' }), 10),
        cell(lineQty, ST.total({ h: 'right', fmt: qf(lineQty) })),
        cell('', ST.total(), 4),
      ],
    });
  }

  const safe = (s) => txt(s).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  const stamp = `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}_${p2(now.getHours())}${p2(now.getMinutes())}`;
  const fileName = `${['Event', safe(evName), safe(uName), stamp].filter(Boolean).join('_')}.xlsx`;

  return {
    fileName,
    title: `${evName} — ${uName}`,
    creator: genBy,
    createdAt: now,
    summary: { enquiries: list.length, totalQty, items: totalItems, designs: totalDesigns },
    sheets: [
      { name: 'Enquiry Summary', tab: C.copper, cols: s1Cols, rows: s1, headerRow: s1HeaderIdx, dataRows: list.length },
      { name: 'Item & Design Details', tab: C.nav, cols: s2Cols, rows: s2, headerRow: s2HeaderIdx, dataRows: lines.length },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* .xlsx writer (OOXML + store-only ZIP)                               */
/* ------------------------------------------------------------------ */
const xmlEsc = (s) =>
  String(s)
    // characters that are illegal in XML 1.0
    .replace(/[^\x09\x0A\x0D\x20-퟿-�\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const colName = (i) => {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

function utf8(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const d = str.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
        i++;
      }
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Uint8Array.from(out);
}

let CRC_TABLE = null;
function crc32(bytes) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function zipStore(files, date) {
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const dosDate = ((Math.max(date.getFullYear(), 1980) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const entries = files.map((f) => {
    const name = utf8(f.name);
    const data = utf8(f.text);
    return { name, data, crc: crc32(data) };
  });
  let size = 22;
  entries.forEach((e) => {
    size += 30 + e.name.length + e.data.length + 46 + e.name.length;
  });
  const buf = new Uint8Array(size);
  const dv = new DataView(buf.buffer);
  let p = 0;
  entries.forEach((e) => {
    e.offset = p;
    dv.setUint32(p, 0x04034b50, true);
    dv.setUint16(p + 4, 20, true);
    dv.setUint16(p + 6, 0, true);
    dv.setUint16(p + 8, 0, true); // stored
    dv.setUint16(p + 10, dosTime, true);
    dv.setUint16(p + 12, dosDate, true);
    dv.setUint32(p + 14, e.crc, true);
    dv.setUint32(p + 18, e.data.length, true);
    dv.setUint32(p + 22, e.data.length, true);
    dv.setUint16(p + 26, e.name.length, true);
    dv.setUint16(p + 28, 0, true);
    buf.set(e.name, p + 30);
    buf.set(e.data, p + 30 + e.name.length);
    p += 30 + e.name.length + e.data.length;
  });
  const cdStart = p;
  entries.forEach((e) => {
    dv.setUint32(p, 0x02014b50, true);
    dv.setUint16(p + 4, 20, true);
    dv.setUint16(p + 6, 20, true);
    dv.setUint16(p + 8, 0, true);
    dv.setUint16(p + 10, 0, true);
    dv.setUint16(p + 12, dosTime, true);
    dv.setUint16(p + 14, dosDate, true);
    dv.setUint32(p + 16, e.crc, true);
    dv.setUint32(p + 20, e.data.length, true);
    dv.setUint32(p + 24, e.data.length, true);
    dv.setUint16(p + 28, e.name.length, true);
    dv.setUint32(p + 42, e.offset, true);
    buf.set(e.name, p + 46);
    p += 46 + e.name.length;
  });
  dv.setUint32(p, 0x06054b50, true);
  dv.setUint16(p + 8, entries.length, true);
  dv.setUint16(p + 10, entries.length, true);
  dv.setUint32(p + 12, p - cdStart, true);
  dv.setUint32(p + 16, cdStart, true);
  return buf;
}

// Rough line count for a wrapped cell, so long addresses / remarks are not cut.
const estLines = (v, widthChars) => {
  if (typeof v !== 'string' || !v) return 1;
  const w = Math.max(4, widthChars - 1);
  return v.split('\n').reduce((n, part) => n + Math.max(1, Math.ceil(part.length / w)), 0);
};

/** Row height (points) the writer and the preview both use. */
export function rowHeight(sheet, row) {
  if (row.h) return row.h;
  let lines = 1;
  let c = 0;
  row.cells.forEach((x) => {
    const span = x.span || 1;
    if (x.s && x.s.wrap) {
      let w = 0;
      for (let k = c; k < c + span; k++) w += sheet.cols[k] || 10;
      lines = Math.max(lines, estLines(x.v, w));
    }
    c += span;
  });
  return Math.min(120, Math.max(20, 6 + lines * 14));
}

export function modelToXlsxBytes(model) {
  // ---- style registry ----
  const fonts = ['<font><sz val="10"/><color rgb="FF1A1514"/><name val="Calibri"/><family val="2"/></font>'];
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  const borders = [
    '<border><left/><right/><top/><bottom/><diagonal/></border>',
    `<border>${['left', 'right', 'top', 'bottom'].map((s) => `<${s} style="thin"><color rgb="FF${C.line}"/></${s}>`).join('')}<diagonal/></border>`,
  ];
  const numFmts = [];
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  const reg = (arr, xml) => {
    let i = arr.indexOf(xml);
    if (i < 0) {
      arr.push(xml);
      i = arr.length - 1;
    }
    return i;
  };
  const xfCache = new Map();
  const styleId = (s) => {
    if (!s) return 0;
    const key = JSON.stringify(s);
    if (xfCache.has(key)) return xfCache.get(key);
    const fontId = reg(
      fonts,
      `<font>${s.bold ? '<b/>' : ''}${s.italic ? '<i/>' : ''}<sz val="${s.sz || 10}"/><color rgb="FF${s.fg || C.ink}"/><name val="Calibri"/><family val="2"/></font>`
    );
    const fillId = s.bg ? reg(fills, `<fill><patternFill patternType="solid"><fgColor rgb="FF${s.bg}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
    let numFmtId = 0;
    if (s.fmt) {
      let i = numFmts.indexOf(s.fmt);
      if (i < 0) {
        numFmts.push(s.fmt);
        i = numFmts.length - 1;
      }
      numFmtId = 164 + i;
    }
    const xml =
      `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${s.border ? 1 : 0}" xfId="0"` +
      `${numFmtId ? ' applyNumberFormat="1"' : ''} applyFont="1"${fillId ? ' applyFill="1"' : ''}${s.border ? ' applyBorder="1"' : ''} applyAlignment="1">` +
      `<alignment horizontal="${s.h || 'left'}" vertical="${s.v || 'center'}"${s.wrap ? ' wrapText="1"' : ''}${s.h === 'center' ? '' : ' indent="1"'}/></xf>`;
    const id = reg(xfs, xml);
    xfCache.set(key, id);
    return id;
  };

  // ---- sheets ----
  const usedNames = new Set();
  const sheetName = (n, i) => {
    let s = (txt(n) || `Sheet${i + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
    while (usedNames.has(s.toLowerCase())) s = `${s.slice(0, 28)} ${i + 1}`;
    usedNames.add(s.toLowerCase());
    return s;
  };
  const names = model.sheets.map((s, i) => sheetName(s.name, i));
  const definedNames = [];

  const sheetXml = model.sheets.map((sheet, sIdx) => {
    const nCols = sheet.cols.length;
    const merges = [];
    let body = '';
    sheet.rows.forEach((row, rIdx) => {
      const r = rIdx + 1;
      let cells = '';
      let c = 0;
      row.cells.forEach((x) => {
        const span = Math.max(1, x.span || 1);
        const sid = styleId(x.s);
        const ref = `${colName(c)}${r}`;
        if (typeof x.v === 'number' && Number.isFinite(x.v)) {
          cells += `<c r="${ref}" s="${sid}"><v>${x.v}</v></c>`;
        } else if (x.v !== '' && x.v !== null && x.v !== undefined) {
          cells += `<c r="${ref}" s="${sid}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(x.v)}</t></is></c>`;
        } else {
          cells += `<c r="${ref}" s="${sid}"/>`;
        }
        // style the covered cells too, so merged blocks keep their fill / border
        for (let k = 1; k < span; k++) cells += `<c r="${colName(c + k)}${r}" s="${sid}"/>`;
        if (span > 1) merges.push(`${ref}:${colName(c + span - 1)}${r}`);
        c += span;
      });
      body += `<row r="${r}" ht="${rowHeight(sheet, row)}" customHeight="1">${cells}</row>`;
    });

    const lastRef = `${colName(nCols - 1)}${Math.max(1, sheet.rows.length)}`;
    const hdr = sheet.headerRow + 1; // 1-based header row
    const hasFilter = sheet.dataRows > 0;
    const filterRef = `A${hdr}:${colName(nCols - 1)}${hdr + sheet.dataRows}`;
    const q = `'${names[sIdx].replace(/'/g, "''")}'`;
    if (hasFilter) {
      definedNames.push(
        `<definedName name="_xlnm._FilterDatabase" localSheetId="${sIdx}" hidden="1">${xmlEsc(`${q}!$A$${hdr}:$${colName(nCols - 1)}$${hdr + sheet.dataRows}`)}</definedName>`
      );
    }
    definedNames.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${sIdx}">${xmlEsc(`${q}!$${hdr}:$${hdr}`)}</definedName>`);

    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      `<sheetPr><tabColor rgb="FF${sheet.tab || C.nav}"/><pageSetUpPr fitToPage="1"/></sheetPr>` +
      `<dimension ref="A1:${lastRef}"/>` +
      `<sheetViews><sheetView showGridLines="0" workbookViewId="0"${sIdx === 0 ? ' tabSelected="1"' : ''}>` +
      `<pane ySplit="${hdr}" topLeftCell="A${hdr + 1}" activePane="bottomLeft" state="frozen"/>` +
      `<selection pane="bottomLeft" activeCell="A${hdr + 1}" sqref="A${hdr + 1}"/></sheetView></sheetViews>` +
      '<sheetFormatPr defaultRowHeight="20" customHeight="1"/>' +
      `<cols>${sheet.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` +
      `<sheetData>${body}</sheetData>` +
      (hasFilter ? `<autoFilter ref="${filterRef}"/>` : '') +
      (merges.length ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '') +
      '<printOptions horizontalCentered="1"/>' +
      '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
      '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
      '</worksheet>'
    );
  });

  const stylesXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    (numFmts.length
      ? `<numFmts count="${numFmts.length}">${numFmts.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${xmlEsc(f)}"/>`).join('')}</numFmts>`
      : '') +
    `<fonts count="${fonts.length}">${fonts.join('')}</fonts>` +
    `<fills count="${fills.length}">${fills.join('')}</fills>` +
    `<borders count="${borders.length}">${borders.join('')}</borders>` +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  const workbookXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<bookViews><workbookView activeTab="0"/></bookViews>' +
    `<sheets>${names.map((n, i) => `<sheet name="${xmlEsc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>` +
    (definedNames.length ? `<definedNames>${definedNames.join('')}</definedNames>` : '') +
    '</workbook>';

  const workbookRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    names
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
      )
      .join('') +
    `<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>';

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    names
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join('') +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '</Types>';

  const rootRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '</Relationships>';

  const when = model.createdAt instanceof Date ? model.createdAt : new Date();
  const iso = when.toISOString().replace(/\.\d+Z$/, 'Z');
  const coreXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<dc:title>${xmlEsc(model.title || 'Event Report')}</dc:title><dc:creator>${xmlEsc(model.creator || 'Madhusudhan ERP')}</dc:creator>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified>` +
    '</cp:coreProperties>';

  return zipStore(
    [
      { name: '[Content_Types].xml', text: contentTypes },
      { name: '_rels/.rels', text: rootRels },
      { name: 'docProps/core.xml', text: coreXml },
      { name: 'xl/workbook.xml', text: workbookXml },
      { name: 'xl/_rels/workbook.xml.rels', text: workbookRels },
      { name: 'xl/styles.xml', text: stylesXml },
      ...sheetXml.map((text, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, text })),
    ],
    when
  );
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function bytesToBase64(bytes) {
  const parts = [];
  let chunk = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    chunk += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)];
    chunk += i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)] : '=';
    chunk += i + 2 < bytes.length ? B64[c & 63] : '=';
    if (chunk.length > 8192) {
      parts.push(chunk);
      chunk = '';
    }
  }
  parts.push(chunk);
  return parts.join('');
}
