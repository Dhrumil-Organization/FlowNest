import { StyleSheet } from 'react-native';

export const C = {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surface2: '#F1F5F9',
    ink: '#0F172A',
    ink2: '#64748B',
    line: '#E2E8F0',
    indigo: '#0E7490',
    primary: '#0E7490',
    indigoSoft: '#E6F7FA',
    saffron: '#0F766E',
    saffronSoft: '#E6F7FA',
    ok: '#23704F',
    okSoft: '#E0F0E7',
    bad: '#B3261E',
    badSoft: '#FBE6E4',
    dotUsed: '#CBD5E1',
};

export const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.surface },
    header: { backgroundColor: C.primary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
    headerMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line },
    headerChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, borderRadius: 7, paddingHorizontal: 9, height: 32, gap: 4 },
    headerChipActive: { borderColor: C.primary, backgroundColor: C.indigoSoft },
    headerChipText: { color: C.ink2, fontSize: 13, fontWeight: '500' },
    headerChipTextActive: { color: C.primary, fontWeight: '700' },
    headerNote: { color: C.ink2, fontSize: 12 },

    body: { padding: 16, paddingBottom: 110 },
    bodyWeb: { width: '100%', maxWidth: 1440, alignSelf: 'center' },
    bodyMobile: { paddingHorizontal: 12, paddingTop: 12 },

    seg: { flexDirection: 'row', backgroundColor: C.surface2, borderWidth: 1, borderColor: C.line, borderRadius: 9, padding: 3, marginBottom: 12 },
    segBtn: { flex: 1, height: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    segBtnOn: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
    segText: { color: C.ink2, fontWeight: '500' },
    segTextOn: { color: C.ink },

    label: { fontSize: 12, color: C.ink2, marginBottom: 4 },
    input: { height: 42, borderWidth: 1, borderColor: C.line, borderRadius: 8, paddingHorizontal: 10, color: C.ink, backgroundColor: C.surface, fontSize: 15 },
    select: { height: 42, borderWidth: 1, borderColor: C.line, borderRadius: 8, paddingHorizontal: 10, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    selectText: { color: C.ink, fontSize: 14, flex: 1 },
    selectPlaceholder: { color: C.ink2, fontSize: 14, flex: 1 },
    disabled: { backgroundColor: C.surface2 },
    row2: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    row2Mobile: { flexDirection: 'column', gap: 8 },
    col: { flex: 1 },
    hint: { fontSize: 12, color: C.ink2, marginTop: 6 },

    btn: { height: 42, borderRadius: 8, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: C.surface, flexDirection: 'row', gap: 6 },
    btnText: { color: C.ink, fontWeight: '500' },
    btnPrimary: { backgroundColor: C.indigo, borderColor: C.indigo },
    btnPrimaryText: { color: '#fff', fontWeight: '600' },
    btnDanger: { borderColor: C.bad },
    btnDangerText: { color: C.bad, fontWeight: '500' },
    btnSm: { height: 30, paddingHorizontal: 10 },
    btnSmText: { fontSize: 12 },

    card: { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, marginBottom: 14, backgroundColor: C.surface },
    cartNo: { fontSize: 18, fontWeight: '600', color: C.ink },
    sub: { fontSize: 12, color: C.ink2, marginTop: 2 },
    dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginVertical: 10 },
    dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 4 },
    balRow: { flexDirection: 'row', gap: 8 },
    balBox: { flex: 1, backgroundColor: C.surface2, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10 },
    balLabel: { fontSize: 11, color: C.ink2 },
    balValue: { fontSize: 20, fontWeight: '600', color: C.ink },
    legend: { flexDirection: 'row', gap: 12, marginTop: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 9, height: 9, borderRadius: 5 },
    legendText: { fontSize: 11, color: C.ink2 },

    secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, marginBottom: 8 },
    secTitle: { fontSize: 13, fontWeight: '600', color: C.ink },
    secSub: { fontSize: 12, color: C.ink2 },

    line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: C.line, borderRadius: 9, padding: 10, marginBottom: 6, backgroundColor: C.surface },
    lineTitle: { fontWeight: '500', color: C.ink },
    lineSub: { fontSize: 12, color: C.ink2, marginTop: 1 },
    lockText: { fontSize: 11, color: C.bad, marginTop: 2 },
    iconBtn: { width: 34, height: 34, borderRadius: 7, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },

    entry: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, borderRadius: 12, padding: 12, marginTop: 10 },

    tag: { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
    tagText: { fontSize: 11, fontWeight: '600' },

    msg: { borderRadius: 8, padding: 9, marginBottom: 10 },
    msgText: { fontSize: 12 },

    radio: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 10, marginBottom: 6 },
    radioOn: { borderColor: C.indigo, backgroundColor: C.indigoSoft },

    empty: { alignItems: 'center', padding: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: C.line, borderRadius: 12, marginTop: 16 },
    emptyTitle: { fontSize: 15, fontWeight: '600', color: C.ink, marginBottom: 4 },
    emptyText: { fontSize: 13, color: C.ink2, textAlign: 'center' },

    listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.line },

    issCard: { borderWidth: 1, borderColor: C.line, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
    issHead: { backgroundColor: C.surface2, padding: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    issTitle: { fontSize: 15, fontWeight: '600', color: C.ink },
    grpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 4 },
    grpText: { fontSize: 12, color: C.ink2, flexShrink: 1 },

    tabs: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surface },
    tab: { flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 10 },
    tabText: { fontSize: 12, color: C.ink2, marginTop: 2 },
    tabTextOn: { color: C.indigo, fontWeight: '600' },

    modalWrap: { flex: 1, backgroundColor: 'rgba(10,18,28,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: C.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '90%' },
    sheetTitle: { fontSize: 16, fontWeight: '600', color: C.ink },

    camera: { flex: 1 },
    scanFrame: { position: 'absolute', top: '30%', left: '15%', right: '15%', aspectRatio: 1, borderWidth: 2, borderColor: '#fff', borderRadius: 16 },
});

export const tagStyle = (kind: 'ok' | 'new' | 'info' | 'bad') => {
    const map: any = {
        ok: [C.okSoft, C.ok], new: [C.saffronSoft, C.saffron], info: [C.indigoSoft, C.indigo], bad: [C.badSoft, C.bad],
    };
    return { box: { backgroundColor: map[kind][0] }, text: { color: map[kind][1] } };
};
