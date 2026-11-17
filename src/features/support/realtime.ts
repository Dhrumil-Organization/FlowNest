// FILE: src/features/support/realtime.ts
// Live updates for the IT Desk and the Raise-ticket screens.
//
//   1. WebSocket (support-ws server): the server pushes every change the moment it happens.
//   2. On (re)connect and when the app comes back to the foreground: "what changed since rev N"
//      — so nothing is missed while the phone slept or the network dropped.
//   3. No WebSocket (server not set up / blocked): the same changes call every few seconds.
// The screen gets ticket changes through onTickets() and other events through onEvent();
// it never needs to know which of the three delivered them.
import { AppState, AppStateStatus } from 'react-native';
import type { Ticket } from './model';

/* app-wide event bus: the open ticket panel listens for comments / pictures of its ticket */
const listeners = new Set<(ev: any) => void>();
export const onSupportEvent = (fn: (ev: any) => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const emitSupportEvent = (ev: any) => listeners.forEach((fn) => { try { fn(ev); } catch { /* ignore */ } });

export type LiveStatus = 'connecting' | 'live' | 'polling' | 'offline';
type Pass = { url: string; token: string; expires_at?: number } | null;

type Options = {
  /** fresh signed pass for the WebSocket server (null = WebSocket not configured) */
  getPass: () => Promise<Pass>;
  /** changes after a revision: { items, rev, more } */
  fetchChanges: (since: number) => Promise<{ items: Ticket[]; rev: number; more: boolean }>;
  onTickets: (items: Ticket[]) => void;
  onEvent?: (event: any) => void;
  onStatus?: (s: LiveStatus) => void;
  startRev: number;
  pollMs?: number;
};

export class LiveSync {
  private o: Options;
  private ws: WebSocket | null = null;
  private rev: number;
  private stopped = false;
  private retry = 0;
  private retryTimer: any = null;
  private pollTimer: any = null;
  private pingTimer: any = null;
  private syncing = false;
  private resync = false;
  private appSub: { remove: () => void } | null = null;
  private status: LiveStatus = 'connecting';
  private wsConfigured = true;

  constructor(o: Options) {
    this.o = o;
    this.rev = o.startRev || 0;
  }

  start() {
    this.stopped = false;
    this.connect();
    this.appSub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') {
        void this.sync();
        if (!this.ws || this.ws.readyState > 1) this.connect();
      }
    });
    return this;
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    clearInterval(this.pollTimer);
    clearInterval(this.pingTimer);
    this.appSub?.remove();
    try { this.ws?.close(); } catch { /* ignore */ }
    this.ws = null;
  }

  /** a revision seen through a normal call (list / save) — the feed continues from the newest */
  seen(rev: number) {
    if (rev > this.rev) this.rev = rev;
  }

  getStatus() {
    return this.status;
  }

  private setStatus(s: LiveStatus) {
    if (this.status === s) return;
    this.status = s;
    this.o.onStatus?.(s);
  }

  /** pull every change after the last known revision (pages through bursts) */
  async sync() {
    if (this.stopped) return;
    if (this.syncing) { this.resync = true; return; }
    this.syncing = true;
    try {
      for (let i = 0; i < 20; i++) {
        const r = await this.o.fetchChanges(this.rev);
        if (r.items.length) this.o.onTickets(r.items);
        if (r.rev > this.rev) this.rev = r.rev;
        if (!r.more) break;
      }
      if (this.status === 'offline') this.setStatus(this.ws && this.ws.readyState === 1 ? 'live' : 'polling');
    } catch (e: any) {
      if (!e?.status) this.setStatus('offline');
    } finally {
      this.syncing = false;
      if (this.resync) { this.resync = false; void this.sync(); }
    }
  }

  private startPolling() {
    clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => { if (AppState.currentState === 'active' || AppState.currentState == null) void this.sync(); }, this.o.pollMs || 12000);
  }

  private async connect() {
    if (this.stopped) return;
    clearTimeout(this.retryTimer);
    let pass: Pass = null;
    try {
      pass = await this.o.getPass();
    } catch {
      pass = null;
    }
    if (this.stopped) return;
    if (!pass || !pass.url || typeof WebSocket === 'undefined') {
      // WebSocket not set up on this server: keep the screen live with the changes feed
      this.wsConfigured = false;
      this.setStatus('polling');
      this.startPolling();
      void this.sync();
      return;
    }
    this.wsConfigured = true;
    this.setStatus(this.status === 'live' ? 'live' : 'connecting');
    const url = `${pass.url}${pass.url.includes('?') ? '&' : '?'}token=${encodeURIComponent(pass.token)}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.retry = 0;
      clearInterval(this.pollTimer);
      this.setStatus('live');
      void this.sync(); // whatever happened while not connected
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => { try { ws.send('ping'); } catch { /* ignore */ } }, 30000);
    };
    ws.onmessage = (m: any) => {
      let msg: any = null;
      try { msg = JSON.parse(String(m.data)); } catch { return; }
      if (!msg || msg.type !== 'event' || !msg.event) return;
      const ev = msg.event;
      if (ev.ticket) {
        if (ev.ticket.rev > this.rev + 1) void this.sync(); // a change was missed in between
        else if (ev.ticket.rev > this.rev) this.rev = ev.ticket.rev;
        this.o.onTickets([ev.ticket]);
      }
      this.o.onEvent?.(ev);
      emitSupportEvent(ev);
    };
    ws.onerror = () => { /* onclose follows */ };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      clearInterval(this.pingTimer);
      if (this.stopped) return;
      this.setStatus('polling');
      this.startPolling();
      this.scheduleRetry();
    };
  }

  private scheduleRetry() {
    if (this.stopped || !this.wsConfigured) return;
    this.retry = Math.min(this.retry + 1, 6);
    const ms = Math.min(30000, 1500 * 2 ** (this.retry - 1)) + Math.floor(Math.random() * 800);
    this.retryTimer = setTimeout(() => this.connect(), ms);
  }
}
