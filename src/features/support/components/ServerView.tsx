// FILE: src/features/support/components/ServerView.tsx
// SERVER (IT admin) — how the backend is doing right now, refreshed every 10 s:
//   warnings first (disk almost full, php.ini too small, live connection down …)
//   machine: CPU load, memory, disk, uptime, PHP · live connection (WebSocket) health
//   traffic: requests per minute (last hour), errors, slowest, busiest actions, per hour (24 h)
//   who is online (IT + FlowNest users) · database tables (rows / size) · today's work
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SupportCall } from '../api';
import { fmtBytes } from '../files';
import type { LiveStatus } from '../realtime';
import { Avatar, Btn, Empty, useLayout } from './ui';

type Stats = {
  machine: {
    host: string; os: string; php: string; sapi: string; cpus: number; load: number[]; load_pct: number; mem_total: number; mem_available: number; swap_total: number; swap_free: number;
    disk_total: number; disk_free: number; uptime_s: number; php_memory_limit: string; php_peak: number; upload_max_filesize: string; post_max_size: string; max_execution_time: number; server_time: string; timezone: string;
  };
  database: { driver: string; ms: number; tables: { name: string; rows: number | null; bytes: number | null; missing?: boolean }[] };
  websocket: { configured: boolean; public_url: string; ok: boolean; clients: { it: number; users: number } | number | null; ms: number | null; error: string; uptime?: number };
  traffic: {
    per_minute: { t: string; n: number; avg_ms: number; err: number }[]; per_hour: { t: string; n: number; err: number }[]; top_actions: { action: string; n: number; avg_ms: number }[];
    realms: Record<string, number>; last_hour: { requests: number; avg_ms: number; slowest_ms: number; errors: number; server_errors: number }; this_minute: number;
  };
  online: { it: { id: number; name: string; sub: string; seen_at: string }[]; client: { id: number; name: string; sub: string; seen_at: string }[] };
  work: { tickets_open: number; tickets_today: number; tickets_deleted: number; messages_today: number; files_today: number; bytes_today: number };
  warnings: string[];
};

const dur = (s: number) => { const d = Math.floor(s / 86400); const h = Math.floor((s % 86400) / 3600); const m = Math.floor((s % 3600) / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`; };
const tone = (p: number) => (p > 0.9 ? T.red : p > 0.75 ? T.amber : T.green);

export function ServerView({ api, live, onStorage }: { api: SupportCall; live: LiveStatus; onStorage: () => void }) {
  const { wide, phone } = useLayout();
  const [st, setSt] = useState<Stats | null>(null);
  const [err, setErr] = useState('');
  const [at, setAt] = useState(0);
  const load = useCallback(() => api<Stats>('admin.server', {}, { timeout: 20000 }).then((r) => { setSt(r); setErr(''); setAt(Date.now()); }).catch((e) => setErr(e?.message || 'Could not load.')), [api]);
  useEffect(() => { void load(); const t = setInterval(() => void load(), 10000); return () => clearInterval(t); }, [load]);

  if (err && !st) return <Empty icon="error-outline" title="Could not load" text={err} action={<Btn small kind="ghost" title="Retry" onPress={() => void load()} />} />;
  if (!st) return <ActivityIndicator color={T.copper} style={{ marginTop: 40 }} />;
  const m = st.machine;
  const memUsed = m.mem_total ? 1 - m.mem_available / m.mem_total : 0;
  const diskUsed = m.disk_total ? 1 - m.disk_free / m.disk_total : 0;
  const maxMin = Math.max(5, ...st.traffic.per_minute.map((x) => x.n));
  const maxHour = Math.max(5, ...st.traffic.per_hour.map((x) => x.n));
  const wsClients = typeof st.websocket.clients === 'object' && st.websocket.clients ? st.websocket.clients : null;

  return (
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 60 }}>
      <View style={v.head}>
        <Icon name="dns" size={18} color={T.nav} />
        <Text style={v.headText} numberOfLines={1}>{m.host} · {m.os} · PHP {m.php} · {st.database.driver}</Text>
        <Text style={v.muted}>updated {at ? `${Math.max(0, Math.round((Date.now() - at) / 1000))}s ago` : ''} · every 10 s</Text>
      </View>

      {st.warnings.length ? (
        <View style={v.warn}>
          {st.warnings.map((w, i) => <View key={i} style={v.warnRow}><Icon name="warning-amber" size={16} color={T.amber} /><Text style={v.warnText}>{w}</Text></View>)}
        </View>
      ) : (
        <View style={[v.warn, { backgroundColor: `${T.green}10`, borderColor: `${T.green}40` }]}><View style={v.warnRow}><Icon name="check-circle" size={16} color={T.green} /><Text style={v.warnText}>Everything looks healthy.</Text></View></View>
      )}

      <View style={[v.gauges, phone && { flexDirection: 'column' }]}>
        <Gauge icon="memory" label="CPU load" value={`${m.load_pct}%`} pct={m.load_pct / 100} sub={`${m.load.join(' · ')} (1/5/15 min) · ${m.cpus} cores`} />
        <Gauge icon="developer-board" label="Memory" value={`${Math.round(memUsed * 100)}%`} pct={memUsed} sub={`${fmtBytes(m.mem_total - m.mem_available)} of ${fmtBytes(m.mem_total)}${m.swap_total ? ` · swap ${fmtBytes(m.swap_total - m.swap_free)}` : ''}`} />
        <Gauge icon="storage" label="Disk" value={`${Math.round(diskUsed * 100)}%`} pct={diskUsed} sub={`${fmtBytes(m.disk_free)} free of ${fmtBytes(m.disk_total)}`} action={<Btn small kind="ghost" title="Storage" icon="sd-storage" onPress={onStorage} />} />
        <Gauge icon="schedule" label="Up for" value={dur(m.uptime_s)} pct={0} sub={`server time ${m.server_time.slice(11, 16)} · ${m.timezone}`} />
      </View>

      <View style={[v.cols, !wide && { flexDirection: 'column' }]}>
        <Card title="Live connection (WebSocket)" style={wide ? { flex: 1 } : undefined}>
          <View style={v.statusRow}>
            <View style={[v.dot, { backgroundColor: st.websocket.ok ? T.green : T.red }]} />
            <Text style={v.big}>{st.websocket.ok ? 'Running' : 'Not reachable'}</Text>
            {st.websocket.ms !== null ? <Text style={v.muted}>{st.websocket.ms} ms</Text> : null}
          </View>
          {st.websocket.ok ? (
            <Text style={v.muted}>{wsClients ? `${wsClients.it} IT + ${wsClients.users} users connected` : ''}{st.websocket.uptime ? ` · up ${dur(st.websocket.uptime)}` : ''}</Text>
          ) : (
            <>
              <Text style={[v.muted, { color: T.red }]}>{st.websocket.error}</Text>
              <Text style={v.muted}>Apps use the fast refresh instead (Settings → Live updates). To fix: pm2 status · curl http://127.0.0.1:6002/health · Apache ProxyPass /support-ws (see README).</Text>
            </>
          )}
          <Text style={[v.muted, { marginTop: 6 }]}>This browser: {live === 'live' ? 'connected live' : live === 'polling' ? 'fast refresh' : live}</Text>
        </Card>
        <Card title="Online now (last 2 min)" style={wide ? { flex: 1 } : undefined}>
          <Text style={v.big}>{st.online.it.length} IT · {st.online.client.length} users</Text>
          <View style={v.people}>
            {[...st.online.it.map((p) => ({ ...p, k: 'it' })), ...st.online.client.map((p) => ({ ...p, k: 'client' }))].slice(0, 24).map((p) => (
              <View key={`${p.k}${p.id}`} style={v.person}>
                <Avatar name={p.name} id={p.id} size={22} />
                <Text style={v.personName} numberOfLines={1}>{p.name}</Text>
                <Text style={v.tag}>{p.k === 'it' ? 'IT' : 'USER'}</Text>
              </View>
            ))}
            {!st.online.it.length && !st.online.client.length ? <Text style={v.muted}>Nobody right now.</Text> : null}
          </View>
        </Card>
      </View>

      <Card title={`Requests per minute — last hour (${st.traffic.last_hour.requests.toLocaleString()} requests)`}>
        <View style={v.statsRow}>
          <Stat label="This minute" value={st.traffic.this_minute} />
          <Stat label="Avg time" value={`${st.traffic.last_hour.avg_ms} ms`} />
          <Stat label="Slowest" value={`${st.traffic.last_hour.slowest_ms} ms`} />
          <Stat label="Errors" value={st.traffic.last_hour.errors} color={st.traffic.last_hour.errors ? T.amber : undefined} />
          <Stat label="Server errors" value={st.traffic.last_hour.server_errors} color={st.traffic.last_hour.server_errors ? T.red : undefined} />
          {Object.entries(st.traffic.realms).map(([r, n]) => <Stat key={r} label={r === 'it' ? 'IT Desk' : 'Users'} value={n} />)}
        </View>
        <View style={v.bars}>
          {st.traffic.per_minute.map((x, i) => (
            <View key={i} style={v.barCol} accessibilityLabel={`${x.t}: ${x.n} requests`}>
              <View style={v.barTrack}>
                <View style={[v.bar, { height: `${Math.round((x.n / maxMin) * 100)}%` as any, backgroundColor: x.err ? T.amber : T.blue }]} />
              </View>
              <Text style={v.barLabel}>{i % 10 === 0 ? x.t : ''}</Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={[v.cols, !wide && { flexDirection: 'column' }]}>
        <Card title="Busiest actions (last hour)" style={wide ? { flex: 1 } : undefined}>
          {st.traffic.top_actions.length ? st.traffic.top_actions.map((a) => (
            <View key={a.action} style={v.tr}>
              <Text style={[v.cell, { flex: 1 }]} numberOfLines={1}>{a.action || '—'}</Text>
              <Text style={[v.num]}>{a.n.toLocaleString()}</Text>
              <Text style={[v.num, { color: a.avg_ms > 1000 ? T.red : a.avg_ms > 300 ? T.amber : T.muted }]}>{a.avg_ms} ms</Text>
            </View>
          )) : <Text style={v.muted}>No requests counted yet.</Text>}
        </Card>
        <Card title="Last 24 hours" style={wide ? { flex: 1 } : undefined}>
          <View style={[v.bars, { height: 120 }]}>
            {st.traffic.per_hour.map((x, i) => (
              <View key={i} style={v.barCol} accessibilityLabel={`${x.t}: ${x.n} requests`}>
                <View style={v.barTrack}><View style={[v.bar, { height: `${Math.round((x.n / maxHour) * 100)}%` as any, backgroundColor: T.copper }]} /></View>
                <Text style={v.barLabel}>{i % 6 === 0 ? x.t : ''}</Text>
              </View>
            ))}
          </View>
        </Card>
      </View>

      <View style={[v.cols, !wide && { flexDirection: 'column' }]}>
        <Card title={`Database · ${st.database.ms} ms to count`} style={wide ? { flex: 1 } : undefined}>
          {st.database.tables.map((t) => (
            <View key={t.name} style={v.tr}>
              <Text style={[v.cell, { flex: 1 }, t.missing && { color: T.red }]}>{t.name}{t.missing ? ' — missing' : ''}</Text>
              <Text style={v.num}>{t.rows === null ? '—' : t.rows.toLocaleString()}</Text>
              <Text style={[v.num, { width: 80 }]}>{t.bytes === null ? '' : fmtBytes(t.bytes)}</Text>
            </View>
          ))}
        </Card>
        <Card title="Today" style={wide ? { flex: 1 } : undefined}>
          <View style={v.statsRow}>
            <Stat label="Open tickets / tasks" value={st.work.tickets_open} />
            <Stat label="Raised today" value={st.work.tickets_today} />
            <Stat label="Chat messages" value={st.work.messages_today} />
            <Stat label="Files" value={st.work.files_today} />
            <Stat label="Uploaded" value={fmtBytes(st.work.bytes_today)} />
            <Stat label="Deleted (to clean)" value={st.work.tickets_deleted} color={st.work.tickets_deleted ? T.amber : undefined} />
          </View>
          <Text style={[v.muted, { marginTop: 10 }]}>php.ini · upload_max_filesize {m.upload_max_filesize} · post_max_size {m.post_max_size} · memory {m.php_memory_limit} · max time {m.max_execution_time || '∞'} s · {m.sapi}</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: any }) {
  return <View style={[v.card, style]}><Text style={v.cardTitle}>{title}</Text>{children}</View>;
}
function Gauge({ icon, label, value, pct, sub, action }: { icon: string; label: string; value: string; pct: number; sub: string; action?: React.ReactNode }) {
  return (
    <View style={v.gauge}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name={icon as any} size={18} color={pct ? tone(pct) : T.nav} />
        <Text style={v.gLabel}>{label}</Text>
        <View style={{ flex: 1 }} />
        {action}
      </View>
      <Text style={[v.gValue, pct ? { color: tone(pct) } : null]}>{value}</Text>
      {pct ? <View style={v.track}><View style={[v.fill, { width: `${Math.min(100, Math.round(pct * 100))}%` as any, backgroundColor: tone(pct) }]} /></View> : <View style={{ height: 6 }} />}
      <Text style={v.muted} numberOfLines={2}>{sub}</Text>
    </View>
  );
}
function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return <View style={v.stat}><Text style={[v.statNum, color ? { color } : null]}>{typeof value === 'number' ? value.toLocaleString() : value}</Text><Text style={v.statLabel}>{label}</Text></View>;
}

const v = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  headText: { flex: 1, fontSize: 12.5, fontWeight: '800', color: T.nav, minWidth: 200 },
  muted: { fontSize: 11, fontWeight: '700', color: T.muted },
  warn: { padding: 10, borderRadius: 12, backgroundColor: `${T.amber}10`, borderWidth: 1, borderColor: `${T.amber}40`, gap: 6 },
  warnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  warnText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: T.ink },
  gauges: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  gauge: { flex: 1, minWidth: 200, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, gap: 4 },
  gLabel: { fontSize: 12, fontWeight: '900', color: T.nav },
  gValue: { fontSize: 24, fontWeight: '900', color: T.ink },
  track: { height: 6, borderRadius: 3, backgroundColor: T.alt, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  cols: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, gap: 4 },
  cardTitle: { fontSize: 12.5, fontWeight: '900', color: T.nav, marginBottom: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  big: { fontSize: 16, fontWeight: '900', color: T.ink },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 8, paddingLeft: 3, height: 28, borderRadius: 14, backgroundColor: T.alt, maxWidth: 200 },
  personName: { fontSize: 11.5, fontWeight: '800', color: T.ink, flexShrink: 1 },
  tag: { fontSize: 8.5, fontWeight: '900', color: T.copper },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  stat: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: T.alt, minWidth: 90 },
  statNum: { fontSize: 15, fontWeight: '900', color: T.ink },
  statLabel: { fontSize: 10, fontWeight: '800', color: T.muted },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 130 },
  barCol: { flex: 1, height: '100%' as any, alignItems: 'center' },
  barTrack: { flex: 1, width: '100%' as any, justifyContent: 'flex-end' },
  bar: { width: '100%' as any, borderTopLeftRadius: 2, borderTopRightRadius: 2, minHeight: 1 },
  barLabel: { fontSize: 9, fontWeight: '800', color: T.muted, height: 12, marginTop: 2, width: 40, textAlign: 'center' },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.hair },
  cell: { fontSize: 12, fontWeight: '800', color: T.ink },
  num: { width: 64, textAlign: 'right', fontSize: 12, fontWeight: '900', color: T.ink },
});
