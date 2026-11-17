// FILE: src/components/RollCutScanner/OfflineStatus.tsx
// What the user sees about offline work:
//   <OfflineBar />    top of the screen — Online / Offline / Uploading n of m / n waiting  (+ Sync now)
//   <PendingQueue />  under the scan card — every scan still on the device, its state, Retry / Remove,
//                     and the scans that were uploaded recently.
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { T } from '../../../src/theme';
import { useMastersStatus } from './offline/masters';
import { removeQueued, retryQueued, useQueue, type QItem } from './offline/queue';
import { fmtWhen } from './offline/storage';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/* -------------------------------------------------------------------------- */

export function OfflineBar({ online, onSync }: { online: boolean; onSync: () => void }) {
  const q = useQueue();
  const m = useMastersStatus();
  const pending = q.items.filter((i) => i.status === 'pending').length;
  const failed = q.items.length - pending;
  const { running, done, total, note, authError } = q.sync;

  let tone: string = T.green;
  let icon = 'cloud-done';
  let title = 'Online';
  let sub = 'Everything is saved on the server';

  if (!online) {
    tone = T.amber;
    icon = 'cloud-off';
    title = 'Offline — you can keep scanning';
    sub = pending
      ? `${plural(pending, 'scan')} saved on this device · uploads automatically when the network is back`
      : 'Scans are saved on this device and upload automatically when the network is back';
  } else if (running) {
    tone = T.blue;
    icon = 'cloud-upload';
    title = `Uploading offline scans · ${Math.min(done + 1, total)} of ${total}`;
    sub = 'One by one, in the order they were scanned';
  } else if (authError && pending) {
    tone = T.red;
    icon = 'sync-problem';
    title = `${plural(pending, 'scan')} waiting — login expired`;
    sub = 'Your scans are safe on this device. Log in again and they upload automatically.';
  } else if (pending) {
    tone = T.amber;
    icon = 'cloud-queue';
    title = `${plural(pending, 'scan')} waiting to upload`;
    sub = note || 'Starts automatically — or tap Sync now';
  } else if (failed) {
    tone = T.red;
    icon = 'sync-problem';
    title = `${plural(failed, 'scan')} not accepted by the server`;
    sub = 'See “Offline scans” on the Scan tab — Retry or Remove';
  } else if (m.running) {
    sub = `Preparing offline data · beams ${m.done}/${m.total || '…'}`;
  } else if (m.readyAt) {
    sub = `Offline ready · ${m.props} ${m.props === 1 ? 'property' : 'properties'} with beams · updated ${fmtWhen(m.readyAt)}`;
  }

  const offlineNotReady = !online && !m.readyAt;
  const pct = running && total ? Math.round((done / total) * 100) : 0;

  return (
    <View style={[st.bar, { borderColor: `${tone}55`, backgroundColor: `${tone}10` }]} accessibilityRole="summary" accessibilityLiveRegion="polite">
      <View style={st.barRow}>
        <View style={[st.barIcon, { backgroundColor: tone }]}>
          {running ? <ActivityIndicator size="small" color="#fff" /> : <Icon name={icon as any} size={17} color="#fff" />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[st.barTitle, { color: tone }]} numberOfLines={1}>{title}</Text>
          <Text style={st.barSub} numberOfLines={2}>{sub}</Text>
        </View>
        {failed && (pending || !online || running) ? (
          <View style={st.failChip}><Text style={st.failChipText}>{failed} failed</Text></View>
        ) : null}
        {online && pending && !running ? (
          <TouchableOpacity activeOpacity={0.85} style={[st.syncBtn, { backgroundColor: tone }]} onPress={onSync} accessibilityRole="button" accessibilityLabel="Sync now">
            <Icon name="sync" size={15} color="#fff" />
            <Text style={st.syncText}>Sync now</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {running ? (
        <View style={st.track}><View style={[st.fill, { width: `${pct}%`, backgroundColor: tone }]} /></View>
      ) : null}
      {offlineNotReady ? (
        <Text style={st.warn}>Property / Beam lists were never downloaded on this device — they appear after the app is opened once with network. Scanning and saving work now.</Text>
      ) : null}
      {online && m.error && !m.running ? <Text style={st.warn}>{m.error}</Text> : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */

export function PendingQueue({ online, onSync }: { online: boolean; onSync: () => void }) {
  const q = useQueue();
  const [showAll, setShowAll] = useState(false);
  if (!q.items.length && !q.log.length) return null;

  const items = [...q.items].sort((a, b) => a.at - b.at);
  const shown = showAll ? items : items.slice(0, 8);
  const failed = items.filter((i) => i.status === 'failed').length;

  return (
    <View style={st.card}>
      <View style={st.head}>
        <Icon name="offline-pin" size={18} color={T.copper} />
        <Text style={st.headTitle}>Offline scans</Text>
        {items.length ? <View style={st.badge}><Text style={st.badgeText}>{items.length}</Text></View> : null}
        <View style={{ flex: 1 }} />
        {failed ? (
          <TouchableOpacity
            style={st.linkBtn}
            onPress={() => void retryQueued().then(onSync)}
            disabled={!online || q.sync.running}
            accessibilityRole="button"
          >
            <Icon name="replay" size={14} color={online ? T.copper : T.muted} />
            <Text style={[st.linkText, !online && { color: T.muted }]}>Retry failed</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {items.length ? (
        <Text style={st.note}>
          {online ? 'These scans are on this device and are being sent to the server.' : 'These scans are safe on this device. They upload by themselves when the network is back.'}
        </Text>
      ) : null}

      {shown.map((it, i) => (
        <QueueRow key={it.id} it={it} no={i + 1} uploading={q.sync.running && q.sync.currentId === it.id} onSync={onSync} />
      ))}
      {items.length > shown.length ? (
        <TouchableOpacity style={st.more} onPress={() => setShowAll(true)} accessibilityRole="button">
          <Text style={st.linkText}>Show all {items.length}</Text>
        </TouchableOpacity>
      ) : null}

      {q.log.length ? (
        <View style={[st.logWrap, !items.length && { borderTopWidth: 0, marginTop: 0, paddingTop: 0 }]}>
          <Text style={st.logTitle}>RECENTLY UPLOADED</Text>
          {q.log.slice(0, 5).map((l) => (
            <View key={l.id} style={st.logRow}>
              <Icon name={l.result === 'uploaded' ? 'check-circle' : 'download-done'} size={15} color={T.green} />
              <Text style={st.logTaka} numberOfLines={1}>{l.takano}</Text>
              <Text style={st.logMeta} numberOfLines={1}>
                {l.result === 'uploaded' ? 'Uploaded' : 'Already on server'} · {fmtWhen(l.syncedAt)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function QueueRow({ it, no, uploading, onSync }: { it: QItem; no: number; uploading: boolean; onSync: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const bad = it.status === 'failed';
  const tone = bad ? T.red : uploading ? T.blue : T.amber;
  return (
    <View style={[st.row, { borderLeftColor: tone }]}>
      <View style={st.rowTop}>
        <View style={st.rowNo}><Text style={st.rowNoText}>{no}</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.rowTaka} numberOfLines={1}>{it.takano}</Text>
          <Text style={st.rowMeta} numberOfLines={1}>Beam {it.beamno} · scanned {fmtWhen(it.at)}</Text>
        </View>
        <View style={[st.chip, { backgroundColor: `${tone}14`, borderColor: `${tone}55` }]}>
          {uploading ? <ActivityIndicator size="small" color={tone} /> : <Icon name={bad ? 'error-outline' : 'schedule'} size={13} color={tone} />}
          <Text style={[st.chipText, { color: tone }]}>{bad ? 'Failed' : uploading ? 'Uploading' : 'Waiting'}</Text>
        </View>
        {!uploading ? (
          <TouchableOpacity style={st.del} onPress={() => setConfirm(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} accessibilityRole="button" accessibilityLabel="Remove offline scan">
            <Icon name="delete-outline" size={18} color={T.red} />
          </TouchableOpacity>
        ) : null}
      </View>
      {bad && it.error ? <Text style={st.rowErr} numberOfLines={3}>{it.error}</Text> : null}
      {bad ? (
        <TouchableOpacity style={st.retry} onPress={() => void retryQueued(it.id).then(onSync)} accessibilityRole="button">
          <Icon name="replay" size={14} color={T.copper} />
          <Text style={st.linkText}>Try again</Text>
        </TouchableOpacity>
      ) : null}
      {confirm ? (
        <View style={st.confirm}>
          <Text style={st.confirmText} numberOfLines={2}>Remove this scan? It was not uploaded.</Text>
          <TouchableOpacity style={st.no} onPress={() => setConfirm(false)}><Text style={st.noText}>Keep</Text></TouchableOpacity>
          <TouchableOpacity style={st.yes} onPress={() => void removeQueued(it.id)}><Text style={st.yesText}>Remove</Text></TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  bar: { marginHorizontal: 16, marginTop: 12, padding: 10, borderRadius: 14, borderWidth: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  barTitle: { fontSize: 13.5, fontWeight: '900' },
  barSub: { fontSize: 11.5, fontWeight: '600', color: T.ink, opacity: 0.75, marginTop: 1 },
  syncBtn: { height: 34, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  syncText: { color: '#fff', fontSize: 12.5, fontWeight: '900' },
  failChip: { height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: `${T.red}14`, borderWidth: 1, borderColor: `${T.red}55`, justifyContent: 'center' },
  failChipText: { fontSize: 11, fontWeight: '900', color: T.red },
  track: { height: 5, borderRadius: 3, backgroundColor: '#00000012', marginTop: 9, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  warn: { fontSize: 11.5, fontWeight: '700', color: T.red, marginTop: 8 },

  card: { backgroundColor: T.surface, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 14, marginTop: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headTitle: { fontSize: 14, fontWeight: '900', color: T.nav },
  badge: { minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '900', color: T.copper },
  note: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 6, marginBottom: 10 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 8 },
  linkText: { fontSize: 12, fontWeight: '800', color: T.copper },
  more: { alignItems: 'center', paddingVertical: 8 },

  row: { borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, padding: 10, marginBottom: 8, backgroundColor: T.sub },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  rowNo: { minWidth: 24, height: 24, paddingHorizontal: 5, borderRadius: 12, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center' },
  rowNoText: { fontSize: 10.5, fontWeight: '900', color: T.copper },
  rowTaka: { fontSize: 13, fontWeight: '900', color: T.ink, fontFamily: MONO },
  rowMeta: { fontSize: 11, fontWeight: '600', color: T.muted, marginTop: 1 },
  chip: { height: 24, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipText: { fontSize: 10.5, fontWeight: '900' },
  del: { width: 30, height: 30, borderRadius: 15, backgroundColor: `${T.red}12`, alignItems: 'center', justifyContent: 'center' },
  rowErr: { fontSize: 11.5, fontWeight: '700', color: T.red, marginTop: 7 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start', height: 26 },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 8, borderRadius: 10, backgroundColor: `${T.red}0F`, borderWidth: 1, borderColor: `${T.red}33` },
  confirmText: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '800', color: T.red },
  no: { height: 30, paddingHorizontal: 11, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  noText: { fontSize: 12, fontWeight: '800', color: T.nav },
  yes: { height: 30, paddingHorizontal: 11, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: T.red },
  yesText: { fontSize: 12, fontWeight: '900', color: '#fff' },

  logWrap: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair },
  logTitle: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6, color: T.muted, marginBottom: 6 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 3 },
  logTaka: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '800', color: T.ink, fontFamily: MONO },
  logMeta: { fontSize: 11, fontWeight: '600', color: T.muted },
});
