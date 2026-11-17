// FILE: src/features/support/model.ts
// Support Desk (IT Desk + Raise ticket) — shared types, labels, colours and small helpers.
import { T } from '@/src/theme';
import { WORD_SPLIT } from './bloom';

export type Status = 'todo' | 'in_progress' | 'review' | 'done';
export type Kind = 'task' | 'ticket';
export type TType = 'task' | 'bug' | 'feature' | 'change' | 'question';
export type Person = { id: number; name: string; color?: string };

export type Ticket = {
  id: number;
  no: string;
  kind: Kind;
  title: string;
  type: TType;
  priority: number;
  status: Status;
  module: string;
  module_label: string;
  screen: string;
  assignee: Person | null;
  created_by: { kind: 'it' | 'client'; id: number; name: string };
  client: { id: number; name: string; property: string } | null;
  work_date: number | null;
  due_date: number | null;
  spent_min: number;
  est_min?: number;
  dev_side?: string;
  labels: string[];
  position: number;
  rev: number;
  comments: number;
  attachments: number;
  has_resolution: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  status_label?: string;
};

export type Comment = {
  id: number;
  ticket_id: number;
  kind: 'it' | 'client' | 'system';
  author: { kind: string; id: number; name: string };
  body: string;
  internal: boolean;
  event: string;
  created_at: string;
};

export type Attachment = {
  id: number;
  ticket_id: number;
  comment_id: number | null;
  name: string;
  mime: string;
  size: number;
  width: number;
  height: number;
  by: { kind: string; id: number; name: string };
  created_at: string;
  url: string;
};

export type TicketDetail = Ticket & {
  body: string;
  resolution_note: string;
  resolved_by: Person | null;
  rights: { edit: boolean; move: boolean; take: boolean; delete: boolean; comment: boolean; internal: boolean; reopen: boolean };
  timeline?: Comment[];
  pictures?: Attachment[];
};

export type ItUser = { id: number; username: string; name: string; role: 'admin' | 'member'; active: boolean; color: string; last_login_at: string | null; session_id?: number };

export type Filters = {
  kind: '' | Kind;
  assignee: '' | 'me' | 'none' | string;
  type: string;
  priority: string;
  due: '' | 'overdue' | 'today' | 'week';
  created_by: '' | 'client' | 'it' | 'me';
  module: string;
  dev_side: string;
  from: string; // yyyymmdd
  to: string;
  q: string;
};

export const EMPTY_FILTERS: Filters = { kind: '', assignee: '', type: '', priority: '', due: '', created_by: '', module: '', dev_side: '', from: '', to: '', q: '' };

/** "Dev Side" column of the IT sheet */
export const DEV_SIDES: { key: string; label: string; short: string; color: string }[] = [
  { key: 'frontend', label: 'Frontend', short: 'FE', color: '#3A568A' },
  { key: 'backend', label: 'Backend', short: 'BE', color: '#2A6044' },
  { key: 'frontend_backend', label: 'Frontend + Backend', short: 'FE+BE', color: '#652880' },
  { key: 'sql', label: 'SQL', short: 'SQL', color: '#9A4A10' },
  { key: 'mobile', label: 'Mobile app', short: 'APP', color: '#1C567A' },
  { key: 'server', label: 'Server / Network', short: 'NET', color: '#0F766E' },
  { key: 'hardware', label: 'Hardware', short: 'HW', color: '#7B8794' },
  { key: 'other', label: 'Other', short: 'OTHER', color: '#7B8794' },
];
export const devSideOf = (k?: string) => DEV_SIDES.find((x) => x.key === k) || null;

export const STATUSES: { key: Status; label: string; client: string; color: string; icon: string }[] = [
  { key: 'todo', label: 'To do', client: 'Raised', color: T.blue, icon: 'radio-button-unchecked' },
  { key: 'in_progress', label: 'In progress', client: 'In progress', color: T.amber, icon: 'autorenew' },
  { key: 'review', label: 'Testing', client: 'Testing', color: T.purple, icon: 'fact-check' },
  { key: 'done', label: 'Done', client: 'Resolved', color: T.green, icon: 'check-circle' },
];
export const statusOf = (s: string) => STATUSES.find((x) => x.key === s) || STATUSES[0];

export const TYPES: { key: TType; label: string; icon: string; color: string; client: boolean; hint: string }[] = [
  { key: 'bug', label: 'Issue', icon: 'bug-report', color: T.red, client: true, hint: 'Something is wrong or not working' },
  { key: 'feature', label: 'New feature', icon: 'auto-awesome', color: T.purple, client: true, hint: 'Something new you want built' },
  { key: 'change', label: 'Change', icon: 'tune', color: T.copper, client: true, hint: 'Change how an existing screen works' },
  { key: 'question', label: 'Question', icon: 'help-outline', color: T.blue, client: true, hint: 'Need help or an answer' },
  { key: 'task', label: 'Task', icon: 'task-alt', color: T.yd, client: false, hint: 'IT team work' },
];
export const typeOf = (k: string) => TYPES.find((x) => x.key === k) || TYPES[4];

export const PRIORITIES: { key: number; label: string; color: string; icon: string }[] = [
  { key: 1, label: 'Low', color: '#7B8794', icon: 'keyboard-arrow-down' },
  { key: 2, label: 'Normal', color: T.blue, icon: 'drag-handle' },
  { key: 3, label: 'High', color: T.amber, icon: 'keyboard-arrow-up' },
  { key: 4, label: 'Urgent', color: T.red, icon: 'priority-high' },
];
export const priorityOf = (k: number) => PRIORITIES.find((x) => x.key === k) || PRIORITIES[1];

/* ------------------------------- dates -------------------------------- */
const pad = (n: number) => String(n).padStart(2, '0');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const toYmd = (d: Date) => Number(`${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`);
export const ymdToDate = (v: number | string | null | undefined) => {
  const s = String(v || '');
  return s.length === 8 ? new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8))) : null;
};
export const todayYmd = () => toYmd(new Date());
export const addDaysYmd = (n: number, from = new Date()) => { const d = new Date(from); d.setDate(d.getDate() + n); return toYmd(d); };
/** 20261116 -> "16 Nov" (this year) / "16 Nov 25" */
export const fmtYmd = (v: number | string | null | undefined) => {
  const d = ymdToDate(v);
  if (!d) return '';
  return `${d.getDate()} ${MON[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` ${String(d.getFullYear()).slice(2)}` : ''}`;
};
export const parseDt = (s: string | null | undefined) => (s ? new Date(String(s).replace(' ', 'T')) : null);
/** "2026-11-16 10:32:00" -> "10:32" today, "Yesterday 10:32", "14 Nov, 10:32" */
export const fmtWhen = (s: string | null | undefined) => {
  const d = parseDt(s);
  if (!d || Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const day = (x: Date) => toYmd(x);
  if (day(d) === day(now)) return hm;
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (day(d) === day(y)) return `Yesterday ${hm}`;
  return `${d.getDate()} ${MON[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : ''}, ${hm}`;
};
/** "3 min ago" style for live lists */
export const ago = (s: string | null | undefined) => {
  const d = parseDt(s);
  if (!d || Number.isNaN(d.getTime())) return '';
  const sec = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} h ago`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86400)} d ago`;
  return fmtWhen(s);
};
export const isOverdue = (t: Pick<Ticket, 'due_date' | 'status'>) => !!t.due_date && t.status !== 'done' && t.due_date < todayYmd();
/** 90 -> "1.5 h" (Excel style hours) */
export const fmtHours = (m: number) => (m ? `${Math.round((m / 60) * 100) / 100} h` : '0 h');
export const fmtMinutes = (m: number) => {
  if (!m) return '';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h${r ? ` ${r}m` : ''}` : `${r}m`;
};

/** "Dhrumil (IT Head)" -> "DI", "Ravi Patel" -> "RP" (letters / digits only) */
export const initials = (name: string) => {
  const p = String(name || '').split(WORD_SPLIT).filter(Boolean);
  if (!p.length) return '?';
  return (p.length > 1 ? Array.from(p[0])[0] + Array.from(p[1])[0] : Array.from(p[0]).slice(0, 2).join('')).toUpperCase();
};
const PALETTE = ['#C87533', '#3A568A', '#2A6044', '#652880', '#B23A2A', '#1C567A', '#9A4A10', '#C98A1A', '#0F766E', '#7C3AED'];
export const colorFor = (id: number) => PALETTE[Math.abs(id || 0) % PALETTE.length];

/** who may drag / edit a card — the same rule as the server (SupportTickets::canEdit / rights) */
export const canMoveCard = (t: Ticket, me: ItUser | null) => {
  if (!me) return false;
  if (me.role === 'admin') return true;
  if (!t.assignee) return true; // unassigned: anybody can pick it up
  return t.assignee.id === me.id || (t.created_by.kind === 'it' && t.created_by.id === me.id);
};

/** does a live-updated card belong to the current filters? (search words are checked as word starts) */
export function matchesFilters(t: Ticket, f: Filters, me: ItUser | null): boolean {
  if (t.deleted) return false;
  if (f.kind && t.kind !== f.kind) return false;
  if (f.assignee === 'me' && t.assignee?.id !== me?.id) return false;
  if (f.assignee === 'none' && t.assignee) return false;
  if (f.assignee && /^\d+$/.test(f.assignee) && t.assignee?.id !== Number(f.assignee)) return false;
  if (f.type && !f.type.split(',').includes(t.type)) return false;
  if (f.priority && !f.priority.split(',').includes(String(t.priority))) return false;
  if (f.created_by === 'client' && t.created_by.kind !== 'client') return false;
  if (f.created_by === 'it' && t.created_by.kind !== 'it') return false;
  if (f.created_by === 'me' && !(t.created_by.kind === 'it' && t.created_by.id === me?.id)) return false;
  if (f.dev_side && !f.dev_side.split(',').includes(t.dev_side || '')) return false;
  if (f.module && !(t.module === f.module || t.module.startsWith(`${f.module}.`))) return false;
  if (f.from && (t.work_date || 0) < Number(f.from)) return false;
  if (f.to && (t.work_date || 0) > Number(f.to)) return false;
  const today = todayYmd();
  if (f.due === 'overdue' && !isOverdue(t)) return false;
  if (f.due === 'today' && t.due_date !== today) return false;
  if (f.due === 'week' && !(t.due_date && t.due_date >= today && t.due_date <= addDaysYmd(7))) return false;
  if (f.q.trim()) {
    const hay = ` ${[t.id, t.kind === 'task' ? 'ts task' : 'tk ticket', t.title, t.module_label, t.module, t.client?.name, t.created_by.name, t.assignee?.name, t.labels.join(' ')].join(' ')} `
      .toLowerCase().split(WORD_SPLIT).join(' ');
    const num = f.q.trim().match(/^#?\s*(?:t[ks]\s*-?\s*)?(\d{1,12})$/i);
    if (num && Number(num[1]) === t.id) return true;
    const words = f.q.toLowerCase().split(WORD_SPLIT).filter((w) => Array.from(w).length >= 2);
    if (!words.length) return false;
    if (!words.every((w) => hay.includes(` ${w}`))) return false;
  }
  return true;
}

export const filtersToParams = (f: Filters): Record<string, string> => {
  const out: Record<string, string> = {};
  (Object.keys(f) as (keyof Filters)[]).forEach((k) => { if (f[k]) out[k] = String(f[k]); });
  return out;
};
export const activeFilterCount = (f: Filters) => (Object.keys(f) as (keyof Filters)[]).filter((k) => k !== 'q' && f[k]).length;

/* ------------------------------ periods ------------------------------- */
// History + Excel: one day, one month, one year or any range (all by the card's work date).
export type PeriodMode = 'day' | 'month' | 'year' | 'range' | 'all';
export type Period = { mode: PeriodMode; from: number; to: number };
export const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function periodFor(mode: PeriodMode, at: Date = new Date()): Period {
  const y = at.getFullYear();
  const m = at.getMonth();
  if (mode === 'day') return { mode, from: toYmd(at), to: toYmd(at) };
  if (mode === 'year') return { mode, from: y * 10000 + 101, to: y * 10000 + 1231 };
  if (mode === 'all') return { mode, from: 0, to: 0 };
  if (mode === 'range') return { mode, from: toYmd(new Date(y, m, 1)), to: toYmd(at) };
  return { mode: 'month', from: toYmd(new Date(y, m, 1)), to: toYmd(new Date(y, m + 1, 0)) };
}
/** previous / next day, month or year */
export function shiftPeriod(p: Period, dir: -1 | 1): Period {
  const d = ymdToDate(p.from) || new Date();
  if (p.mode === 'day') { d.setDate(d.getDate() + dir); return periodFor('day', d); }
  if (p.mode === 'month') return periodFor('month', new Date(d.getFullYear(), d.getMonth() + dir, 1));
  if (p.mode === 'year') return periodFor('year', new Date(d.getFullYear() + dir, 0, 1));
  return p;
}
export const periodHasNext = (p: Period) => p.mode !== 'range' && p.mode !== 'all' && p.to < todayYmd();
export function periodLabel(p: Period): string {
  const d = ymdToDate(p.from);
  if (p.mode === 'all' || !d) return 'All dates';
  if (p.mode === 'day') return `${DOW[d.getDay()].slice(0, 3)}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
  if (p.mode === 'month') return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
  if (p.mode === 'year') return String(d.getFullYear());
  return `${fmtYmdFull(p.from)} – ${fmtYmdFull(p.to)}`;
}
export const periodParams = (p: Period): Record<string, string> => (p.mode === 'all' || !p.from ? {} : { from: String(p.from), to: String(p.to) });
/** 20261116 -> "16/11/2026" (same as the Excel sheet) */
export const fmtYmdFull = (v: number | string | null | undefined) => {
  const d = ymdToDate(v);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '';
};
/** 20261116 -> "Monday" */
export const dayName = (v: number | string | null | undefined) => { const d = ymdToDate(v); return d ? DOW[d.getDay()] : ''; };
export const inPeriod = (t: Pick<Ticket, 'work_date'>, p: Period) => p.mode === 'all' || !p.from || (!!t.work_date && t.work_date >= p.from && t.work_date <= p.to);
