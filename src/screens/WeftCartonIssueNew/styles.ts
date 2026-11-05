import { T } from '@/src/theme';
import { MONO } from '@/src/screens/inquiry/ui';
import { StyleSheet } from 'react-native';

/* Colours come from the same theme the Beam Gaiting screen uses (T), so both screens always match.
   Old key names are kept (indigo / saffron ...) so every component that already uses C keeps working:
     primary / indigo  -> T.nav     (structure: selected chip, tab, left bar, icons)
     saffron           -> T.copper  (accent: main buttons, highlights)  */
export const C = {
    bg: T.bg,
    surface: T.surface,
    surface2: T.sub,
    ink: T.ink,
    ink2: T.muted,
    line: T.border,
    hair: T.hair,
    indigo: T.nav,
    primary: T.nav,
    primaryDark: T.nav,
    indigoSoft: T.alt,
    saffron: T.copper,
    saffronSoft: `${T.copper}1A`,
    accent: T.copper,
    availBar: `${T.copper}99`,
    ok: '#1F7A4F',
    okSoft: '#E3F3EA',
    bad: T.red,
    badSoft: `${T.red}14`,
    dotUsed: T.border,
};
export { MONO };

const shadow = (o = 0.05, r = 8, y = 2) => ({
    shadowColor: '#0F172A',
    shadowOpacity: o,
    shadowRadius: r,
    shadowOffset: { width: 0, height: y },
    elevation: 1,
});

export const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },

    /* kept for compatibility with older references */
    header: { backgroundColor: C.primary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
    filterLabel: { fontSize: 11, color: C.ink, marginBottom: 4, fontWeight: '800' },

    /* Search-aware quantity summary for the weft carton issue browse. */
    qtySummaryCard: {
        marginTop: 16, paddingTop: 14, borderTopWidth: 1,
        borderTopColor: C.line, width: '100%',
    },
    qtySummaryHeading: { fontSize: 13, fontWeight: '900', color: C.ink, marginBottom: 13 },
    qtySummaryLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, color: C.ink2 },
    qtySummaryValue: { fontSize: 26, fontWeight: '900', color: C.primary, marginTop: 4, fontFamily: MONO },
    qtySummaryDivider: { height: 1, backgroundColor: C.line, marginVertical: 12 },
    qtySummaryCountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    qtySummaryCountLabel: { fontSize: 12, fontWeight: '700', color: C.ink2 },
    qtySummaryCount: { fontSize: 16, fontWeight: '900', color: C.ink },
    qtySummaryHint: { fontSize: 11, color: C.ink2, marginTop: 8 },
    qtySummaryMobile: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 8, paddingTop: 10, marginTop: 10,
        borderTopWidth: 1, borderTopColor: C.line,
    },
    qtySummaryMobileText: { fontSize: 12, color: C.ink2, fontWeight: '700' },
    qtySummaryMobileValue: { fontSize: 13.5, fontWeight: '900', color: C.primary },

    /* ---------- Property / Year criteria bar (both tabs) ----------
       On mobile it spans the full screen width (matching the body's mobile padding). On a
       wide/desktop viewport it sits inside the same 1100px content column as the page body,
       with the same 16px padding, so its left/right edges line up exactly with the scan card,
       the segmented control, and everything else below it. */
    criteriaTrigger: { marginTop: 12, marginBottom: 2 },
    criteriaTriggerMobile: { marginHorizontal: 12, marginTop: 10 },
    criteriaTriggerWebWrap: { width: '100%', maxWidth: 1440, alignSelf: 'center', paddingHorizontal: 16 },
    criteriaTriggerButton: {
        width: '100%', borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: C.surface,
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
    },
    criteriaTriggerIcon: {
        width: 38, height: 38, borderRadius: 10, backgroundColor: C.indigoSoft,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    criteriaTriggerTextWrap: { flex: 1, minWidth: 0 },
    critRow: { flexDirection: 'row', alignItems: 'center' },
    critItem: { flex: 1, minWidth: 0 },
    critDivider: { width: 1, alignSelf: 'stretch', backgroundColor: C.line, marginHorizontal: 12 },
    critLabel: { fontSize: 9.5, fontWeight: '900', color: C.ink2, letterSpacing: 0.3 },
    critValue: { fontSize: 13, fontWeight: '800', color: C.ink, marginTop: 2 },
    critDates: { fontSize: 11, color: C.ink2, marginTop: 6 },
    criteriaTriggerTitle: { color: C.ink, fontSize: 13, fontWeight: '800' },
    criteriaTriggerSummary: { color: C.ink2, fontSize: 11, marginTop: 2 },

    body: { padding: 16, paddingBottom: 120 },
    bodyWeb: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
    /* Beams tab: wider column so 4 issue cards fit in one row on a big screen */
    bodyBeamsWeb: { width: '100%', maxWidth: 1440, alignSelf: 'center' },
    bodyMobile: { paddingHorizontal: 12, paddingTop: 12 },

    /* ---------- Scan / Manual switch ---------- */
    seg: {
        flexDirection: 'row', backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 4, marginBottom: 14,
    },
    segBtn: {
        flex: 1, minHeight: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 10, flexDirection: 'row', gap: 8,
    },
    segBtnOn: { backgroundColor: C.surface, ...shadow(0.08, 4, 1) },
    segText: { color: C.ink2, fontWeight: '700', fontSize: 13 },
    segTextOn: { color: C.primary, fontWeight: '900' },

    /* ---------- Scan zone ---------- */
    scanZone: {
        alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1.5,
        borderStyle: 'dashed', borderColor: `${C.accent}88`, paddingVertical: 26, paddingHorizontal: 20,
    },
    scanIconWrap: {
        width: 64, height: 64, borderRadius: 32, backgroundColor: C.indigoSoft,
        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    scanTitle: { fontSize: 16, fontWeight: '900', color: C.ink },
    scanText: { fontSize: 12.5, color: C.ink2, textAlign: 'center', marginTop: 4, marginBottom: 16, lineHeight: 18 },

    label: { fontSize: 11, color: C.ink, fontWeight: '800', marginBottom: 4 },
    input: { height: 46, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, color: C.ink, backgroundColor: C.surface, fontSize: 15 },

    /* ---------- Manual search ---------- */
    searchPanel: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 12 },
    searchWrap: {
        flexDirection: 'row', alignItems: 'center', height: 44, borderWidth: 1, borderColor: C.line,
        borderRadius: 10, backgroundColor: C.surface, paddingHorizontal: 11, gap: 7,
    },
    searchInput: { flex: 1, color: C.ink, fontSize: 13.5, height: 42 },
    searchHint: { fontSize: 11, color: C.ink2, marginTop: 4 },
    /* ---------- Filter chip (Browse: New Design) ---------- */
    filterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    filterChip: {
        flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingLeft: 8, paddingRight: 14,
        borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface,
    },
    filterChipOn: { borderColor: C.primary, backgroundColor: C.primary },
    filterBox: {
        width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: C.ink2,
        alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface,
    },
    filterBoxOn: { borderColor: C.accent, backgroundColor: C.accent },
    filterText: { fontSize: 12, fontWeight: '800', color: C.ink },
    filterTextOn: { color: '#fff' },
    resultList: { marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: C.line, overflow: 'hidden', maxHeight: 340 },
    resultRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12,
        borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.surface,
    },
    resultIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: C.indigoSoft, alignItems: 'center', justifyContent: 'center' },
    badge: { backgroundColor: C.saffronSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: '700', color: C.saffron },

    select: { height: 46, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    selectText: { color: C.ink, fontSize: 14, flex: 1 },
    selectPlaceholder: { color: C.ink2, fontSize: 14, flex: 1 },
    disabled: { backgroundColor: C.surface2 },
    row2: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    row2Mobile: { flexDirection: 'column', gap: 10 },
    col: { flex: 1 },
    hint: { fontSize: 12, color: C.ink2, marginTop: 6 },

    btn: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: C.surface, flexDirection: 'row', gap: 6 },
    btnText: { color: C.ink, fontWeight: '800' },
    btnPrimary: { backgroundColor: C.accent, borderColor: C.accent },
    btnPrimaryText: { color: '#fff', fontWeight: '900' },
    btnDanger: { borderColor: `${C.bad}55`, backgroundColor: C.badSoft },
    btnDangerText: { color: C.bad, fontWeight: '600' },
    btnSm: { height: 32, paddingHorizontal: 12, borderRadius: 8 },
    btnSmText: { fontSize: 12 },

    /* ---------- Carton card ---------- */
    card: { borderWidth: 1, borderColor: C.line, borderLeftWidth: 4, borderLeftColor: C.accent, borderRadius: 12, padding: 12, marginBottom: 12, backgroundColor: C.surface },
    cardAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.indigoSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    cartNo: { fontSize: 18, fontWeight: '900', color: C.ink, fontFamily: MONO },
    sub: { fontSize: 11.5, fontWeight: '700', color: C.ink2, marginTop: 1 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    chip: { backgroundColor: C.indigoSoft, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
    chipText: { fontSize: 11.5, color: C.primary, fontWeight: '800' },
    balRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    balBox: { flex: 1, backgroundColor: C.surface2, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
    balLabel: { fontSize: 9.5, color: C.ink2, fontWeight: '900', letterSpacing: 0.3 },
    balValue: { fontSize: 22, fontWeight: '900', color: C.ink, marginTop: 2, fontFamily: MONO },
    progressTrack: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: C.surface2, marginTop: 14 },
    legend: { flexDirection: 'row', gap: 14, marginTop: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: C.ink2 },

    secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, marginBottom: 10 },
    secTitle: { fontSize: 14, fontWeight: '900', color: C.ink },
    secSub: { fontSize: 12, color: C.ink2 },
    stepBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    stepBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },

    line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: C.line, borderLeftWidth: 4, borderLeftColor: C.primary, borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: C.surface },
    lineTitle: { fontWeight: '800', color: C.ink },
    lineSub: { fontSize: 11.5, fontWeight: '600', color: C.ink2, marginTop: 2 },
    lockText: { fontSize: 11, color: C.bad, marginTop: 2 },
    iconBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginLeft: 6, backgroundColor: C.surface },

    entry: { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, marginTop: 12, backgroundColor: C.surface },

    tag: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    tagText: { fontSize: 11, fontWeight: '700' },

    msg: { borderRadius: 10, padding: 10, marginBottom: 10 },
    msgText: { fontSize: 12.5 },

    radio: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 11, marginBottom: 6, backgroundColor: C.surface },
    radioOn: { borderColor: C.primary, backgroundColor: C.indigoSoft },

    empty: { alignItems: 'center', padding: 28, borderWidth: 1, borderStyle: 'dashed', borderColor: C.line, borderRadius: 14, marginTop: 16, backgroundColor: C.surface },
    emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    emptyTitle: { fontSize: 15, fontWeight: '900', color: C.ink, marginBottom: 4 },
    emptyText: { fontSize: 13, color: C.ink2, textAlign: 'center', lineHeight: 19 },

    listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.surface },

    issCard: { flex: 1, borderWidth: 1, borderColor: C.line, borderLeftWidth: 4, borderLeftColor: C.primary, borderRadius: 12, overflow: 'hidden', backgroundColor: C.surface },
    /* grid cell around each issue card: 1 column on phones, 2 / 3 / 4 as the screen gets wider */
    issCell: { flexGrow: 1, flexBasis: 0, minWidth: 0, padding: 6 },
    issGridPadMobile: { paddingHorizontal: 6 },
    issHead: { backgroundColor: C.indigoSoft, padding: 12, flexDirection: 'column', gap: 8 },
    issTitle: { fontSize: 15, fontWeight: '900', color: C.ink },
    grpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.line },
    issTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    issBeam: { fontSize: 15, fontWeight: '900', color: C.ink },
    issDsnPill: { alignSelf: 'flex-start', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, marginTop: 4 },
    issDsnPillText: { fontSize: 11.5, fontWeight: '800', color: C.ink },
    issMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    issChip: { backgroundColor: C.surface, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
    issChipText: { fontSize: 11.5, fontWeight: '800', color: C.ink },
    grpBadge: { backgroundColor: C.primary, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginRight: 8 },
    grpBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    lineCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 6, backgroundColor: C.surface2 },
    lineSr: { fontSize: 11, fontWeight: '900', color: C.ink2, minWidth: 30 },
    lineMain: { fontSize: 13.5, fontWeight: '900', color: C.ink },
    grpText: { fontSize: 11.5, color: C.ink2, flexShrink: 1, fontWeight: '800' },

    tabs: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surface, ...shadow(0.08, 10, -2) },
    tab: { flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 10, borderTopWidth: 2.5, borderTopColor: 'transparent' },
    tabOn: { borderTopColor: C.accent },
    tabText: { fontSize: 12, color: C.ink2, marginTop: 2, fontWeight: '700' },
    tabTextOn: { color: C.primary, fontWeight: '900' },

    modalWrap: { flex: 1, backgroundColor: 'rgba(10,18,28,0.5)', justifyContent: 'flex-end' },
    /* Wide screens: a centered dialog instead of a full-bleed bottom sheet. */
    modalWrapWeb: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
    sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '90%' },
    sheetWeb: { width: '100%', maxWidth: 600, borderRadius: 18, padding: 22, maxHeight: '88%', ...shadow(0.2, 30, 10) },
    sheetTitle: { fontSize: 16, fontWeight: '900', color: C.ink },
    filterSheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '88%', width: '100%', alignSelf: 'center' },
    /* Wide screens: capped width, rounded on every corner, no longer pinned to the bottom edge. */
    filterSheetWeb: { width: '100%', maxWidth: 480, borderRadius: 20, ...shadow(0.18, 30, 10) },
    sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: C.line, alignSelf: 'center', marginBottom: 14 },
    sheetHandleHidden: { opacity: 0, height: 0, marginBottom: 4 },
    filterSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    filterReset: { color: C.bad, fontSize: 13, fontWeight: '600' },
    filterFieldRow: { flexDirection: 'row', gap: 12 },
    filterFieldRowMobile: { flexDirection: 'column', gap: 10 },
    filterField: { flex: 1, minWidth: 0 },
    filterDateBtn: { minHeight: 46, borderRadius: 10, backgroundColor: C.surface2, justifyContent: 'center', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line },
    filterDateText: { color: C.ink, fontSize: 14, fontWeight: '500', flex: 1 },

    camera: { flex: 1 },
    scanFrame: { position: 'absolute', top: '28%', left: '14%', right: '14%', aspectRatio: 1 },
    corner: { position: 'absolute', width: 34, height: 34, borderColor: '#fff' },
});

export const tagStyle = (kind: 'ok' | 'new' | 'info' | 'bad') => {
    const map: any = {
        ok: [C.okSoft, C.ok], new: [C.saffronSoft, C.saffron], info: [C.indigoSoft, C.indigo], bad: [C.badSoft, C.bad],
    };
    return { box: { backgroundColor: map[kind][0] }, text: { color: map[kind][1] } };
};
