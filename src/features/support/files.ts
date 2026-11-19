// FILE: src/features/support/files.ts
// Files for chat messages and ticket replies — any type (pictures, PDF, Excel, Word, zip …),
// a whole folder on the web, photos / camera on phones. Each file is uploaded on its own
// (multipart, with progress) and the server answers an "upload ticket"; the message / reply is
// then sent with those tickets.
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Linking, Platform } from 'react-native';
import { T } from '@/src/theme';
import type { SupportCall } from './api';

export type PickedFile = {
  key: string;
  name: string;
  size: number;
  mime: string;
  /** native: file:// uri — web: object URL for previews */
  uri?: string;
  /** web: the File object */
  file?: any;
  /** inside a picked folder: "Reports/Nov/a.pdf" */
  relPath?: string;
};

export type Uploaded = { token: string; name: string; mime: string; size: number; width: number; height: number; image: boolean };

const uid = () => Math.random().toString(36).slice(2, 10);
const WEB = Platform.OS === 'web';

/** web: the browser's file chooser (folder = every file of a folder, with its paths) */
function webPick(opts: { multiple?: boolean; folder?: boolean; accept?: string; capture?: boolean }): Promise<PickedFile[]> {
  return new Promise((resolve) => {
    const g: any = globalThis;
    const input = g.document.createElement('input');
    input.type = 'file';
    input.multiple = opts.multiple !== false;
    if (opts.accept) input.accept = opts.accept;
    if (opts.folder) { input.webkitdirectory = true; input.setAttribute('webkitdirectory', ''); input.setAttribute('directory', ''); }
    input.style.display = 'none';
    let done = false;
    input.onchange = () => {
      done = true;
      const list: PickedFile[] = Array.from(input.files || []).map((f: any) => ({
        key: uid(), name: f.name, size: f.size, mime: f.type || 'application/octet-stream', file: f,
        uri: /^image\//.test(f.type) ? g.URL.createObjectURL(f) : undefined,
        relPath: f.webkitRelativePath || undefined,
      }));
      input.remove();
      resolve(list);
    };
    // cancelled: some browsers fire nothing — resolve when the window gets focus back
    g.addEventListener('focus', () => setTimeout(() => { if (!done) { input.remove(); resolve([]); } }, 800), { once: true });
    g.document.body.appendChild(input);
    input.click();
  });
}

/** web: File objects (paste / drag & drop) -> picked files */
export function fromWebFiles(list: any): PickedFile[] {
  const g: any = globalThis;
  return Array.from(list || []).filter((f: any) => f && typeof f.size === 'number').map((f: any, i: number) => {
    const isImg = /^image\//.test(f.type || '');
    // a screenshot pasted from the clipboard is always called "image.png" -> give it a real name
    const name = !f.name || f.name === 'image.png' ? `pasted-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}${i ? `-${i + 1}` : ''}.${(f.type || 'image/png').split('/')[1] || 'png'}` : f.name;
    return { key: uid(), name, size: f.size, mime: f.type || 'application/octet-stream', file: f, uri: isImg ? g.URL.createObjectURL(f) : undefined };
  });
}

/** phone: a picture copied to the clipboard -> a file (Paste) */
export async function pasteFromClipboard(): Promise<PickedFile[]> {
  if (WEB) {
    const nav: any = (globalThis as any).navigator;
    if (!nav?.clipboard?.read) return [];
    const items = await nav.clipboard.read();
    const out: any[] = [];
    for (const it of items) for (const t of it.types) if (t.startsWith('image/') || !t.startsWith('text/')) { const b = await it.getType(t); out.push(new (globalThis as any).File([b], '', { type: t })); }
    return fromWebFiles(out);
  }
  const Clipboard = await import('expo-clipboard');
  if (!(await Clipboard.hasImageAsync())) return [];
  const img = await Clipboard.getImageAsync({ format: 'png' });
  if (!img?.data) return [];
  const b64 = img.data.replace(/^data:image\/\w+;base64,/, '');
  const name = `pasted-${Date.now()}.png`;
  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
  return [{ key: uid(), name, size: Math.floor((b64.length * 3) / 4), mime: 'image/png', uri }];
}

export async function clipboardHasImage(): Promise<boolean> {
  if (WEB) return true;
  try { const Clipboard = await import('expo-clipboard'); return await Clipboard.hasImageAsync(); } catch { return false; }
}

/** copy text (message, note) */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (WEB) { await (globalThis as any).navigator.clipboard.writeText(text); return true; }
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(text);
    return true;
  } catch { return false; }
}

/** any files (documents, zip, pictures …) */
export async function pickFiles(multiple = true): Promise<PickedFile[]> {
  if (WEB) return webPick({ multiple });
  const r = await DocumentPicker.getDocumentAsync({ multiple, copyToCacheDirectory: true, type: '*/*' });
  if (r.canceled || !r.assets) return [];
  return r.assets.map((a) => ({ key: uid(), name: a.name || 'file', size: a.size || 0, mime: a.mimeType || 'application/octet-stream', uri: a.uri }));
}

/** web only: a whole folder (its files keep their folder path; others can download it as one zip) */
export const canPickFolder = WEB;
export async function pickFolder(): Promise<{ folder: string; files: PickedFile[] }> {
  const files = await webPick({ folder: true });
  const first = files.find((f) => f.relPath)?.relPath || '';
  return { folder: first.split('/')[0] || 'Folder', files };
}

/** photos from the gallery */
export async function pickPhotos(): Promise<PickedFile[]> {
  if (WEB) return webPick({ multiple: true, accept: 'image/*' });
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return [];
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: 20, quality: 0.85 });
  if (r.canceled) return [];
  return r.assets.map((a, i) => ({ key: uid(), name: a.fileName || `photo-${Date.now()}-${i + 1}.jpg`, size: a.fileSize || 0, mime: a.mimeType || 'image/jpeg', uri: a.uri }));
}

/** a new photo from the camera (phones / tablets) */
export async function takePicture(): Promise<PickedFile[]> {
  if (WEB) return webPick({ multiple: false, accept: 'image/*', capture: true });
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return [];
  const r = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  if (r.canceled || !r.assets?.[0]) return [];
  const a = r.assets[0];
  return [{ key: uid(), name: a.fileName || `camera-${Date.now()}.jpg`, size: a.fileSize || 0, mime: a.mimeType || 'image/jpeg', uri: a.uri }];
}

/* ============================== uploads ============================== */
//
// Every file is its own JOB with its own progress and status. Files up to 4 MB go in one request;
// bigger ones (up to the admin's limit, 1 GB by default) go in 4 MB pieces:
//   upload.start -> piece, piece, … -> upload.finish
// A piece that fails is retried (1 s, 2 s, 4 s …); after a network drop the server tells where
// to continue (upload.status), so nothing is sent twice. The same bytes come back on download.

export type UploadCfg = {
  /** API base (https://apig…) */
  base: string;
  realm: 'it' | 'client';
  headers: Record<string, string>;
  /** the realm's action caller (upload.start / status / chunk / finish) */
  api: SupportCall;
};
export type Limits = { max_upload_mb: number; max_files_per_message: number; blocked_extensions: string[]; chunk_kb?: number };
export const DEFAULT_LIMITS: Limits = { max_upload_mb: 1024, max_files_per_message: 200, blocked_extensions: ['php', 'phtml', 'phar', 'cgi', 'asp', 'aspx', 'jsp', 'htaccess'] };
export type JobStatus = 'waiting' | 'uploading' | 'done' | 'error';
export type Job = { key: string; name: string; size: number; progress: number; status: JobStatus; error: string; token?: string };

const CHUNK = 4 * 1024 * 1024;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const extOf = (name: string) => (name.includes('.') ? (name.split('.').pop() || '').toLowerCase() : '');
const cleanBase = (b: string) => String(b || '').replace(/\/+$/, '').replace(/\/api$/, '');

/** check files BEFORE anything is uploaded -> list of problems (shown in one alert) */
export function checkFiles(files: PickedFile[], limits: Limits, alreadyAttached = 0): { ok: PickedFile[]; problems: string[] } {
  const max = limits.max_upload_mb * 1048576;
  const blocked = new Set((limits.blocked_extensions || []).map((x) => x.toLowerCase()));
  const problems: string[] = [];
  const ok: PickedFile[] = [];
  const tooBig: string[] = []; const empty: string[] = []; const bad: string[] = [];
  files.forEach((f) => {
    const ext = extOf(f.name);
    if (f.size > max) tooBig.push(`${f.name} (${fmtBytes(f.size)})`);
    else if (f.size === 0 && (WEB || f.file)) empty.push(f.name);
    else if (ext && blocked.has(ext)) bad.push(f.name);
    else ok.push(f);
  });
  const list = (a: string[]) => (a.length > 4 ? `${a.slice(0, 4).join(', ')} and ${a.length - 4} more` : a.join(', '));
  if (tooBig.length) problems.push(`Too big — a file can be at most ${fmtBytes(max)}: ${list(tooBig)}`);
  if (empty.length) problems.push(`Empty files skipped: ${list(empty)}`);
  if (bad.length) problems.push(`These file types cannot be shared (put them in a zip): ${list(bad)}`);
  const room = Math.max(0, limits.max_files_per_message - alreadyAttached);
  if (ok.length > room) {
    problems.push(`At most ${limits.max_files_per_message} files in one message — ${ok.length - room} file(s) left out. Zip the folder to send everything at once.`);
    ok.splice(room);
  }
  return { ok, problems };
}

/** native: real size of a picked file when the picker did not say */
async function sizeOf(f: PickedFile): Promise<number> {
  if (f.size > 0 || WEB) return f.size;
  try { const info: any = await FileSystem.getInfoAsync(f.uri || ''); return info?.size || 0; } catch { return 0; }
}

function errText(e: any, name: string) {
  const status = e?.response?.status || e?.status;
  const msg = e?.response?.data?.message || e?.message || 'Upload failed.';
  if (status === 0 || e?.code === 'ERR_NETWORK' || /network/i.test(String(msg))) return `${name}: no connection — will retry`;
  return String(msg).startsWith(name) ? String(msg) : `${name}: ${msg}`;
}
const retryable = (e: any) => { const st = e?.response?.status ?? e?.status ?? 0; return st === 0 || st === 408 || st === 409 || st === 429 || st >= 500; };

/** one small file, one request */
async function uploadWhole(cfg: UploadCfg, f: PickedFile, onProgress: (p: number) => void, signal?: AbortSignal): Promise<Uploaded> {
  const fd = new FormData();
  if (WEB && f.file) fd.append('file', f.file, f.name);
  else fd.append('file', { uri: f.uri, name: f.name, type: f.mime || 'application/octet-stream' } as any);
  if (f.relPath) fd.append('path', f.relPath);
  const r = await axios.post(`${cleanBase(cfg.base)}/api/support/${cfg.realm}-upload`, fd, {
    headers: { Accept: 'application/json', ...cfg.headers, ...(WEB ? {} : { 'Content-Type': 'multipart/form-data' }) },
    timeout: 10 * 60 * 1000, signal,
    onUploadProgress: (e: any) => { if (e.total) onProgress(Math.min(0.99, e.loaded / e.total)); },
  });
  const b = r.data;
  if (!b || b.success !== true) throw Object.assign(new Error(b?.message || 'Upload failed.'), { status: r.status });
  return b.response.data as Uploaded;
}

/** a big file in 4 MB pieces, resumable */
async function uploadChunked(cfg: UploadCfg, f: PickedFile, size: number, onProgress: (p: number) => void, signal?: AbortSignal): Promise<Uploaded> {
  const st = await cfg.api<{ upload_id: string; chunk_bytes: number; received: number }>('upload.start', { name: f.name, size, mime: f.mime || 'application/octet-stream', path: f.relPath || '' });
  const id = st.upload_id;
  const piece = st.chunk_bytes || CHUNK;
  let offset = st.received || 0;
  let fails = 0;
  while (offset < size) {
    if (signal?.aborted) throw new Error('Cancelled.');
    const len = Math.min(piece, size - offset);
    try {
      let received: number;
      if (WEB && f.file) {
        const blob = f.file.slice(offset, offset + len);
        const r = await axios.post(`${cleanBase(cfg.base)}/api/support/${cfg.realm}-upload-chunk?upload_id=${id}&offset=${offset}`, blob, {
          headers: { Accept: 'application/json', 'Content-Type': 'application/octet-stream', ...cfg.headers }, timeout: 120000, signal,
          onUploadProgress: (e: any) => { if (e.total) onProgress(Math.min(0.99, (offset + e.loaded * (len / e.total)) / size)); },
        });
        if (!r.data || r.data.success !== true) throw Object.assign(new Error(r.data?.message || 'Upload failed.'), { status: r.status });
        received = r.data.response.data.received;
      } else {
        const data = await FileSystem.readAsStringAsync(f.uri || '', { encoding: FileSystem.EncodingType.Base64, position: offset, length: len });
        received = (await cfg.api<{ received: number }>('upload.chunk', { upload_id: id, offset, data }, { timeout: 120000, signal })).received;
      }
      offset = received;
      fails = 0;
      onProgress(Math.min(0.99, offset / size));
    } catch (e: any) {
      if (signal?.aborted) throw new Error('Cancelled.');
      fails++;
      if (!retryable(e) || fails > 6) throw e;
      await sleep(Math.min(15000, 1000 * 2 ** (fails - 1)));
      // ask the server how much it has (a piece may have arrived although the answer got lost)
      try { offset = (await cfg.api<{ received: number }>('upload.status', { upload_id: id })).received; } catch { /* retry the same piece */ }
    }
  }
  return cfg.api<Uploaded>('upload.finish', { upload_id: id }, { timeout: 300000 });
}

/** upload one file (picks one request or pieces) — retried on network errors */
export async function uploadOne(cfg: UploadCfg, f: PickedFile, onProgress: (p: number) => void, signal?: AbortSignal): Promise<Uploaded> {
  const size = await sizeOf(f);
  for (let attempt = 1; ; attempt++) {
    try {
      const r = size > CHUNK || size === 0 && !WEB ? await uploadChunked(cfg, f, size || 1, onProgress, signal) : await uploadWhole(cfg, f, onProgress, signal);
      onProgress(1);
      return r;
    } catch (e: any) {
      if (signal?.aborted) throw new Error(`${f.name}: cancelled`);
      if (attempt >= 3 || !retryable(e)) throw new Error(errText(e, f.name));
      await sleep(1500 * attempt);
    }
  }
}

/**
 * Upload many files as jobs, 3 at a time. onJob reports every file's own progress / status.
 * Files that are already done (token) are skipped -> "retry" sends only the failed ones.
 */
export async function uploadJobs(cfg: UploadCfg, files: PickedFile[], jobs: Job[], onJob: (key: string, patch: Partial<Job>) => void, signal?: AbortSignal): Promise<{ tokens: string[]; failed: number }> {
  const todo = files.map((f, i) => ({ f, j: jobs[i] })).filter((x) => x.j.status !== 'done');
  let next = 0;
  let failed = 0;
  const worker = async () => {
    while (next < todo.length) {
      const { f, j } = todo[next++];
      onJob(j.key, { status: 'uploading', error: '', progress: 0 });
      try {
        const r = await uploadOne(cfg, f, (p) => onJob(j.key, { progress: p }), signal);
        j.token = r.token; j.status = 'done';
        onJob(j.key, { status: 'done', progress: 1, token: r.token });
      } catch (e: any) {
        failed++;
        j.status = 'error';
        onJob(j.key, { status: 'error', error: e?.message || 'Upload failed.' });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, todo.length) }, worker));
  return { tokens: jobs.filter((j) => j.status === 'done' && j.token).map((j) => j.token!), failed };
}

/** many files, one overall progress (ticket replies) — throws the first problem */
export async function uploadAll(cfg: UploadCfg, files: PickedFile[], onProgress?: (p: number) => void): Promise<string[]> {
  const jobs = newJobs(files);
  const total = files.reduce((n, f) => n + (f.size || 1), 0) || 1;
  const prog: Record<string, number> = {};
  const r = await uploadJobs(cfg, files, jobs, (key, patch) => {
    if (patch.progress != null) { prog[key] = patch.progress; onProgress?.(files.reduce((n, f) => n + (f.size || 1) * (prog[f.key] || 0), 0) / total); }
  });
  if (r.failed) throw new Error(jobs.find((j) => j.status === 'error')?.error || 'Upload failed.');
  return r.tokens;
}

export const newJobs = (files: PickedFile[]): Job[] => files.map((f) => ({ key: f.key, name: f.relPath || f.name, size: f.size, progress: 0, status: 'waiting', error: '' }));

export const fmtBytes = (n: number) => {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} MB`;
  return `${(n / 1073741824).toFixed(1)} GB`;
};

/** icon + colour for a file */
export function fileLook(name: string, mime = ''): { icon: string; color: string; label: string } {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (/^image\//.test(mime) || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)) return { icon: 'image', color: T.purple, label: 'Picture' };
  if (ext === 'pdf') return { icon: 'picture-as-pdf', color: '#D93025', label: 'PDF' };
  if (['xls', 'xlsx', 'xlsm', 'csv'].includes(ext)) return { icon: 'grid-on', color: '#1E7E45', label: 'Excel' };
  if (['doc', 'docx', 'rtf', 'odt', 'txt'].includes(ext)) return { icon: 'description', color: '#2B5797', label: 'Document' };
  if (['ppt', 'pptx'].includes(ext)) return { icon: 'slideshow', color: '#C55A11', label: 'Slides' };
  if (['zip', 'rar', '7z', 'gz', 'tar'].includes(ext)) return { icon: 'folder-zip', color: '#9A4A10', label: 'Zip' };
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return { icon: 'movie', color: '#652880', label: 'Video' };
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return { icon: 'audiotrack', color: '#0F766E', label: 'Audio' };
  if (['sql', 'js', 'ts', 'tsx', 'php', 'json', 'xml', 'html', 'css', 'py', 'log'].includes(ext)) return { icon: 'code', color: '#3A568A', label: 'Code' };
  return { icon: 'insert-drive-file', color: T.muted, label: ext ? ext.toUpperCase() : 'File' };
}

/** open / download a signed link (web: new tab or download, phone: browser / viewer) */
export function openLink(url: string) {
  if (WEB) { (globalThis as any).open(url, '_blank', 'noopener'); return; }
  void Linking.openURL(url);
}
