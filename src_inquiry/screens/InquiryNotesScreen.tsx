import AppAlert from '@/common/utils/appAlert';
import Icon from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@/common/utils/compatibleStorage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { getCurrentFinancialYear } from '../../common/commonfunction';
import EmptyState from '../components/EmptyState';
import { notesApi } from '../services/notesApi';
import { InquiryNote, RootStackParamList } from '../types';
import { colors, fontSize, radius, spacing } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'InquiryNotes'>;

// Format chat timestamp - WhatsApp style
const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
};

// Format date separator (like "Today", "Yesterday", "15 May 2026")
const formatDateSeparator = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';

  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Should we show a date separator before this message?
const shouldShowDateSeparator = (
  current: InquiryNote,
  previous: InquiryNote | undefined,
): boolean => {
  if (!previous) return true;
  const a = new Date(current.created_at);
  const b = new Date(previous.created_at);
  return (
    a.getFullYear() !== b.getFullYear() ||
    a.getMonth() !== b.getMonth() ||
    a.getDate() !== b.getDate()
  );
};

interface ListItem {
  type: 'note' | 'separator';
  note?: InquiryNote;
  date?: string;
  key: string;
}

const InquiryNotesScreen: React.FC<Props> = () => {
  // const { inquiryId, inquiryNo } = route.params;
  const router = useRouter();
  const params = useLocalSearchParams();
  const inquiryId = params?.inquiryId;
  const inquiryNo = params?.inquiryNo;

  const [notes, setNotes] = useState<InquiryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [editingNote, setEditingNote] = useState<InquiryNote | null>(null);
  const [getUserPrptype, setUserPrptype] = useState<string>('');

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const user_prptype = await AsyncStorage.getItem('user_prptype');
        console.log('user_prptype', user_prptype);
        setUserPrptype(user_prptype);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
      }
    };

    initializeApp();
  }, []);

  // Set screen title
  useEffect(() => {
    // navigation.setOptions({
    //   title: `Notes • ${inquiryNo}`,
    // });
    router.setParams({
      title: `Notes • ${inquiryNo}`,
    })
  }, [router, inquiryNo]);

  console.log('getUserPrptype in Notes', getUserPrptype);

  const load = useCallback(async (getUserPrptype) => {
    try {
      const data = await notesApi.list(inquiryId, getUserPrptype, getCurrentFinancialYear());
      setNotes(data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [inquiryId]);

  useEffect(() => {
    if (!getUserPrptype) return;
    load(getUserPrptype);
  }, [load, getUserPrptype]);

  // Auto-scroll to bottom when new notes arrive
  useEffect(() => {
    if (notes.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [notes.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setSending(true);

    if (editingNote) {
      // Editing existing
      try {
        const updated = await notesApi.update(inquiryId, editingNote.id, trimmed, getUserPrptype, getCurrentFinancialYear());
        setNotes(prev => prev.map(n => (n.id === updated.id ? updated : n)));
        setEditingNote(null);
        setText('');
      } catch (e: any) {
        AppAlert.alert('Error', e?.response?.data?.message || 'Failed to update note');
      } finally {
        setSending(false);
      }
      return;
    }

    // Optimistic UI - add a temp note immediately
    const tempNote: InquiryNote = {
      id: -Date.now(),
      inquiry_id: inquiryId,
      note: trimmed,
      created_by: null,
      created_by_name: 'You',
      is_edited: false,
      edited_at: null,
      prptype: getUserPrptype,
      yearno: getCurrentFinancialYear(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setNotes(prev => [...prev, tempNote]);
    setText('');

    try {
      const realNote = await notesApi.send(inquiryId, { note: trimmed, prptype: getUserPrptype, yearno: getCurrentFinancialYear() });
      // Replace temp with real
      setNotes(prev => prev.map(n => (n.id === tempNote.id ? realNote : n)));
    } catch (e: any) {
      // Remove the optimistic note on failure
      setNotes(prev => prev.filter(n => n.id !== tempNote.id));
      setText(trimmed); // restore text
      AppAlert.alert('Error', e?.response?.data?.message || 'Failed to send note');
    } finally {
      setSending(false);
    }
  };

  const handleLongPress = (note: InquiryNote) => {
    AppAlert.alert('Note Options', undefined, [
      {
        text: 'Edit',
        onPress: () => {
          setEditingNote(note);
          setText(note.note);
        },
      },
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
                  await notesApi.delete(inquiryId, note.id, getUserPrptype, getCurrentFinancialYear());
                  setNotes(prev => prev.filter(n => n.id !== note.id));
                } catch (e: any) {
                  AppAlert.alert(
                    'Error',
                    e?.response?.data?.message || 'Failed to delete',
                  );
                }
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setText('');
  };

  // Build list with date separators interleaved
  const buildListItems = (): ListItem[] => {
    const items: ListItem[] = [];
    notes.forEach((note, idx) => {
      const prev = notes[idx - 1];
      if (shouldShowDateSeparator(note, prev)) {
        items.push({
          type: 'separator',
          date: note.created_at,
          key: `sep-${note.created_at}-${note.id}`,
        });
      }
      items.push({
        type: 'note',
        note,
        key: `note-${note.id}`,
      });
    });
    return items;
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'separator') {
      return (
        <View style={styles.separatorWrap}>
          <View style={styles.separatorPill}>
            <Text style={styles.separatorText}>
              {formatDateSeparator(item.date!)}
            </Text>
          </View>
        </View>
      );
    }

    const note = item.note!;
    const isOptimistic = note.id < 0;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={() => !isOptimistic && handleLongPress(note)}
        style={styles.bubbleWrap}>
        <View style={styles.bubble}>
          {note.created_by_name ? (
            <Text style={styles.author}>{note.created_by_name}</Text>
          ) : null}
          <Text style={styles.noteText}>{note.note}</Text>
          <View style={styles.bubbleFooter}>
            {note.is_edited ? (
              <Text style={styles.editedText}>edited</Text>
            ) : null}
            <Text style={styles.timeText}>
              {formatTime(note.created_at)}
              {isOptimistic ? ' ⏱' : ' ✓'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const items = buildListItems();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <>
      <View style={styles.breadcrumbChip}>
        <View style={styles.breadcrumbRow}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={goBack}>
            <Icon name="arrow-back" size={18} color="#000000" />
            <Text style={styles.breadcrumbBackText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={flatListRef}
          data={items}
          keyExtractor={i => i.key}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={{ paddingVertical: 60 }}>
              <EmptyState
                title="No notes yet"
                subtitle="Add the first note about this inquiry"
              />
            </View>
          }
        />

        {/* Edit indicator */}
        {editingNote ? (
          <View style={styles.editBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.editBannerTitle}>Editing note</Text>
              <Text style={styles.editBannerPreview} numberOfLines={1}>
                {editingNote.note}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelEdit} style={styles.editCancel}>
              <Text style={styles.editCancelText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a note..."
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            multiline
            maxLength={5000}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending || !text.trim()}
            style={[
              styles.sendBtn,
              (!text.trim() || sending) && styles.sendBtnDisabled,
            ]}>
            {sending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.sendBtnText}>{editingNote ? '✓' : '➤'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  breadcrumbChip: {
    marginTop: 50,
    // marginLeft: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 14,
    // borderBlockColor: 'rgba(255,255,255,0.15)',
    // borderWidth: 1,
    // borderTopWidth: 1,
    paddingVertical: 6,
    width: '100%', // takes full width
    zIndex: 999
  },
  breadcrumbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  breadcrumbBackText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.9,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  separatorWrap: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  separatorPill: {
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  separatorText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bubbleWrap: {
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  bubble: {
    maxWidth: '85%',
    backgroundColor: colors.infoBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  author: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.info,
    marginBottom: 4,
  },
  noteText: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  editedText: {
    fontSize: 10,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  timeText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBg,
    borderTopWidth: 1,
    borderTopColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  editBannerTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.warning,
  },
  editBannerPreview: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    marginTop: 2,
  },
  editCancel: {
    padding: spacing.sm,
  },
  editCancelText: {
    fontSize: 18,
    color: colors.warning,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default InquiryNotesScreen;
