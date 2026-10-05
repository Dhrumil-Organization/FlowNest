// FILE: src/components/FeedbackNEW/index.tsx
// NEW ERP — Feedback (replaces legacy screen).
// Legacy source : components/FeedBackScreen/index.tsx (identical copy: src/components/FeedBackScreen/index.tsx)
//                 + common/utils/feedbackStorage.ts (storage helpers, IMPORTED from the legacy path, not copied)
// Legacy route  : app/(tabs)/feedback.tsx (passes token, username — the legacy component ignores both)
// Endpoints     : NONE. Legacy makes no HTTP call; feedback is stored on the device only, so there is no api.ts.
// AsyncStorage keys (all through feedbackStorage.ts, unchanged):
//   @flow_nest_username   read / created on mount (getOrCreateUsername) — the "Submitting as" name
//   @flow_nest_user_id    read / created on mount (getOrCreateUserId)
//   @flow_nest_feedbacks  read (getFeedbacksByUsername), written (saveFeedback, deleteFeedback)
// Logic kept exactly as legacy:
//   - defaults: category 'general-feedback', rating 0, priority 'medium', anonymous off
//   - validation order + alert texts: rating 0 -> 'Rating Required'; title.trim() < 5 -> 'Title Too Short';
//     message.trim() < 10 -> 'Message Too Short'
//   - saveFeedback payload keys/order: username ('Anonymous' if anonymous), userId ('HIDDEN' if anonymous),
//     category, rating, title, message, contact (trimmed), attachments [], priority, deviceInfo { platform, version }
//   - success alert with Reference ID and the 'View History' / 'Submit Another' buttons; error alert on failure
//   - history = feedbacks whose username equals the stored username (so anonymous ones never list — as legacy),
//     reloaded on mount, on opening My History, on pull-to-refresh, after submit->View History and after delete
//   - delete confirmation alert; haptics on rating / submit success / delete, skipped on web
// Deliberate deviations (look only):
//   - hero header (image + gradient + back button + inert 'Help' button) -> plain in-content title block;
//     the decorative header image, StatusBar and the 'Developed by Madhusudan Group' footer are dropped
//   - legacy hex colours mapped to theme tokens (category / priority / status colours)
//   - category chips wrap instead of scrolling horizontally; form is 2 columns on tablet/desktop;
//     history cards are a 1 / 2 / 3 column grid
//   - `token`, `API`, `username` props are accepted but unused, exactly like legacy ignored token/username
import { AppAlert } from '@/common/utils/appAlert';
import {
  deleteFeedback,
  Feedback,
  FeedbackCategory,
  getFeedbacksByUsername,
  getOrCreateUserId,
  getOrCreateUsername,
  saveFeedback,
} from '@/common/utils/feedbackStorage';
import { S, T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Btn, EmptyState, Segment } from '../erpUi';

type Props = { token: string; API: string; username?: string };
type ViewKey = 'submit' | 'history';
type Priority = 'low' | 'medium' | 'high';

const CATEGORIES: { id: FeedbackCategory; label: string; icon: string; color: string }[] = [
  { id: 'product-quality', label: 'Product Quality', icon: 'verified', color: T.green },
  { id: 'service-experience', label: 'Service', icon: 'support-agent', color: T.blue },
  { id: 'app-bug', label: 'App Issue', icon: 'bug-report', color: T.red },
  { id: 'feature-request', label: 'Feature Request', icon: 'lightbulb', color: T.amber },
  { id: 'billing-payment', label: 'Billing', icon: 'receipt', color: T.purple },
  { id: 'delivery-shipping', label: 'Delivery', icon: 'local-shipping', color: T.copper },
  { id: 'general-feedback', label: 'General', icon: 'chat-bubble', color: T.yd },
];

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];
const RATING_LABELS = ['', 'Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];
const NATIVE_DRIVER = Platform.OS !== 'web';

const getCategoryInfo = (catId: FeedbackCategory) => CATEGORIES.find((c) => c.id === catId) || CATEGORIES[6];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'resolved': return T.green;
    case 'reviewed': return T.amber;
    default: return T.muted;
  }
};

const priorityColor = (p: Priority) => (p === 'low' ? T.green : p === 'medium' ? T.amber : T.red);
const priorityIcon = (p: Priority) => (p === 'low' ? 'arrow-downward' : p === 'medium' ? 'remove' : 'priority-high');

function Label({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={st.labelRow}>
      <Icon name={icon as any} size={14} color={T.copper} />
      <Text style={st.label}>{text}</Text>
    </View>
  );
}

export default function FeedbackNEW(_props: Props) {
  const { width } = useWindowDimensions();
  const phone = width < 768;
  const cols = width >= 1180 ? 3 : width >= 768 ? 2 : 1;

  // State Management
  const [activeView, setActiveView] = useState<ViewKey>('submit');
  const [category, setCategory] = useState<FeedbackCategory>('general-feedback');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // User & History (legacy: from feedbackStorage, NOT from the login session)
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [myFeedbacks, setMyFeedbacks] = useState<Feedback[]>([]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const starScale = useRef(new Animated.Value(1)).current;

  const initializeUser = async () => {
    const name = await getOrCreateUsername();
    const id = await getOrCreateUserId();
    setUsername(name);
    setUserId(id);
  };

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: NATIVE_DRIVER }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: NATIVE_DRIVER }),
    ]).start();
  };

  const animateStars = () => {
    Animated.sequence([
      Animated.timing(starScale, { toValue: 1.2, duration: 150, useNativeDriver: NATIVE_DRIVER }),
      Animated.timing(starScale, { toValue: 1, duration: 150, useNativeDriver: NATIVE_DRIVER }),
    ]).start();
  };

  const loadMyFeedbacks = async () => {
    setRefreshing(true);
    const list = await getFeedbacksByUsername(username);
    setMyFeedbacks(list);
    setRefreshing(false);
  };

  useEffect(() => {
    initializeUser();
    animateEntrance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (username) {
      loadMyFeedbacks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleRating = (value: number) => {
    setRating(value);
    animateStars();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const validateForm = (): boolean => {
    if (rating === 0) {
      AppAlert.alert('Rating Required', 'Please select a star rating before submitting.');
      return false;
    }
    if (title.trim().length < 5) {
      AppAlert.alert('Title Too Short', 'Please enter at least 5 characters in the title.');
      return false;
    }
    if (message.trim().length < 10) {
      AppAlert.alert('Message Too Short', 'Please enter at least 10 characters in your feedback.');
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setContact('');
    setRating(0);
    setCategory('general-feedback');
    setPriority('medium');
    setIsAnonymous(false);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const newFeedback = await saveFeedback({
        username: isAnonymous ? 'Anonymous' : username,
        userId: isAnonymous ? 'HIDDEN' : userId,
        category,
        rating,
        title: title.trim(),
        message: message.trim(),
        contact: contact.trim(),
        attachments: [],
        priority,
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version?.toString() || '1.0',
        },
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      AppAlert.alert(
        '✅ Feedback Submitted',
        `Thank you for your valuable feedback!\n\nReference ID: ${newFeedback.id}\n\nWe'll review it and get back to you soon.`,
        [
          {
            text: 'View History',
            onPress: () => {
              setActiveView('history');
              resetForm();
              loadMyFeedbacks();
            },
          },
          {
            text: 'Submit Another',
            onPress: () => resetForm(),
          },
        ]
      );
    } catch (error) {
      AppAlert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    AppAlert.alert(
      'Delete Feedback?',
      'Are you sure you want to delete this feedback? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteFeedback(id);
            loadMyFeedbacks();
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          },
        },
      ]
    );
  };

  const onChangeView = (v: ViewKey) => {
    setActiveView(v);
    if (v === 'history') loadMyFeedbacks(); // legacy: opening My History reloads the list
  };

  /* ------------------------------ form parts ------------------------------ */
  const ratingBlock = (
    <View style={st.group}>
      <Label icon="star" text="Rate Your Experience *" />
      <View style={st.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleRating(star)}
            activeOpacity={0.7}
            style={st.starBtn}
            accessibilityRole="button"
            accessibilityLabel={`${star} star`}
          >
            <Animated.View style={{ transform: [{ scale: starScale }] }}>
              <Icon
                name={star <= rating ? 'star' : 'star-border'}
                size={40}
                color={star <= rating ? T.amber : T.border}
              />
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>
      {rating === 0 ? null : <Text style={st.ratingLabel}>{RATING_LABELS[rating]}</Text>}
    </View>
  );

  const categoryBlock = (
    <View style={st.group}>
      <Label icon="category" text="Category" />
      <View style={st.chipWrap}>
        {CATEGORIES.map((cat) => {
          const on = category === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[st.catChip, on && { backgroundColor: cat.color, borderColor: cat.color }]}
              onPress={() => setCategory(cat.id)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Icon name={cat.icon as any} size={18} color={on ? '#fff' : cat.color} />
              <Text style={[st.catText, on && { color: '#fff' }]} numberOfLines={1}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const priorityBlock = (
    <View style={st.group}>
      <Label icon="flag" text="Priority Level" />
      <View style={st.priorityRow}>
        {PRIORITIES.map((p) => {
          const on = priority === p;
          return (
            <TouchableOpacity
              key={p}
              style={[st.priorityChip, on && { backgroundColor: priorityColor(p), borderColor: priorityColor(p) }]}
              onPress={() => setPriority(p)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Icon name={priorityIcon(p) as any} size={14} color={on ? '#fff' : T.muted} />
              <Text style={[st.priorityText, on && { color: '#fff' }]} numberOfLines={1}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const textBlock = (
    <>
      <View style={st.group}>
        <Label icon="title" text="Title *" />
        <TextInput
          style={st.input}
          placeholder="Brief summary of your feedback"
          placeholderTextColor={T.muted}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
        />
        <Text style={st.charCount}>{title.length}/80</Text>
      </View>

      <View style={st.group}>
        <Label icon="message" text="Detailed Feedback *" />
        <TextInput
          style={[st.input, st.textArea]}
          placeholder="Share your detailed experience, suggestions, or concerns..."
          placeholderTextColor={T.muted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          maxLength={500}
        />
        <Text style={st.charCount}>{message.length}/500</Text>
      </View>

      <View style={st.group}>
        <Label icon="contact-mail" text="Contact (Optional)" />
        <TextInput
          style={st.input}
          placeholder="Email or phone for follow-up"
          placeholderTextColor={T.muted}
          value={contact}
          onChangeText={setContact}
          keyboardType="email-address"
        />
      </View>

      <TouchableOpacity
        style={st.anonRow}
        onPress={() => setIsAnonymous(!isAnonymous)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isAnonymous }}
      >
        <View style={[st.checkbox, isAnonymous && st.checkboxOn]}>
          {isAnonymous && <Icon name="check" size={14} color="#fff" />}
        </View>
        <Text style={st.anonText}>Submit anonymously (hide my username)</Text>
      </TouchableOpacity>

      <Btn
        kind="copper"
        label={isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        icon={isSubmitting ? undefined : 'send'}
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={st.submitBtn}
      />

      <View style={st.privacyRow}>
        <Icon name="lock" size={12} color={T.muted} />
        <Text style={st.privacyNote}>Your feedback is stored locally and kept confidential.</Text>
      </View>
    </>
  );

  /* ------------------------------ history card ---------------------------- */
  const renderFeedbackCard = (feedback: Feedback) => {
    const catInfo = getCategoryInfo(feedback.category);
    const date = new Date(feedback.createdAt);
    const sc = getStatusColor(feedback.status);

    return (
      <View key={feedback.id} style={[st.cell, { width: `${100 / cols}%` as any }]}>
        <View style={st.historyCard}>
          <View style={st.historyHead}>
            <View style={[st.catIcon, { backgroundColor: `${catInfo.color}20` }]}>
              <Icon name={catInfo.icon as any} size={20} color={catInfo.color} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.historyTitle} numberOfLines={2}>
                {feedback.title}
              </Text>
              <Text style={st.historyDate} numberOfLines={1}>
                {date.toLocaleDateString()} • {date.toLocaleTimeString()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(feedback.id)}
              style={st.deleteBtn}
              accessibilityRole="button"
              accessibilityLabel="Delete feedback"
            >
              <Icon name="delete-outline" size={22} color={T.red} />
            </TouchableOpacity>
          </View>

          <View style={st.historyStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Icon
                key={star}
                name={star <= feedback.rating ? 'star' : 'star-border'}
                size={16}
                color={star <= feedback.rating ? T.amber : T.border}
              />
            ))}
          </View>

          <Text style={st.historyMessage}>{feedback.message}</Text>

          <View style={st.historyFoot}>
            <View style={[st.statusBadge, { backgroundColor: `${sc}20` }]}>
              <View style={[st.statusDot, { backgroundColor: sc }]} />
              <Text style={[st.statusText, { color: sc }]}>{feedback.status.toUpperCase()}</Text>
            </View>
            <Text style={st.historyId} numberOfLines={1}>{feedback.id}</Text>
          </View>
        </View>
      </View>
    );
  };

  const enter = { opacity: fadeAnim, transform: [{ translateY: slideAnim }] };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadMyFeedbacks} tintColor={T.copper} colors={[T.copper]} />
          }
          contentContainerStyle={[st.content, { paddingHorizontal: phone ? 12 : 20 }]}
        >
          {/* ---------- title block (legacy hero header) ---------- */}
          <View style={st.titleBlock}>
            <View style={st.titleIcon}>
              <Icon name="rate-review" size={22} color={T.copper} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={st.h1}>Feedback</Text>
              <Text style={st.h2}>Your Voice Matters</Text>
              <Text style={st.lead}>
                Help us improve by sharing your experience, suggestions, or concerns.
              </Text>
            </View>
          </View>

          {/* ---------- user banner + view toggle ---------- */}
          <View style={[st.topRow, !phone && st.topRowWide]}>
            <Animated.View style={[st.userBanner, !phone && { flex: 1 }, enter]}>
              <View style={st.userAvatar}>
                <Icon name="person" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.userLabel}>Submitting as</Text>
                <Text style={st.userName} numberOfLines={1}>{username}</Text>
              </View>
              <View style={st.idChip}>
                <Text style={st.idChipText}>{userId.slice(-8)}</Text>
              </View>
            </Animated.View>

            <View style={!phone ? { width: 360 } : null}>
              <Segment<ViewKey>
                value={activeView}
                onChange={onChangeView}
                options={[
                  { value: 'submit', label: 'Submit', icon: 'edit' },
                  { value: 'history', label: `My History (${myFeedbacks.length})`, icon: 'history' },
                ]}
              />
            </View>
          </View>

          {/* ---------- submit view ---------- */}
          {activeView === 'submit' && (
            <Animated.View style={[st.formCard, enter]}>
              {phone ? (
                <>
                  {categoryBlock}
                  {ratingBlock}
                  {priorityBlock}
                  {textBlock}
                </>
              ) : (
                <View style={st.formCols}>
                  <View style={st.formCol}>
                    {categoryBlock}
                    {ratingBlock}
                    {priorityBlock}
                  </View>
                  <View style={st.formCol}>{textBlock}</View>
                </View>
              )}
            </Animated.View>
          )}

          {/* ---------- history view ---------- */}
          {activeView === 'history' && (
            <View>
              {myFeedbacks.length === 0 ? (
                <EmptyState
                  icon="inbox"
                  title="No Feedback Yet"
                  text="Your submitted feedback will appear here."
                  action={<Btn kind="copper" label="Submit Your First Feedback" onPress={() => setActiveView('submit')} />}
                />
              ) : (
                <>
                  <View style={st.stats}>
                    <View style={st.statItem}>
                      <Text style={st.statValue}>{myFeedbacks.length}</Text>
                      <Text style={st.statLabel}>Total</Text>
                    </View>
                    <View style={[st.statItem, st.statDivider]}>
                      <Text style={st.statValue}>{myFeedbacks.filter((f) => f.status === 'pending').length}</Text>
                      <Text style={st.statLabel}>Pending</Text>
                    </View>
                    <View style={[st.statItem, st.statDivider]}>
                      <Text style={st.statValue}>{myFeedbacks.filter((f) => f.status === 'resolved').length}</Text>
                      <Text style={st.statLabel}>Resolved</Text>
                    </View>
                  </View>

                  <View style={st.grid}>{myFeedbacks.map(renderFeedbackCard)}</View>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  content: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingTop: 14, paddingBottom: 30, gap: 14 },

  /* title block */
  titleBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: `${T.copper}16`,
    alignItems: 'center', justifyContent: 'center',
  },
  h1: { fontSize: 22, fontWeight: '800', color: T.ink },
  h2: { fontSize: 14, fontWeight: '700', color: T.copper, marginTop: 2 },
  lead: { fontSize: 13, lineHeight: 19, color: T.muted, marginTop: 4 },

  /* user banner + toggle */
  topRow: { gap: 12 },
  topRowWide: { flexDirection: 'row', alignItems: 'center' },
  userBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.surface,
    borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 12, ...S.card,
  },
  userAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center',
  },
  userLabel: { fontSize: 11, color: T.muted },
  userName: { fontSize: 15, fontWeight: '700', color: T.ink, marginTop: 2 },
  idChip: { backgroundColor: T.alt, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  idChipText: { fontSize: 11, fontWeight: '600', color: T.ink },

  /* form */
  formCard: {
    backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 16, ...S.card,
  },
  formCols: { flexDirection: 'row', gap: 24 },
  formCol: { flex: 1, minWidth: 0 },
  group: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', color: T.ink, flexShrink: 1 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14,
    borderRadius: 20, backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.border,
  },
  catText: { fontSize: 12, fontWeight: '600', color: T.ink },

  starsRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10 },
  starBtn: { padding: 4 },
  ratingLabel: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: T.amber, marginTop: 5 },

  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: {
    flex: 1, minWidth: 0, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, borderRadius: 12, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border,
  },
  priorityText: { fontSize: 12, fontWeight: '600', color: T.muted },

  input: {
    backgroundColor: T.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: T.ink, borderWidth: 1, borderColor: T.border, minHeight: 44,
  },
  textArea: { height: 120, textAlignVertical: 'top', paddingTop: 12 },
  charCount: { fontSize: 11, color: T.muted, textAlign: 'right', marginTop: 5 },

  anonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, marginBottom: 20 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: T.copper, borderColor: T.copper },
  anonText: { flex: 1, fontSize: 13, color: T.ink, fontWeight: '500' },

  submitBtn: { minHeight: 50, borderRadius: 14 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 12 },
  privacyNote: { fontSize: 11, color: T.muted, flexShrink: 1, textAlign: 'center' },

  /* history */
  stats: {
    flexDirection: 'row', backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border,
    paddingVertical: 14, marginBottom: 14,
  },
  statItem: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: T.hair },
  statValue: { fontSize: 22, fontWeight: '800', color: T.copper },
  statLabel: { fontSize: 11, color: T.muted, marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell: { paddingHorizontal: 6, paddingBottom: 12 },
  historyCard: {
    flex: 1, backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 14, ...S.card,
  },
  historyHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  catIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  historyTitle: { fontSize: 14, fontWeight: '700', color: T.ink },
  historyDate: { fontSize: 11, color: T.muted, marginTop: 3 },
  deleteBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -6 },
  historyStars: { flexDirection: 'row', gap: 2, marginBottom: 10 },
  historyMessage: { flexGrow: 1, fontSize: 13, color: T.ink, lineHeight: 20, marginBottom: 12 },
  historyFoot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: T.hair,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  historyId: { flexShrink: 1, fontSize: 10, color: T.muted, fontWeight: '600' },
});
