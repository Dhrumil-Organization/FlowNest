// FILE: src/screens/inquiry/NotesView.tsx
// Inquiry notes — chat style (legacy InquiryNotesScreen).
//   GET    /api/inquiries/{id}/notes
//   POST   /api/inquiries/{id}/notes            { note, prptype, yearno }  (optimistic)
//   PUT    /api/inquiries/{id}/notes/{noteId}   { note }
//   DELETE /api/inquiries/{id}/notes/{noteId}
// Long-press (or the ⋮ button) on a note -> Edit / Delete.
import AppAlert from '@/common/utils/appAlert';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useInquiry, useViewFocus } from './InquiryContext';
import { errMsg, InquiryNote } from './inquiryModel';
import { EmptyState, ErrorBox, HIT, Loader, useWide, ViewShell } from './ui';

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const timeOf = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours();
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, y)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

type Item = { type: 'sep'; key: string; date: string } | { type: 'note'; key: string; note: InquiryNote };

export function NotesView({ inquiryId, inquiryNo }: { inquiryId: number; inquiryNo: string }) {
  const { api, prptype, yearno } = useInquiry();
  const { wide } = useWide();
  const [notes, setNotes] = useState<InquiryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState<InquiryNote | null>(null);
  const listRef = useRef<FlatList<Item>>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setNotes(await api.notes(inquiryId));
    } catch (e) {
      setError(errMsg(e, 'Unable to load notes'));
    } finally {
      setLoading(false);
    }
  }, [api, inquiryId]);

  useViewFocus(() => { void load(); }, [load]);

  useEffect(() => {
    if (!notes.length) return;
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 80);
    return () => clearTimeout(t);
  }, [notes.length]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    notes.forEach((n, i) => {
      const prev = notes[i - 1];
      if (!prev || !sameDay(new Date(n.created_at), new Date(prev.created_at))) {
        out.push({ type: 'sep', key: `sep-${n.id}`, date: n.created_at });
      }
      out.push({ type: 'note', key: `note-${n.id}`, note: n });
    });
    return out;
  }, [notes]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    if (editing) {
      try {
        const updated = await api.updateNote(inquiryId, editing.id, trimmed);
        setNotes((cur) => cur.map((n) => (n.id === editing.id ? { ...n, ...(updated || {}), note: updated?.note ?? trimmed } : n)));
        setEditing(null);
        setText('');
      } catch (e) {
        AppAlert.alert('Error', errMsg(e, 'Failed to update note'));
      } finally {
        setSending(false);
      }
      return;
    }
    // optimistic
    const temp: InquiryNote = {
      id: -Date.now(), inquiry_id: inquiryId, note: trimmed, created_by: null, created_by_name: 'You',
      is_edited: false, edited_at: null, prptype, yearno,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    setNotes((cur) => [...cur, temp]);
    setText('');
    try {
      const real = await api.addNote(inquiryId, trimmed);
      setNotes((cur) => cur.map((n) => (n.id === temp.id ? (real || { ...temp, id: Math.abs(temp.id) }) : n)));
    } catch (e) {
      setNotes((cur) => cur.filter((n) => n.id !== temp.id));
      setText(trimmed);
      AppAlert.alert('Error', errMsg(e, 'Failed to send note'));
    } finally {
      setSending(false);
    }
  };

  const options = (note: InquiryNote) => {
    AppAlert.alert('Note Options', undefined, [
      { text: 'Edit', onPress: () => { setEditing(note); setText(note.note); } },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          AppAlert.alert('Delete Note?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await api.deleteNote(inquiryId, note.id);
                  setNotes((cur) => cur.filter((n) => n.id !== note.id));
                } catch (e) {
                  AppAlert.alert('Error', errMsg(e, 'Failed to delete'));
                }
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <ViewShell
      title={`Notes · ${inquiryNo}`}
      subtitle={`${notes.length} note${notes.length === 1 ? '' : 's'}`}
      scroll={false}
      footer={
        <View style={s.composerWrap}>
          <View style={[s.composerInner, wide && { maxWidth: 820 }]}>
            {!!editing && (
              <View style={s.editBar}>
                <Icon name="edit" size={15} color={T.blue} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.editTitle}>Editing note</Text>
                  <Text style={s.editPreview} numberOfLines={1}>{editing.note}</Text>
                </View>
                <TouchableOpacity onPress={() => { setEditing(null); setText(''); }} hitSlop={HIT}>
                  <Icon name="close" size={18} color={T.muted} />
                </TouchableOpacity>
              </View>
            )}
            <View style={s.composer}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Type a note..."
                placeholderTextColor={T.muted}
                style={s.input}
                multiline
                maxLength={5000}
              />
              <TouchableOpacity
                onPress={send}
                disabled={sending || !text.trim()}
                style={[s.sendBtn, (!text.trim() || sending) && { opacity: 0.45 }]}
                activeOpacity={0.8}
              >
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Icon name={editing ? 'check' : 'send'} size={19} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      }
    >
      {loading ? (
        <Loader label="Loading notes…" />
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(i) => i.key}
          contentContainerStyle={[s.list, wide && { maxWidth: 820, width: '100%', alignSelf: 'center' }]}
          ListHeaderComponent={error ? <ErrorBox text={error} onRetry={load} /> : null}
          ListEmptyComponent={!error ? <EmptyState icon="chat-bubble-outline" title="No notes yet" subtitle="Add the first note about this inquiry" /> : null}
          renderItem={({ item }) => {
            if (item.type === 'sep') {
              return <View style={s.sepWrap}><Text style={s.sep}>{dayLabel(item.date)}</Text></View>;
            }
            const n = item.note;
            const optimistic = n.id < 0;
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onLongPress={() => !optimistic && options(n)}
                delayLongPress={350}
                style={s.bubbleWrap}
              >
                <View style={s.bubble}>
                  <View style={s.bubbleHead}>
                    {!!n.created_by_name && <Text style={s.author} numberOfLines={1}>{n.created_by_name}</Text>}
                    <View style={{ flex: 1 }} />
                    {!optimistic && (
                      <TouchableOpacity onPress={() => options(n)} hitSlop={HIT}>
                        <Icon name="more-horiz" size={16} color={T.muted} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={s.noteText}>{n.note}</Text>
                  <View style={s.bubbleFoot}>
                    {n.is_edited && <Text style={s.edited}>edited</Text>}
                    <Text style={s.time}>{timeOf(n.created_at)}</Text>
                    <Icon name={optimistic ? 'schedule' : 'done'} size={12} color={T.muted} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </ViewShell>
  );
}

const s = StyleSheet.create({
  list: { padding: 12, paddingBottom: 20, flexGrow: 1 },
  sepWrap: { alignItems: 'center', marginVertical: 8 },
  sep: {
    fontSize: 10.5, fontWeight: '800', color: T.muted, backgroundColor: T.alt, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden',
  },
  bubbleWrap: { alignItems: 'flex-start', marginBottom: 6 },
  bubble: {
    maxWidth: '88%', minWidth: 140, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
    borderRadius: 12, borderTopLeftRadius: 4, paddingHorizontal: 11, paddingVertical: 8,
  },
  bubbleHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  author: { fontSize: 11, fontWeight: '900', color: T.copper, flexShrink: 1 },
  noteText: { fontSize: 13.5, fontWeight: '500', color: T.ink, lineHeight: 19 },
  bubbleFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 3 },
  edited: { fontSize: 10, fontStyle: 'italic', color: T.muted },
  time: { fontSize: 10, fontWeight: '700', color: T.muted },

  composerWrap: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  composerInner: { width: '100%', alignSelf: 'center', padding: 8 },
  editBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${T.blue}10`, borderLeftWidth: 3,
    borderLeftColor: T.blue, borderRadius: 8, padding: 8, marginBottom: 6,
  },
  editTitle: { fontSize: 11, fontWeight: '900', color: T.blue },
  editPreview: { fontSize: 11.5, fontWeight: '600', color: T.ink },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1, minHeight: 42, maxHeight: 120, borderWidth: 1, borderColor: T.border, borderRadius: 21,
    backgroundColor: T.sub, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 10, fontSize: 13.5, color: T.ink,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center' },
});
