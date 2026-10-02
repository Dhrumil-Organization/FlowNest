// FILE: src/components/VisitorsReportNEW/pdfLite.ts
// A small PDF writer (no library) used for the report PDF on WEB — the same
// file is shown in the preview and downloaded. On Android / iOS the PDF is
// made by expo-print from the HTML in reportHtml.ts instead.
//
// It can do what a report needs: pages, Helvetica / Helvetica-Bold text
// (left / right / centre), filled rectangles (also rounded), lines and JPEG
// photos.
//
// Limit: the built-in PDF fonts only have English / Latin letters — any other
// script (e.g. Hindi typed in a name) is written as "?" here. Print and the
// phone PDF show every script correctly.
//
// Units: points (1/72 inch), origin = TOP-left of the page (converted inside).

// Helvetica character widths (per 1000 units) for ASCII 32…126.
const WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667,
  778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556,
  222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

/** Keep what the built-in fonts can draw. */
export const pdfSafe = (text: any): string =>
  String(text ?? '')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[·•]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\n]/g, '?');

/** Width of a text in points (bold is about 6% wider). */
export const textWidth = (text: string, size: number, bold = false): number => {
  let w = 0;
  for (let i = 0; i < text.length; i += 1) w += WIDTHS[text.charCodeAt(i) - 32] ?? 556;
  return ((w * size) / 1000) * (bold ? 1.06 : 1);
};

/** Break text into lines that fit `maxWidth` (also breaks on "\n" and very long words). */
export function wrapText(text: string, size: number, maxWidth: number, bold = false): string[] {
  const out: string[] = [];
  pdfSafe(text).split('\n').forEach((para) => {
    let line = '';
    para.split(' ').forEach((raw) => {
      let word = raw;
      // a single word wider than the cell → cut it
      while (textWidth(word, size, bold) > maxWidth && word.length > 1) {
        let n = word.length - 1;
        while (n > 1 && textWidth(word.slice(0, n), size, bold) > maxWidth) n -= 1;
        if (line) { out.push(line); line = ''; }
        out.push(word.slice(0, n));
        word = word.slice(n);
      }
      const next = line ? `${line} ${word}` : word;
      if (textWidth(next, size, bold) <= maxWidth) line = next;
      else { if (line) out.push(line); line = word; }
    });
    out.push(line);
  });
  return out.length ? out : [''];
}

export type Rgb = [number, number, number];
/** 'C87533' → [200, 117, 51] */
export const hex = (h: string): Rgb => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
const col = (c: Rgb) => c.map((x) => (x / 255).toFixed(3)).join(' ');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const n2 = (x: number) => x.toFixed(2);

export type JpegInfo = { width: number; height: number; components: number };

/** Size of a JPEG (null when the bytes are not a JPEG the PDF can embed). */
export function jpegInfo(bytes: Uint8Array): JpegInfo | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) { i += 1; continue; }
    const marker = bytes[i + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xff) { i += 2; continue; }
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    // SOF0…SOF3, SOF5…SOF7, SOF9…SOF11, SOF13…SOF15 carry the size
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8], components: bytes[i + 9] };
    }
    i += 2 + len;
  }
  return null;
}

type Image = { bytes: Uint8Array; info: JpegInfo };

export class PdfLite {
  readonly width: number;
  readonly height: number;
  private pages: string[] = [''];
  private at = 0;
  private images: Image[] = [];

  constructor(width = 841.89, height = 595.28) { // A4 landscape
    this.width = width;
    this.height = height;
  }

  get pageCount() { return this.pages.length; }

  addPage() {
    this.pages.push('');
    this.at = this.pages.length - 1;
  }

  /** Draw on an earlier page (used to add "Page x of y" at the end). */
  setPage(index: number) { this.at = Math.max(0, Math.min(index, this.pages.length - 1)); }

  private put(op: string) { this.pages[this.at] += op; }

  text(text: string, x: number, y: number, size: number, opts?: { bold?: boolean; color?: Rgb; align?: 'left' | 'right' | 'center' }) {
    const safe = pdfSafe(text);
    const c = opts?.color || [26, 21, 20];
    const w = opts?.align && opts.align !== 'left' ? textWidth(safe, size, opts?.bold) : 0;
    const left = opts?.align === 'right' ? x - w : opts?.align === 'center' ? x - w / 2 : x;
    this.put(`BT /${opts?.bold ? 'F2' : 'F1'} ${size} Tf ${col(c)} rg ${n2(left)} ${n2(this.height - y)} Td (${esc(safe)}) Tj ET\n`);
  }

  rect(x: number, y: number, w: number, h: number, color: Rgb) {
    this.put(`${col(color)} rg ${n2(x)} ${n2(this.height - y - h)} ${n2(w)} ${n2(h)} re f\n`);
  }

  /** Filled rectangle with round corners. */
  roundRect(x: number, y: number, w: number, h: number, r: number, color: Rgb) {
    const rr = Math.min(r, w / 2, h / 2);
    const k = rr * 0.5523; // circle approximation with Bezier curves
    const b = this.height - y - h; // bottom
    const t = this.height - y;     // top
    const l = x;
    const rt = x + w;
    this.put(
      `${col(color)} rg ${n2(l + rr)} ${n2(b)} m ${n2(rt - rr)} ${n2(b)} l `
      + `${n2(rt - rr + k)} ${n2(b)} ${n2(rt)} ${n2(b + rr - k)} ${n2(rt)} ${n2(b + rr)} c ${n2(rt)} ${n2(t - rr)} l `
      + `${n2(rt)} ${n2(t - rr + k)} ${n2(rt - rr + k)} ${n2(t)} ${n2(rt - rr)} ${n2(t)} c ${n2(l + rr)} ${n2(t)} l `
      + `${n2(l + rr - k)} ${n2(t)} ${n2(l)} ${n2(t - rr + k)} ${n2(l)} ${n2(t - rr)} c ${n2(l)} ${n2(b + rr)} l `
      + `${n2(l)} ${n2(b + rr - k)} ${n2(l + rr - k)} ${n2(b)} ${n2(l + rr)} ${n2(b)} c f\n`,
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, color: Rgb, width = 0.5) {
    this.put(`${col(color)} RG ${width} w ${n2(x1)} ${n2(this.height - y1)} m ${n2(x2)} ${n2(this.height - y2)} l S\n`);
  }

  /** Register a JPEG; returns its id for image() or -1 when it cannot be used. */
  addJpeg(bytes: Uint8Array): number {
    const info = jpegInfo(bytes);
    if (!info || !info.width || !info.height || ![1, 3, 4].includes(info.components)) return -1;
    this.images.push({ bytes, info });
    return this.images.length - 1;
  }

  /** Draw a registered JPEG, cropped to fill the box (like object-fit: cover). */
  image(id: number, x: number, y: number, w: number, h: number) {
    const img = this.images[id];
    if (!img) return;
    const scale = Math.max(w / img.info.width, h / img.info.height);
    const dw = img.info.width * scale;
    const dh = img.info.height * scale;
    const bottom = this.height - y - h;
    this.put(
      `q ${n2(x)} ${n2(bottom)} ${n2(w)} ${n2(h)} re W n `
      + `${n2(dw)} 0 0 ${n2(dh)} ${n2(x - (dw - w) / 2)} ${n2(bottom - (dh - h) / 2)} cm /Im${id} Do Q\n`,
    );
  }

  /** The finished file as bytes. */
  build(): Uint8Array {
    const chunks: Uint8Array[] = [];
    let length = 0;
    const ascii = (s: string) => {
      const b = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i += 1) b[i] = s.charCodeAt(i) & 0xff;
      return b;
    };
    const push = (b: Uint8Array) => { chunks.push(b); length += b.length; };
    const offsets: number[] = [];
    const total = 4 + this.images.length + this.pages.length * 2;
    const object = (id: number, head: string, stream?: Uint8Array) => {
      offsets[id] = length;
      if (stream) {
        push(ascii(`${id} 0 obj\n${head}\nstream\n`));
        push(stream);
        push(ascii('\nendstream\nendobj\n'));
      } else {
        push(ascii(`${id} 0 obj\n${head}\nendobj\n`));
      }
    };

    // ids: 1 catalog, 2 pages, 3 F1, 4 F2, then images, then (content, page) pairs
    const imageId = (i: number) => 5 + i;
    const contentId = (p: number) => 5 + this.images.length + p * 2;
    const pageId = (p: number) => contentId(p) + 1;

    push(ascii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
    object(1, '<< /Type /Catalog /Pages 2 0 R >>');
    object(2, `<< /Type /Pages /Kids [${this.pages.map((_p, i) => `${pageId(i)} 0 R`).join(' ')}] /Count ${this.pages.length} >>`);
    object(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    object(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    this.images.forEach((img, i) => {
      const space = img.info.components === 1 ? '/DeviceGray' : img.info.components === 4 ? '/DeviceCMYK' : '/DeviceRGB';
      object(
        imageId(i),
        `<< /Type /XObject /Subtype /Image /Width ${img.info.width} /Height ${img.info.height} /ColorSpace ${space} `
        + `/BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>`,
        img.bytes,
      );
    });
    const xobjects = this.images.length ? ` /XObject << ${this.images.map((_im, i) => `/Im${i} ${imageId(i)} 0 R`).join(' ')} >>` : '';
    this.pages.forEach((content, p) => {
      const bytes = ascii(content);
      object(contentId(p), `<< /Length ${bytes.length} >>`, bytes);
      object(
        pageId(p),
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] `
        + `/Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xobjects} >> /Contents ${contentId(p)} 0 R >>`,
      );
    });

    const xref = length;
    let tail = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
    for (let id = 1; id <= total; id += 1) tail += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    tail += `trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    push(ascii(tail));

    const out = new Uint8Array(length);
    let at = 0;
    chunks.forEach((b) => { out.set(b, at); at += b.length; });
    return out;
  }
}
