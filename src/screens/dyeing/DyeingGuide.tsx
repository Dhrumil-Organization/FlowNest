// FILE: src/screens/dyeing/DyeingGuide.tsx
// In-app GUIDE for the Dyeing module — key points with small UI pictures, so a
// new user can learn Priority, the Status sheet (outward lots + status),
// Daily Update and Mill Hub without anyone explaining it.
//
//   <DyeingGuide visible section="priority" onClose={…} />
//
// Opened from the "Guide" button on the Dyeing tab bar (on the tab you are
// on) and from the "?" in the Status sheet header. Opens by itself the first
// time a user visits Dyeing on a device (see useFirstVisitGuide).
//
// The pictures are drawn with the SAME colours / letters / shapes as the real
// screens (STATUS_COLORS, STATUS_LETTER, report colours), so what the user
// sees here is what they see on the screen. Layout: phone = full-height sheet,
// one column; tablet / web = centred dialog, picture beside the text.

import AsyncStorage from '@/common/utils/compatibleStorage';
import { T } from '@/src/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShadeStatus, STATUS_COLORS, STATUS_LETTER } from './dyeingModel';

export type GuideSection = 'priority' | 'status' | 'daily' | 'millHub';

const SECTIONS: { id: GuideSection; label: string; icon: any }[] = [
  { id: 'priority', label: 'Priority', icon: 'low-priority' },
  { id: 'status', label: 'Status & Lots', icon: 'assignment' },
  { id: 'daily', label: 'Daily Update', icon: 'today' },
  { id: 'millHub', label: 'Mill Hub', icon: 'local-shipping' },
];

const SEQ: ShadeStatus[] = ['Sent for job', 'Dying', 'Finish', 'Job inward', 'Lorry Cut'];

// Daily Update / Mill Hub colours (same as DailyUpdateTab PC)
const PC = { dyeing: '#c0392b', finish: '#2e6b4f', inward: '#dd7a2e', cut: '#8e44ad', re: '#B5651D' };

const GUIDE_SEEN_KEY = 'dyeing_guide_seen_v1';

/** true once, the first time Dyeing opens on this device (then remembered). */
export function useFirstVisitGuide() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const seen = await AsyncStorage.getItem(GUIDE_SEEN_KEY);
        if (alive && !seen) setShow(true);
      } catch {
        // storage not available -> never auto-open
      }
    })();
    return () => { alive = false; };
  }, []);
  const dismiss = () => {
    setShow(false);
    void AsyncStorage.setItem(GUIDE_SEEN_KEY, '1').catch(() => undefined);
  };
  return { show, dismiss };
}

/* ========================================================================== */
/*  Shell                                                                       */
/* ========================================================================== */

export function DyeingGuide({
  visible, section = 'priority', onClose,
}: { visible: boolean; section?: GuideSection; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 760;
  const [tab, setTab] = useState<GuideSection>(section);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => { if (visible) setTab(section); }, [visible, section]);
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [tab]);

  const idx = SECTIONS.findIndex((x) => x.id === tab);
  const next = SECTIONS[idx + 1];

  return (
    <Modal visible={visible} animationType={wide ? 'fade' : 'slide'} transparent onRequestClose={onClose}>
      <View style={[g.overlay, wide && g.overlayWide]}>
        <View
          style={[
            g.sheet,
            wide
              ? { width: Math.min(900, width - 48), height: Math.min(height - 48, 860), borderRadius: 18 }
              : { height: height - Math.max(insets.top, 12) - 8, paddingBottom: insets.bottom },
          ]}
        >
          {/* header */}
          <View style={g.head}>
            <View style={g.headIcon}><Icon name="menu-book" size={18} color="#fff" /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={g.headTitle}>Dyeing — how it works</Text>
              <Text style={g.headSub} numberOfLines={1}>Key points with pictures · takes 3 minutes</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={g.closeBtn} hitSlop={HIT} accessibilityLabel="Close guide">
              <Icon name="close" size={20} color={T.muted} />
            </TouchableOpacity>
          </View>

          {/* section tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={g.tabsScroll} contentContainerStyle={g.tabs}>
            {SECTIONS.map((x) => {
              const on = x.id === tab;
              return (
                <TouchableOpacity key={x.id} onPress={() => setTab(x.id)} style={[g.tab, on && g.tabOn]} activeOpacity={0.75}>
                  <Icon name={x.icon} size={14} color={on ? '#fff' : T.muted} />
                  <Text style={[g.tabText, on && g.tabTextOn]}>{x.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={g.body}>
            {tab === 'priority' && <PriorityGuide wide={wide} />}
            {tab === 'status' && <StatusGuide wide={wide} />}
            {tab === 'daily' && <DailyGuide wide={wide} />}
            {tab === 'millHub' && <MillHubGuide wide={wide} />}

            <View style={g.footerRow}>
              {next ? (
                <TouchableOpacity onPress={() => setTab(next.id)} style={g.nextBtn} activeOpacity={0.8}>
                  <Text style={g.nextText}>Next: {next.label}</Text>
                  <Icon name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={onClose} style={g.nextBtn} activeOpacity={0.8}>
                  <Icon name="check" size={16} color="#fff" />
                  <Text style={g.nextText}>Got it</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ========================================================================== */
/*  Building blocks                                                            */
/* ========================================================================== */

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

function Intro({ icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <View style={g.intro}>
      <Icon name={icon} size={20} color={T.copper} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={g.introTitle}>{title}</Text>
        <Text style={g.introText}>{children}</Text>
      </View>
    </View>
  );
}

/** One key point: number + title + text (+ picture beside on wide, below on phone). */
function Point({
  n, title, wide, picture, children,
}: { n: number; title: string; wide: boolean; picture?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={g.point}>
      <View style={g.pointHead}>
        <View style={g.num}><Text style={g.numText}>{n}</Text></View>
        <Text style={g.pointTitle}>{title}</Text>
      </View>
      <View style={[wide && !!picture && g.pointRow]}>
        <View style={[wide && !!picture && { flex: 1, minWidth: 0, paddingRight: 14 }]}>{children}</View>
        {!!picture && <View style={[g.picture, wide && g.pictureWide]}>{picture}</View>}
      </View>
    </View>
  );
}

/** A bullet line. `b` = bold lead word(s). */
function Li({ b, children, color }: { b?: string; children?: React.ReactNode; color?: string }) {
  return (
    <View style={g.li}>
      <View style={[g.dot, color ? { backgroundColor: color } : null]} />
      <Text style={g.liText}>
        {!!b && <Text style={[g.bold, color ? { color } : null]}>{b} </Text>}
        {children}
      </Text>
    </View>
  );
}

function Tip({ kind = 'tip', children }: { kind?: 'tip' | 'rule' | 'warn'; children: React.ReactNode }) {
  const c = kind === 'warn' ? T.red : kind === 'rule' ? T.blue : T.green;
  const icon = kind === 'warn' ? 'error-outline' : kind === 'rule' ? 'rule' : 'lightbulb-outline';
  return (
    <View style={[g.tip, { borderColor: `${c}55`, backgroundColor: `${c}0D` }]}>
      <Icon name={icon} size={15} color={c} style={{ marginTop: 1 }} />
      <Text style={[g.tipText]}>{children}</Text>
    </View>
  );
}

/** Numbered callout pin used inside the pictures. */
function Pin({ n }: { n: number }) {
  return <View style={g.pin}><Text style={g.pinText}>{n}</Text></View>;
}

/** Legend line under a picture: ① = … */
function PinLegend({ items }: { items: string[] }) {
  return (
    <View style={{ marginTop: 8, gap: 3 }}>
      {items.map((t, i) => (
        <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pin n={i + 1} />
          <Text style={g.legendText}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

/** Status letter circle exactly like the card: filled = done, ring = current, grey = not yet. */
function Letter({ status, done, current, size = 16 }: { status: ShadeStatus; done: boolean; current?: boolean; size?: number }) {
  const color = STATUS_COLORS[status];
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' },
        done ? { backgroundColor: color } : { backgroundColor: T.alt, borderWidth: 1, borderColor: T.border },
        current && { borderWidth: 1.5, borderColor: T.ink },
      ]}
    >
      <Text style={{ color: done ? '#fff' : '#BDB6AE', fontSize: size * 0.56, fontWeight: '800' }}>{STATUS_LETTER[status]}</Text>
    </View>
  );
}

/** Shade chip like the card: name + S D F J ✂. */
function ChipMock({ name, done, current, cuts }: { name: string; done: ShadeStatus[]; current: ShadeStatus | null; cuts?: number }) {
  const c = current ? STATUS_COLORS[current] : null;
  return (
    <View style={[g.chip, c ? { borderColor: c, backgroundColor: `${c}12` } : null]}>
      <Text style={g.chipText} numberOfLines={1}>{name}</Text>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {SEQ.map((s) => <Letter key={s} status={s} done={done.includes(s)} current={current === s} size={14} />)}
      </View>
      {!!cuts && cuts > 1 && <Text style={{ fontSize: 9.5, fontWeight: '800', color: T.purple }}>✂{cuts}</Text>}
    </View>
  );
}

/** Priority card like the real one (with optional pins). */
function CardMock({ self, client, design, party, chart, qty, date, pins, dragging }: {
  self: number; client: string; design: string; party: string; chart: string; qty: string; date: string; pins?: boolean; dragging?: boolean;
}) {
  return (
    <View style={[g.card, dragging && { borderColor: T.copper, opacity: 0.8 }]}>
      <View style={g.cardHandle}>
        <Icon name="drag-handle" size={20} color={T.muted} />
        {pins && <Pin n={1} />}
      </View>
      <View style={{ flex: 1, minWidth: 0, padding: 8 }}>
        <View style={g.rowBetween}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={[g.numBadge, { borderColor: T.green }]}><Text style={g.numBadgeText}>{self}</Text></View>
              <Text style={[g.tinyLbl, { color: T.green }]}>Self</Text>
            </View>
            {pins && <Pin n={2} />}
            <View style={{ alignItems: 'center' }}>
              <View style={g.numBadgeSmall}><Text style={g.numBadgeSmallText}>{client}</Text></View>
              <Text style={g.tinyLbl}>Client</Text>
            </View>
            {pins && <Pin n={3} />}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {pins && <Pin n={4} />}
            <View style={g.statusBtn}>
              <Icon name="assignment" size={11} color={T.copper} />
              <Text style={g.statusBtnText}>Status</Text>
            </View>
          </View>
        </View>
        <View style={[g.rowBetween, { marginTop: 5 }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={g.cardDesign} numberOfLines={1}>{design}</Text>
            <Text style={g.cardParty} numberOfLines={1}>{party}</Text>
          </View>
          <Text style={g.cardMeta}>{qty} · {date}</Text>
        </View>
        <Text style={g.cardChart}>{chart}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5, alignItems: 'center' }}>
          <ChipMock name="Navy" done={['Sent for job', 'Dying']} current="Dying" />
          <ChipMock name="Black" done={['Sent for job']} current="Sent for job" />
          {pins && <Pin n={5} />}
        </View>
      </View>
    </View>
  );
}

function Btn({ label, color = T.copper, outline, icon }: { label: string; color?: string; outline?: boolean; icon?: any }) {
  return (
    <View style={[g.mBtn, outline ? { borderColor: color, backgroundColor: T.surface } : { backgroundColor: color, borderColor: color }]}>
      {!!icon && <Icon name={icon} size={13} color={outline ? color : '#fff'} />}
      <Text style={[g.mBtnText, { color: outline ? color : '#fff' }]}>{label}</Text>
    </View>
  );
}

function Frame({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={g.frame}>
      {!!title && <Text style={g.frameTitle}>{title}</Text>}
      {children}
    </View>
  );
}

/* ========================================================================== */
/*  1. PRIORITY                                                                */
/* ========================================================================== */

function PriorityGuide({ wide }: { wide: boolean }) {
  return (
    <>
      <Intro icon="low-priority" title="Priority = your dyeing queue">
        Every allocation chart (one design for one party) is one card. The card at the top is dyed first. You set the
        order by dragging cards, and you track every shade of every card from Sent for job to Job inward.
      </Intro>

      <Point
        n={1}
        wide={wide}
        title="Read a card"
        picture={(
          <Frame>
            <CardMock pins self={3} client="2" design="Rib Stop 145" party="Chennai Sportswear" chart="CH-2-03 · APC Summer" qty="3,600 m" date="12-09-2026" />
            <PinLegend items={['Drag handle — hold and move the card', 'Self priority — YOUR order (changes when you drag)', 'Client priority — from the customer, read only', 'Status — opens the Status sheet of this card', 'Shades of the chart with their status letters']} />
          </Frame>
        )}
      >
        <Li b="Top line:">Self number (green), Client number (grey) and the Status button.</Li>
        <Li b="Middle:">design name, party, total metres and last date.</Li>
        <Li b="Bottom:">chart no., APC chart name and one chip per shade.</Li>
      </Point>

      <Point
        n={2}
        wide={wide}
        title="Status letters on each shade"
        picture={(
          <Frame title="Shade chips">
            <View style={{ gap: 6 }}>
              <ChipMock name="Not started" done={[]} current={null} />
              <ChipMock name="Navy" done={['Sent for job', 'Dying']} current="Dying" />
              <ChipMock name="White" done={['Sent for job', 'Dying', 'Finish', 'Job inward']} current="Job inward" />
              <ChipMock name="Olive" done={['Sent for job', 'Dying', 'Finish', 'Lorry Cut']} current="Lorry Cut" cuts={2} />
            </View>
          </Frame>
        )}
      >
        <Text style={g.p}>Every shade shows all five steps in order:</Text>
        {SEQ.map((s) => (
          <Li key={s} b={`${STATUS_LETTER[s]} =`} color={STATUS_COLORS[s]}>{s}</Li>
        ))}
        <Li b="Coloured letter">= this step has happened.</Li>
        <Li b="Dark ring">= the CURRENT (latest) step.</Li>
        <Li b="Grey letter">= not done yet.</Li>
        <Li b="✂2">= the shade was lorry-cut two times.</Li>
        <Text style={g.p}>The chip border takes the colour of the current step.</Text>
      </Point>

      <Point
        n={3}
        wide={wide}
        title="Change the order (reorder)"
        picture={(
          <Frame title="Dragging card #3 above #2">
            <CardMock self={1} client="1" design="Rib Stop 145" party="Chennai Sportswear" chart="CH-2-01" qty="7,200 m" date="10-09-2026" />
            <View style={g.dropLine} />
            <CardMock self={2} client="3" design="8228" party="Mumbai Uniforms" chart="CH-3-02" qty="4,800 m" date="11-09-2026" />
            <CardMock dragging self={3} client="2" design="Rib Stop 145" party="Chennai Sportswear" chart="CH-2-03" qty="3,600 m" date="12-09-2026" />
            <View style={g.unsaved}><Icon name="error-outline" size={12} color={T.amber} /><Text style={g.unsavedText}>Unsaved</Text></View>
          </Frame>
        )}
      >
        <Li b="1.">Hold the ≡ handle on the left of a card and drag up or down.</Li>
        <Li b="2.">A copper line shows exactly where the card will land. Near the top / bottom edge the list scrolls by itself.</Li>
        <Li b="3.">Release — the card moves and all Self numbers renumber (1, 2, 3 …).</Li>
        <Li b="4.">The header shows <Text style={[g.bold, { color: T.amber }]}>Unsaved</Text>. Press <Text style={g.bold}>Save</Text> (top right of the list) to store the new order. It then shows <Text style={[g.bold, { color: T.green }]}>Saved</Text>.</Li>
        <Tip kind="rule">Only the Self order is saved. The Client priority is never changed from here.</Tip>
        <Tip>Dragging is off while you search — clear the search box to reorder. With a status filter on, you only reorder the cards you see; hidden cards keep their places.</Tip>
      </Point>

      <Point n={4} wide={wide} title="How the list is sorted when it opens">
        <Li b="First:">cards with a Self priority, by Self number.</Li>
        <Li b="Then:">cards with only a Client priority, by Client number.</Li>
        <Li b="Last:">cards with no priority, in the order they came.</Li>
      </Point>

      <Point
        n={5}
        wide={wide}
        title="Filter and search"
        picture={(
          <Frame title="Filter bar">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
              <View style={[g.fPill, { borderColor: T.ink }]}><Text style={g.fText}>All 42</Text></View>
              {SEQ.map((s) => (
                <View key={s} style={g.fPill}>
                  <Letter status={s} done size={13} />
                  <Text style={g.fText}>{s}</Text>
                </View>
              ))}
              <View style={g.fPill}><Text style={g.fText}>– Not started</Text></View>
            </View>
            <View style={[g.search, { marginTop: 8 }]}>
              <Icon name="search" size={14} color={T.muted} />
              <Text style={g.searchText}>Search chart, party, design, colour, lot no…</Text>
            </View>
          </Frame>
        )}
      >
        <Li b="Status chips">show how many cards have a shade CURRENTLY at that step. Tap one to see only those cards; tap again (or All) to clear.</Li>
        <Li b="Search">finds chart no., party, design, shade name / code and lot no.</Li>
        <Li b="⟳ Refresh">reloads from the server. Saving a status never loses an unsaved reorder.</Li>
      </Point>
    </>
  );
}

/* ========================================================================== */
/*  2. STATUS & LOTS                                                           */
/* ========================================================================== */

function StatusGuide({ wide }: { wide: boolean }) {
  return (
    <>
      <Intro icon="assignment" title="Status sheet = everything about one card, shade by shade">
        Tap <Text style={g.bold}>Status</Text> on a card. Every shade has its own block: its outward lots (lot no. + lot qty)
        and its status steps. What you do in one shade never changes another shade.
      </Intro>

      <Point
        n={1}
        wide={wide}
        title="The shade block"
        picture={(
          <Frame>
            <View style={g.shadeHead}>
              <View style={{ flex: 1 }}>
                <Text style={g.shadeName}>Navy</Text>
                <Text style={g.shadeMeta}>Code 1201 · Sr 1 · 1,200 m · Lot SR-4310 · Lot qty 1,200 m</Text>
              </View>
              <View style={[g.curChip, { borderColor: STATUS_COLORS.Dying }]}>
                <Letter status="Dying" done size={13} />
                <Text style={[g.curText, { color: STATUS_COLORS.Dying }]}>Dying</Text>
              </View>
            </View>
            <Text style={g.shadeMeta}>▸ Outward · Lot No. block</Text>
            <Text style={g.shadeMeta}>▸ Status buttons</Text>
            <Text style={g.shadeMeta}>▸ Status timeline with dates</Text>
          </Frame>
        )}
      >
        <Li b="Top:">shade name, code, SO serial (Sr), shade metres, its lot nos. and total lot qty.</Li>
        <Li b="Right:">the current status of the shade.</Li>
        <Li b="Header of the sheet:">design, chart, party, Self # and Client # (🔒 read only).</Li>
      </Point>

      <Point
        n={2}
        wide={wide}
        title="Add an outward lot (lot no. + lot qty)"
        picture={(
          <Frame title="Outward · Lot No. — Navy">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
              <View style={[g.input, { flexGrow: 1.4, flexBasis: 130, borderColor: T.copper }]}>
                <Text style={g.inputText} numberOfLines={1}>DC-4101</Text>
                <Text style={g.inputSub} numberOfLines={1}>Out 1,200 m · Bal 1,200 m</Text>
              </View>
              <View style={[g.input, { flexGrow: 1, flexBasis: 70 }]}><Text style={g.inputText}>SR-4310</Text></View>
              <View style={[g.input, { flexGrow: 0.8, flexBasis: 70, alignItems: 'flex-end' }]}><Text style={g.inputText}>1200</Text></View>
              <Btn label="Add" icon="add" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Pin n={1} /><Pin n={2} /><Pin n={3} /><Pin n={4} />
            </View>
            <PinLegend items={['Select Outward (🔍) — pick the challan line', 'Lot No. — the mill lot number', 'Lot Qty (m) — metres of this lot', 'Add — saves it for THIS shade']} />
          </Frame>
        )}
      >
        <Li b="1. Select Outward:">opens the chart's outward list — challan no., UId/Sr, outward qty, balance and mill. Search to find one.</Li>
        <Li b="Advance:">inside that list, shows every outward of this SO line (use it when the outward was made on another chart).</Li>
        <Li b="2. Lot No.:">type the lot (it is saved in CAPITALS).</Li>
        <Li b="3. Lot Qty (m):">pre-filled with the outward's balance — change it if only part of the outward is this lot.</Li>
        <Li b="4. Add:">the lot appears in the table below.</Li>
        <Tip kind="rule">Lot qty is what Daily Update and Mill Hub count as metres — always enter it.</Tip>
      </Point>

      <Point
        n={3}
        wide={wide}
        title="One outward = one lot per shade"
        picture={(
          <Frame title="Select Outward (in Pink)">
            <View style={g.helpRow}>
              <View style={{ flex: 1 }}>
                <Text style={g.inputText}>DC-4101</Text>
                <Text style={g.inputSub}>UId 370000208 · Sr 1 · Out 1,200 m</Text>
              </View>
              <Text style={g.addedBadge}>Added · Lot P-11</Text>
            </View>
            <View style={g.helpRow}>
              <View style={{ flex: 1 }}>
                <Text style={g.inputText}>DC-4102</Text>
                <Text style={g.inputSub}>Out 900 m · Bal 400 m</Text>
                <Text style={g.takenText}>Taken: Lot B-21 · Shd Black</Text>
              </View>
              <Icon name="chevron-right" size={18} color={T.muted} />
            </View>
          </Frame>
        )}
      >
        <Li b="Same shade:">once DC-4101 is added in <Text style={g.bold}>Pink</Text>, Pink cannot add DC-4101 again — it shows
          “Added · Lot …” and is greyed out. To change it, edit the row in the table.</Li>
        <Li b="Other shade:">
          <Text style={g.bold}>Black</Text> CAN still add DC-4101 with its own lot and qty. “Taken: Lot … · Shd …” only tells you
          another shade already uses that outward.</Li>
        <Li b="Qty limit:">the lot qtys of all shades on one outward can't be more than that outward's qty (the balance).</Li>
        <Li b="Same lot no.">may be used by several shades, or one shade may have several lots — both are fine.</Li>
      </Point>

      <Point
        n={4}
        wide={wide}
        title="Edit or remove a lot"
        picture={(
          <Frame title="Lot table">
            <View style={g.tHead}>
              <Text style={[g.th, { flex: 1.3 }]}>OUTWARD NO.</Text>
              <Text style={[g.th, { flex: 1 }]}>LOT NO.</Text>
              <Text style={[g.th, { width: 56, textAlign: 'right' }]}>LOT QTY</Text>
              <View style={{ width: 46 }} />
            </View>
            <View style={g.tRow}>
              <Text style={[g.td, { flex: 1.3 }]}>DC-4101</Text>
              <Text style={[g.td, { flex: 1, color: T.copper }]}>SR-4310</Text>
              <Text style={[g.td, { width: 56, textAlign: 'right' }]}>700</Text>
              <View style={{ width: 46, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                <Icon name="edit" size={14} color={T.blue} /><Icon name="delete-outline" size={15} color={T.red} />
              </View>
            </View>
            <View style={g.tRow}>
              <Text style={[g.td, { flex: 1.3 }]}>DC-4131</Text>
              <Text style={[g.td, { flex: 1, color: T.copper }]}>SR-4388</Text>
              <Text style={[g.td, { width: 56, textAlign: 'right', color: T.amber, fontSize: 9.5 }]}>set qty</Text>
              <View style={{ width: 46, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                <Icon name="edit" size={14} color={T.blue} /><Icon name="delete-outline" size={15} color={T.red} />
              </View>
            </View>
            <View style={[g.tRow, { backgroundColor: T.sub }]}>
              <Text style={[g.td, { flex: 1, color: T.muted, fontSize: 9.5 }]}>Total lot qty · shade 1,200 m · 1 lot without qty</Text>
              <Text style={[g.td, { width: 56, textAlign: 'right' }]}>700</Text>
              <View style={{ width: 46 }} />
            </View>
          </Frame>
        )}
      >
        <Li b="✎ Edit:">change the lot no. and/or lot qty, then ✓ to save (✕ cancels).</Li>
        <Li b="🗑 Remove:">asks “Remove Lot …?” — ✓ confirms. The outward becomes free again for THIS shade only.</Li>
        <Li b="“set qty”">(amber) = an old lot saved before lot qty existed. Tap ✎ and enter its qty.</Li>
        <Li b="Total row:">total lot qty of the shade against the shade's metres.</Li>
      </Point>

      <Point
        n={5}
        wide={wide}
        title="Move the shade to the next status"
        picture={(
          <Frame title="Current: Sent for job">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
              <View style={[g.sBtn, { borderColor: STATUS_COLORS['Sent for job'], backgroundColor: `${STATUS_COLORS['Sent for job']}22` }]}>
                <Text style={[g.sBtnText, { color: STATUS_COLORS['Sent for job'] }]}>Sent for job</Text>
              </View>
              <View style={[g.sBtn, { borderColor: STATUS_COLORS.Dying, borderStyle: 'dashed' }]}>
                <Text style={g.sBtnText}>Dying</Text>
              </View>
              {(['Finish', 'Job inward', 'Lorry Cut'] as ShadeStatus[]).map((s) => (
                <View key={s} style={[g.sBtn, { opacity: 0.45 }]}>
                  <Icon name="lock-outline" size={10} color={T.muted} />
                  <Text style={g.sBtnText}>{s === 'Lorry Cut' ? '✂ Lorry Cut' : s}</Text>
                </View>
              ))}
            </View>
            <View style={g.confirm}>
              <Text style={[g.inputSub, { flex: 1, color: T.ink }]}>Set <Text style={{ color: STATUS_COLORS.Dying, fontWeight: '800' }}>Dying</Text> for Navy · 1,200 m · today?</Text>
              <Btn label="Cancel" color={T.ink} outline />
              <Btn label="Save" color={T.green} icon="check" />
            </View>
          </Frame>
        )}
      >
        <Text style={g.p}>The steps always go in this order:</Text>
        <View style={g.flow}>
          {(['Sent for job', 'Dying', 'Finish'] as ShadeStatus[]).map((s) => (
            <React.Fragment key={s}>
              <Text style={[g.flowStep, { color: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] }]}>{s}</Text>
              <Icon name="arrow-forward" size={12} color={T.muted} />
            </React.Fragment>
          ))}
          <Text style={[g.flowStep, { color: STATUS_COLORS['Job inward'], borderColor: STATUS_COLORS['Job inward'] }]}>Job inward</Text>
          <Text style={g.inputSub}>or</Text>
          <Text style={[g.flowStep, { color: STATUS_COLORS['Lorry Cut'], borderColor: STATUS_COLORS['Lorry Cut'] }]}>✂ Lorry Cut</Text>
        </View>
        <Li b="Dashed button">= the only step you can press now. ✓ = done, 🔒 = not yet.</Li>
        <Li b="Tap it → Save.">It is saved with today's date and the shade's total lot qty (the shade metres if it has no lot yet).</Li>
        <Li b="Lorry Cut">needs a reason (White spots, Patchiness, Shade variation …) — pick one chip before Save.</Li>
        <Tip kind="warn">You can't skip a step, go back, repeat a step or use a future date. Job inward and Lorry Cut are final steps.</Tip>
      </Point>

      <Point
        n={6}
        wide={wide}
        title="Timeline and removing a status"
        picture={(
          <Frame title="Timeline (oldest → latest)">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
              {([['01/09/26', 'Sent for job'], ['03/09/26', 'Dying'], ['04/09/26', 'Finish']] as [string, ShadeStatus][]).map(([d, s], i, arr) => (
                <React.Fragment key={s}>
                  <View style={[g.tChip, { borderColor: STATUS_COLORS[s], backgroundColor: `${STATUS_COLORS[s]}14` }, i === arr.length - 1 && { borderWidth: 1.5 }]}>
                    <Text style={g.tChipDate}>{d}</Text>
                    <Text style={[g.tChipStatus, { color: STATUS_COLORS[s] }]}>{s}</Text>
                    {i === arr.length - 1 && <View style={g.tX}><Icon name="close" size={10} color={T.red} /></View>}
                  </View>
                  {i < arr.length - 1 && <Icon name="arrow-forward" size={11} color={T.muted} />}
                </React.Fragment>
              ))}
            </View>
          </Frame>
        )}
      >
        <Li b="Timeline:">every status of the shade with its date, oldest first.</Li>
        <Li b="✕ on the LAST chip only:">removes the latest status (asks to confirm). The one before it becomes the latest.</Li>
        <Li b="Wrong status?">Remove from the end, one by one, then save the right one.</Li>
        <Tip>Buttons you don't have rights for (status / lot) are hidden or disabled — ask an admin.</Tip>
      </Point>
    </>
  );
}

/* ========================================================================== */
/*  3. DAILY UPDATE                                                            */
/* ========================================================================== */

function Kpi({ lbl, col, val, sub }: { lbl: string; col: string; val: string; sub: string }) {
  return (
    <View style={[g.kpi, { borderColor: T.border }]}>
      <Text style={[g.kpiLbl, { color: col }]} numberOfLines={1}>{lbl}</Text>
      <Text style={g.kpiVal}>{val} <Text style={g.kpiUnit}>m</Text></Text>
      <Text style={g.kpiSub} numberOfLines={1}>{sub}</Text>
    </View>
  );
}

function DailyGuide({ wide }: { wide: boolean }) {
  return (
    <>
      <Intro icon="today" title="Daily Update = what the dye house did on a day">
        Read only — nothing is typed here. It is built from the statuses saved in the Priority Status sheet and the
        outward lots (lot no. + lot qty) of each shade.
      </Intro>

      <Point
        n={1}
        wide={wide}
        title="Pick the day"
        picture={(
          <Frame>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={g.arrow}>‹</Text>
              <View style={g.dateBox}><Text style={g.inputText}>28-09-2026</Text></View>
              <Text style={g.arrow}>›</Text>
              <View style={[g.quick, { backgroundColor: T.copper }]}><Text style={[g.quickText, { color: '#fff' }]}>Yesterday</Text></View>
              <View style={g.quick}><Text style={g.quickText}>Today</Text></View>
              <Text style={g.inputSub}>Monday</Text>
            </View>
          </Frame>
        )}
      >
        <Li b="‹ ›">move one day. The date box opens a calendar.</Li>
        <Li b="Opens on Yesterday">(the last full working day). Future days can't be picked.</Li>
      </Point>

      <Point
        n={2}
        wide={wide}
        title="Where the metres come from"
        picture={(
          <Frame title="Navy has 2 outward lots">
            <View style={g.aRow}>
              <View style={{ flex: 1 }}>
                <Text style={g.inputText}>Rib Stop 145 · Navy</Text>
                <Text style={g.inputSub}>CH-2-01 · L·SR-4310 · DC-4101 · Shree Rang</Text>
              </View>
              <Text style={g.inputText}>700 m</Text>
            </View>
            <View style={g.aRow}>
              <View style={{ flex: 1 }}>
                <Text style={g.inputText}>Rib Stop 145 · Navy</Text>
                <Text style={g.inputSub}>CH-2-01 · L·SR-4311 · DC-4102 · Akash</Text>
              </View>
              <Text style={g.inputText}>500 m</Text>
            </View>
            <View style={g.aRow}>
              <View style={{ flex: 1 }}>
                <Text style={g.inputText}>8228 · Black</Text>
                <Text style={g.inputSub}>CH-3-02 · no lot</Text>
              </View>
              <Text style={g.inputText}>≈ 1,200 m</Text>
            </View>
          </Frame>
        )}
      >
        <Li b="One row per outward lot:">a shade with 2 lots shows 2 rows, each with its own lot no., challan, mill and LOT QTY.</Li>
        <Li b="≈ 1,200 m">= this shade has no lot qty yet, so its order metres are used. Enter lot qty in Priority → Status to make it exact.</Li>
      </Point>

      <Point
        n={3}
        wide={wide}
        title="The two groups of boxes"
        picture={(
          <Frame>
            <Text style={g.groupLbl}>DYEING OUTPUT — counted once</Text>
            <View style={g.kpiRow}>
              <Kpi lbl="DYED" col={PC.dyeing} val="3,600" sub="3 lots" />
              <Kpi lbl="FINISHED" col={PC.finish} val="2,400" sub="2 lots" />
              <Kpi lbl="RECEIVED" col={PC.inward} val="1,200" sub="1 receipt" />
            </View>
            <Text style={[g.groupLbl, { color: PC.cut, marginTop: 8 }]}>RE-PROCESSING — kept separate</Text>
            <View style={g.kpiRow}>
              <Kpi lbl="LORRY CUTS" col={PC.cut} val="1,200" sub="1 cut" />
              <Kpi lbl="RE-DYED" col={PC.re} val="1,200" sub="1 lot" />
            </View>
          </Frame>
        )}
      >
        <Li b="DYED / FINISHED / RECEIVED" color={PC.dyeing}>= first-time work that day (Dying / Finish / Job inward saved on that date).</Li>
        <Li b="LORRY CUTS · SENT FOR RE-DYE · RE-DYED · RE-FINISHED · RE-DYE BACK" color={PC.cut}>= repeat work after a lorry cut. It is never added to the output boxes, so metres are never counted twice.</Li>
        <Li b="Tap a box">to see only those rows; tap again to clear.</Li>
      </Point>

      <Point n={4} wide={wide} title="Design chips and the day's rows">
        <Li b="Design chips:">metres per design for the day; “↻ 1,200” = re-processing metres of that design. Tap a chip to filter.</Li>
        <Li b="Each row:">design · colour, then chart · L·lot · challan · mill, then party and lorry-cut reasons. Right side: metres and a coloured badge (Dyed, Finished, Received, Lorry cut before/after finishing, Re-dyed …).</Li>
        <Li b="↻ RE-WORK · cycle 2">= second round after a lorry cut.</Li>
      </Point>

      <Point
        n={5}
        wide={wide}
        title="Month table (date-wise)"
        picture={(
          <Frame title="Date-wise dyeing — September 2026">
            <View style={g.tHead}>
              {['DATE', 'DYED', 'FIN', 'RECV', 'CUT'].map((h, i) => (
                <Text key={h} style={[g.th, i === 0 ? { flex: 1.4 } : { flex: 1, textAlign: 'right' }]}>{h}</Text>
              ))}
            </View>
            {[['▾ 28 Sep', '3,600', '2,400', '1,200', '—'], ['▸ 27 Sep', '1,200', '—', '—', '1,200']].map((r) => (
              <View key={r[0]} style={g.tRow}>
                {r.map((c, i) => (
                  <Text key={i} style={[g.td, i === 0 ? { flex: 1.4, color: r[0].startsWith('▾') ? T.copper : T.ink } : { flex: 1, textAlign: 'right' }]}>{c}</Text>
                ))}
              </View>
            ))}
            <View style={[g.tRow, { borderTopWidth: 2, borderTopColor: T.border }]}>
              {['GRAND TOTAL', '4,800', '2,400', '1,200', '1,200'].map((c, i) => (
                <Text key={i} style={[g.td, { fontWeight: '800' }, i === 0 ? { flex: 1.4 } : { flex: 1, textAlign: 'right' }]}>{c}</Text>
              ))}
            </View>
          </Frame>
        )}
      >
        <Li b="Every date of the month">(newest first) with DYED, FIN, RECV, CUT, RE-DYE, RE-FIN, BACK metres.</Li>
        <Li b="Tap a date">to open its details under it (and jump the page to that day).</Li>
        <Li b="GRAND TOTAL">for the month is the last row. Swipe sideways on a phone to see all columns.</Li>
        <Tip kind="rule">A status saved twice for the same material is counted once. A day counts each lot once per column.</Tip>
      </Point>
    </>
  );
}

/* ========================================================================== */
/*  4. MILL HUB                                                                */
/* ========================================================================== */

function MillHubGuide({ wide }: { wide: boolean }) {
  return (
    <>
      <Intro icon="local-shipping" title="Mill Hub = what went to outside mills and what came back">
        Read only. Built from Sent for job, Job inward and Lorry Cut saved in Priority, plus each shade's outward lots
        (challan, mill and lot qty). Use it to see pending material and shortage per design, mill and challan.
      </Intro>

      <Point n={1} wide={wide} title="The idea: every outward lot is a trip">
        <Li b="Sent for job">opens a trip for each outward lot of the shade (its own challan, mill and lot qty).</Li>
        <Li b="Job inward">closes the trip — the lot is received.</Li>
        <Li b="Lorry Cut after receipt">sends the material back = a RE-DYE trip, shown separately (never added to Out / In).</Li>
        <Tip>If Sent for job was never saved, the first status of the shade is taken as the outward (tag “NO SENT ENTRY”).</Tip>
      </Point>

      <Point
        n={2}
        wide={wide}
        title="Pick the dates and the mill"
        picture={(
          <Frame>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
              <View style={g.dateBox}><Text style={g.inputText}>01-09-2026</Text></View>
              <Text style={g.inputSub}>→</Text>
              <View style={g.dateBox}><Text style={g.inputText}>29-09-2026</Text></View>
              <View style={g.quick}><Text style={g.quickText}>7d</Text></View>
              <View style={[g.quick, { backgroundColor: T.copper }]}><Text style={[g.quickText, { color: '#fff' }]}>Month</Text></View>
              <View style={g.quick}><Text style={g.quickText}>90d</Text></View>
            </View>
            <Text style={[g.inputSub, { marginTop: 6 }]}>01 Sep → 29 Sep · 12 outward · 9 inward · 2 re-dye   <Text style={{ color: T.copper, fontWeight: '800' }}>+4 outside range — show all</Text></Text>
            <View style={{ flexDirection: 'row', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
              <View style={[g.quick, { borderColor: T.copper }]}><Text style={g.quickText}>All mills</Text></View>
              <View style={[g.quick, { backgroundColor: T.surface }]}><Text style={[g.quickText, { color: T.ink }]}>Shree Rang</Text></View>
              <View style={[g.quick, { backgroundColor: T.surface }]}><Text style={[g.quickText, { color: T.ink }]}>Akash Process</Text></View>
            </View>
          </Frame>
        )}
      >
        <Li b="From → To">or the presets 7d / Month / 90d.</Li>
        <Li b="Opens on:">this month if it has activity, else the last 90 days, else everything.</Li>
        <Li b="“+N outside range — show all”">widens the dates to everything recorded.</Li>
        <Li b="Mill chips">show one mill only (each outward lot carries its own mill).</Li>
      </Point>

      <Point
        n={3}
        wide={wide}
        title="Read the design table"
        picture={(
          <Frame>
            <View style={g.tHead}>
              {['DESIGN', 'OUT', 'IN', 'PEND', 'SHORT', '%'].map((h, i) => (
                <Text key={h} style={[g.th, i === 0 ? { flex: 1.6 } : { flex: 1, textAlign: 'right' }]}>{h}</Text>
              ))}
            </View>
            <View style={g.tRow}>
              <View style={{ flex: 1.6 }}>
                <Text style={g.td}>Rib Stop 145 <Text style={{ color: T.copper }}>›</Text></Text>
                <Text style={{ fontSize: 8.5, color: PC.re, fontWeight: '700' }}>↻ re-dye 1,200 out · 1,190 back</Text>
              </View>
              {['7,200', '6,000', '1,200', '24', '0.4'].map((c, i) => (
                <Text key={i} style={[g.td, { flex: 1, textAlign: 'right' }, i === 2 && { color: T.amber }, i === 3 && { color: T.red, fontWeight: '800' }]}>{c}</Text>
              ))}
            </View>
            <View style={[g.tRow, { backgroundColor: T.sub }]}>
              {['GRAND TOTAL', '7,200', '6,000', '1,200', '24', '0.4'].map((c, i) => (
                <Text key={i} style={[g.td, { fontWeight: '800' }, i === 0 ? { flex: 1.6 } : { flex: 1, textAlign: 'right' }]}>{c}</Text>
              ))}
            </View>
          </Frame>
        )}
      >
        <Li b="OUT">— metres sent out in the range (by the Sent for job date).</Li>
        <Li b="IN">— metres received in the range, even if they were sent earlier. OUT and IN are counted independently.</Li>
        <Li b="PEND" color={T.amber}>— of the range's outwards, what is still at the mill.</Li>
        <Li b="SHORT" color={T.red}>— sent minus received on the lots received in the range.</Li>
        <Li b="%">— shortage as a share of the metres settled. Above 5 % shows in red.</Li>
        <Li b="IN ₹">— job-work value of the receipts (metres × rate).</Li>
        <Li b="↻ re-dye">— material sent back after a lorry cut, shown under the design, not added to OUT / IN.</Li>
      </Point>

      <Point
        n={4}
        wide={wide}
        title="Tap a design → challan-wise page"
        picture={(
          <Frame>
            <Text style={g.inputText}>DC-4101 <Text style={g.inputSub}>01 Sep</Text></Text>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
              <Text style={[g.tag, { color: PC.re, backgroundColor: '#FBF1DC' }]}>RE-DYE</Text>
              <Text style={[g.tag, { color: '#1C567A', backgroundColor: '#E3EEF5' }]}>EARLIER OUTWARD</Text>
              <Text style={[g.tag, { color: T.muted, backgroundColor: T.alt }]}>NO SENT ENTRY</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 5, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={[g.state, { backgroundColor: '#2A6044' }]}>CLOSED</Text>
              <Text style={[g.state, { backgroundColor: T.red }]}>CLOSED · SHORT</Text>
              <Text style={[g.state, { backgroundColor: '#C98A1A' }]}>PARTIAL</Text>
              <Text style={[g.state, { backgroundColor: '#5A6B7A' }]}>PENDING</Text>
            </View>
            <Text style={[g.inputSub, { marginTop: 6 }]}>Navy D F L·SR-4310 ✂1 · Shree Rang · chart CH-2-01 · outwarded 700 m · received 690 m</Text>
          </Frame>
        )}
      >
        <Li b="One row per challan / outward lot">with OUT, IN, PEND, SHORT, % and IN ₹, and a TOTAL row.</Li>
        <Li b="State badge:">CLOSED (fully back), CLOSED · SHORT (back with less metres), PARTIAL, PENDING (still at the mill).</Li>
        <Li b="Tags:">RE-DYE (lorry-cut round), EARLIER OUTWARD (sent before the range, received inside it), NO SENT ENTRY.</Li>
        <Li b="Info line:">shade, D (dyed) F (finished), L·lot no., ✂ cuts, mill, chart, party, outwarded / received metres. “≈ … (order qty)” = no lot qty entered yet.</Li>
        <Li b="‹ Designs">goes back. On the main page, “ⓘ How to read this” repeats these rules.</Li>
      </Point>
    </>
  );
}

/* ========================================================================== */

const g = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  overlayWide: { justifyContent: 'center', alignItems: 'center' },
  sheet: {
    width: '100%', backgroundColor: T.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden',
  },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  headIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: T.nav, alignItems: 'center', justifyContent: 'center' },
  headTitle: { fontSize: 15, fontWeight: '800', color: T.ink },
  headSub: { fontSize: 11, fontWeight: '500', color: T.muted, marginTop: 1 },
  closeBtn: { padding: 4 },
  tabsScroll: { flexGrow: 0, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: T.border, borderRadius: 16,
    paddingHorizontal: 11, paddingVertical: 6, backgroundColor: T.sub,
  },
  tabOn: { backgroundColor: T.nav, borderColor: T.nav },
  tabText: { fontSize: 12, fontWeight: '700', color: T.ink },
  tabTextOn: { color: '#fff' },
  body: { padding: 12, paddingBottom: 28, gap: 10, width: '100%', maxWidth: 900, alignSelf: 'center' },

  intro: {
    flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: '#F8EFE6',
    borderWidth: 1, borderColor: `${T.copper}44`,
  },
  introTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
  introText: { fontSize: 12.5, lineHeight: 18, color: T.ink, marginTop: 3 },

  point: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 12 },
  pointHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  num: { width: 22, height: 22, borderRadius: 11, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center' },
  numText: { color: '#fff', fontSize: 11.5, fontWeight: '800' },
  pointTitle: { flex: 1, fontSize: 13.5, fontWeight: '800', color: T.ink },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start' },
  picture: { marginTop: 10 },
  pictureWide: { marginTop: 0, width: 390 },

  p: { fontSize: 12.5, lineHeight: 18, color: T.ink, marginBottom: 4 },
  li: { flexDirection: 'row', gap: 7, marginBottom: 5, alignItems: 'flex-start' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: T.copper, marginTop: 7 },
  liText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: T.ink },
  bold: { fontWeight: '800', color: T.ink },
  tip: { flexDirection: 'row', gap: 7, borderWidth: 1, borderRadius: 9, padding: 8, marginTop: 6 },
  tipText: { flex: 1, fontSize: 11.5, lineHeight: 17, color: T.ink },

  pin: { width: 16, height: 16, borderRadius: 8, backgroundColor: T.copper, alignItems: 'center', justifyContent: 'center' },
  pinText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  legendText: { flex: 1, fontSize: 11, color: T.ink },

  frame: { backgroundColor: T.bg, borderRadius: 10, borderWidth: 1, borderColor: T.border, padding: 9, gap: 6 },
  frameTitle: { fontSize: 9.5, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4 },

  card: { flexDirection: 'row', backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  cardHandle: { width: 30, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: T.sub, borderRightWidth: 1, borderRightColor: T.hair },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  numBadge: { minWidth: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  numBadgeText: { fontSize: 11, fontWeight: '800', color: T.ink },
  numBadgeSmall: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: T.alt, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  numBadgeSmallText: { fontSize: 9.5, fontWeight: '700', color: T.muted },
  tinyLbl: { fontSize: 8.5, fontWeight: '700', color: T.muted },
  statusBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: `${T.copper}88`, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  statusBtnText: { fontSize: 10, fontWeight: '800', color: T.copper },
  cardDesign: { fontSize: 12.5, fontWeight: '800', color: T.ink },
  cardParty: { fontSize: 10, color: T.muted },
  cardMeta: { fontSize: 9.5, color: T.muted, fontWeight: '600' },
  cardChart: { fontSize: 9.5, fontWeight: '700', color: T.ink, marginTop: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3,
    borderColor: T.border, backgroundColor: T.sub, alignSelf: 'flex-start',
  },
  chipText: { fontSize: 9.5, fontWeight: '700', color: T.ink, maxWidth: 110 },
  dropLine: { height: 4, borderRadius: 2, backgroundColor: T.copper, marginVertical: 1 },
  unsaved: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', borderWidth: 1, borderColor: T.amber,
    backgroundColor: 'rgba(201,138,26,0.15)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
  },
  unsavedText: { fontSize: 10, fontWeight: '800', color: T.amber },

  fPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: T.surface },
  fText: { fontSize: 10, fontWeight: '700', color: T.ink },
  search: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 8, height: 32, backgroundColor: T.surface },
  searchText: { fontSize: 11, color: T.muted, flex: 1 },

  shadeHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shadeName: { fontSize: 14, fontWeight: '800', color: T.ink },
  shadeMeta: { fontSize: 10.5, color: T.muted },
  curChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3 },
  curText: { fontSize: 10.5, fontWeight: '800' },
  input: { minHeight: 36, borderWidth: 1, borderColor: T.border, borderRadius: 8, backgroundColor: T.surface, paddingHorizontal: 8, paddingVertical: 4, justifyContent: 'center' },
  inputText: { fontSize: 12, fontWeight: '700', color: T.ink },
  inputSub: { fontSize: 10, color: T.muted },
  mBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, height: 32 },
  mBtnText: { fontSize: 11.5, fontWeight: '800' },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: T.hair },
  addedBadge: {
    fontSize: 10, fontWeight: '800', color: T.copper, borderWidth: 1, borderColor: `${T.copper}66`, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden',
  },
  takenText: { fontSize: 9.5, fontWeight: '700', color: T.blue, marginTop: 1 },
  tHead: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.alt, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  th: { fontSize: 8.5, fontWeight: '800', color: T.muted },
  tRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.hair },
  td: { fontSize: 11, fontWeight: '600', color: T.ink },
  sBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderColor: T.border, borderRadius: 7, paddingHorizontal: 7, height: 28, backgroundColor: T.surface },
  sBtnText: { fontSize: 10, fontWeight: '800', color: T.ink },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 4 },
  flow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  flowStep: { fontSize: 10.5, fontWeight: '800', borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  tChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3 },
  tChipDate: { fontSize: 9.5, fontWeight: '800', color: T.ink },
  tChipStatus: { fontSize: 9.5, fontWeight: '800' },
  tX: { width: 14, height: 14, borderRadius: 7, backgroundColor: `${T.red}1A`, alignItems: 'center', justifyContent: 'center' },

  arrow: { fontSize: 20, color: T.copper, fontWeight: '800' },
  dateBox: { borderWidth: 1, borderColor: T.border, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: T.surface },
  quick: { borderWidth: 1, borderColor: `${T.copper}55`, backgroundColor: '#F8EFE6', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  quickText: { fontSize: 10, fontWeight: '800', color: T.copper },
  aRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.hair },
  groupLbl: { fontSize: 8.5, fontWeight: '800', color: T.muted, letterSpacing: 0.4 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  kpi: { flexGrow: 1, flexBasis: 90, borderWidth: 2, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 6, backgroundColor: T.surface },
  kpiLbl: { fontSize: 8.5, fontWeight: '800' },
  kpiVal: { fontSize: 13.5, fontWeight: '800', color: T.ink, marginTop: 1 },
  kpiUnit: { fontSize: 9, color: T.muted },
  kpiSub: { fontSize: 8.5, color: T.muted },
  tag: { fontSize: 8, fontWeight: '800', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  state: { fontSize: 8, fontWeight: '800', color: '#fff', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },

  footerRow: { alignItems: Platform.OS === 'web' ? 'flex-end' : 'stretch', marginTop: 4 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.copper,
    borderRadius: 10, paddingHorizontal: 18, height: 42,
  },
  nextText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
