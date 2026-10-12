// ═══════════════════════════════════════════════════════════════
// FILE: screens/designs/DesignsScreen.tsx
// ✅ MERGED VERSION
//    Base UI/structure = original DesignsScreen (Doc 1)
//    Client            = new lightweight client (common/API/client.ts)
//    Save logic        = validated + verified save from Doc 3
//    Navigation        = Doc 3's catalogRefreshKey / handleDesignSaved
//      so that after a successful save the user is taken back to
//      Catalog and the list is force-refreshed.
// ═══════════════════════════════════════════════════════════════
import { useFocusEffect } from '@react-navigation/native';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { useHeaderExtrasStore } from '../../core/layout/headerExtras';
import { usePermission } from '../../core/permissions';
import { T } from '../../theme';
// ✅ CHANGED: import from the new lightweight client instead of legacyClient
// import client, { DesignAPI, ItemAPI, type Design, type GetItem, type YarnMaster } from '../../../common/API/client';
import { Ionicons } from '@expo/vector-icons';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import AppAlert from '@/common/utils/appAlert';
import AsyncStorage from '@/common/utils/compatibleStorage';
import client, { DesignAPI, ItemAPI, type Design, type GetItem, type YarnMaster } from '../../../common/API/client_fix_design';
import DyeingMasterTab, { apiErrorText, type DyeingMasterApi } from './DyeingMasterTab';

const SHORT = (c: string) =>
    c === 'Linen Shirting' ? 'Shirting' : c === 'Linen Suiting' ? 'Suiting' : c;
const r0 = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// ERP design code (DAPDesign DsnCode) shown with the design name everywhere.
const dsnCodeOf = (d: any): string => {
    const v = String(d?.dsn_code ?? '').trim();
    return v && v !== '0' && v.toLowerCase() !== 'null' ? v : '';
};
/** "RIB STOP 145 · 1234" — design name with its ERP code (name only if not synced yet). */
const designLabel = (d: any): string => {
    const name = String(d?.code ?? '').trim();
    const code = dsnCodeOf(d);
    return code ? `${name} · ${code}` : name;
};
const f1 = (n: number) => n > 0 ? n.toFixed(1) : '—';

const DESIGN_TABS = [
    // { key: 'Monthly Sales Target', label: 'Monthly Sales Target', resource: 'designs.monthlysalestarget' },
    { key: 'Aliases', label: 'Aliases', resource: 'designs.aliases' },
    { key: 'Catalog', label: 'Catalog', resource: 'designs.catalog' },
    { key: 'Design', label: 'Design', resource: 'designs.design' },
    { key: 'Colourway', label: 'Colourway', resource: 'designs.colourway' },
    { key: 'Yarns', label: 'Yarns', resource: 'designs.yarns' },
    { key: 'Dyeing', label: 'Dyeing', resource: 'designs.dyeing' },
] as const;

type DesignTabDefinition = typeof DESIGN_TABS[number];
type Tab = DesignTabDefinition['key'];

const getCurrentFinancialYear = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const financialYear = currentMonth >= 4 ? currentYear + 1 : currentYear;
    return financialYear.toString().substring(2);
};

const DEFAULT_PRPCODE = 'SIP';
const DEFAULT_PRPTYPE = 'S';
const DEFAULT_STRCODE = '002';
const DEFAULT_YEARNO = getCurrentFinancialYear();

type ERPContextValue = { prpcode: string; strcode: string; yearno: string };

const DEFAULT_ERP_CONTEXT: ERPContextValue = {
    prpcode: DEFAULT_PRPCODE,
    strcode: DEFAULT_STRCODE,
    yearno: DEFAULT_YEARNO,
};

const ERPContext = createContext<ERPContextValue>(DEFAULT_ERP_CONTEXT);

function useERP(): ERPContextValue {
    return useContext(ERPContext);
}

type DesignOptionShade = { color_name: string; hex: string; shade_no?: string };
type DesignOptions = { shades: DesignOptionShade[]; blend_options: string[] };

// ═══════════════════════════════════════════════════════════════
// SHARED FABRIC MATH — mirrors app/Services/CostingEngine.php
// ═══════════════════════════════════════════════════════════════

// Ply of a yarn line. Missing / 0 / invalid → 1 (single), so old data behaves as before.
const PLY = (y: any): number => {
    const p = Number(y?.ply ?? y?.w_ply);
    return Number.isFinite(p) && p >= 1 ? p : 1;
};

// grams of yarn per metre of yarn — matches TextileYarnService::gramsPerMetre()
// Backend (TextileYarnService::resolve) sends:
//   Ne / Lea : cnt = SINGLE-yarn count (WCount), ply separate → weight × ply
//              e.g. 20/2 Ne → 2 × 0.5905/20
//   Den / Dtx: cnt = TOTAL denier/dtex already incl. ply (WDenier, or WCount×WPly)
//              → ply must NOT be applied again.
const GPM = (sys: string, cnt: number, ply: number = 1): number => {
    if (!cnt || cnt <= 0) return 0;
    const p = ply >= 1 ? ply : 1;
    switch (sys) {
        case 'Lea': return (1.6535 / cnt) * p;        // Linen  (single count × ply)
        case 'Ne': return (0.5905 / cnt) * p;         // Cotton / blends (single count × ply)
        case 'Den': return cnt / 9000;                // Filament — total denier
        case 'Dtx': return (cnt * 0.9) / 9000;        // Dtex — total dtex
        default: return 0;
    }
};

export type FabricSpec = ReturnType<typeof calcSpec>;

function calcSpec(d: any) {
    // Client Claude reference: four independent engineering inputs.
    // Reed Space       = on-loom width.
    // Greige Width     = off-loom width entered/stored independently.
    // Warp Shrink      = warp length take-up, not a width formula.
    // Finish Shrink    = greige -> finished length shrink.
    const reed = Number(d.reed_space) || 0;
    const warpTakeUp = 1 + ((Number(d.warp_shrink) || 0) / 100);
    const gf = (Number(d.gf_shrink) || 0) / 100;

    const enteredGreigeWidth = Number(d.greige_width) || 0;
    const greigeWidthMissing = !(enteredGreigeWidth > 0);
    // Strong rule: Greige Width is an independent REQUIRED measurement.
    // Never substitute Reed Space or a derived value into live calculations.
    const widthGreige = enteredGreigeWidth > 0 ? enteredGreigeWidth : 0;
    const widthContraction =
        enteredGreigeWidth > 0 && reed > 0
            ? reed / enteredGreigeWidth
            : 0;

    const warpYarns: any[] = d.warp_yarns ?? [];
    const weftYarns: any[] = d.weft_yarns ?? [];

    const epiLoom = warpYarns.reduce(
        (total, yarn) => total + (Number(yarn.epi) || 0),
        0
    );
    const ppiLoom = weftYarns.reduce(
        (total, yarn) => total + (Number(yarn.ppi) || 0),
        0
    );

    // Body ends only. Selvedge remains cost-only in the current RN design model.
    const totalEnds = Math.round(epiLoom * reed);

    const epiGreige = epiLoom * widthContraction;
    const ppiTable = ppiLoom > 0 ? ppiLoom + 2 : 0;
    const ppiFactor = ppiLoom > 0 ? ppiTable / ppiLoom : 1;

    // Claude physical fabric-weight formula:
    // warp = effective greige EPI × yarn g/m × warp take-up
    // weft = effective greige PPI × yarn g/m
    const IN_PER_M = 39.3701;
    const M_PER_IN = 0.0254;

    let warpGSM = 0;
    warpYarns.forEach((yarn) => {
        const effectiveEpi =
            (Number(yarn.epi) || 0) * widthContraction;
        warpGSM +=
            effectiveEpi *
            IN_PER_M *
            GPM(yarn.sys, Number(yarn.cnt), PLY(yarn)) *
            warpTakeUp;
    });

    let weftGSM = 0;
    weftYarns.forEach((yarn) => {
        const effectivePpi =
            (Number(yarn.ppi) || 0) * ppiFactor;
        weftGSM +=
            effectivePpi *
            IN_PER_M *
            GPM(yarn.sys, Number(yarn.cnt), PLY(yarn));
    });

    const greigGSM = !greigeWidthMissing ? (warpGSM + weftGSM) : 0;
    const greigGLM =
        !greigeWidthMissing && widthGreige > 0
            ? greigGSM * (widthGreige * M_PER_IN)
            : 0;

    const finWidthEntered = (Number(d.fin_width) || 0) > 0;
    const finWidthIn = finWidthEntered ? Number(d.fin_width) : 0;
    const hasFinished =
        !greigeWidthMissing &&
        finWidthEntered &&
        gf >= 0 &&
        gf < 1;

    const finGLM =
        hasFinished
            ? greigGLM / (1 - gf)
            : 0;
    const finGSM =
        hasFinished && finWidthIn > 0
            ? finGLM / (finWidthIn * M_PER_IN)
            : 0;

    const epiFinished =
        hasFinished && finWidthIn > 0
            ? totalEnds / finWidthIn
            : 0;
    const ppiFinished =
        hasFinished
            ? ppiTable / (1 - gf)
            : 0;

    // ── ERP-authoritative fibre identity ──────────────────────
    const normalizeFibreName = (value: string): string => {
        const raw = String(value || '').trim();
        const name = raw.toLowerCase();

        if (!name) return 'Other';
        if (name.includes('elastomultiester')) return 'Elastomultiester';
        if (name.includes('linen') || name.includes('flax')) return 'Linen';
        if (name.includes('cotton')) return 'Cotton';
        if (name.includes('polyester') || name === 'poly' || name === 'pes') return 'Polyester';
        if (name.includes('viscose') || name.includes('rayon')) return 'Viscose';
        if (name.includes('modal')) return 'Modal';
        if (name.includes('lyocell') || name.includes('tencel')) return 'Lyocell';
        if (name.includes('bamboo')) return 'Bamboo';
        if (name.includes('wool')) return 'Wool';
        if (name.includes('silk')) return 'Silk';
        if (name.includes('nylon') || name.includes('polyamide')) return 'Nylon';
        if (name.includes('acrylic')) return 'Acrylic';
        if (name.includes('elastane') || name.includes('spandex') || name.includes('lycra')) return 'Elastane';

        return raw || 'Other';
    };

    const resolveYarnFibreShares = (
        yarn: any
    ): { fibre: string; share: number }[] => {
        const rawComposition = Array.isArray(yarn?.fibre_composition)
            ? yarn.fibre_composition
            : [];

        const composition = rawComposition
            .map((component: any) => ({
                fibre: normalizeFibreName(component?.name),
                percent: Number(component?.percent),
            }))
            .filter((component: any) =>
                component.fibre !== 'Other' &&
                Number.isFinite(component.percent) &&
                component.percent > 0
            );

        if (composition.length > 0) {
            const total = composition.reduce(
                (sum: number, component: any) => sum + component.percent,
                0
            );

            if (total > 0) {
                return composition.map((component: any) => ({
                    fibre: component.fibre,
                    share: component.percent / total,
                }));
            }
        }

        const authoritativeFibre = String(yarn?.fibre || '').trim();
        if (authoritativeFibre && !authoritativeFibre.includes('/')) {
            const fibre = normalizeFibreName(authoritativeFibre);
            if (fibre !== 'Other') {
                return [{ fibre, share: 1 }];
            }
        }

        // Never infer fibre from Denier/Ne/Lea or yarn name.
        return [{ fibre: 'Other', share: 1 }];
    };

    const calculateBlend = (
        warpMultiplier: number,
        weftMultiplier: number
    ) => {
        const totals: Record<string, number> = {};

        const add = (yarn: any, mass: number) => {
            if (!(mass > 0)) return;

            resolveYarnFibreShares(yarn).forEach(({ fibre, share }) => {
                if (!(share > 0)) return;
                totals[fibre] = (totals[fibre] ?? 0) + (mass * share);
            });
        };

        warpYarns.forEach((yarn) => {
            const mass =
                (Number(yarn.epi) || 0) *
                warpMultiplier *
                IN_PER_M *
                GPM(yarn.sys, Number(yarn.cnt), PLY(yarn));
            add(yarn, mass);
        });

        weftYarns.forEach((yarn) => {
            const mass =
                (Number(yarn.ppi) || 0) *
                weftMultiplier *
                IN_PER_M *
                GPM(yarn.sys, Number(yarn.cnt), PLY(yarn));
            add(yarn, mass);
        });

        const sorted = Object.fromEntries(
            Object.entries(totals).sort(([, a], [, b]) => b - a)
        ) as Record<string, number>;

        const grand = Object.values(sorted).reduce(
            (sum, value) => sum + value,
            0
        );

        return { totals: sorted, grand };
    };

    // Claude GREIGE blend:
    // warp = reed/greige width × warp take-up
    // weft = on-table PPI / loom PPI
    const blendGreige = !greigeWidthMissing
        ? calculateBlend(
            widthContraction * warpTakeUp,
            ppiFactor
        )
        : { totals: {} as Record<string, number>, grand: 0 };

    // Claude FINISHED blend:
    // warp ends are packed from reed width to finished width;
    // picks are additionally packed by finish shrink.
    const blendFinished = hasFinished
        ? calculateBlend(
            (reed / finWidthIn) * warpTakeUp,
            ppiFactor / (1 - gf)
        )
        : { totals: {} as Record<string, number>, grand: 0 };

    const naturalFibres = new Set([
        'Cotton',
        'Linen',
        'Viscose',
        'Modal',
        'Lyocell',
        'Bamboo',
        'Wool',
        'Silk',
    ]);

    const hasNaturalFibre = Object.keys(blendGreige.totals).some(
        fibre =>
            naturalFibres.has(fibre) &&
            (blendGreige.totals[fibre] ?? 0) > 0
    );

    return {
        basis: 'reed' as const,
        reed,
        widthGreige,
        greigeWidthMissing,
        widthContraction,
        warpTakeUp,
        finWidthIn,
        finWidthEntered,
        hasFinished,
        epiLoom,
        ppiLoom,
        ppiTable,
        totalEnds,
        epiGreige,
        epiFinished,
        ppiFinished,
        warpGLM: 0,
        weftGLM: 0,
        greigGLM,
        greigGSM,
        finGLM,
        finGSM,
        blendTotals: blendGreige.totals,
        blendGrand: blendGreige.grand,
        blendGreigeTotals: blendGreige.totals,
        blendGreigeGrand: blendGreige.grand,
        blendFinishedTotals: blendFinished.totals,
        blendFinishedGrand: blendFinished.grand,
        hasNaturalFibre,
    };
}

const BLEND_COLORS: Record<string, string> = {
    Linen: '#C8A96E',
    Cotton: '#A8C8A0',
    Polyester: '#A0B8C8',
    Elastomultiester: '#3F9C8F',
    Viscose: '#B8A0C8',
    Modal: '#9FC4B6',
    Lyocell: '#8FBDB0',
    Bamboo: '#AFC58A',
    Wool: '#C4B29C',
    Silk: '#D8C0A8',
    Nylon: '#9EB5CD',
    Acrylic: '#C6A3B8',
    Elastane: '#9C9C9C',
    Other: '#C8A8B0',
};

// ── TabBar ────────────────────────────────────────────────────
function TabBar({
    active,
    tabs,
    onChange,
}: {
    active: Tab | null;
    tabs: readonly DesignTabDefinition[];
    onChange: (t: Tab) => void;
}) {
    return (
        <View style={tb.bar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tb.inner}>
                {tabs.map(item => (
                    <TouchableOpacity
                        key={item.key}
                        onPress={() => onChange(item.key)}
                        style={[tb.tab, active === item.key && tb.tabActive]}
                    >
                        <Text style={[tb.label, active === item.key && tb.labelActive]}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}
const tb = StyleSheet.create({
    bar: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
    inner: { paddingHorizontal: 12 },
    tab: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: T.copper },
    label: { fontSize: 13, fontWeight: '600', color: T.muted },
    labelActive: { color: T.ink, fontWeight: '700' },
});

// ── Swatch ────────────────────────────────────────────────────
function Swatch({ design, size = 44 }: { design: Design; size?: number }) {
    const isGreige = design.type === 'PD';
    return (
        <View style={{
            width: size, height: size, borderRadius: 8, overflow: 'hidden',
            backgroundColor: isGreige ? '#D4C5A9' : '#1B2A4A',
            justifyContent: 'center', alignItems: 'center',
            borderWidth: 1, borderColor: T.border,
        }}>
            {isGreige && <Text style={{ fontSize: 8, color: '#888', fontWeight: '600' }}>GREIGE</Text>}
        </View>
    );
}

// ── TypeBadge ─────────────────────────────────────────────────
function TypeBadge({ type }: { type: 'YD' | 'PD' }) {
    const isYD = type === 'YD';
    return (
        <View style={{ backgroundColor: isYD ? T.yd + '20' : T.pd + '20', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: isYD ? T.yd : T.pd }}>{type}</Text>
        </View>
    );
}

// ── DsnCodeBadge: ERP design code next to the design name ──────
function DsnCodeBadge({ design }: { design: any }) {
    const code = dsnCodeOf(design);
    if (!code) return null;
    return (
        <View style={{ borderWidth: 1, borderColor: T.border, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: T.muted }}>Code {code}</Text>
        </View>
    );
}

// ── enrich ────────────────────────────────────────────────────
function enrich(d: Design): Design & { epi_total: number; ppi_total: number } {
    const epi = d.epi_total ?? (d.warp_yarns ?? []).reduce((s: number, y: any) => s + (Number(y.epi) || 0), 0);
    const ppi = d.ppi_total ?? (d.weft_yarns ?? []).reduce((s: number, y: any) => s + (Number(y.ppi) || 0), 0);
    return { ...d, epi_total: epi, ppi_total: ppi };
}

// ═══════════════════════════════════════════════════════════════
// LIVE SPEC PANEL
// ═══════════════════════════════════════════════════════════════
function LiveSpecPanel({ design }: { design: any }) {
    const [showFormula, setShowFormula] = useState(false);
    const spec = useMemo(() => calcSpec(design), [design]);

    const hasConstruction = spec.epiLoom > 0 && spec.reed > 0;
    const hasWeight = spec.greigGLM > 0;
    if (!hasConstruction && !hasWeight) return null;

    return (
        <View style={ls.wrap}>
            <Text style={ls.title}>LIVE FABRIC SPECIFICATION</Text>

            {/* ── dark reed / total ends card ── */}
            <View style={ls.darkCard}>
                <View style={{ flex: 1 }}>
                    <Text style={ls.darkLabel}>
                        {spec.basis === 'greige' ? 'GREIGE WIDTH · BASIS' : 'REED SPACE · BASIS'}
                    </Text>
                    <Text style={ls.darkVal}>
                        {spec.basis === 'greige' ? `${f1(spec.widthGreige)}"` : `${spec.reed}"`}
                    </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={ls.darkLabel}>TOTAL ENDS</Text>
                    <Text style={ls.darkVal}>
                        {spec.totalEnds > 0 ? Math.round(spec.totalEnds).toLocaleString('en-IN') : '—'}
                    </Text>
                </View>
            </View>

            <Text style={ls.loomLine}>
                ↑EPI {f1(spec.epiLoom)} × ↑PPI {f1(spec.ppiLoom)}  (on loom)
            </Text>

            {spec.greigeWidthMissing && (
                <Text style={{ fontSize: 10, color: T.red, fontWeight: '700', marginBottom: 6 }}>
                    Greige width is required — enter the actual off-loom measurement. Greige/finished weight and fibre calculations are held until entered.
                </Text>
            )}

            {/* ── construction table LOOM / GREIGE / FINISHED ── */}
            <View style={ls.table}>
                <View style={[ls.tr, ls.trHead]}>
                    {['CONSTRUCTION', 'LOOM', 'GREIGE', 'FINISHED'].map((h, i) => (
                        <Text key={i} style={[ls.td, ls.tdHead, i === 0 && ls.tdLabel]}>{h}</Text>
                    ))}
                </View>
                <View style={ls.tr}>
                    <Text style={[ls.td, ls.tdLabel]}>EPI</Text>
                    <Text style={ls.td}>{f1(spec.epiLoom)}</Text>
                    <Text style={[ls.td, ls.tdGreige]}>{f1(spec.epiGreige)}</Text>
                    <Text style={[ls.td, ls.tdFin]}>{f1(spec.epiFinished)}</Text>
                </View>
                <View style={ls.tr}>
                    <Text style={[ls.td, ls.tdLabel]}>PPI</Text>
                    <Text style={ls.td}>{f1(spec.ppiLoom)}</Text>
                    <Text style={[ls.td, ls.tdGreige]}>{f1(spec.ppiTable)}</Text>
                    <Text style={[ls.td, ls.tdFin]}>{f1(spec.ppiFinished)}</Text>
                </View>
                <View style={ls.tr}>
                    <Text style={[ls.td, ls.tdLabel]}>Width"</Text>
                    <Text style={ls.td}>{f1(spec.reed)}</Text>
                    <Text style={[ls.td, ls.tdGreige]}>{f1(spec.widthGreige)}</Text>
                    <Text style={[ls.td, ls.tdFin]}>{f1(spec.finWidthIn)}</Text>
                </View>
            </View>

            {/* ── GSM / GLM grid ── */}
            {hasWeight && (
                <>
                    <Text style={ls.weightHeading}>FABRIC WEIGHT · LIVE</Text>
                    <View style={ls.gsmGrid}>
                        <View style={ls.gsmBox}>
                            <Text style={ls.gsmLabel}>Greige GSM</Text>
                            <Text style={ls.gsmVal}>{Math.round(spec.greigGSM)}</Text>
                        </View>
                        <View style={ls.gsmBox}>
                            <Text style={ls.gsmLabel}>Greige GLM</Text>
                            <Text style={ls.gsmVal}>{spec.greigGLM.toFixed(1)} g/m</Text>
                        </View>
                        <View style={[ls.gsmBox, ls.gsmBoxBorder]}>
                            <Text style={ls.gsmLabel}>Finished GSM</Text>
                            <Text style={ls.gsmVal}>{Math.round(spec.finGSM)}</Text>
                            {spec.finWidthEntered && <Text style={ls.gsmNote}>{spec.finWidthIn}" fin</Text>}
                        </View>
                        <View style={[ls.gsmBox, ls.gsmBoxBorder]}>
                            <Text style={ls.gsmLabel}>Finished GLM</Text>
                            <Text style={ls.gsmVal}>{spec.finGLM.toFixed(1)} g/m</Text>
                        </View>
                    </View>
                </>
            )}

            {/* ── fibre blend: greige + finished ── */}
            {spec.blendGreigeGrand > 0 && (
                <View style={{ marginTop: 14 }}>
                    <Text style={ls.sec}>FIBRE BLEND · GREIGE</Text>
                    <View style={ls.blendBar}>
                        {Object.entries(spec.blendGreigeTotals).map(([k, v]) => (
                            <View
                                key={k}
                                style={{
                                    flex: v / spec.blendGreigeGrand,
                                    backgroundColor: BLEND_COLORS[k] ?? '#888',
                                }}
                            />
                        ))}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                        {Object.entries(spec.blendGreigeTotals).map(([k, v]) => (
                            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: BLEND_COLORS[k] ?? '#888' }} />
                                <Text style={ls.blendLegendName}>{k}</Text>
                                <Text style={ls.blendLegendPct}>
                                    {(v / spec.blendGreigeGrand * 100).toFixed(1)}%
                                </Text>
                            </View>
                        ))}
                    </View>

                    {spec.blendFinishedGrand > 0 && (
                        <View style={{ marginTop: 10 }}>
                            <Text style={ls.sec}>FIBRE BLEND · FINISHED</Text>
                            <View style={ls.blendBar}>
                                {Object.entries(spec.blendFinishedTotals).map(([k, v]) => (
                                    <View
                                        key={k}
                                        style={{
                                            flex: v / spec.blendFinishedGrand,
                                            backgroundColor: BLEND_COLORS[k] ?? '#888',
                                        }}
                                    />
                                ))}
                            </View>
                            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                                {Object.entries(spec.blendFinishedTotals).map(([k, v]) => {
                                    const finishedPct = v / spec.blendFinishedGrand * 100;
                                    const greigeMass = spec.blendGreigeTotals[k] ?? 0;
                                    const greigePct = spec.blendGreigeGrand > 0
                                        ? greigeMass / spec.blendGreigeGrand * 100
                                        : 0;
                                    const delta = finishedPct - greigePct;

                                    return (
                                        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: BLEND_COLORS[k] ?? '#888' }} />
                                            <Text style={ls.blendLegendName}>{k}</Text>
                                            <Text style={ls.blendLegendPct}>
                                                {finishedPct.toFixed(1)}%
                                            </Text>
                                            {Math.abs(delta) >= 0.1 && (
                                                <Text style={{ fontSize: 10, fontWeight: '700', color: delta > 0 ? T.green : T.red }}>
                                                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                                                </Text>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}
                </View>
            )}

            {/* ── formula basis (expandable) ── */}
            <TouchableOpacity style={{ marginTop: 12 }} onPress={() => setShowFormula(v => !v)}>
                <Text style={{ fontSize: 12, color: T.copper, fontWeight: '600' }}>
                    {showFormula ? '▾' : '▸'} Formula basis
                </Text>
            </TouchableOpacity>
            {showFormula && (
                <View style={ls.formulaBox}>
                    <Text style={ls.formulaTxt}>
                        Reed Space and Greige Width are independent widths. Greige Width must be entered as the actual off-loom measurement and is never derived from Warp Shrink. Warp Shrink is length take-up:
                        warp mass × (1 + warp shrink), not a greige-width formula. Greige EPI = Loom EPI × Reed / Greige Width;
                        Greige PPI = Loom PPI + 2. Greige GSM is calculated from effective warp/weft yarn mass and Greige GLM
                        = Greige GSM × Greige Width(m). Finished GLM = Greige GLM ÷ (1 − Finish Shrink);
                        Finished EPI = body ends ÷ Finished Width and Finished PPI = Greige PPI ÷ (1 − Finish Shrink).
                        Yarn g/m: Ne / Lea use single count × ply (20/2 Ne = 2 × 0.5905 ÷ 20); Denier / Dtex already include ply.
                    </Text>
                </View>
            )}

            {/* ── natural fibre / Rapier warning ── */}
            {spec.hasNaturalFibre && (
                <View style={ls.warnBox}>
                    <Text style={ls.warnTxt}>
                        ⚠️ Contains natural fibre — this design is restricted to{' '}
                        <Text style={{ fontWeight: '800', color: T.copper }}>Rapier</Text> looms;
                        water-jet gating is blocked automatically.
                    </Text>
                </View>
            )}
        </View>
    );
}
const ls = StyleSheet.create({
    wrap: { marginTop: 24, backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14 },
    title: { fontSize: 10, fontWeight: '800', color: T.ink, letterSpacing: 0.8, marginBottom: 10 },
    darkCard: { flexDirection: 'row', backgroundColor: T.nav, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
    darkLabel: { fontSize: 9, color: '#ffffffAA', fontWeight: '600', letterSpacing: 0.4 },
    darkVal: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 2 },
    loomLine: { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.3, marginBottom: 6 },
    table: { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: T.border },
    tr: { flexDirection: 'row', backgroundColor: T.surface },
    trHead: { backgroundColor: T.sub },
    td: { flex: 1, fontSize: 11, color: T.ink, paddingVertical: 6, paddingHorizontal: 8, textAlign: 'right' },
    tdHead: { fontSize: 9, fontWeight: '700', color: T.muted },
    tdLabel: { textAlign: 'left', fontWeight: '600', flex: 1.2 },
    tdGreige: { fontWeight: '700', color: T.ink },
    tdFin: { fontWeight: '700', color: T.copper },
    weightHeading: { fontSize: 9, fontWeight: '800', color: T.muted, letterSpacing: 0.6, marginTop: 12, marginBottom: -2 },
    gsmGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, borderWidth: 1, borderColor: T.border, borderRadius: 8, overflow: 'hidden' },
    gsmBox: { width: '50%', backgroundColor: T.sub, padding: 10 },
    gsmBoxBorder: { borderTopWidth: 1, borderTopColor: T.border },
    gsmLabel: { fontSize: 9, color: T.muted, fontWeight: '600', letterSpacing: 0.3 },
    gsmVal: { fontSize: 16, fontWeight: '800', color: T.ink, marginTop: 2 },
    gsmNote: { fontSize: 9, color: T.muted },
    sec: { fontSize: 9, fontWeight: '800', color: T.ink, letterSpacing: 0.6, marginBottom: 4 },
    blendHint: { fontSize: 10, color: T.muted, marginBottom: 7, lineHeight: 14 },
    blendLegendName: { fontSize: 10, color: T.muted },
    blendLegendPct: { fontSize: 10, fontWeight: '800', color: T.ink },
    blendBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
    formulaBox: { backgroundColor: T.sub, borderRadius: 8, padding: 10, marginTop: 6 },
    formulaTxt: { fontSize: 10, color: T.muted, lineHeight: 15 },
    warnBox: { backgroundColor: '#FBF3E3', borderRadius: 8, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#EAD9B0' },
    warnTxt: { fontSize: 11, color: '#7A5C1E', lineHeight: 16 },
});

// ═══════════════════════════════════════════════════════════════
// SHARED: Server Search Yarn Picker Modal
// ═══════════════════════════════════════════════════════════════
type MainYarnHelpRow = {
    row_type?: 'main';
    selectable?: boolean;
    mi_id: string;
    itm_code: null;
    m_itm_code: string;
    main_yarn_code: string;
    name: string;
    prp_code: string;
    str_code: string;
    variant_count: number;
    available_blends: string[];
    is_blended_family: boolean;
    requires_sub_item: boolean;
    direct_item: YarnItemHelpRow | null;
};

type YarnItemHelpRow = YarnMaster & {
    row_type?: 'item';
    selectable?: boolean;
    itm_code: string;
    m_itm_code: string;
    main_yarn_code: string;
    is_main_yarn_item?: boolean;
    blend_ratio?: string;
    w_blend_per?: string;
};

function YarnPickerModal({ visible, title = 'Select yarn', onSelect, onClose }: {
    visible: boolean;
    title?: string;
    onSelect: (y: YarnMaster) => void;
    onClose: () => void;
}) {
    const { prpcode, strcode, yearno } = useERP();

    const [stage, setStage] = useState<'main' | 'items'>('main');
    const [mainSearch, setMainSearch] = useState('');
    const [itemSearch, setItemSearch] = useState('');
    const [mainYarns, setMainYarns] = useState<MainYarnHelpRow[]>([]);
    const [itemYarns, setItemYarns] = useState<YarnItemHelpRow[]>([]);
    const [selectedMain, setSelectedMain] = useState<MainYarnHelpRow | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorText, setErrorText] = useState('');
    const requestSequence = useRef(0);

    const resetPicker = useCallback(() => {
        requestSequence.current += 1;
        setStage('main');
        setMainSearch('');
        setItemSearch('');
        setMainYarns([]);
        setItemYarns([]);
        setSelectedMain(null);
        setLoading(false);
        setErrorText('');
    }, []);

    const closePicker = useCallback(() => {
        resetPicker();
        onClose();
    }, [onClose, resetPicker]);

    const goBackToMain = useCallback(() => {
        requestSequence.current += 1;
        setStage('main');
        setItemSearch('');
        setItemYarns([]);
        setSelectedMain(null);
        setErrorText('');
        /*
         * mainSearch and mainYarns are intentionally preserved so the user
         * returns to the exact Main Yarn result list they were viewing.
         */
    }, []);

    const loadMainYarns = useCallback(async (queryText = '') => {
        if (!visible || stage !== 'main') return;

        const requestId = ++requestSequence.current;
        setLoading(true);
        setErrorText('');

        try {
            const response = await (DesignAPI.yarns as any)({
                mode: 'main',
                yearno,
                prpcode,
                strcode,
                limit: 100,
                search: queryText.trim() || undefined,
            });

            if (requestId !== requestSequence.current) return;

            if (response?.data?.success !== true) {
                throw new Error(
                    response?.data?.message || 'Unable to load Main Yarn help.'
                );
            }

            setMainYarns(
                Array.isArray(response?.data?.data)
                    ? response.data.data
                    : []
            );
        } catch (error: any) {
            if (requestId !== requestSequence.current) return;

            console.log('MAIN YARN HELP ERROR', {
                message: error?.message,
                status: error?.response?.status,
                data: error?.response?.data,
                url: error?.config?.url,
                params: error?.config?.params,
            });

            setMainYarns([]);
            setErrorText(String(
                error?.response?.data?.message ||
                error?.message ||
                'Unable to load Main Yarn help.'
            ));
        } finally {
            if (requestId === requestSequence.current) {
                setLoading(false);
            }
        }
    }, [prpcode, stage, strcode, visible, yearno]);

    const loadItemYarns = useCallback(async (
        mainRow: MainYarnHelpRow,
        queryText = ''
    ) => {
        if (!visible) return;

        const requestId = ++requestSequence.current;
        setLoading(true);
        setErrorText('');

        try {
            const response = await (DesignAPI.yarns as any)({
                mode: 'items',
                yearno,
                prpcode,
                strcode,
                main_yarn_code: mainRow.main_yarn_code,
                limit: 250,
                search: queryText.trim() || undefined,
            });

            if (requestId !== requestSequence.current) return;

            if (response?.data?.success !== true) {
                throw new Error(
                    response?.data?.message || 'Unable to load Yarn Item help.'
                );
            }

            setItemYarns(
                Array.isArray(response?.data?.data)
                    ? response.data.data
                    : []
            );
        } catch (error: any) {
            if (requestId !== requestSequence.current) return;

            console.log('YARN ITEM HELP ERROR', {
                main_yarn_code: mainRow.main_yarn_code,
                message: error?.message,
                status: error?.response?.status,
                data: error?.response?.data,
                url: error?.config?.url,
                params: error?.config?.params,
            });

            setItemYarns([]);
            setErrorText(String(
                error?.response?.data?.message ||
                error?.message ||
                'Unable to load Yarn Item help.'
            ));
        } finally {
            if (requestId === requestSequence.current) {
                setLoading(false);
            }
        }
    }, [prpcode, strcode, visible, yearno]);

    useEffect(() => {
        if (!visible) {
            resetPicker();
            return;
        }

        if (stage !== 'main') return;

        const timer = setTimeout(
            () => void loadMainYarns(mainSearch),
            mainSearch.trim() ? 350 : 0
        );

        return () => clearTimeout(timer);
    }, [loadMainYarns, mainSearch, resetPicker, stage, visible]);

    useEffect(() => {
        if (!visible || stage !== 'items' || !selectedMain) return;

        const timer = setTimeout(
            () => void loadItemYarns(selectedMain, itemSearch),
            itemSearch.trim() ? 350 : 0
        );

        return () => clearTimeout(timer);
    }, [itemSearch, loadItemYarns, selectedMain, stage, visible]);

    const openItemHelp = useCallback((mainRow: MainYarnHelpRow) => {
        setSelectedMain(mainRow);
        setStage('items');
        setItemSearch('');
        setItemYarns([]);
        setErrorText('');
    }, []);

    const chooseItem = useCallback((item: YarnItemHelpRow) => {
        const actualItemCode = String(item.itm_code || item.mi_id || '').trim();

        if (!actualItemCode) {
            AppAlert.alert(
                'Invalid Yarn Item',
                'The selected row does not contain an actual ItmCode.'
            );
            return;
        }

        onSelect({
            ...item,
            mi_id: actualItemCode,
            itm_code: actualItemCode,
            m_itm_code: String(
                item.m_itm_code || item.main_yarn_code || ''
            ),
            main_yarn_code: String(
                item.main_yarn_code || item.m_itm_code || ''
            ),
            blend_ratio: item.blend_ratio || null,
        } as YarnMaster);

        closePicker();
    }, [closePicker, onSelect]);

    /**
     * Phase 2 decision:
     * - ordinary Main Yarn selects direct_item immediately;
     * - blended Main Yarn opens the child help for exact ItmCode + blend %.
     */
    const chooseMainYarn = useCallback((mainRow: MainYarnHelpRow) => {
        if (
            mainRow.requires_sub_item === true ||
            (
                mainRow.is_blended_family === true &&
                Number(mainRow.variant_count || 0) > 1
            )
        ) {
            openItemHelp(mainRow);
            return;
        }

        if (mainRow.direct_item) {
            chooseItem(mainRow.direct_item);
            return;
        }

        AppAlert.alert(
            'Yarn item unavailable',
            'This Main Yarn does not contain a directly selectable item. Please refresh the help and try again.'
        );
    }, [chooseItem, openItemHelp]);

    const childTitle = selectedMain
        ? `${selectedMain.main_yarn_code} · ${selectedMain.name}`
        : 'Select Yarn Item';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={stage === 'items' ? goBackToMain : closePicker}
        >
            <View style={yp.overlay}>
                <View style={yp.sheet}>
                    <View style={yp.handle} />

                    <View style={yp.header}>
                        {stage === 'items' ? (
                            <TouchableOpacity
                                onPress={goBackToMain}
                                style={yp.backBtn}
                            >
                                <Text style={yp.backTxt}>‹ Main Yarn</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={yp.backPlaceholder} />
                        )}

                        <Text style={yp.title} numberOfLines={1}>
                            {stage === 'main' ? title : 'Select Yarn Item'}
                        </Text>

                        <TouchableOpacity
                            /*
                             * In child help, close returns to Main Yarn Help as
                             * requested. Only Main Yarn Help closes the modal.
                             */
                            onPress={stage === 'items' ? goBackToMain : closePicker}
                            style={yp.closeBtn}
                        >
                            <Text style={yp.closeTxt}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {stage === 'items' && selectedMain ? (
                        <View style={yp.mainSelectionCard}>
                            <Text style={yp.mainSelectionLabel}>MAIN YARN</Text>
                            <Text style={yp.mainSelectionCode}>
                                {selectedMain.main_yarn_code}
                            </Text>
                            <Text style={yp.mainSelectionName} numberOfLines={2}>
                                {childTitle}
                            </Text>
                            {selectedMain.available_blends?.length > 0 ? (
                                <Text style={yp.mainSelectionBlend} numberOfLines={2}>
                                    Available blends: {selectedMain.available_blends.join(' · ')}
                                </Text>
                            ) : null}
                        </View>
                    ) : null}

                    <View style={yp.searchWrap}>
                        <TextInput
                            value={stage === 'main' ? mainSearch : itemSearch}
                            onChangeText={
                                stage === 'main'
                                    ? setMainSearch
                                    : setItemSearch
                            }
                            placeholder={
                                stage === 'main'
                                    ? 'Search Main Yarn code / name...'
                                    : 'Search Item Code / name / blend...'
                            }
                            placeholderTextColor={T.muted}
                            style={yp.search}
                            autoFocus
                            autoCorrect={false}
                            autoCapitalize="characters"
                            returnKeyType="search"
                        />
                    </View>

                    {errorText ? (
                        <View style={yp.errorBox}>
                            <Text style={yp.errorText}>{errorText}</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (stage === 'main') {
                                        void loadMainYarns(mainSearch);
                                    } else if (selectedMain) {
                                        void loadItemYarns(selectedMain, itemSearch);
                                    }
                                }}
                            >
                                <Text style={yp.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {loading && (
                        <ActivityIndicator
                            color={T.copper}
                            style={{ paddingVertical: 10 }}
                        />
                    )}

                    <View style={yp.listFrame}>
                        {stage === 'main' ? (
                            <FlatList
                                data={mainYarns}
                                keyExtractor={(row) => row.main_yarn_code}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={yp.row}
                                        activeOpacity={0.7}
                                        onPress={() => chooseMainYarn(item)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={yp.yarnName}>
                                                {item.name}
                                            </Text>
                                            <Text style={yp.yarnSub} numberOfLines={2}>
                                                {item.main_yarn_code}
                                            </Text>
                                            <View style={yp.metaRow}>
                                                <Text style={yp.metaText}>
                                                    {item.variant_count} item
                                                    {item.variant_count === 1 ? '' : 's'}
                                                </Text>
                                                {item.available_blends?.length > 0 ? (
                                                    <Text
                                                        style={yp.blendPreview}
                                                        numberOfLines={1}
                                                    >
                                                        {item.available_blends.join(' · ')}
                                                    </Text>
                                                ) : null}
                                            </View>
                                        </View>
                                        {item.requires_sub_item ? (
                                            <Text style={yp.chevron}>›</Text>
                                        ) : (
                                            <Text style={yp.directSelectText}>Select</Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                                ItemSeparatorComponent={() => (
                                    <View
                                        style={{
                                            height: 1,
                                            backgroundColor: T.border,
                                            marginLeft: 16,
                                        }}
                                    />
                                )}
                                ListEmptyComponent={!loading ? (
                                    <Text style={yp.emptyText}>
                                        {mainSearch.trim()
                                            ? 'No Main Yarn found.'
                                            : 'No Main Yarn is available.'}
                                    </Text>
                                ) : null}
                                contentContainerStyle={{ paddingBottom: 40 }}
                            />
                        ) : (
                            <FlatList
                                data={itemYarns}
                                keyExtractor={(row, index) =>
                                    `${row.main_yarn_code || selectedMain?.main_yarn_code}:${row.itm_code || row.mi_id}:${index}`
                                }
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={yp.row}
                                        activeOpacity={0.7}
                                        onPress={() => chooseItem(item)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <View style={yp.itemCodeRow}>
                                                <Text style={yp.yarnName}>
                                                    {item.name || item.itm_name}

                                                </Text>
                                                {item.is_main_yarn_item ? (
                                                    <View style={yp.mainBadge}>
                                                        <Text style={yp.mainBadgeText}>
                                                            MAIN
                                                        </Text>
                                                    </View>
                                                ) : null}
                                            </View>

                                            <Text style={yp.yarnSub} numberOfLines={2}>
                                                {item.itm_code || item.mi_id}
                                            </Text>

                                            <View style={yp.metaRow}>
                                                {item.blend_ratio ? (
                                                    <Text style={yp.blendChip}>
                                                        Blend {item.blend_ratio}
                                                    </Text>
                                                ) : null}

                                                <Text style={yp.metaText}>
                                                    {item.cnt || item.denier || 0}{' '}
                                                    {item.sys || ''}
                                                </Text>

                                                {Number(item.price || 0) > 0 ? (
                                                    <Text style={yp.metaText}>
                                                        ₹{Number(item.price).toFixed(2)}/kg
                                                    </Text>
                                                ) : null}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                ItemSeparatorComponent={() => (
                                    <View
                                        style={{
                                            height: 1,
                                            backgroundColor: T.border,
                                            marginLeft: 16,
                                        }}
                                    />
                                )}
                                ListEmptyComponent={!loading ? (
                                    <View style={yp.childEmptyBox}>
                                        <Text style={yp.emptyText}>
                                            No Yarn Item found under this Main Yarn.
                                        </Text>
                                        <TouchableOpacity
                                            onPress={goBackToMain}
                                            style={yp.changeMainBtn}
                                        >
                                            <Text style={yp.changeMainTxt}>
                                                Select another Main Yarn
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : null}
                                contentContainerStyle={{ paddingBottom: 40 }}
                            />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function CategoryPickerModal({ visible, onSelect, onClose, }: {
    visible: boolean;
    onSelect: (value: GetItem) => void;
    onClose: () => void;
}) {
    const { prpcode, strcode, yearno } = useERP();
    const [search, setSearch] = useState('');
    const [categories, setCategories] = useState<GetItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadCategories = useCallback(async (q = '') => {
        if (!visible) return;

        setLoading(true);

        try {
            const res = await ItemAPI.getItem({
                yearno: yearno,
                prpcode: prpcode,
                strcode: strcode,
                txntype: 'design_master',
                isall: 1,
                billdate: '',
                itmcode: '',
                ttype: [8, 3, 30, 2, 34, 83, 42],
                fetch: '',
            });

            console.log("ITEM RESPONSE =>", res.data);

            const list = res.data.response?.data || [];
            setCategories(list);
        } catch (e: any) {
            setCategories([]);
        } finally {
            setLoading(false);
        }

    }, [visible]);

    useEffect(() => {
        if (!visible) return;

        loadCategories();
    }, [visible]);

    const closePicker = () => {
        onClose();
        setSearch('');
        setCategories([]);
    };

    const filteredCategories = useMemo(() => {
        const q = search.trim().toLowerCase();

        if (!q) return categories;

        return categories.filter(item =>
            item.ItmName?.toLowerCase().includes(q) ||
            item.ItmCode?.toLowerCase().includes(q)
        );
    }, [categories, search]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={closePicker}
        >
            <View style={yp.overlay}>
                <View style={yp.sheet}>

                    <View style={yp.handle} />

                    <View style={yp.header}>
                        <Text style={yp.title}>
                            Select Category
                        </Text>

                        <TouchableOpacity
                            onPress={closePicker}
                            style={yp.closeBtn}
                        >
                            <Text style={yp.closeTxt}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={yp.searchWrap}>
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search Category..."
                            placeholderTextColor={T.muted}
                            style={yp.search}
                            autoFocus
                        />
                    </View>

                    {loading && (
                        <ActivityIndicator
                            color={T.copper}
                            style={{ paddingVertical: 10 }}
                        />
                    )}
                    <View style={yp.listFrame}>
                        <FlatList
                            data={filteredCategories}
                            keyExtractor={(item, index) =>
                                `${item.ItmCode}_${item.ItmName}_${index}`
                            }
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={yp.row}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        onSelect(item);
                                        closePicker();
                                    }}
                                >
                                    <Text style={yp.yarnName}>
                                        {item.ItmName}
                                    </Text>

                                    <Text style={yp.yarnSub}>
                                        {item.ItmCode}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            ItemSeparatorComponent={() => (
                                <View
                                    style={{
                                        height: 1,
                                        backgroundColor: T.border,
                                        marginLeft: 16,
                                    }}
                                />
                            )}
                            ListEmptyComponent={
                                !loading ? (
                                    <Text
                                        style={{
                                            padding: 16,
                                            color: T.muted,
                                            textAlign: "center",
                                        }}
                                    >
                                        No Category Found
                                    </Text>
                                ) : null
                            }
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}


const yp = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: T.surface,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '85%',
        height: '78%', // <-- Add this
    },
    handle: { width: 40, height: 4, backgroundColor: T.border, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
    title: { fontSize: 16, fontWeight: '700', color: T.ink },
    closeBtn: { padding: 4 },
    closeTxt: { fontSize: 16, color: T.muted },
    searchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
    search: { backgroundColor: T.sub, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: T.ink },
    row: { paddingHorizontal: 16, paddingVertical: 12 },
    yarnName: { fontSize: 14, fontWeight: '600', color: T.ink },
    yarnSub: { fontSize: 12, color: T.muted, marginTop: 2 },
    listFrame: { height: 430 },
    backBtn: { minWidth: 88, paddingVertical: 4 },
    backPlaceholder: { width: 88 },
    backTxt: { fontSize: 12, fontWeight: '800', color: T.copper },
    mainSelectionCard: {
        marginHorizontal: 16,
        marginTop: 10,
        backgroundColor: T.sub,
        borderWidth: 1,
        borderColor: T.border,
        borderRadius: 10,
        padding: 10,
    },
    mainSelectionLabel: { fontSize: 8.5, fontWeight: '800', color: T.muted, letterSpacing: 0.6 },
    mainSelectionCode: { marginTop: 2, fontSize: 11, color: T.ink },
    mainSelectionName: { marginTop: 2, fontSize: 15, fontWeight: '900', color: T.muted },
    mainSelectionBlend: { marginTop: 5, fontSize: 10, color: T.copper },
    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 6 },
    metaText: { fontSize: 10.5, color: T.muted },
    blendPreview: { flex: 1, fontSize: 10.5, color: T.copper },
    chevron: { marginLeft: 10, fontSize: 24, color: T.muted },
    directSelectText: { marginLeft: 10, fontSize: 11, fontWeight: '800', color: T.copper },
    itemCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    mainBadge: { backgroundColor: '#E7F1EA', borderRadius: 9, paddingHorizontal: 7, paddingVertical: 2 },
    mainBadgeText: { fontSize: 8.5, fontWeight: '900', color: T.green },
    blendChip: {
        fontSize: 10.5,
        fontWeight: '700',
        color: T.copper,
        backgroundColor: T.copper + '18',
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    errorBox: {
        marginHorizontal: 16,
        marginBottom: 6,
        padding: 10,
        borderRadius: 9,
        backgroundColor: '#FFF1F0',
        borderWidth: 1,
        borderColor: '#F0C3C0',
        flexDirection: 'row',
        alignItems: 'center',
    },
    errorText: { flex: 1, fontSize: 11, color: '#8B302B' },
    retryText: { marginLeft: 10, fontSize: 11, fontWeight: '800', color: '#8B302B' },
    emptyText: { padding: 16, color: T.muted, textAlign: 'center' },
    childEmptyBox: { alignItems: 'center', paddingVertical: 20 },
    changeMainBtn: {
        marginTop: 8,
        borderRadius: 8,
        backgroundColor: T.copper,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    changeMainTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
});

// ── Yarn line row ──
function YarnLineRow({ yarn, type, onChange, onRemove }: {
    yarn: any; type: 'warp' | 'weft' | 'selvedge';
    onChange: (k: string, v: any) => void; onRemove: () => void;
}) {
    const key = type === 'warp' ? 'epi' : type === 'weft' ? 'ppi' : 'ends';
    const lbl = type === 'warp' ? 'EPI' : type === 'weft' ? 'PPI' : 'ENDS';
    // Keep the typed text so "52." / "52.5" / empty can be typed; the number goes to the form.
    const [txt, setTxt] = useState<string>(String(yarn[key] ?? 0));
    useEffect(() => {
        const n = Number(yarn[key]) || 0;
        setTxt(t => ((parseFloat(t) || 0) === n ? t : String(n)));
    }, [yarn[key]]); // eslint-disable-line react-hooks/exhaustive-deps
    const onNum = (v: string) => {
        let clean = v.replace(',', '.').replace(/[^0-9.]/g, '');
        const dot = clean.indexOf('.');
        if (dot >= 0) clean = clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, '');
        setTxt(clean);
        onChange(key, parseFloat(clean) || 0);
    };
    const zero = !(Number(yarn[key]) > 0) && type !== 'selvedge';
    return (
        <View style={yl.card}>
            <View style={yl.row}>
                <View style={{ flex: 1 }}>
                    <Text style={yl.name}>{yarn.name}</Text>
                    <Text style={yl.sub}>
                        Item {yarn.itm_code || yarn.mi_id}
                        {yarn.main_yarn_code || yarn.m_itm_code
                            ? ` · Main ${yarn.main_yarn_code || yarn.m_itm_code}`
                            : ''}
                        {yarn.cnt ? ` · ${yarn.cnt}${PLY(yarn) > 1 ? `/${PLY(yarn)}` : ''} ${yarn.sys || ''}` : ''}
                    </Text>
                </View>
                {type === 'warp' && (
                    <TouchableOpacity style={[yl.sizingChip, yarn.sizing && yl.sizingChipOn]}
                        onPress={() => onChange('sizing', !yarn.sizing)}>
                        <Text style={[yl.sizingTxt, yarn.sizing && yl.sizingTxtOn]}>Sizing</Text>
                    </TouchableOpacity>
                )}
                <View style={yl.epiWrap}>
                    <TextInput value={txt}
                        onChangeText={onNum} keyboardType="decimal-pad" selectTextOnFocus
                        onBlur={() => setTxt(String(Number(yarn[key]) || 0))}
                        style={[yl.epiInput, zero ? { borderWidth: 1, borderColor: T.copper } : null]} />
                    <Text style={yl.epiLabel}>{lbl}</Text>
                </View>
                <TouchableOpacity onPress={onRemove} style={{ paddingLeft: 8 }}><Text style={{ color: T.pd, fontSize: 18 }}>✕</Text></TouchableOpacity>
            </View>
            <Text style={yl.blendLabel}>BLEND / SUB ITEM</Text>
            <TextInput value={yarn.blend_ratio ?? ''}
                onChangeText={v => onChange('blend_ratio', v.trim() || null)}
                placeholder="Pure or ratio/sub-item, e.g. 65/35"
                placeholderTextColor={T.muted} style={yl.blendInput}
                editable={false} />
        </View>
    );
}
const yl = StyleSheet.create({
    card: { backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { fontSize: 13, fontWeight: '700', color: T.ink },
    sub: { fontSize: 11, color: T.muted, marginTop: 2 },
    sizingChip: { borderWidth: 1, borderColor: T.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: T.sub },
    sizingChipOn: { backgroundColor: T.copper + '22', borderColor: T.copper },
    sizingTxt: { fontSize: 10, fontWeight: '700', color: T.muted },
    sizingTxtOn: { color: T.copper },
    epiWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    epiInput: { backgroundColor: T.sub, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, color: T.ink, width: 56, textAlign: 'center' },
    epiLabel: { fontSize: 11, color: T.muted, fontWeight: '600' },
    blendLabel: { fontSize: 9, color: T.muted, fontWeight: '700', letterSpacing: 0.5, marginTop: 10, marginBottom: 6 },
    blendInput: { backgroundColor: T.sub, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: T.ink, fontSize: 12 },
});

// ═══════════════════════════════════════════════════════════════
// TAB 1 — CATALOG
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// SAVED COLOURWAY HELPERS — read a saved sub_design (from GET /designs/{id})
// sub_designs[].warp_patterns / weft_patterns (repeat counts) with a
// fallback to warp_colors / weft_colors.
// ═══════════════════════════════════════════════════════════════
type SavedBand = {
    side: 'warp' | 'weft';
    mi_id: string;
    blend_ratio: string | null;
    shade: string;
    color_name: string;
    hex: string;
    thread_count: number | null;
    sort_order: number;
};

const cwArr = (sub: any, snake: string, camel: string): any[] =>
    Array.isArray(sub?.[snake]) ? sub[snake] : Array.isArray(sub?.[camel]) ? sub[camel] : [];

function savedBands(sub: any, side: 'warp' | 'weft'): SavedBand[] {
    const patterns = cwArr(sub, `${side}_patterns`, `${side}Patterns`);
    const colors = cwArr(sub, `${side}_colors`, `${side}Colors`);
    const src = patterns.length ? patterns : colors;
    return src
        .map((r: any, i: number): SavedBand => ({
            side,
            mi_id: String(r?.mi_id ?? '').trim(),
            blend_ratio: r?.blend_ratio != null && String(r.blend_ratio).trim() !== '' ? String(r.blend_ratio).trim() : null,
            shade: String(r?.shade ?? '').trim(),
            color_name: String(r?.color_name ?? '').trim(),
            hex: /^#[0-9A-Fa-f]{6}$/.test(String(r?.hex || '')) ? String(r.hex) : '#808080',
            thread_count: r?.thread_count != null && r.thread_count !== '' ? Number(r.thread_count) : null,
            sort_order: Number.isFinite(Number(r?.sort_order)) ? Number(r.sort_order) : i,
        }))
        .sort((a: SavedBand, b: SavedBand) => a.sort_order - b.sort_order);
}

// "4 Navy · 2 White" — repeat count per colour (warp first, weft if no warp)
function cwSummary(sub: any): string {
    const bands = savedBands(sub, 'warp');
    const src = bands.length ? bands : savedBands(sub, 'weft');
    const order: string[] = [];
    const total: Record<string, number> = {};
    src.forEach(b => {
        const name = b.color_name || b.shade || '—';
        if (!(name in total)) { order.push(name); total[name] = 0; }
        total[name] += b.thread_count ?? 1;
    });
    return order.map(n => `${total[n]} ${n}`).join(' · ');
}

// Colourway delete from Catalog is switched off for now (frontend only).
const CW_DELETE_ENABLED = false;

function CatalogColourwayCard({ sub, design, onEdit, onDelete, deleting }: {
    sub: any;
    design: any;
    onEdit: () => void;
    onDelete: () => void;
    deleting: boolean;
}) {
    const [open, setOpen] = useState(false);
    const warp = savedBands(sub, 'warp');
    const weft = savedBands(sub, 'weft');
    const stripe = (warp.length ? warp : weft).slice(0, 24);
    const sync = String(sub?.erp_sync_status || '').toUpperCase();
    const summary = cwSummary(sub);

    const yarnName = (side: 'warp' | 'weft', miId: string) => {
        const list: any[] = side === 'warp' ? (design?.warp_yarns ?? []) : (design?.weft_yarns ?? []);
        const y = list.find(x => String(x?.mi_id ?? '').trim() === miId);
        return y?.name || `Item ${miId}`;
    };

    const renderSide = (label: string, side: 'warp' | 'weft', bands: SavedBand[]) => {
        if (!bands.length) return null;
        const groups: { key: string; mi_id: string; blend: string | null; bands: SavedBand[] }[] = [];
        bands.forEach(b => {
            const k = `${b.mi_id}|${b.blend_ratio ?? ''}`;
            const last = groups[groups.length - 1];
            if (last && last.key === k) last.bands.push(b);
            else groups.push({ key: k, mi_id: b.mi_id, blend: b.blend_ratio, bands: [b] });
        });
        return (
            <View style={{ marginTop: 8 }}>
                <Text style={cwc.sideLabel}>{label}</Text>
                {groups.map((g, gi) => (
                    <View key={`${g.key}_${gi}`} style={cwc.yarnRow}>
                        <Text style={cwc.yarnName}>
                            {yarnName(side, g.mi_id)}{g.blend ? `  · ${g.blend}` : ''}
                        </Text>
                        {g.bands.map((b, bi) => (
                            <View key={bi} style={cwc.bandRow}>
                                <View style={[cwc.dot, { backgroundColor: b.hex }]} />
                                <Text style={cwc.bandName} numberOfLines={1}>{b.color_name || b.shade || '—'}</Text>
                                <Text style={cwc.muted}>
                                    {/^\d+$/.test(b.shade) ? `ERP ${b.shade}` : b.shade}
                                    {b.thread_count != null ? `  ·  ${b.thread_count}` : ''}
                                </Text>
                            </View>
                        ))}
                    </View>
                ))}
            </View>
        );
    };

    return (
        <View style={cwc.card}>
            <View style={cwc.head}>
                <TouchableOpacity style={cwc.main} onPress={() => setOpen(v => !v)} activeOpacity={0.7}>
                    <View style={cwc.swatch}>
                        {stripe.length
                            ? stripe.map((b, i) => <View key={i} style={{ flex: Math.max(1, b.thread_count ?? 1), backgroundColor: b.hex }} />)
                            : <View style={{ flex: 1, backgroundColor: T.sub }} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={cwc.code} numberOfLines={1}>{sub?.code}</Text>
                        <Text style={cwc.muted} numberOfLines={2}>
                            {summary || (sub?.commercial_name ? sub.commercial_name : 'No yarn shades')}
                        </Text>
                        {sync && sync !== 'SYNCED' ? (
                            <Text style={[cwc.muted, { color: T.copper, fontWeight: '700' }]}>ERP {sync}</Text>
                        ) : null}
                    </View>
                </TouchableOpacity>
                <View style={cwc.actions}>
                    <TouchableOpacity style={cwc.actionBtn} onPress={onEdit} disabled={deleting}>
                        <Text style={cwc.actionText}>Edit</Text>
                    </TouchableOpacity>
                    {/* Colourway Delete — TEMPORARILY DISABLED. To enable again set CW_DELETE_ENABLED = true. */}
                    <TouchableOpacity
                        style={[cwc.actionBtn, cwc.actionDanger, !CW_DELETE_ENABLED && { opacity: 0.35 }]}
                        onPress={CW_DELETE_ENABLED ? onDelete : undefined}
                        disabled={!CW_DELETE_ENABLED || deleting}>
                        {deleting
                            ? <ActivityIndicator size="small" color={T.red} />
                            : <Text style={[cwc.actionText, { color: T.red }]}>Delete</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setOpen(v => !v)} style={{ paddingHorizontal: 4 }}>
                        <Text style={cwc.chev}>{open ? '⌃' : '⌄'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {open ? (
                <View style={cwc.detail}>
                    {sub?.commercial_name ? <Text style={cwc.muted}>Commercial name: {sub.commercial_name}</Text> : null}
                    {sub?.shade_code ? <Text style={cwc.muted}>ERP shade: {sub.shade_code}{sync ? ` · ${sync}` : ''}</Text> : null}
                    {renderSide('WARP', 'warp', warp)}
                    {renderSide('WEFT', 'weft', weft)}
                    {!warp.length && !weft.length ? <Text style={cwc.muted}>No yarn shades stored.</Text> : null}
                    {sync && sync !== 'SYNCED' && sub?.erp_sync_message
                        ? <Text style={[cwc.muted, { marginTop: 6 }]}>ERP: {sub.erp_sync_message}</Text>
                        : null}
                </View>
            ) : null}
        </View>
    );
}

const cwc = StyleSheet.create({
    card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, marginTop: 8, overflow: 'hidden' },
    head: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: 10 },
    main: { flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: 10 },
    swatch: { width: 42, height: 42, borderRadius: 7, overflow: 'hidden', flexDirection: 'row', borderWidth: 1, borderColor: T.border },
    code: { fontSize: 14, fontWeight: '800', color: T.ink },
    muted: { fontSize: 11, color: T.muted, marginTop: 2 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
    actionBtn: { borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, minWidth: 60, alignItems: 'center', backgroundColor: T.surface },
    actionDanger: { borderColor: T.red + '55' },
    actionText: { fontSize: 12, fontWeight: '800', color: T.ink },
    chev: { fontSize: 15, color: T.muted },
    detail: { borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: T.bg },
    sideLabel: { fontSize: 9.5, fontWeight: '900', color: T.muted, letterSpacing: 0.6, marginBottom: 2 },
    yarnRow: { borderTopWidth: 1, borderTopColor: T.sub, paddingTop: 6, marginTop: 4 },
    yarnName: { fontSize: 12, fontWeight: '800', color: T.ink, marginBottom: 2 },
    bandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
    dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: T.border },
    bandName: { flex: 1, fontSize: 12, color: T.ink, fontWeight: '700' },
});

function CatalogTab({ onSelectDesign, onEditDesign, onEditColourway }: {
    onSelectDesign: (d: Design) => void;
    onEditDesign: (d: Design) => void;
    onEditColourway?: (d: Design, sub: any) => void;
}) {
    const { yearno, prpcode, strcode } = useERP();
    const [deletingCw, setDeletingCw] = useState<string | null>(null);
    const [designs, setDesigns] = useState<Design[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [expandedDetail, setExpandedDetail] = useState<Design | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const requestSequence = useRef(0);

    const load = useCallback(async (page = 1) => {
        const requestId = ++requestSequence.current;
        const normalizedSearch = search.trim();

        try {
            const res = await DesignAPI.list({
                yearno,
                page,
                per_page: 50,
                limit: 50,

                /*
                 * A typed search is intentionally GLOBAL.
                 *
                 * The production app previously sent both a stale category
                 * chip and the search text, which could hide a valid design.
                 * Category filtering resumes automatically when search clears.
                 */
                category:
                    normalizedSearch === '' && filter !== 'All'
                        ? filter
                        : undefined,

                search: normalizedSearch || undefined,
            } as any);

            /*
             * Only the newest Catalog request may update UI state.
             * This prevents slower old searches (8 -> 82 -> 822 -> 8229)
             * from overwriting the latest result after it has already loaded.
             */
            if (requestId !== requestSequence.current) {
                return;
            }

            console.log('DESIGN LIST OK', {
                url: res.config?.url,
                baseURL: res.config?.baseURL,
                params: res.config?.params,
                status: res.status,
                requestId,
            });

            const body: any = res.data;
            const rows: Design[] = Array.isArray(body?.data)
                ? body.data
                : Array.isArray(body?.data?.data)
                    ? body.data.data
                    : [];

            const meta = body?.meta ?? body?.data?.meta ?? {};
            const hasMore = Boolean(meta.has_more);

            setDesigns(prev => {
                if (page === 1) {
                    return rows;
                }

                /*
                 * Defensive de-duplication protects pagination if the server
                 * result set shifts while the user is browsing.
                 */
                const seen = new Set(prev.map(row => String(row.id)));
                const appendRows = rows.filter(
                    row => !seen.has(String(row.id))
                );

                return [...prev, ...appendRows];
            });

            setTotalPages(hasMore ? page + 1 : page);
            setTotal(previousTotal =>
                page === 1
                    ? rows.length + (hasMore ? 1 : 0)
                    : Math.max(0, previousTotal - 1)
                    + rows.length
                    + (hasMore ? 1 : 0)
            );
            setCurrentPage(page);
        } catch (e: any) {
            if (requestId !== requestSequence.current) {
                return;
            }

            const msg = e?.response?.data?.message
                || e?.response?.data?.error
                || e?.message
                || 'Unable to load designs';

            console.log('DESIGN LIST ERROR', {
                message: e?.message,
                code: e?.code,
                status: e?.response?.status,
                data: e?.response?.data,
                url: e?.config?.url,
                baseURL: e?.config?.baseURL,
                params: e?.config?.params,
                requestId,
            });

            AppAlert.alert('Design list error', String(msg));
        } finally {
            if (requestId === requestSequence.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [filter, search, yearno]);

    /*
     * One effect owns first-page loading for both category and search.
     * Invalidating the request sequence immediately (before debounce)
     * prevents an already-running old request from updating the screen
     * while the user is still typing.
     */
    useEffect(() => {
        requestSequence.current += 1;
        setExpandedId(null);
        setExpandedDetail(null);

        const timer = setTimeout(
            () => void load(1),
            search.trim() ? 400 : 0
        );

        return () => clearTimeout(timer);
    }, [load, search]);

    const handleExpand = async (d: Design) => {
        if (expandedId === d.id) { setExpandedId(null); setExpandedDetail(null); return; }
        setExpandedId(d.id); setExpandedDetail(null); setDetailLoading(true);
        try {
            const res = await DesignAPI.get(d.id);
            setExpandedDetail({ ...d, ...res.data.data });
        } catch { setExpandedDetail(d); }
        finally { setDetailLoading(false); }
    };

    // Re-read the open design after a colourway change (count + list stay accurate).
    const reloadExpanded = async (d: Design) => {
        try {
            const res = await DesignAPI.get(d.id);
            const full = { ...d, ...res.data.data };
            setExpandedDetail(full);
            const subs = Array.isArray((full as any).sub_designs) ? (full as any).sub_designs : null;
            if (subs) {
                setDesigns(prev => prev.map(x => x.id === d.id ? ({ ...x, cw_count: subs.length } as any) : x));
            }
        } catch { /* keep current view */ }
    };

    const deleteColourway = (d: Design, sub: any) => {
        AppAlert.alert(
            'Delete colourway?',
            `${sub.code} will be removed from ${designLabel(d)}.` +
            (sub.shade_code ? ` ERP shade ${sub.shade_code} stays in ERP.` : ''),
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeletingCw(String(sub.id));
                        try {
                            const res: any = await client.delete(`/design-colourways/${encodeURIComponent(String(sub.id))}`, {
                                params: { yearno, prpcode, strcode },
                            });
                            await reloadExpanded(d);
                            AppAlert.alert('Deleted', res?.data?.message ? `${sub.code}: ${res.data.message}` : `${sub.code} deleted.`);
                        } catch (e: any) {
                            if (e?.response?.status === 404 && /already deleted/i.test(String(e?.response?.data?.message || ''))) {
                                await reloadExpanded(d);
                            }
                            AppAlert.alert('Delete failed', apiErrorText(e, 'Unable to delete colourway.'));
                        } finally {
                            setDeletingCw(null);
                        }
                    },
                },
            ]
        );
    };

    if (loading) return <View style={s.center}><ActivityIndicator color={T.copper} /></View>;

    return (
        <View style={{ flex: 1 }}>
            <View style={{ backgroundColor: T.surface }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingVertical: 8 }}>
                    {['All', ...Array.from(new Set(designs.map(d => d.category).filter(Boolean)))].map(c => (
                        <TouchableOpacity key={c} onPress={() => setFilter(c)}
                            style={[ct.chip, filter === c && ct.chipActive]}>
                            <Text style={[ct.chipTxt, filter === c && ct.chipTxtActive]}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            <View style={ct.searchWrap}>
                <TextInput value={search} onChangeText={setSearch}
                    placeholder="Search design…" placeholderTextColor={T.muted} style={ct.search} />
            </View>
            <FlatList
                data={designs} keyExtractor={d => d.id}
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1); }} />}
                renderItem={({ item: d }) => {
                    const expanded = expandedId === d.id;
                    const raw = expanded ? expandedDetail : null;
                    const det = raw ? enrich(raw) : null;
                    return (
                        <View>
                            <TouchableOpacity style={ct.row} activeOpacity={0.7} onPress={() => handleExpand(d)}>
                                <Swatch design={d} size={44} />
                                <View style={ct.rowInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={ct.rowCode}>{d.code}</Text>
                                        <TypeBadge type={d.type} />
                                        <DsnCodeBadge design={d} />
                                    </View>
                                    <Text style={ct.rowSub}>
                                        {SHORT(d.category)} ·
                                        {Number(d.epi_total).toFixed(2)}×{Number(d.ppi_total).toFixed(2)} ·
                                        {d.cw_count} cw
                                    </Text>
                                </View>
                                <View style={ct.rowRight}>
                                    <Text style={ct.rowPrice}>{d.latest_cost ? r0(d.latest_cost) : '—'}</Text>
                                    <Text style={ct.rowPriceSub}>per m</Text>
                                </View>
                                <Text style={[ct.chevron, expanded && { transform: [{ rotate: '90deg' }] }]}>›</Text>
                            </TouchableOpacity>
                            {expanded && (
                                <View style={ct.expandBox}>
                                    {detailLoading ? (
                                        <ActivityIndicator color={T.copper} style={{ paddingVertical: 20 }} />
                                    ) : det ? (() => {
                                        const fab = calcSpec(det);
                                        const hasC = det.epi_total > 0 && (det.reed_space ?? 0) > 0;
                                        const hasG = fab.greigGLM > 0;
                                        return (
                                            <>
                                                {!!det.weave && <Text style={ct.expandWeave}>{det.weave}{det.note ? ` · ${det.note}` : ''}</Text>}
                                                {((det.warp_yarns?.length ?? 0) > 0 || (det.weft_yarns?.length ?? 0) > 0) && (
                                                    <>
                                                        <Text style={ct.expandSec}>YARNS</Text>
                                                        {det.warp_yarns?.map((y: any, i: number) => (
                                                            <View key={`w${i}`} style={ct.yarnRow}>
                                                                <View style={ct.yarnBadgeWarp}><Text style={ct.yarnBadgeTxt}>WARP</Text></View>
                                                                <Text style={ct.yarnName}>{y.cnt ? `${y.cnt} ` : ''}{y.name}{y.blend_ratio ? ` ${y.blend_ratio}` : ''}{y.sizing ? ' · sized' : ''}</Text>
                                                                <Text style={ct.yarnEpi}>{Number(y.epi).toFixed(2)} EPI</Text>
                                                            </View>
                                                        ))}
                                                        {det.weft_yarns?.map((y: any, i: number) => (
                                                            <View key={`f${i}`} style={ct.yarnRow}>
                                                                <View style={ct.yarnBadgeWeft}><Text style={ct.yarnBadgeTxt}>WEFT</Text></View>
                                                                <Text style={ct.yarnName}>{y.cnt ? `${y.cnt} ` : ''}{y.name}{y.blend_ratio ? ` ${y.blend_ratio}` : ''}</Text>
                                                                <Text style={ct.yarnEpi}>{Number(y.ppi).toFixed(2)} PPI</Text>
                                                            </View>
                                                        ))}
                                                    </>
                                                )}
                                                {hasC && (
                                                    <View style={ct.statsRow}>
                                                        <View style={ct.statBox}>
                                                            <Text style={ct.statLabel}>REED SPACE · BASIS</Text>
                                                            <Text style={ct.statVal}>{det.reed_space}"</Text>
                                                        </View>
                                                        <View style={ct.statBox}>
                                                            <Text style={ct.statLabel}>TOTAL ENDS</Text>
                                                            <Text style={ct.statVal}>{fab.totalEnds > 0 ? Math.round(fab.totalEnds).toLocaleString('en-IN') : '—'}</Text>
                                                        </View>
                                                    </View>
                                                )}
                                                {hasC && (
                                                    <>
                                                        <Text style={[ct.expandSec, { marginTop: 10 }]}>↑EPI {det.epi_total} × ↑PPI {det.ppi_total} (on loom)</Text>
                                                        <View style={ct.constructTable}>
                                                            <View style={[ct.tableRow, ct.tableHeader]}>
                                                                {['CONSTRUCTION', 'LOOM', 'GREIGE', 'FINISHED'].map((h, i) => (
                                                                    <Text key={i} style={[ct.tableCell, ct.tableCellHdr, i === 0 && ct.tableCellLabel]}>{h}</Text>
                                                                ))}
                                                            </View>
                                                            <View style={ct.tableRow}>
                                                                <Text style={[ct.tableCell, ct.tableCellLabel]}>EPI</Text>
                                                                <Text style={ct.tableCell}>{f1(det.epi_total)}</Text>
                                                                <Text style={[ct.tableCell, ct.tdGreige]}>{f1(fab.epiGreige)}</Text>
                                                                <Text style={[ct.tableCell, ct.tdFinished]}>{f1(fab.epiFinished)}</Text>
                                                            </View>
                                                            <View style={ct.tableRow}>
                                                                <Text style={[ct.tableCell, ct.tableCellLabel]}>PPI</Text>
                                                                <Text style={ct.tableCell}>{f1(det.ppi_total)}</Text>
                                                                <Text style={[ct.tableCell, ct.tdGreige]}>{f1(fab.ppiTable)}</Text>
                                                                <Text style={[ct.tableCell, ct.tdFinished]}>{f1(fab.ppiFinished)}</Text>
                                                            </View>
                                                            <View style={ct.tableRow}>
                                                                <Text style={[ct.tableCell, ct.tableCellLabel]}>Width"</Text>
                                                                <Text style={ct.tableCell}>{det.reed_space}</Text>
                                                                <Text style={[ct.tableCell, ct.tdGreige]}>{f1(fab.widthGreige)}</Text>
                                                                <Text style={[ct.tableCell, ct.tdFinished]}>{det.fin_width > 0 ? det.fin_width : f1(fab.finWidthIn)}</Text>
                                                            </View>
                                                        </View>
                                                    </>
                                                )}
                                                {hasG && (
                                                    <View style={ct.gsmGrid}>
                                                        <View style={ct.gsmBox}>
                                                            <Text style={ct.gsmLabel}>Greige GSM</Text>
                                                            <Text style={ct.gsmVal}>{Math.round(fab.greigGSM)}</Text>
                                                        </View>
                                                        <View style={ct.gsmBox}>
                                                            <Text style={ct.gsmLabel}>Greige GLM</Text>
                                                            <Text style={ct.gsmVal}>{fab.greigGLM.toFixed(1)} g/m</Text>
                                                        </View>
                                                        <View style={[ct.gsmBox, { borderTopWidth: 1, borderTopColor: T.border }]}>
                                                            <Text style={ct.gsmLabel}>Finished GSM</Text>
                                                            <Text style={ct.gsmVal}>{Math.round(fab.finGSM)}</Text>
                                                            {det.fin_width > 0 && <Text style={{ fontSize: 9, color: T.muted }}>{det.fin_width}" fin</Text>}
                                                        </View>
                                                        <View style={[ct.gsmBox, { borderTopWidth: 1, borderTopColor: T.border }]}>
                                                            <Text style={ct.gsmLabel}>Finished GLM</Text>
                                                            <Text style={ct.gsmVal}>{fab.finGLM.toFixed(1)} g/m</Text>
                                                        </View>
                                                    </View>
                                                )}
                                                {fab.blendGrand > 0 && (
                                                    <View style={{ marginTop: 14 }}>
                                                        <Text style={ct.expandSec}>FIBRE BLEND</Text>
                                                        <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                                                            {Object.entries(fab.blendTotals).map(([k, v]) => (
                                                                <View key={k} style={{ flex: v / fab.blendGrand, backgroundColor: BLEND_COLORS[k] ?? '#888' }} />
                                                            ))}
                                                        </View>
                                                        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                                                            {Object.entries(fab.blendTotals).map(([k, v]) => (
                                                                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: BLEND_COLORS[k] ?? '#888' }} />
                                                                    <Text style={{ fontSize: 10, color: T.muted }}>{k} {Math.round(v / fab.blendGrand * 100)}%</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    </View>
                                                )}
                                                {!!det.latest_cost && (
                                                    <View style={ct.latestCostRow}>
                                                        <Text style={ct.latestCostTxt}>Latest cost</Text>
                                                        <Text style={ct.latestCostVal}>{r0(det.latest_cost)}/m</Text>
                                                    </View>
                                                )}
                                                {(() => {
                                                    const subs: any[] = Array.isArray((det as any).sub_designs) ? (det as any).sub_designs : [];
                                                    const count = Array.isArray((det as any).sub_designs) ? subs.length : (det.cw_count ?? 0);
                                                    return (
                                                        <>
                                                            <View style={ct.cwRow}>
                                                                <Text style={ct.cwTitle}>COLOURWAYS ({count})</Text>
                                                                <View style={ct.cwBtns}>
                                                                    {String(det.type).toUpperCase() === 'YD' ? (
                                                                        <TouchableOpacity style={ct.cwAddBtn} onPress={() => onSelectDesign(det)}>
                                                                            <Text style={ct.cwAddTxt}>+ Add colourway</Text>
                                                                        </TouchableOpacity>
                                                                    ) : null}
                                                                    <TouchableOpacity style={[ct.cwAddBtn]} onPress={() => onEditDesign(det)}>
                                                                        <Text style={ct.cwAddTxt}>Update Design</Text>
                                                                    </TouchableOpacity>
                                                                </View>
                                                            </View>
                                                            {subs.length === 0 ? (
                                                                count > 0
                                                                    ? null
                                                                    : <Text style={ct.cwEmpty}>No colourway yet.</Text>
                                                            ) : subs.map((sub: any) => (
                                                                <CatalogColourwayCard
                                                                    key={String(sub.id)}
                                                                    sub={sub}
                                                                    design={det}
                                                                    deleting={deletingCw === String(sub.id)}
                                                                    onEdit={() => onEditColourway?.(det, sub)}
                                                                    onDelete={() => deleteColourway(det, sub)}
                                                                />
                                                            ))}
                                                        </>
                                                    );
                                                })()}
                                            </>
                                        );
                                    })() : null}
                                </View>
                            )}
                        </View>
                    );
                }}
                ItemSeparatorComponent={() => <View style={ct.sep} />}
                ListEmptyComponent={<Text style={s.empty}>No designs found</Text>}
                ListFooterComponent={
                    currentPage < totalPages
                        ? <TouchableOpacity onPress={() => load(currentPage + 1)} style={{ padding: 16, alignItems: 'center' }}>
                            <Text style={{ color: T.copper, fontWeight: '700' }}>Load More ({total - designs.length} remaining)</Text>
                        </TouchableOpacity>
                        : null
                }
            />
        </View>
    );
}
const ct = StyleSheet.create({
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: T.sub },
    chipActive: { backgroundColor: T.ink },
    chipTxt: { fontSize: 12, fontWeight: '600', color: T.muted },
    chipTxtActive: { color: '#fff' },
    searchWrap: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
    search: { backgroundColor: T.sub, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: T.ink },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: T.surface, gap: 10 },
    rowInfo: { flex: 1 },
    rowCode: { fontSize: 15, fontWeight: '700', color: T.ink },
    rowSub: { fontSize: 11, color: T.muted, marginTop: 2 },
    rowRight: { alignItems: 'flex-end' },
    rowPrice: { fontSize: 14, fontWeight: '800', color: T.copper },
    rowPriceSub: { fontSize: 9, color: T.muted },
    chevron: { fontSize: 18, color: T.muted },
    sep: { height: 1, backgroundColor: T.border, marginLeft: 68 },
    expandBox: { backgroundColor: T.bg, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border },
    expandWeave: { fontSize: 12, color: T.muted, fontStyle: 'italic', marginBottom: 8 },
    expandSec: { fontSize: 9, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginBottom: 6 },
    yarnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    yarnBadgeWarp: { backgroundColor: T.yd + '20', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
    yarnBadgeWeft: { backgroundColor: T.pd + '20', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
    yarnBadgeTxt: { fontSize: 9, fontWeight: '800', color: T.muted },
    yarnName: { flex: 1, fontSize: 12, fontWeight: '600', color: T.ink },
    yarnEpi: { fontSize: 12, fontWeight: '700', color: T.copper },
    statsRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 4 },
    statBox: { flex: 1, backgroundColor: T.nav, borderRadius: 8, padding: 10 },
    statLabel: { fontSize: 9, color: '#fff', fontWeight: '600', letterSpacing: 0.4 },
    statVal: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 2 },
    constructTable: { marginTop: 4, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: T.border },
    tableRow: { flexDirection: 'row', backgroundColor: T.surface },
    tableHeader: { backgroundColor: T.sub },
    tableCell: { flex: 1, fontSize: 11, color: T.ink, paddingVertical: 6, paddingHorizontal: 8, textAlign: 'right' },
    tableCellHdr: { fontSize: 9, fontWeight: '700', color: T.muted, textAlign: 'right' },
    tableCellLabel: { textAlign: 'left', fontWeight: '600', flex: 1.2 },
    tdGreige: { fontWeight: '700', color: T.ink },
    tdFinished: { fontWeight: '700', color: T.copper },
    gsmGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, borderWidth: 1, borderColor: T.border, borderRadius: 8, overflow: 'hidden' },
    gsmBox: { width: '50%', backgroundColor: T.surface, padding: 10 },
    gsmLabel: { fontSize: 9, color: T.muted, fontWeight: '600', letterSpacing: 0.3 },
    gsmVal: { fontSize: 16, fontWeight: '800', color: T.ink, marginTop: 2 },
    latestCostRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, backgroundColor: T.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: T.border },
    latestCostTxt: { fontSize: 12, color: T.muted, fontWeight: '600' },
    latestCostVal: { fontSize: 14, fontWeight: '800', color: T.copper },
    cwRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border },
    cwBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    cwEmpty: { fontSize: 11, color: T.muted, marginTop: 8 },
    cwTitle: { fontSize: 11, fontWeight: '700', color: T.muted, letterSpacing: 0.4 },
    cwAddBtn: { backgroundColor: T.copper + '22', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    cwAddTxt: { fontSize: 12, fontWeight: '700', color: T.copper },
});

// ═══════════════════════════════════════════════════════════════
// TAB 2 — DESIGN  (Reed Space input + calculated Greige Width + Live Spec)
// ✅ save() logic below is the validated + verified version (from the
//    second file) adapted to the new lightweight client, which does
//    NOT inject yearno/prpcode/strcode automatically — so we add them
//    to the payload explicitly here.
// ═══════════════════════════════════════════════════════════════
const EMPTY_FORM = {
    code: '', category: '', type: 'YD',
    weave: '', reed_space: 0, greige_width: 0, warp_shrink: 0, gf_shrink: 0,
    fin_width: 58, warp_wastage: 0, weft_wastage: 0,
    warp_yarns: [], weft_yarns: [], selvedge_yarns: [], width_basis: 'reed',
};

function DesignTab({ design, onRefresh, onCancelEdit }: {
    design: Design | null; onRefresh: () => void; onCancelEdit: () => void;
}) {
    // ✅ needed because the new client doesn't auto-attach these
    const { prpcode, strcode, yearno } = useERP();

    const [saving, setSaving] = useState(false);
    const [pickerFor, setPickerFor] = useState<'warp' | 'weft' | 'selvedge' | null>(null);
    const [form, setForm] = useState<any>({ ...EMPTY_FORM });
    const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
    // Raw text is kept separately so values like `85.` and `85.50`
    // remain typeable instead of being collapsed by parseFloat.
    const [greigeWidthText, setGreigeWidthText] = useState('');

    useEffect(() => {
        const stored = Number((design as any)?.greige_width) || 0;
        setGreigeWidthText(stored > 0 ? String((design as any)?.greige_width) : '');
    }, [design]);

    useEffect(() => {
        if (design) setForm({
            ...EMPTY_FORM, ...design,
            width_basis: (design as any).width_basis ?? 'reed',
            greige_width: (design as any).greige_width ?? 0,
            selvedge_yarns: (design as any).selvedge_yarns ?? [],
            warp_wastage: (design as any).warp_wastage ?? 0,
            weft_wastage: (design as any).weft_wastage ?? 6,
            fin_width: (design as any).fin_width ?? 58,
        });
        else setForm({ ...EMPTY_FORM });
    }, [design]);

    const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

    const addYarn = (y: YarnMaster, type: 'warp' | 'weft' | 'selvedge') => {
        const key = `${type}_yarns`;
        set(key, [...(form[key] ?? []), {
            mi_id: String(y.itm_code || y.mi_id),
            itm_code: String(y.itm_code || y.mi_id),
            m_itm_code: String(y.m_itm_code || (y as any).main_yarn_code || ''),
            main_yarn_code: String((y as any).main_yarn_code || y.m_itm_code || ''),
            prp_code: y.prp_code,
            str_code: y.str_code,
            name: y.name,
            sys: y.sys,
            cnt: y.cnt,
            ply: PLY(y),
            base_price: y.price,
            blend_ratio: (y as any).blend_ratio || null,// Preserve authoritative ERP fibre metadata from Yarn Help.
            fibre: (y as any).fibre || null,
            fibre_composition: Array.isArray((y as any).fibre_composition)
                ? (y as any).fibre_composition
                : [],
            w_blend: (y as any).w_blend || '',
            w_blend_per: (y as any).w_blend_per || '',

            ...(type === 'warp' ? { epi: 0, sizing: false } : type === 'weft' ? { ppi: 0 } : { ends: 0 }),   // user enters EPI / PPI
        }]);
    };
    const updateYarn = (type: string, idx: number, k: string, v: any) => {
        const key = `${type}_yarns`; const list = [...(form[key] ?? [])];
        list[idx] = { ...list[idx], [k]: v }; set(key, list);
    };
    const removeYarn = (type: string, idx: number) =>
        set(`${type}_yarns`, (form[`${type}_yarns`] ?? []).filter((_: any, i: number) => i !== idx));

    // ✅ validated + verified save (ported logic)
    const save = async () => {
        const requiredGreigeWidth = Number(form.greige_width) || 0;
        if (!(requiredGreigeWidth > 0)) {
            AppAlert.alert(
                'Greige Width required',
                'Enter the actual off-loom Greige Width before saving the design.'
            );
            return;
        }

        if (!String(form.code || '').trim()) {
            AppAlert.alert('Validation', 'Design code is required.');
            return;
        }

        if (!String(form.category || '').trim()) {
            AppAlert.alert('Validation', 'Category is required.');
            return;
        }

        if (!Array.isArray(form.warp_yarns) || form.warp_yarns.length === 0) {
            AppAlert.alert('Validation', 'At least one warp yarn is required.');
            return;
        }

        if (!Array.isArray(form.weft_yarns) || form.weft_yarns.length === 0) {
            AppAlert.alert('Validation', 'At least one weft yarn is required.');
            return;
        }

        // EPI / PPI start at 0 — every warp / weft yarn needs its own value before saving.
        const noEpi = form.warp_yarns.filter((y: any) => !(Number(y.epi) > 0)).map((y: any) => y.name || y.mi_id);
        const noPpi = form.weft_yarns.filter((y: any) => !(Number(y.ppi) > 0)).map((y: any) => y.name || y.mi_id);
        if (noEpi.length || noPpi.length) {
            AppAlert.alert('EPI / PPI required', [
                noEpi.length ? `Enter EPI for warp yarn: ${noEpi.join(', ')}` : '',
                noPpi.length ? `Enter PPI for weft yarn: ${noPpi.join(', ')}` : '',
            ].filter(Boolean).join('\n'));
            return;
        }

        setSaving(true);

        try {
            const payload = {
                ...form,

                yearno,
                YearNo: yearno,

                prpcode,
                PrpCode: prpcode,

                strcode,
                StrCode: strcode,

                width_basis: 'reed',
                reed_space: Number(form.reed_space) || 0,
                greige_width: Number(form.greige_width) || 0,
                warp_shrink: Number(form.warp_shrink) || 0,
                warp_wastage: Number(form.warp_wastage) || 0,
                weft_wastage: Number(form.weft_wastage) || 6,

                warp_yarns: (form.warp_yarns || []).map((row: any) => ({
                    mi_id: String(row.mi_id),
                    blend_ratio: row.blend_ratio || null,
                    epi: Number(row.epi) || 0,
                    sizing: Boolean(row.sizing),
                })),

                weft_yarns: (form.weft_yarns || []).map((row: any) => ({
                    mi_id: String(row.mi_id),
                    blend_ratio: row.blend_ratio || null,
                    ppi: Number(row.ppi) || 0,
                })),

                selvedge_yarns: (form.selvedge_yarns || []).map((row: any) => ({
                    mi_id: String(row.mi_id),
                    blend_ratio: row.blend_ratio || null,
                    ends: Number(row.ends) || 0,
                })),
            };

            console.log('DESIGN SAVE PAYLOAD', JSON.stringify(payload, null, 2));

            const response = design?.id
                ? await DesignAPI.update(design.id, payload)
                : await DesignAPI.create(payload);

            console.log('DESIGN SAVE FULL RESPONSE', {
                status: response.status,
                baseURL: response.config?.baseURL,
                url: response.config?.url,
                requestParams: response.config?.params,
                responseData: response.data,
            });

            /*
             * Normalize all supported production response envelopes.
             *
             * IMPORTANT:
             * HTTP 200/201 alone is NOT treated as a completed Design save.
             * A completed save must resolve a real engineering design ID and
             * that ID is read back from /designs/{id} below.
             *
             * This fixes the old false-positive popup:
             * "Server confirmed the save but did not return the engineering
             * design ID."
             */
            const rawBody: any = response?.data ?? response;

            const body: any =
                rawBody?.response?.data ??
                rawBody?.response ??
                rawBody;

            const nestedData: any =
                body?.data?.data ??
                body?.data ??
                {};

            let savedId = String(
                nestedData?.id ??
                nestedData?.design_id ??
                nestedData?.engineering_design_id ??
                body?.design_id ??
                body?.engineering_design_id ??
                body?.id ??
                rawBody?.design_id ??
                rawBody?.engineering_design_id ??
                rawBody?.id ??
                ''
            ).trim();

            const explicitFailure =
                body?.success === false ||
                rawBody?.success === false;

            if (explicitFailure) {
                throw new Error(
                    String(
                        body?.message ||
                        rawBody?.message ||
                        'Server rejected the design save.'
                    )
                );
            }

            /*
             * UPDATE is deterministic: the engineering ID is already known.
             * Some older production response envelopes returned no ID after
             * a successful PUT, so safely retain the current design ID.
             */
            if (!savedId && design?.id) {
                savedId = String(design.id).trim();
            }

            /*
             * CREATE recovery:
             *
             * If the save call returned successfully but an old proxy/client
             * envelope stripped the ID, search the Catalog by the submitted
             * code and accept ONLY one exact code match. This cannot confuse
             * code 8229 with 1129128229/1 because comparison is exact here.
             *
             * We still verify /designs/{id} immediately afterwards, so this
             * recovery never converts an uncommitted save into success.
             */
            if (!savedId && !design?.id) {
                const submittedCode = String(form.code || '').trim();

                try {
                    const recoveryResponse = await DesignAPI.list({
                        yearno,
                        page: 1,
                        per_page: 50,
                        limit: 50,
                        search: submittedCode,
                    } as any);

                    const recoveryBody: any = recoveryResponse?.data ?? {};
                    const recoveryRows: Design[] = Array.isArray(recoveryBody?.data)
                        ? recoveryBody.data
                        : Array.isArray(recoveryBody?.data?.data)
                            ? recoveryBody.data.data
                            : [];

                    const exactMatches = recoveryRows.filter(row =>
                        String(row?.code || '').trim().toUpperCase()
                        === submittedCode.toUpperCase()
                    );

                    if (exactMatches.length === 1) {
                        savedId = String(exactMatches[0]?.id || '').trim();
                    } else if (exactMatches.length > 1) {
                        throw new Error(
                            `Design code ${submittedCode} returned multiple exact Catalog matches. Save verification was stopped for safety.`
                        );
                    }
                } catch (recoveryError: any) {
                    /*
                     * Preserve a deliberate ambiguity/safety error, otherwise
                     * continue to the standard missing-ID failure below.
                     */
                    if (
                        String(recoveryError?.message || '')
                            .includes('multiple exact Catalog matches')
                    ) {
                        throw recoveryError;
                    }

                    console.log('DESIGN SAVE ID RECOVERY ERROR', {
                        message: recoveryError?.message,
                        status: recoveryError?.response?.status,
                        responseData: recoveryError?.response?.data,
                    });
                }
            }

            const saveConfirmed =
                Boolean(savedId) &&
                !explicitFailure;

            console.log('DESIGN SAVE NORMALIZED RESPONSE', {
                status: response?.status,
                baseURL: response?.config?.baseURL,
                url: response?.config?.url,
                rawBody,
                body,
                nestedData,
                savedId,
                saveConfirmed,
            });

            if (!savedId) {
                throw new Error(
                    'The design save response did not contain an engineering design ID, and the committed design could not be recovered safely.'
                );
            }

            /*
             * Verify the committed record immediately. Include ERP context
             * explicitly so verification uses the same property/year context
             * as the save request even if the lightweight client does not
             * append these values automatically.
             */
            const verifyResponse = await client.get(
                `/designs/${encodeURIComponent(savedId)}`,
                {
                    params: {
                        yearno,
                        YearNo: yearno,
                        prpcode,
                        PrpCode: prpcode,
                        strcode,
                        StrCode: strcode,
                    },
                }
            );

            const verifyRawBody: any =
                verifyResponse?.data ??
                verifyResponse;

            const verifyBody: any =
                verifyRawBody?.response?.data ??
                verifyRawBody?.response ??
                verifyRawBody;

            const verified: any =
                verifyBody?.data?.data ??
                verifyBody?.data ??
                null;

            console.log('DESIGN SAVE VERIFY RESPONSE', {
                savedId,
                status: verifyResponse?.status,
                responseData: verifyResponse?.data,
                verified,
            });

            if (
                !verified ||
                String(verified?.id || '').trim() !== savedId
            ) {
                throw new Error(
                    `Design ${savedId} was returned by save but could not be read back.`
                );
            }

            if (
                String(verified?.code || '').trim().toUpperCase() !==
                String(form.code || '').trim().toUpperCase()
            ) {
                throw new Error(
                    `Design ${savedId} was read back with a different design code. Save verification was stopped for safety.`
                );
            }

            AppAlert.alert(
                'Saved',
                `Design saved successfully.\n\nID: ${savedId}`
            );

            onRefresh();
        } catch (e: any) {
            console.log('DESIGN SAVE FINAL ERROR', {
                message: e?.message,
                status: e?.response?.status,
                responseData: e?.response?.data,
                baseURL: e?.config?.baseURL,
                url: e?.config?.url,
            });

            const errorBody =
                e?.response?.data?.response?.data ??
                e?.response?.data?.response ??
                e?.response?.data ??
                {};

            AppAlert.alert(
                'Design save failed',
                String(
                    errorBody?.message ||
                    errorBody?.error ||
                    e?.message ||
                    'Unable to save design'
                )
            );
        } finally {
            setSaving(false);
        }
    };

    const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
        <TouchableOpacity onPress={onPress} style={[fm.chip, active && fm.chipActive]}>
            <Text style={[fm.chipTxt, active && fm.chipTxtActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <>
            <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                {/* ── editing banner (owner mode) ── */}
                {design?.id && (
                    <View style={fm.editBanner}>
                        <Text style={fm.editTxt}>
                            <Text style={{ fontWeight: '800' }}>Editing {designLabel(design)}</Text> — owner mode.
                            Changes update the existing design; saved costings keep their snapshots,
                            and the next costing version picks up the new recipe automatically.
                        </Text>
                        <TouchableOpacity onPress={onCancelEdit}>
                            <Text style={fm.editCancel}>Cancel editing</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={fm.label}>DESIGN CODE</Text>
                <TextInput value={form.code ?? ''} onChangeText={v => set('code', v)} placeholder="e.g. Cambridge" placeholderTextColor={T.muted} style={fm.input} />

                <Text style={fm.label}>CATEGORY</Text>

                {form.category ? (
                    <View style={yl.row}>
                        <View style={{ flex: 1 }}>
                            <Text style={yl.name}>{form.category}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => set('category', '')}
                            style={{ paddingLeft: 8 }}
                        >
                            <Text style={{ color: T.pd, fontSize: 18 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={fm.addBtn}
                    onPress={() => setCategoryPickerVisible(true)}
                >
                    <Text style={fm.addBtnTxt}>
                        {'+ Select Category'}
                    </Text>
                </TouchableOpacity>


                <Text style={fm.label}>DYE TYPE</Text>
                <View style={fm.chipRow}>
                    <Chip label="Yarn Dyed" active={form.type === 'YD'} onPress={() => set('type', 'YD')} />
                    <Chip label="Piece Dyed" active={form.type === 'PD'} onPress={() => set('type', 'PD')} />
                </View>

                <Text style={fm.label}>WEAVE / STRUCTURE</Text>
                <TextInput value={form.weave ?? ''} onChangeText={v => set('weave', v)} placeholder="e.g. Dobby — fine dobby" placeholderTextColor={T.muted} style={fm.input} />

                <Text style={fm.label}>WIDTH BASIS</Text>
                <Text style={fm.hint}>Reed Space is the construction anchor. Greige Width is calculated automatically.</Text>
                <View style={fm.chipRow}>
                    <View style={[fm.chip, fm.chipActive]}>
                        <Text style={[fm.chipTxt, fm.chipTxtActive]}>Reed space</Text>
                    </View>
                    <View style={[fm.chip, fm.chipDisabled]}>
                        <Text style={[fm.chipTxt, fm.chipDisabledTxt]}>Greige width · entered</Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={fm.label}>REED SPACE · INPUT</Text>
                        <View style={fm.inputRow}>
                            <TextInput value={String(form.reed_space ?? '')} onChangeText={v => set('reed_space', parseFloat(v) || 0)} keyboardType="numeric" style={[fm.input, { flex: 1 }]} />
                            <Text style={fm.unit}>"</Text>
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={fm.label}>WARP SHRINK</Text>
                        <View style={fm.inputRow}>
                            <TextInput value={String(form.warp_shrink ?? '')} onChangeText={v => set('warp_shrink', parseFloat(v) || 0)} keyboardType="numeric" style={[fm.input, { flex: 1 }]} />
                            <Text style={fm.unit}>%</Text>
                        </View>
                    </View>
                </View>

                <Text style={fm.label}>GREIGE WIDTH · REQUIRED</Text>
                <Text style={fm.hint}>actual off-loom measurement · required</Text>
                <View style={fm.inputRow}>
                    <TextInput
                        value={greigeWidthText}
                        onChangeText={v => {
                            if (!/^\d*(?:\.\d*)?$/.test(v)) return;
                            setGreigeWidthText(v);
                            const parsed = Number(v);
                            set('greige_width', v !== '' && Number.isFinite(parsed) ? parsed : 0);
                        }}
                        onBlur={() => {
                            const parsed = Number(greigeWidthText);
                            if (Number.isFinite(parsed) && parsed > 0) {
                                setGreigeWidthText(greigeWidthText.replace(/\.$/, ''));
                                set('greige_width', parsed);
                            }
                        }}
                        keyboardType="decimal-pad"
                        style={[fm.input, { flex: 1 }]}
                        placeholder="Enter measured greige width"
                        placeholderTextColor={T.muted}
                    />
                    <Text style={fm.unit}>"</Text>
                </View>

                <Text style={fm.label}>WARP YARNS</Text>
                {(form.warp_yarns ?? []).map((y: any, i: number) => (
                    <YarnLineRow key={i} yarn={y} type="warp" onChange={(k, v) => updateYarn('warp', i, k, v)} onRemove={() => removeYarn('warp', i)} />
                ))}
                <TouchableOpacity style={fm.addBtn} onPress={() => setPickerFor('warp')}>
                    <Text style={fm.addBtnTxt}>+ Add warp yarn</Text>
                </TouchableOpacity>

                <Text style={fm.label}>WEFT YARNS</Text>
                {(form.weft_yarns ?? []).map((y: any, i: number) => (
                    <YarnLineRow key={i} yarn={y} type="weft" onChange={(k, v) => updateYarn('weft', i, k, v)} onRemove={() => removeYarn('weft', i)} />
                ))}
                <TouchableOpacity style={fm.addBtn} onPress={() => setPickerFor('weft')}>
                    <Text style={fm.addBtnTxt}>+ Add weft yarn</Text>
                </TouchableOpacity>

                <Text style={fm.label}>SELVEDGE</Text>
                <Text style={fm.hint}>optional · cost only, excluded from GSM</Text>
                {(form.selvedge_yarns ?? []).map((y: any, i: number) => (
                    <YarnLineRow key={i} yarn={y} type="selvedge" onChange={(k, v) => updateYarn('selvedge', i, k, v)} onRemove={() => removeYarn('selvedge', i)} />
                ))}
                <TouchableOpacity style={fm.addBtn} onPress={() => setPickerFor('selvedge')}>
                    <Text style={fm.addBtnTxt}>+ Select selvedge yarn</Text>
                </TouchableOpacity>

                <Text style={fm.label}>WASTAGE</Text>
                <Text style={fm.hint}>adds to yarn cost only — does not change GSM / fabric weight</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={fm.label}>WARP WASTAGE</Text>
                        <View style={fm.inputRow}>
                            <TextInput value={String(form.warp_wastage ?? '0')} onChangeText={v => set('warp_wastage', parseFloat(v) || 0)} keyboardType="numeric" style={[fm.input, { flex: 1 }]} placeholder="0" placeholderTextColor={T.muted} />
                            <Text style={fm.unit}>%</Text>
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={fm.label}>WEFT WASTAGE</Text>
                        <View style={fm.inputRow}>
                            <TextInput value={String(form.weft_wastage ?? '6')} onChangeText={v => set('weft_wastage', parseFloat(v) || 0)} keyboardType="numeric" style={[fm.input, { flex: 1 }]} placeholder="6" placeholderTextColor={T.muted} />
                            <Text style={fm.unit}>%</Text>
                        </View>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={fm.label}>FINISHED WIDTH</Text>
                        <Text style={fm.hint}>optional</Text>
                        <View style={fm.inputRow}>
                            <TextInput editable={!form.finish_locked} value={form.fin_width ? String(form.fin_width) : ''} onChangeText={v => set('fin_width', parseFloat(v) || 0)} keyboardType="numeric" style={[fm.input, { flex: 1 }]} placeholder="58" placeholderTextColor={T.muted} />
                            <Text style={fm.unit}>"</Text>
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={fm.label}>FINISH SHRINK</Text>
                        <View style={fm.inputRow}>
                            <TextInput value={String(form.gf_shrink ?? 0)} onChangeText={v => set('gf_shrink', parseFloat(v) || 0)} keyboardType="numeric" style={[fm.input, { flex: 1 }]} placeholder="0" placeholderTextColor={T.muted} />
                            <Text style={fm.unit}>%</Text>
                        </View>
                    </View>
                </View>

                {/* LIVE SPEC panel (updates as you type) */}
                <LiveSpecPanel design={{
                    ...form,
                    width_basis: 'reed',
                    reed_space: form.reed_space,
                    greige_width: form.greige_width,
                }} />

                <TouchableOpacity style={[fm.saveBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
                    <Text style={fm.saveTxt}>{saving ? 'Saving…' : design ? 'Update design' : 'Create design'}</Text>
                </TouchableOpacity>
            </ScrollView>
            <YarnPickerModal
                visible={pickerFor !== null}
                title={
                    pickerFor === 'warp'
                        ? 'Select warp yarn'
                        : pickerFor === 'weft'
                            ? 'Select weft yarn'
                            : 'Select selvedge yarn'
                }
                onSelect={(item) => {
                    if (pickerFor) {
                        addYarn(item, pickerFor);
                    }
                }}
                onClose={() => setPickerFor(null)}
            />
            <CategoryPickerModal
                visible={categoryPickerVisible}
                onSelect={(item) => {
                    set('category', item.ItmName);
                }}
                onClose={() => setCategoryPickerVisible(false)}
            />

        </>
    );
}
const fm = StyleSheet.create({
    fixedBasis: { backgroundColor: T.sub, borderRadius: 10, borderWidth: 1, borderColor: T.border, padding: 12 },
    fixedBasisTitle: { fontSize: 12, fontWeight: '800', color: T.ink },
    fixedBasisText: { fontSize: 11, lineHeight: 16, color: T.muted, marginTop: 4 },
    editBanner: { backgroundColor: T.copper + '15', borderWidth: 1, borderColor: T.copper + '55', borderRadius: 10, padding: 12, marginBottom: 4 },
    editTxt: { fontSize: 12, color: T.ink, lineHeight: 17 },
    editCancel: { fontSize: 12, fontWeight: '700', color: T.copper, marginTop: 6 },
    label: { fontSize: 10, fontWeight: '700', color: T.muted, letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
    hint: { fontSize: 11, color: T.muted, marginTop: -4, marginBottom: 6 },
    input: { backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.ink },
    inputRO: { backgroundColor: T.sub, justifyContent: 'center' },
    roTxt: { fontSize: 14, color: T.ink, fontWeight: '600' },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    unit: { fontSize: 14, color: T.muted, fontWeight: '600' },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: T.sub },
    chipActive: { backgroundColor: T.ink },
    chipDisabled: { backgroundColor: T.sub, borderWidth: 1, borderColor: T.border },
    chipTxt: { fontSize: 13, fontWeight: '600', color: T.muted },
    chipTxtActive: { color: '#fff' },
    chipDisabledTxt: { color: T.muted },
    addBtn: { borderWidth: 1.5, borderColor: T.copper, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 4 },
    addBtnTxt: { fontSize: 14, fontWeight: '700', color: T.copper },
    saveBtn: { backgroundColor: T.copper, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    saveTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ═══════════════════════════════════════════════════════════════
// TAB 3 — SUB DESIGN / COLOURWAY
// ═══════════════════════════════════════════════════════════════
function DesignPickerModal({ visible, onSelect, onClose, onlyType }: {
    visible: boolean;
    onSelect: (d: Design) => void;
    onClose: () => void;
    onlyType?: 'YD' | 'PD';          // Colourway passes 'YD' → only yarn-dyed designs
}) {
    const { yearno } = useERP();
    const [designs, setDesigns] = useState<Design[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const seq = useRef(0);

    useEffect(() => { if (!visible) setSearch(''); }, [visible]);

    // Server search (debounced) so designs beyond the first 200 are found too.
    useEffect(() => {
        if (!visible) return;
        const mySeq = ++seq.current;
        const timer = setTimeout(() => {
            setLoading(true);
            DesignAPI.list({
                page: 1, per_page: 200, limit: 200, yearno,
                type: onlyType || undefined,
                search: search.trim() || undefined,
            } as any)
                .then(r => {
                    if (mySeq !== seq.current) return;
                    const envelope: any = r.data.data;
                    setDesigns(Array.isArray(envelope) ? envelope : (envelope?.data ?? []));
                })
                .catch(() => { if (mySeq === seq.current) setDesigns([]); })
                .finally(() => { if (mySeq === seq.current) setLoading(false); });
        }, search.trim() ? 350 : 0);
        return () => clearTimeout(timer);
    }, [visible, search, onlyType, yearno]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const byType = onlyType
            ? designs.filter(d => String(d.type || '').toUpperCase() === onlyType)
            : designs;
        return !q ? byType : byType.filter(d =>
            d.code.toLowerCase().includes(q) || String(d.category || '').toLowerCase().includes(q)
            || dsnCodeOf(d).toLowerCase().includes(q)
        );
    }, [designs, search, onlyType]);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={yp.overlay}>
                <View style={yp.sheet}>
                    <View style={yp.handle} />
                    <View style={yp.header}>
                        <Text style={yp.title}>{onlyType === 'YD' ? 'Select Yarn-Dyed Design' : 'Select Main Design'}</Text>
                        <TouchableOpacity onPress={onClose} style={yp.closeBtn}><Text style={yp.closeTxt}>✕</Text></TouchableOpacity>
                    </View>
                    <View style={yp.searchWrap}>
                        <TextInput value={search} onChangeText={setSearch} placeholder="Search design..." placeholderTextColor={T.muted} style={yp.search} />
                    </View>
                    {loading ? <ActivityIndicator color={T.copper} style={{ padding: 24 }} /> : (
                        <View style={yp.listFrame}>
                            <FlatList
                                data={filtered}
                                keyExtractor={d => d.id}
                                keyboardShouldPersistTaps="handled"
                                ListEmptyComponent={<Text style={[yp.yarnSub, { padding: 18, textAlign: 'center' }]}>
                                    {onlyType === 'YD' ? 'No yarn-dyed (YD) design found.' : 'No design found.'}
                                </Text>}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={yp.row} onPress={() => { onSelect(item); onClose(); }}>
                                        <Text style={yp.yarnName}>{designLabel(item)}</Text>
                                        <Text style={yp.yarnSub}>{item.category} · {item.type}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

type Shade = {
    key: string;
    source: 'dyeing' | 'legacy';
    mapping_id?: string | null;
    shd_code: number;
    shd_name: string;
    color_name: string;
    hex: string;
    shade_no: string;
    colour_id?: string | null;
    colour_code?: string | null;
    colour_name?: string | null;
    party_acc_code?: string | null;
    party_name?: string | null;
    party_shade_no?: string | null;
    legacy: boolean;
};
type ShadeBand = Shade & { mi_id: string; blend_ratio?: string | null; thread_count: number };

function ShadePickerModal({ visible, onSelect, onClose }: {
    visible: boolean;
    onSelect: (shade: Shade) => void;
    onClose: () => void;
}) {
    const { prpcode, strcode, yearno } = useERP();
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState<Shade[]>([]);
    const [loading, setLoading] = useState(false);
    const requestSeq = useRef(0);

    useEffect(() => {
        if (!visible) {
            setSearch('');
            setRows([]);
            setLoading(false);
            return;
        }

        const seq = ++requestSeq.current;
        const timer = setTimeout(() => {
            setLoading(true);
            client.get('/design-dyeing/shade-options', {
                params: { prpcode, strcode, yearno, search: search.trim() },
            })
                .then(r => {
                    if (seq !== requestSeq.current) return;
                    const data = Array.isArray(r.data?.data) ? r.data.data : [];
                    setRows(data.map((x: any): Shade => {
                        const shdCode = Number(x.shd_code || 0);
                        const isLegacy = Boolean(x.legacy) || x.source === 'legacy';
                        const logicalName = String(x.colour_name || x.shd_name || `ERP ${shdCode}`).trim();
                        return {
                            key: String(x.key || `${isLegacy ? 'L' : 'D'}:${x.mapping_id || shdCode}`),
                            source: isLegacy ? 'legacy' : 'dyeing',
                            mapping_id: x.mapping_id ? String(x.mapping_id) : null,
                            shd_code: shdCode,
                            shd_name: String(x.shd_name || logicalName).trim(),
                            color_name: logicalName,
                            hex: /^#[0-9A-Fa-f]{6}$/.test(String(x.hex || '')) ? String(x.hex) : '#808080',
                            shade_no: String(shdCode),
                            colour_id: x.colour_id ? String(x.colour_id) : null,
                            colour_code: x.colour_code ? String(x.colour_code) : null,
                            colour_name: x.colour_name ? String(x.colour_name) : null,
                            party_acc_code: x.party_acc_code ? String(x.party_acc_code) : null,
                            party_name: x.party_name ? String(x.party_name) : null,
                            party_shade_no: x.party_shade_no ? String(x.party_shade_no) : null,
                            legacy: isLegacy,
                        };
                    }).filter((x: Shade) => x.shd_code > 0));
                })
                .catch(() => {
                    if (seq === requestSeq.current) setRows([]);
                })
                .finally(() => {
                    if (seq === requestSeq.current) setLoading(false);
                });
        }, 250);

        return () => clearTimeout(timer);
    }, [visible, search, prpcode, strcode, yearno]);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={yp.overlay}><View style={yp.sheet}>
                <View style={yp.handle} />
                <View style={yp.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={yp.title}>Select dyed shade</Text>
                        <Text style={yp.yarnSub}>Dyeing master + existing ERP shades</Text>
                    </View>
                    <TouchableOpacity onPress={onClose}><Text style={yp.closeTxt}>✕</Text></TouchableOpacity>
                </View>
                <View style={yp.searchWrap}>
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search colour, ERP shade, party or party shade no..."
                        placeholderTextColor={T.muted}
                        style={yp.search}
                        autoFocus
                    />
                </View>
                <View style={yp.listFrame}>
                    {loading ? (
                        <ActivityIndicator color={T.copper} style={{ padding: 24 }} />
                    ) : (
                        <FlatList
                            data={rows}
                            keyExtractor={x => x.key}
                            keyboardShouldPersistTaps="handled"
                            ListEmptyComponent={<Text style={[yp.yarnSub, { padding: 18, textAlign: 'center' }]}>No matching ERP shade found.</Text>}
                            renderItem={({ item }) => {
                                const detail = item.legacy
                                    ? `ERP ${item.shd_code} · Legacy / no party mapping`
                                    : `${item.party_name || item.party_acc_code || 'Job Work Party'}${item.party_shade_no ? ` · ${item.party_shade_no}` : ''} · ERP ${item.shd_code}`;
                                return (
                                    <TouchableOpacity style={yp.row} onPress={() => { onSelect(item); onClose(); }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: item.hex, borderWidth: 1, borderColor: T.border }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={yp.yarnName}>{item.colour_name || item.shd_name}</Text>
                                                {!item.legacy && item.shd_name !== item.colour_name ? <Text style={yp.yarnSub}>{item.shd_name}</Text> : null}
                                                <Text style={yp.yarnSub}>{detail}</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    )}
                </View>
            </View></View>
        </Modal>
    );
}

function YarnShadeBlock({ yarn, direction, bands, onChange }: {
    yarn: any;
    direction: 'warp' | 'weft';
    bands: ShadeBand[];
    onChange: (rows: ShadeBand[]) => void;
}) {
    const [picker, setPicker] = useState(false);
    const [pendingShade, setPendingShade] = useState<Shade | null>(null);
    const [count, setCount] = useState('1');
    const unit = direction === 'warp' ? `${Number(yarn.epi || 0)} EPI` : `${Number(yarn.ppi || 0)} PPI`;

    const add = () => {
        if (!pendingShade) { AppAlert.alert('Shade required', 'Select a shade first.'); return; }
        const n = Math.max(1, Math.round(Number(count) || 1));
        onChange([...bands, {
            ...pendingShade,
            mi_id: yarn.mi_id,
            blend_ratio: yarn.blend_ratio ?? null,
            thread_count: n,
        }]);
        setPendingShade(null);
        setCount('1');
    };

    return (
        <View style={cw3.yarnBlock}>
            <View style={cw3.yarnHeader}>
                <View style={[cw3.dirBadge, direction === 'weft' && { backgroundColor: T.pd + '20' }]}>
                    <Text style={[cw3.dirText, direction === 'weft' && { color: T.pd }]}>{direction.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={cw3.yarnName}>{yarn.name}</Text>
                    <Text style={cw3.yarnMeta}>{unit}{yarn.blend_ratio ? ` · ${yarn.blend_ratio}` : ''}</Text>
                </View>
            </View>

            {bands.length > 0 && (
                <View style={{ marginTop: 10 }}>
                    {bands.map((b, i) => (
                        <View key={`${b.color_name}-${i}`} style={cw3.bandRow}>
                            <View style={[cw3.bandDot, { backgroundColor: b.hex }]} />
                            <Text style={cw3.bandName}>{b.color_name}</Text>
                            <Text style={cw3.bandCount}>{b.thread_count}</Text>
                            <TouchableOpacity onPress={() => onChange(bands.filter((_, x) => x !== i))}>
                                <Text style={cw3.remove}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            <View style={cw3.addRow}>
                <TouchableOpacity style={cw3.shadeSelect} onPress={() => setPicker(true)}>
                    {pendingShade ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                            <View style={[cw3.bandDot, { backgroundColor: pendingShade.hex }]} />
                            <Text style={cw3.shadeSelectText}>{pendingShade.color_name}</Text>
                        </View>
                    ) : <Text style={cw3.shadeSelectText}>Select shade ▾</Text>}
                </TouchableOpacity>
                <TextInput value={count} onChangeText={setCount} keyboardType="numeric" style={cw3.countInput} />
                <TouchableOpacity style={cw3.addBandBtn} onPress={add}><Text style={cw3.addBandText}>Add</Text></TouchableOpacity>
            </View>

            <ShadePickerModal visible={picker} onSelect={setPendingShade} onClose={() => setPicker(false)} />
        </View>
    );
}

function ColourwayTab({ design, onNavigateToCatalog, editSub = null, onEditDone, onClear }: {
    design: Design | null;
    onNavigateToCatalog: () => void;
    editSub?: any | null;                       // saved colourway opened from Catalog → Edit
    onEditDone?: (saved: boolean) => void;
    onClear?: () => void;                       // clear the selected design everywhere
}) {
    const { prpcode, strcode, yearno } = useERP();
    const [baseDesign, setBaseDesign] = useState<Design | null>(design);
    const prefilledFor = useRef<string | null>(null);
    const [showDesignPicker, setShowDesignPicker] = useState(false);
    const [saving, setSaving] = useState(false);
    const [subCode, setSubCode] = useState('');
    const [codeError, setCodeError] = useState('');

    // Default code = next free "<DESIGN>-NN" (not always -01, which fails once -01 is saved).
    // Only replaces the code if the user has not typed / edit-mode has not filled another one.
    const applyDefaultCode = useCallback((d: Design | null) => {
        setCodeError('');
        if (!d?.code) return;
        const base = d.code.replace(/\s+/g, '-');
        const first = `${base}-01`;
        setSubCode(first);
        client.get(`/designs/${d.id}/colourways`, { params: { prpcode, strcode, yearno } })
            .then(r => {
                const rows: any[] = Array.isArray(r.data?.data) ? r.data.data : [];
                const used = new Set(rows.map(x => String(x?.code ?? '').trim().toUpperCase()));
                const esc = base.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const re = new RegExp(`^${esc}-(\\d+)$`);
                let max = 0;
                used.forEach(c => { const m = c.match(re); if (m) max = Math.max(max, Number(m[1])); });
                let n = max + 1;
                let next = `${base}-${String(n).padStart(2, '0')}`;
                while (used.has(next.toUpperCase())) { n += 1; next = `${base}-${String(n).padStart(2, '0')}`; }
                setSubCode(prev => (prev === first ? next : prev));
            })
            .catch(() => { /* keep -01; backend will suggest a free code if it clashes */ });
    }, [prpcode, strcode, yearno]);
    const [commercialName, setCommercialName] = useState('');
    const [warpBands, setWarpBands] = useState<Record<string, ShadeBand[]>>({});
    const [weftBands, setWeftBands] = useState<Record<string, ShadeBand[]>>({});

    const loadFull = useCallback(async (d: Design) => {
        try {
            const res = await DesignAPI.get(d.id);
            setBaseDesign({ ...d, ...res.data.data });
        } catch {
            setBaseDesign(d);
        }
    }, []);

    // Selection cleared from outside (Clear button) → back to the blank form.
    useEffect(() => {
        if (design) return;
        setBaseDesign(null);
        setSubCode(''); setCommercialName('');
        setWarpBands({}); setWeftBands({});
        prefilledFor.current = null;
    }, [design]);

    useEffect(() => {
        if (!design) return;
        loadFull(design);
        applyDefaultCode(design);
        setWarpBands({}); setWeftBands({}); setCommercialName('');
    }, [design?.id, loadFull]);

    const warpYarns = baseDesign?.warp_yarns ?? [];
    const weftYarns = baseDesign?.weft_yarns ?? [];
    const allWarp = Object.values(warpBands).flat();
    const allWeft = Object.values(weftBands).flat();
    const editing = !!editSub?.id;

    // EDIT MODE: fill the same form with the saved colourway (once per colourway).
    useEffect(() => {
        if (!editSub?.id) { prefilledFor.current = null; return; }
        if (!baseDesign || String(baseDesign.id) !== String(editSub.md_id ?? baseDesign.id)) return;
        if (prefilledFor.current === String(editSub.id)) return;
        if (warpYarns.length + weftYarns.length === 0) return;   // wait until design yarns are loaded
        prefilledFor.current = String(editSub.id);

        let unmatched = 0;
        const build = (side: 'warp' | 'weft', yarns: any[]) => {
            const out: Record<string, ShadeBand[]> = {};
            savedBands(editSub, side).forEach((b, i) => {
                let idx = yarns.findIndex(y => String(y?.mi_id ?? '').trim() === b.mi_id
                    && String(y?.blend_ratio ?? '').trim() === String(b.blend_ratio ?? ''));
                if (idx < 0) idx = yarns.findIndex(y => String(y?.mi_id ?? '').trim() === b.mi_id);
                if (idx < 0) { unmatched += 1; return; }
                const y = yarns[idx];
                const key = `${y.mi_id}|${y.blend_ratio ?? ''}|${idx}`;
                const numeric = /^\d+$/.test(b.shade);
                (out[key] = out[key] || []).push({
                    key: `S:${side}:${i}`,
                    source: numeric ? 'dyeing' : 'legacy',
                    mapping_id: null,
                    shd_code: numeric ? Number(b.shade) : 0,
                    shd_name: b.color_name || b.shade,
                    color_name: b.color_name || b.shade,
                    hex: b.hex,
                    shade_no: b.shade,
                    legacy: !numeric,
                    mi_id: y.mi_id,
                    blend_ratio: y.blend_ratio ?? null,
                    thread_count: Math.max(1, Math.round(b.thread_count ?? 1)),
                });
            });
            return out;
        };

        setSubCode(String(editSub.code || ''));
        setCommercialName(String(editSub.commercial_name || ''));
        setWarpBands(build('warp', warpYarns));
        setWeftBands(build('weft', weftYarns));
        if (unmatched > 0) {
            AppAlert.alert('Check shades', `${unmatched} saved shade row(s) no longer match a yarn of this design and were not loaded.`);
        }
    }, [editSub, baseDesign, warpYarns, weftYarns]);

    // One button: forget the selected design + everything typed → blank form.
    const clearAll = () => {
        prefilledFor.current = null;
        setBaseDesign(null);
        setSubCode(''); setCommercialName('');
        setWarpBands({}); setWeftBands({});
        onClear?.();
    };

    const cancelEdit = () => {
        prefilledFor.current = null;
        setWarpBands({}); setWeftBands({}); setCommercialName('');
        if (baseDesign) applyDefaultCode(baseDesign);
        onEditDone?.(false);
    };

    const save = async () => {
        if (!baseDesign) { AppAlert.alert('Main Design required'); return; }
        if (!subCode.trim()) { AppAlert.alert('Sub Design code required'); return; }
        if (baseDesign.type === 'YD') {
            const missingWarp = warpYarns.some((y: any, i: number) => {
                const key = `${y.mi_id}|${y.blend_ratio ?? ''}|${i}`;
                return (warpBands[key] || []).length === 0;
            });
            const missingWeft = weftYarns.some((y: any, i: number) => {
                const key = `${y.mi_id}|${y.blend_ratio ?? ''}|${i}`;
                return (weftBands[key] || []).length === 0;
            });
            if (missingWarp || missingWeft) {
                AppAlert.alert('Shade required', 'Assign at least one dyed shade to every Warp and Weft yarn before saving.');
                return;
            }
        }
        if (baseDesign.type === 'PD' && !commercialName.trim()) {
            AppAlert.alert('Commercial shade required', 'Enter the final piece-dyed shade name.'); return;
        }

        setSaving(true);
        try {
            // Saved legacy text shades (e.g. "MLL 2113") have shd_code 0 → keep their text.
            const shadeValue = (r: ShadeBand) => (r.shd_code > 0 ? String(r.shd_code) : String(r.shade_no || ''));
            const toColors = (rows: ShadeBand[]) => rows.map(r => ({
                mi_id: r.mi_id, blend_ratio: r.blend_ratio ?? null,
                shade: shadeValue(r), color_name: r.shd_name || r.color_name, hex: r.hex,
            }));
            const toPatterns = (rows: ShadeBand[]) => rows.map(r => ({
                mi_id: r.mi_id, blend_ratio: r.blend_ratio ?? null,
                shade: shadeValue(r), color_name: r.shd_name || r.color_name, hex: r.hex,
                thread_count: r.thread_count,
            }));

            const body = {
                code: subCode.trim(),
                commercial_name: commercialName.trim() || undefined,
                warp_colors: toColors(allWarp),
                weft_colors: toColors(allWeft),
                warp_patterns: toPatterns(allWarp),
                weft_patterns: toPatterns(allWeft),
            };

            if (editing) {
                // Backend route: PUT /design-colourways/{sdId}
                const res: any = await client.put(`/design-colourways/${encodeURIComponent(String(editSub.id))}`, body, {
                    params: { yearno, prpcode, strcode },
                });
                AppAlert.alert('Updated', res?.data?.message || 'Sub Design updated successfully.');
                prefilledFor.current = null;
                setWarpBands({}); setWeftBands({}); setCommercialName('');
                applyDefaultCode(baseDesign);
                onEditDone?.(true);
                return;
            }

            const res: any = await DesignAPI.addColourway(baseDesign.id, body as any);
            const d: any = res?.data ?? {};
            const sync = String(d.erp_sync_status || '').toUpperCase();
            const msg = [
                `${body.code}: ${d.message || 'Sub Design saved successfully.'}`,
                d.shade_code ? `ERP shade: ${d.shade_code}` : '',
                sync && sync !== 'SYNCED' && d.erp_sync_message ? `ERP: ${d.erp_sync_message}` : '',
            ].filter(Boolean).join('\n');
            AppAlert.alert(sync && sync !== 'SYNCED' ? 'Saved (ERP pending)' : 'Saved', msg);
            setWarpBands({}); setWeftBands({});
            applyDefaultCode(baseDesign);
        } catch (e: any) {
            const data = e?.response?.data;
            const codeErr = Array.isArray(data?.errors?.code) ? String(data.errors.code[0] || '') : '';
            if (codeErr) setCodeError(codeErr);
            const suggested = typeof data?.suggested_code === 'string' ? data.suggested_code.trim() : '';
            if (suggested && !editing) {
                setSubCode(suggested);
                AppAlert.alert('Code already used',
                    `${codeErr || apiErrorText(e, 'Sub Design code already exists.')}\n\n` +
                    `Naya code ${suggested} bhar diya hai — shades waise hi hain, Save dobara dabao.`);
            } else {
                AppAlert.alert(editing ? 'Update failed' : 'Save failed',
                    apiErrorText(e, editing ? 'Unable to update Sub Design' : 'Unable to save Sub Design'));
            }
        } finally { setSaving(false); }
    };

    return (
        <>
            <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
                <View style={cw3.intro}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <Text style={[cw3.introTitle, { flex: 1 }]}>
                            {editing ? `EDIT SUB DESIGN · ${editSub.code}` : 'NEW SUB DESIGN'}
                        </Text>
                        {editing ? (
                            <TouchableOpacity onPress={cancelEdit} style={cw3.cancelEditBtn}>
                                <Text style={cw3.cancelEditText}>Cancel edit</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <Text style={cw3.introText}>Construction stays in Main Design. This screen stores yarn-wise shades and repeat counts only.</Text>
                </View>

                <View style={cw3.labelRow}>
                    <Text style={[cw3.label, { flex: 1 }]}>MAIN DESIGN · YARN-DYED</Text>
                    {baseDesign && !editing ? (
                        <TouchableOpacity onPress={clearAll} style={cw3.clearBtn}>
                            <Text style={cw3.clearText}>✕ Clear</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
                <TouchableOpacity style={[cw3.picker, editing && { opacity: 0.6 }]} disabled={editing} onPress={() => setShowDesignPicker(true)}>
                    <Text style={cw3.pickerText}>{baseDesign ? `${designLabel(baseDesign)} · ${baseDesign.type}` : 'Select Main Design'}</Text>
                    <Text>▾</Text>
                </TouchableOpacity>

                {baseDesign && (
                    <>
                        <Text style={cw3.label}>SUB DESIGN CODE</Text>
                        <TextInput value={subCode} onChangeText={v => { setSubCode(v); if (codeError) setCodeError(''); }}
                            style={[cw3.input, codeError ? { borderColor: T.red } : null]}
                            placeholder="e.g. RIB-145-NAVY" placeholderTextColor={T.muted} />
                        {codeError ? (
                            <Text style={{ color: T.red, fontSize: 11, fontWeight: '700', marginTop: 4 }}>{codeError}</Text>
                        ) : null}

                        {baseDesign.type === 'YD' ? (
                            <>
                                <Text style={cw3.label}>COMMERCIAL NAME</Text>
                                <TextInput
                                    value={commercialName}
                                    onChangeText={setCommercialName}
                                    style={cw3.input}
                                    placeholder="optional market name"
                                    placeholderTextColor={T.muted}
                                />
                                <Text style={cw3.section}>WOVEN CHECK</Text>
                                <View style={cw3.preview}>
                                    <View style={cw3.previewLine}>
                                        {[...allWarp, ...allWeft].slice(0, 80).map((b, i) => (
                                            <View key={i} style={{ width: Math.max(3, Math.min(20, b.thread_count * 2)), height: 42, backgroundColor: b.hex }} />
                                        ))}
                                    </View>
                                    <Text style={cw3.previewText}>{allWarp.length} warp bands · {allWeft.length} weft bands</Text>
                                </View>

                                <Text style={cw3.section}>WARP SHADES</Text>
                                {warpYarns.map((y: any, i: number) => {
                                    const key = `${y.mi_id}|${y.blend_ratio ?? ''}|${i}`;
                                    return <YarnShadeBlock key={key} yarn={y} direction="warp" bands={warpBands[key] ?? []} onChange={rows => setWarpBands(p => ({ ...p, [key]: rows }))} />;
                                })}

                                <Text style={cw3.section}>WEFT SHADES</Text>
                                {weftYarns.map((y: any, i: number) => {
                                    const key = `${y.mi_id}|${y.blend_ratio ?? ''}|${i}`;
                                    return <YarnShadeBlock key={key} yarn={y} direction="weft" bands={weftBands[key] ?? []} onChange={rows => setWeftBands(p => ({ ...p, [key]: rows }))} />;
                                })}
                            </>
                        ) : (
                            <>
                                <View style={cw3.pdBox}>
                                    <Text style={cw3.pdTitle}>PIECE-DYED SUB DESIGN</Text>
                                    <Text style={cw3.pdText}>The complete greige fabric is dyed after weaving. Yarn-wise shade selection is not required.</Text>
                                </View>

                                <Text style={cw3.label}>COMMERCIAL SHADE</Text>
                                <TextInput
                                    value={commercialName}
                                    onChangeText={setCommercialName}
                                    style={cw3.input}
                                    placeholder="e.g. Indigo, Olive, Charcoal"
                                    placeholderTextColor={T.muted}
                                />

                                <View style={cw3.preview}>
                                    <View style={[cw3.previewLine, cw3.pdPreview]}>
                                        <Text style={cw3.pdPreviewText}>
                                            {commercialName.trim() || 'GREIGE / SHADE PREVIEW'}
                                        </Text>
                                    </View>
                                    <Text style={cw3.previewText}>Piece-dyed commercial shade</Text>
                                </View>
                            </>
                        )}

                        <TouchableOpacity style={[cw3.save, saving && { opacity: 0.5 }]} disabled={saving} onPress={save}>
                            <Text style={cw3.saveText}>{saving ? 'Saving…' : editing ? 'Update Sub Design' : 'Save Sub Design'}</Text>
                        </TouchableOpacity>
                    </>
                )}

                {!baseDesign && <TouchableOpacity onPress={onNavigateToCatalog}><Text style={s.empty}>Select a Main Design or return to Catalog.</Text></TouchableOpacity>}
            </ScrollView>

            <DesignPickerModal
                onlyType="YD"
                visible={showDesignPicker}
                onSelect={d => { loadFull(d); applyDefaultCode(d); setWarpBands({}); setWeftBands({}); }}
                onClose={() => setShowDesignPicker(false)}
            />
        </>
    );
}

const cw3 = StyleSheet.create({
    intro: { backgroundColor: T.copper + '16', borderWidth: 1, borderColor: T.copper + '55', borderRadius: 10, padding: 12 },
    introTitle: { fontSize: 11, fontWeight: '900', color: T.copper, letterSpacing: 0.7 },
    introText: { fontSize: 11, lineHeight: 16, color: T.ink, marginTop: 4 },
    label: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
    section: { fontSize: 11, fontWeight: '900', color: T.ink, letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },
    picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 14 },
    pickerText: { fontSize: 14, color: T.ink, fontWeight: '700' },
    input: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: T.ink, fontSize: 14 },
    yarnBlock: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 12, padding: 12, marginBottom: 10 },
    yarnHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    dirBadge: { backgroundColor: T.yd + '20', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
    dirText: { color: T.yd, fontSize: 9, fontWeight: '900' },
    yarnName: { fontSize: 13, fontWeight: '800', color: T.ink },
    yarnMeta: { fontSize: 10, color: T.muted, marginTop: 2 },
    bandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: T.sub },
    bandDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: T.border },
    bandName: { flex: 1, fontSize: 12, color: T.ink, fontWeight: '700' },
    bandCount: { fontSize: 12, color: T.copper, fontWeight: '900' },
    remove: { color: T.pd, fontSize: 16, paddingLeft: 8 },
    addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    shadeSelect: { flex: 1, minHeight: 40, justifyContent: 'center', borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 10 },
    shadeSelectText: { fontSize: 12, color: T.copper, fontWeight: '700' },
    countInput: { width: 58, backgroundColor: T.sub, borderRadius: 8, paddingVertical: 9, textAlign: 'center', color: T.ink },
    addBandBtn: { backgroundColor: T.copper, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
    addBandText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    swatches: { gap: 7, paddingTop: 10, paddingRight: 10 },
    quickDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: T.border },
    paletteItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10 },
    paletteDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: T.border },
    paletteText: { fontSize: 12, color: T.ink, fontWeight: '700' },
    preview: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 10 },
    previewLine: { flexDirection: 'row', minHeight: 42, borderRadius: 7, overflow: 'hidden', backgroundColor: T.sub },
    previewText: { color: T.muted, fontSize: 10, marginTop: 6 },
    pdBox: { backgroundColor: T.sub, borderRadius: 10, padding: 14, marginTop: 16 },
    pdTitle: { fontSize: 11, fontWeight: '900', color: T.ink },
    pdText: { fontSize: 11, lineHeight: 16, color: T.muted, marginTop: 4 },
    pdPreview: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
    pdPreviewText: { color: T.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    save: { backgroundColor: T.copper, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    labelRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    clearBtn: { borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 6, backgroundColor: T.surface },
    clearText: { fontSize: 11, fontWeight: '800', color: T.muted },
    cancelEditBtn: { borderWidth: 1, borderColor: T.copper + '77', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: T.surface },
    cancelEditText: { fontSize: 11, fontWeight: '800', color: T.copper },
});// Design Picker Modal (Isolated for AliasesTab)
// function AliasesDesignPickerModal({
//     visible,
//     onSelect,
//     onClose,
// }: {
//     visible: boolean;
//     onSelect: (d: Design) => void;
//     onClose: () => void;
// }) {
//     const { yearno } = useERP();
//     const [designs, setDesigns] = useState<Design[]>([]);
//     const [search, setSearch] = useState('');
//     const [loading, setLoading] = useState(false);

//     const loadDesigns = useCallback(async () => {
//         if (!visible) return;
//         setLoading(true);
//         try {
//             const res = await DesignAPI.list({
//                 page: 1,
//                 per_page: 200,
//                 limit: 200,
//                 yearno: yearno,
//             } as any);
//             const envelope: any = res.data.data;
//             setDesigns(Array.isArray(envelope) ? envelope : (envelope?.data ?? []));
//         } catch (e) {
//             setDesigns([]);
//         } finally {
//             setLoading(false);
//         }
//     }, [visible, yearno]);

//     useEffect(() => {
//         loadDesigns();
//     }, [visible, loadDesigns]);

//     const filteredDesigns = useMemo(() => {
//         const q = search.trim().toLowerCase();
//         return !q
//             ? designs
//             : designs.filter(
//                 d =>
//                     d.code.toLowerCase().includes(q) ||
//                     String(d.category || '').toLowerCase().includes(q)
//             );
//     }, [designs, search]);

//     return (
//         <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
//             <View style={styles.modalOverlay}>
//                 <View style={styles.modalSheet}>
//                     <View style={styles.modalHandle} />
//                     <View style={styles.modalHeader}>
//                         <Text style={styles.modalTitle}>Select Main Design</Text>
//                         <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
//                             <Text style={styles.modalCloseTxt}>✕</Text>
//                         </TouchableOpacity>
//                     </View>
//                     <View style={styles.modalSearchWrap}>
//                         <TextInput
//                             value={search}
//                             onChangeText={setSearch}
//                             placeholder="Search design..."
//                             placeholderTextColor={T.muted}
//                             style={styles.modalSearch}
//                             autoFocus
//                         />
//                     </View>
//                     {loading ? (
//                         <ActivityIndicator color={T.copper} style={{ padding: 24 }} />
//                     ) : (
//                         <FlatList
//                             data={filteredDesigns}
//                             keyExtractor={d => d.id}
//                             renderItem={({ item }) => (
//                                 <TouchableOpacity
//                                     style={styles.modalRow}
//                                     onPress={() => {
//                                         onSelect(item);
//                                         onClose();
//                                     }}
//                                 >
//                                     <Text style={styles.modalRowName}>{item.code}</Text>
//                                     <Text style={styles.modalRowSub}>
//                                         {item.category} · {item.type}
//                                     </Text>
//                                 </TouchableOpacity>
//                             )}
//                             ItemSeparatorComponent={() => (
//                                 <View style={{ height: 1, backgroundColor: T.border, marginLeft: 16 }} />
//                             )}
//                             ListEmptyComponent={
//                                 !loading ? (
//                                     <Text style={styles.modalEmptyText}>No designs found</Text>
//                                 ) : null
//                             }
//                         />
//                     )}
//                 </View>
//             </View>
//         </Modal>
//     );
// }

// // Main AliasesTab Component
// // Main AliasesTab Component
// function AliasesTab({ design }: AliasesTabProps) {
//     // State
//     const [selectedDesign, setSelectedDesign] = useState<Design | null>(design);
//     const [showDesignPicker, setShowDesignPicker] = useState(false);
//     const [aliasInput, setAliasInput] = useState('');
//     const [aliases, setAliases] = useState<Alias[]>([]);
//     const [editingAliasId, setEditingAliasId] = useState<string | null>(null);
//     const [searchQuery, setSearchQuery] = useState('');

//     // refs for auto-scroll
//     const scrollViewRef = useRef<ScrollView>(null);
//     const itemRefs = useRef<Record<string, any>>({});

//     // Load aliases when design changes (simulate API call)
//     useEffect(() => {
//         if (design) {
//             setSelectedDesign(design);
//             setAliases([
//                 { id: '1', name: `${design.code}-ALIAS-1` },
//                 { id: '2', name: `${design.code}-SUMMER` },
//             ]);
//             setEditingAliasId(null);
//             setAliasInput('');
//         } else {
//             setSelectedDesign(null);
//             setAliases([]);
//         }
//     }, [design?.id]);

//     // Filter aliases based on search
//     const filteredAliases = useMemo(() => {
//         return aliases.filter(alias =>
//             alias.name.toLowerCase().includes(searchQuery.toLowerCase())
//         );
//     }, [aliases, searchQuery]);

//     // Load full design details when selected
//     const loadFullDesign = useCallback(async (d: Design) => {
//         try {
//             const res = await DesignAPI.get(d.id);
//             setSelectedDesign({ ...d, ...res.data.data });
//             setAliases([
//                 { id: '1', name: `${d.code}-ALIAS-1` },
//                 { id: '2', name: `${d.code}-SUMMER` },
//             ]);
//             setEditingAliasId(null);
//             setAliasInput('');
//         } catch {
//             setSelectedDesign(d);
//         }
//     }, []);

//     // Scroll helper: jump to a specific alias row in the list
//     const scrollToAlias = useCallback((id: string) => {
//         setTimeout(() => {
//             const node = itemRefs.current[id];
//             const scrollNode = findNodeHandle(scrollViewRef.current);
//             if (node && scrollNode && typeof node.measureLayout === 'function') {
//                 node.measureLayout(
//                     scrollNode,
//                     (_x: number, y: number) => {
//                         scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
//                     },
//                     () => { }
//                 );
//             }
//         }, 100); // small delay so layout is settled after re-render
//     }, []);

//     // Start editing: fills the top "Add New Alias" box and scrolls up to it
//     const handleEditStart = (alias: Alias) => {
//         setEditingAliasId(alias.id);
//         setAliasInput(alias.name);
//         scrollViewRef.current?.scrollTo({ y: 0, animated: true });
//     };

//     // Cancel editing — resets the top box back to "Add" mode
//     const handleEditCancel = () => {
//         setEditingAliasId(null);
//         setAliasInput('');
//     };

//     // Single handler for both Add and Update (dynamic based on editingAliasId)
//     const handleAddOrUpdateAlias = () => {
//         if (!aliasInput.trim()) {
//             AppAlert.alert('Error', 'Alias name cannot be empty.');
//             return;
//         }
//         if (!selectedDesign) {
//             AppAlert.alert('Error', 'Please select a main design first.');
//             return;
//         }

//         if (editingAliasId) {
//             // ── UPDATE MODE ──
//             const targetId = editingAliasId;
//             const newName = aliasInput.trim();

//             setAliases(prev =>
//                 prev.map(a => (a.id === targetId ? { ...a, name: newName } : a))
//             );

//             setEditingAliasId(null);
//             setAliasInput('');
//             console.log('Updated alias:', targetId, newName);

//             // auto-scroll back down to that alias's position in the list
//             scrollToAlias(targetId);
//         } else {
//             // ── ADD MODE ──
//             const newAlias: Alias = {
//                 id: Date.now().toString(),
//                 name: aliasInput.trim(),
//             };
//             setAliases(prev => [...prev, newAlias]);
//             setAliasInput('');
//             console.log('Added alias:', newAlias);
//         }
//     };

//     // Delete an alias
//     const handleDeleteAlias = (id: string) => {
//         AppAlert.alert(
//             'Delete Alias',
//             'Are you sure you want to delete this alias?',
//             [
//                 { text: 'Cancel', style: 'cancel' },
//                 {
//                     text: 'Delete',
//                     style: 'destructive',
//                     onPress: () => {
//                         setAliases(prev => prev.filter(alias => alias.id !== id));
//                         if (editingAliasId === id) {
//                             setEditingAliasId(null);
//                             setAliasInput('');
//                         }
//                         console.log('Deleted alias:', id);
//                     },
//                 },
//             ]
//         );
//     };

//     // Render
//     return (
//         <>
//             <ScrollView
//                 ref={scrollViewRef}
//                 contentContainerStyle={styles.container}
//                 keyboardShouldPersistTaps="handled"
//             >
//                 {/* Header: Selected Design */}
//                 <View style={styles.header}>
//                     <Text style={styles.headerTitle}>Aliases for Design</Text>
//                     <TouchableOpacity
//                         style={styles.picker}
//                         onPress={() => setShowDesignPicker(true)}
//                     >
//                         <Text style={styles.pickerText}>
//                             {selectedDesign ? `${selectedDesign.code} (${selectedDesign.type})` : 'Select Main Design'}
//                         </Text>
//                         <Text style={styles.pickerArrow}>▾</Text>
//                     </TouchableOpacity>
//                 </View>

//                 {/* Add / Update Alias Input — dynamic section */}
//                 <View style={styles.inputContainer}>
//                     <Text style={styles.label}>
//                         {editingAliasId ? 'UPDATE ALIAS' : 'ADD NEW ALIAS'}
//                     </Text>
//                     <View style={styles.inputRow}>
//                         <TextInput
//                             value={aliasInput}
//                             onChangeText={setAliasInput}
//                             placeholder="e.g. RIB-145-NAVY"
//                             placeholderTextColor={T.muted}
//                             style={styles.input}
//                             autoCapitalize="words"
//                         />
//                         <TouchableOpacity style={styles.addButton} onPress={handleAddOrUpdateAlias}>
//                             <Text style={styles.addButtonText}>
//                                 {editingAliasId ? 'Update' : '+ Add'}
//                             </Text>
//                         </TouchableOpacity>
//                     </View>
//                     {editingAliasId && (
//                         <TouchableOpacity onPress={handleEditCancel} style={{ marginTop: 8 }}>
//                             <Text style={{ color: T.copper, fontSize: 12, fontWeight: '700' }}>
//                                 Cancel update
//                             </Text>
//                         </TouchableOpacity>
//                     )}
//                 </View>

//                 {/* Search */}
//                 <View style={styles.searchContainer}>
//                     <Text style={styles.label}>SEARCH ALIASES</Text>
//                     <TextInput
//                         value={searchQuery}
//                         onChangeText={setSearchQuery}
//                         placeholder="Search..."
//                         placeholderTextColor={T.muted}
//                         style={styles.searchInput}
//                     />
//                 </View>

//                 {/* Aliases List */}
//                 <View style={styles.listHeader}>
//                     <Text style={styles.listTitle}>ALIASES LIST ({filteredAliases.length})</Text>
//                 </View>

//                 {filteredAliases.length === 0 ? (
//                     <View style={styles.emptyContainer}>
//                         <Text style={styles.emptyText}>No aliases found.</Text>
//                     </View>
//                 ) : (
//                     <View style={styles.listContent}>
//                         {filteredAliases.map((item, idx) => (
//                             <View key={item.id}>
//                                 <View
//                                     ref={(ref) => { itemRefs.current[item.id] = ref; }}
//                                     style={[
//                                         styles.aliasItem,
//                                         editingAliasId === item.id && styles.aliasItemActive,
//                                     ]}
//                                 >
//                                     <View style={styles.aliasRow}>
//                                         <Text style={styles.aliasName}>{item.name}</Text>
//                                         <View style={styles.aliasActions}>
//                                             <TouchableOpacity
//                                                 style={styles.actionButton}
//                                                 onPress={() => handleEditStart(item)}
//                                             >
//                                                 <Text style={styles.actionButtonText}>Edit</Text>
//                                             </TouchableOpacity>
//                                             <TouchableOpacity
//                                                 style={[styles.actionButton, styles.deleteButton]}
//                                                 onPress={() => handleDeleteAlias(item.id)}
//                                             >
//                                                 <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
//                                                     Delete
//                                                 </Text>
//                                             </TouchableOpacity>
//                                         </View>
//                                     </View>
//                                 </View>
//                                 {idx < filteredAliases.length - 1 && <View style={styles.separator} />}
//                             </View>
//                         ))}
//                     </View>
//                 )}

//                 {/* Save Button — logs all aliases with the selected design attached */}
//                 <TouchableOpacity
//                     style={styles.saveButton}
//                     onPress={() => {
//                         const payload = aliases.map(alias => ({
//                             ...alias,
//                             design_id: selectedDesign?.id,
//                             design_code: selectedDesign?.code,
//                         }));
//                         console.log('SAVED ALIASES', payload);
//                         AppAlert.alert('Success', `Aliases saved for ${selectedDesign?.code || 'design'}.`);
//                     }}
//                 >
//                     <Text style={styles.saveButtonText}>Save Aliases</Text>
//                 </TouchableOpacity>
//             </ScrollView>

//             {/* Isolated Design Picker Modal */}
//             <AliasesDesignPickerModal
//                 visible={showDesignPicker}
//                 onSelect={(d) => {
//                     loadFullDesign(d);
//                     setShowDesignPicker(false);
//                 }}
//                 onClose={() => setShowDesignPicker(false)}
//             />
//         </>
//     );
// }
// // Styles
// const styles = StyleSheet.create({
//     // Modal Styles
//     modalOverlay: {
//         flex: 1,
//         backgroundColor: 'rgba(0,0,0,0.4)',
//         justifyContent: 'flex-end',
//     },
//     modalSheet: {
//         backgroundColor: T.surface,
//         borderTopLeftRadius: 16,
//         borderTopRightRadius: 16,
//         maxHeight: '85%',
//     },
//     modalHandle: {
//         width: 40,
//         height: 4,
//         backgroundColor: T.border,
//         borderRadius: 2,
//         alignSelf: 'center',
//         marginTop: 10,
//     },
//     modalHeader: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         paddingHorizontal: 16,
//         paddingVertical: 14,
//         borderBottomWidth: 1,
//         borderBottomColor: T.border,
//     },
//     modalTitle: {
//         fontSize: 16,
//         fontWeight: '700',
//         color: T.ink,
//     },
//     modalCloseBtn: {
//         padding: 4,
//     },
//     modalCloseTxt: {
//         fontSize: 16,
//         color: T.muted,
//     },
//     modalSearchWrap: {
//         paddingHorizontal: 16,
//         paddingVertical: 10,
//         borderBottomWidth: 1,
//         borderBottomColor: T.border,
//     },
//     modalSearch: {
//         backgroundColor: T.sub,
//         borderRadius: 10,
//         paddingHorizontal: 12,
//         paddingVertical: 9,
//         fontSize: 14,
//         color: T.ink,
//     },
//     modalRow: {
//         paddingHorizontal: 16,
//         paddingVertical: 12,
//     },
//     modalRowName: {
//         fontSize: 14,
//         fontWeight: '600',
//         color: T.ink,
//     },
//     modalRowSub: {
//         fontSize: 12,
//         color: T.muted,
//         marginTop: 2,
//     },
//     modalEmptyText: {
//         padding: 16,
//         color: T.muted,
//         textAlign: 'center',
//     },

//     // Main Container
//     container: {
//         padding: 14,
//         paddingBottom: 30,
//         backgroundColor: T.bg,
//     },
//     header: {
//         marginBottom: 16,
//     },
//     headerTitle: {
//         fontSize: 11,
//         fontWeight: '900',
//         color: T.ink,
//         letterSpacing: 0.8,
//         marginBottom: 8,
//     },
//     picker: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         backgroundColor: T.surface,
//         borderWidth: 1,
//         borderColor: T.border,
//         borderRadius: 10,
//         padding: 14,
//     },
//     pickerText: {
//         fontSize: 14,
//         fontWeight: '700',
//         color: T.ink,
//     },
//     pickerArrow: {
//         fontSize: 14,
//         color: T.muted,
//     },
//     inputContainer: {
//         marginBottom: 16,
//     },
//     label: {
//         fontSize: 10,
//         fontWeight: '800',
//         color: T.muted,
//         letterSpacing: 0.5,
//         marginBottom: 6,
//     },
//     inputRow: {
//         flexDirection: 'row',
//         gap: 8,
//     },
//     input: {
//         flex: 1,
//         backgroundColor: T.surface,
//         borderWidth: 1,
//         borderColor: T.border,
//         borderRadius: 10,
//         paddingHorizontal: 14,
//         paddingVertical: 12,
//         fontSize: 14,
//         color: T.ink,
//     },
//     addButton: {
//         backgroundColor: T.copper,
//         borderRadius: 10,
//         paddingHorizontal: 16,
//         paddingVertical: 12,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     addButtonText: {
//         color: '#fff',
//         fontSize: 14,
//         fontWeight: '700',
//     },
//     searchContainer: {
//         marginBottom: 16,
//     },
//     searchInput: {
//         backgroundColor: T.surface,
//         borderWidth: 1,
//         borderColor: T.border,
//         borderRadius: 10,
//         paddingHorizontal: 14,
//         paddingVertical: 12,
//         fontSize: 14,
//         color: T.ink,
//     },
//     listHeader: {
//         marginBottom: 8,
//     },
//     listTitle: {
//         fontSize: 11,
//         fontWeight: '900',
//         color: T.ink,
//         letterSpacing: 0.8,
//     },
//     aliasItem: {
//         backgroundColor: T.surface,
//         borderRadius: 10,
//         borderWidth: 1,
//         borderColor: T.border,
//         padding: 12,
//     },
//     aliasItemActive: {
//         borderColor: T.copper,
//         borderWidth: 2,
//     },
//     aliasRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//     },
//     aliasName: {
//         fontSize: 14,
//         fontWeight: '600',
//         color: T.ink,
//         flex: 1,
//     },
//     aliasActions: {
//         flexDirection: 'row',
//         gap: 8,
//     },
//     actionButton: {
//         backgroundColor: T.sub,
//         borderRadius: 8,
//         paddingHorizontal: 12,
//         paddingVertical: 6,
//     },
//     actionButtonText: {
//         fontSize: 12,
//         fontWeight: '700',
//         color: T.copper,
//     },
//     deleteButton: {
//         backgroundColor: '#FBF3E3',
//         borderWidth: 1,
//         borderColor: '#EAD9B0',
//     },
//     deleteButtonText: {
//         color: '#7A5C1E',
//     },
//     editRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         gap: 8,
//     },
//     editInput: {
//         flex: 1,
//         backgroundColor: T.sub,
//         borderWidth: 1,
//         borderColor: T.copper,
//         borderRadius: 8,
//         paddingHorizontal: 10,
//         paddingVertical: 8,
//         fontSize: 14,
//         color: T.ink,
//     },
//     editButton: {
//         backgroundColor: T.copper,
//         borderRadius: 8,
//         padding: 8,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     editButtonText: {
//         color: '#fff',
//         fontSize: 14,
//         fontWeight: '800',
//     },
//     separator: {
//         height: 1,
//         backgroundColor: T.border,
//         marginVertical: 4,
//     },
//     listContent: {
//         paddingVertical: 4,
//     },
//     emptyContainer: {
//         alignItems: 'center',
//         padding: 20,
//     },
//     emptyText: {
//         fontSize: 13,
//         color: T.muted,
//     },
//     saveButton: {
//         backgroundColor: T.copper,
//         borderRadius: 10,
//         paddingVertical: 14,
//         alignItems: 'center',
//         marginTop: 20,
//     },
//     saveButtonText: {
//         color: '#fff',
//         fontSize: 15,
//         fontWeight: '800',
//     },
// });
type DesignAliasRow = {
    client_id: string;
    dsn_code: string | null;
    dsn_name: string;
    original_name: string;
    operation: 'unchanged' | 'create' | 'update' | 'delete';
};

const unwrapAliasPayload = (payload: any) => payload?.data?.data ?? payload?.data ?? payload;

// ═══════════════════════════════════════════════════════════════
// TAB 1 — MONTHLY SALES TARGET
// ═══════════════════════════════════════════════════════════════
// Helper function to generate consistent color from name
const getAvatarColor = (name: string) => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFBE0B', '#FB5607',
        '#8338EC', '#3A86FF', '#FF006E', '#A5DD9B', '#F9C74F',
        '#90BE6D', '#560BAD', '#4361EE', '#3F37C9', '#4895EF',
        '#4CC9F0', '#F8961E', '#F0506E', '#6A0572', '#2E8B57'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

function MonthlySalesTargetTab({ design }: { design: Design | null }) {
    const { prpcode, strcode, yearno } = useERP();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth());
    const [year, setYear] = useState(now.getFullYear());
    const [periodPicked, setPeriodPicked] = useState(true);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerYear, setPickerYear] = useState(now.getFullYear());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [rows, setRows] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [setAllValue, setSetAllValue] = useState('');
    const [userType, setUserType] = useState<string>('');

    // Load user type on mount
    useEffect(() => {
        const loadUserType = async () => {
            const p = await AsyncStorage.getItem('user_prptype');
            setUserType(p || prpcode);
        };
        loadUserType();
    }, []);

    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const MONTH_SHORT = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const formatMonthYear = (month: number, year: number) => {
        return `${MONTH_NAMES[month]} ${year}`;
    };


    const getFinancialYear = (year: number, month: number) => {
        return month >= 3
            ? String((year + 1) % 100).padStart(2, "0")
            : String(year % 100).padStart(2, "0");
    };

    const loadTargetsForPeriod = async (month: number, year: number) => {
        setLoading(true);
        try {
            const payload = {
                prptype: userType,
                yearno: getFinancialYear(year, month),
                monthno: String(month + 1).padStart(2, '0'),
                txntype: "monthly_sales_target",
            };
            console.log("aaa payload", payload);

            const response = await client.get('/monthly_sales_target_browse', {
                params: payload,
            });

            if (response.data.success && response.data.data?.monthly_sales_target?.length > 0) {
                const targets = response.data.data.monthly_sales_target.map((item: any) => ({
                    ...item,
                    id: item.sexe,
                    target: item.target || "0",
                    isSelected: true, // All rows are selected by default
                }));
                setRows(targets);
            } else {
                setRows([]);
            }
        } catch (error) {
            console.log("Browse API Error:", error);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    const saveTargets = async () => {
        // All rows with non-zero values are considered selected
        const selectedRows = rows.filter((row) => parseFloat(row.target || "0") > 0);

        const payload = {
            prptype: userType || prpcode,
            yearno: getFinancialYear(year, month),
            monthno: String(month + 1).padStart(2, "0"),
            d1: rows.map(row => ({
                ...row,
                target: row.target || "0"
            })),
        };

        try {
            const response = await client.post('/add_edit_monthly_sales_target', payload);
            const message =
                response.data?.message ||
                response.data?.response?.message ||
                "Operation completed.";

            if (response.data?.success) {
                AppAlert.alert(
                    "Success",
                    message,
                    [
                        {
                            text: "OK",
                            onPress: async () => {
                                await loadTargetsForPeriod(month, year);
                            },
                        },
                    ],
                    { cancelable: false }
                );
            } else {
                AppAlert.alert("Error", message);
            }
        } catch (error: any) {
            const message =
                error.response?.data?.message ||
                error.response?.data?.response?.message ||
                error.message;
            AppAlert.alert("Error", message);
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        if (!periodPicked) return;
        setLoading(true);
        loadTargetsForPeriod(month, year);
    }, [month, year, periodPicked, userType]);

    const shiftMonth = (delta: number) => {
        setPeriodPicked(true);
        let m = month + delta;
        let y = year;
        if (m < 0) {
            m = 11;
            y -= 1;
        } else if (m > 11) {
            m = 0;
            y += 1;
        }
        setMonth(m);
        setYear(y);
    };

    const openPicker = () => {
        setPickerYear(year);
        setPickerVisible(true);
    };

    const shiftPickerYear = (delta: number) => setPickerYear((y) => y + delta);

    const selectMonthFromPicker = (m: number) => {
        setMonth(m);
        setYear(pickerYear);
        setPeriodPicked(true);
        setPickerVisible(false);
    };

    const handleSetAllChange = (value: string) => {
        if (/^\d*\.?\d{0,2}$/.test(value)) {
            setSetAllValue(value);
        }
    };

    const handleApplyToAll = () => {
        if (setAllValue === '') return;

        setRows(prevRows => prevRows.map(row => ({
            ...row,
            target: setAllValue,
            isSelected: true
        })));
        setSetAllValue('');
    };

    const handleChangeTarget = (id: string, value: string) => {
        if (/^\d*\.?\d{0,2}$/.test(value)) {
            setRows((prev) =>
                prev.map((r) =>
                    r.id === id ? { ...r, target: value, isSelected: true } : r
                )
            );
        }
    };

    const handleResetTarget = (id: string) => {
        setRows((prev) =>
            prev.map((r) =>
                r.id === id ? { ...r, target: "0", isSelected: true } : r
            )
        );
    };

    const filteredRows = useMemo(() => {
        return rows.filter(row =>
            row.sexename.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.sexe.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [rows, searchQuery]);

    const totalTarget = useMemo(() => {
        return rows.reduce((sum, row) => sum + parseFloat(row.target || 0), 0);
    }, [rows]);

    const selectedCount = useMemo(() => {
        return rows.filter(row => parseFloat(row.target || "0") > 0).length;
    }, [rows]);

    const renderRow = ({ item }: { item: any }) => {
        return (
            <View style={mst.row}>
                <View style={[mst.avatar, { backgroundColor: getAvatarColor(item.sexename) }]}>
                    <Text style={mst.avatarText}>{item.sexename.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={mst.rowInfo}>
                    <Text style={mst.rowName}>{item.sexename}</Text>
                    <Text style={mst.rowCode}>{item.sexe}</Text>
                    <Text style={mst.lastMonth}>Last month: ₹{item.last_month_target || '0'}</Text>
                </View>
                <View style={mst.targetInputContainer}>
                    <Text style={mst.rupeeSymbol}>₹</Text>
                    <TextInput
                        style={mst.targetInput}
                        value={item.target}
                        onChangeText={(v) => handleChangeTarget(item.id, v)}
                        placeholder="0"
                        placeholderTextColor="#7C93A6"
                        keyboardType="numeric"
                    />
                    {parseFloat(item.target || "0") > 0 && (
                        <TouchableOpacity
                            style={mst.resetButton}
                            onPress={() => handleResetTarget(item.id)}
                        >
                            <Ionicons name="close-circle" size={20} color="#ff3b30" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <ScrollView
            style={mst.container}
            contentContainerStyle={mst.scrollContainer}
            keyboardShouldPersistTaps="handled"
        >
            {/* Month Picker */}
            <View style={mst.monthPicker}>
                <TouchableOpacity onPress={() => shiftMonth(-1)} style={mst.monthNav}>
                    <Ionicons name="chevron-back" size={24} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity onPress={openPicker} style={mst.monthTextContainer}>
                    <Text style={mst.monthText}>{formatMonthYear(month, year)}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => shiftMonth(1)} style={mst.monthNav}>
                    <Ionicons name="chevron-forward" size={24} color="#666" />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={mst.searchContainer}>
                <Ionicons name="search" size={20} color="#999" style={mst.searchIcon} />
                <TextInput
                    style={mst.searchInput}
                    placeholder="Search executive"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Set All and Apply to All */}
            <View style={mst.setAllContainer}>
                <View style={mst.setAllInputContainer}>
                    <Text style={mst.rupeeSymbol}>₹</Text>
                    <TextInput
                        style={mst.setAllInput}
                        value={setAllValue}
                        onChangeText={handleSetAllChange}
                        placeholder="Set all"
                        placeholderTextColor="#7C93A6"
                        keyboardType="numeric"
                    />
                </View>
                <TouchableOpacity
                    style={mst.applyAllButton}
                    onPress={handleApplyToAll}
                >
                    <Ionicons name="copy" size={18} color="#fff" />
                    <Text style={mst.applyAllButtonText}>Apply to all</Text>
                </TouchableOpacity>
            </View>

            {/* List of Executives */}
            <View style={mst.listHeader}>
                <Text style={mst.listTitle}>Executives ({filteredRows.length})</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#6200ee" style={mst.loader} />
            ) : filteredRows.length === 0 ? (
                <Text style={mst.emptyText}>No executives found for this period.</Text>
            ) : (<FlatList
                data={filteredRows}
                keyExtractor={(item) => item.id}
                renderItem={renderRow}
                contentContainerStyle={mst.listContent}
                scrollEnabled={false}
            />
            )}

            {/* Footer with Total and Save Button */}
            <View style={mst.footer}>
                <View style={mst.footerLeft}>
                    <Text style={mst.footerLabel}>Total target</Text>
                    <Text style={mst.footerValue}>₹{totalTarget.toFixed(2)}</Text>
                </View>
                <View style={mst.footerMiddle}>
                    <Text style={mst.footerLabel}>Assigned</Text>
                    <Text style={mst.footerValue}>{selectedCount}/{rows.length}</Text>
                </View>
                <TouchableOpacity
                    style={mst.saveButton}
                    onPress={saveTargets}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark" size={18} color="#fff" />
                            <Text style={mst.saveButtonText}>Save targets</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Month Picker Modal */}
            <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
                <Pressable style={mst.modalOverlay} onPress={() => setPickerVisible(false)}>
                    <View style={mst.modalContent}>
                        <View style={mst.modalHeader}>
                            <TouchableOpacity onPress={() => shiftPickerYear(-1)}>
                                <Ionicons name="chevron-back" size={24} color="#6200ee" />
                            </TouchableOpacity>
                            <Text style={mst.modalYear}>{pickerYear}</Text>
                            <TouchableOpacity onPress={() => shiftPickerYear(1)}>
                                <Ionicons name="chevron-forward" size={24} color="#6200ee" />
                            </TouchableOpacity>
                        </View>
                        <View style={mst.monthGrid}>
                            {MONTH_SHORT.map((label, m) => {
                                const isActive = m === month && pickerYear === year;
                                return (
                                    <TouchableOpacity
                                        key={label}
                                        style={[mst.monthCell, isActive && mst.monthCellActive]}
                                        onPress={() => selectMonthFromPicker(m)}
                                    >
                                        <Text style={[mst.monthCellText, isActive && mst.monthCellTextActive]}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity
                            style={mst.modalCloseButton}
                            onPress={() => setPickerVisible(false)}
                        >
                            <Text style={mst.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </ScrollView>
    );
}

const mst = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContainer: {
        padding: 16,
        paddingBottom: 30,
    },
    monthPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    monthNav: {
        padding: 8,
    },
    monthTextContainer: {
        flex: 1,
        alignItems: 'center',
    },
    monthText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    setAllContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    setAllInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    setAllInput: {
        flex: 1,
        height: 40,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: 8,
        fontSize: 16,
    },
    applyAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: T.copper,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    applyAllButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    listHeader: {
        marginBottom: 8,
    },
    listTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    rowInfo: {
        flex: 1,
    },
    rowName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    rowCode: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    lastMonth: {
        fontSize: 12,
        color: '#999',
    },
    targetInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rupeeSymbol: {
        fontSize: 16,
        color: '#333',
    },
    targetInput: {
        width: 80,
        height: 40,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: 8,
        fontSize: 16,
        textAlign: 'right',
    },
    resetButton: {
        padding: 4,
    },
    listContent: {
        paddingBottom: 20,
    },
    loader: {
        marginVertical: 20,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginVertical: 20,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    footerLeft: {
        alignItems: 'flex-start',
    },
    footerMiddle: {
        alignItems: 'center',
    },
    footerLabel: {
        fontSize: 12,
        color: '#666',
    },
    footerValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6200ee',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: T.copper,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalYear: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    monthCell: {
        width: '30%',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: '#f5f5f5',
    },
    monthCellActive: {
        backgroundColor: '#6200ee',
    },
    monthCellText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    monthCellTextActive: {
        color: '#fff',
    },
    modalCloseButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    modalCloseText: {
        fontSize: 16,
        color: '#6200ee',
        fontWeight: '600',
    },
});

// const mst = StyleSheet.create({
//     filterCard: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         paddingVertical: 10,
//         paddingHorizontal: 10,
//         marginHorizontal: 18,
//         marginBottom: 14,
//         backgroundColor: 'rgba(255,255,255,0.06)',
//         borderRadius: 16,
//         borderWidth: 1,
//         borderColor: 'rgba(255,255,255,0.08)',
//         shadowColor: '#000',
//         shadowOpacity: 0.25,
//         shadowRadius: 6,
//         shadowOffset: { width: 0, height: 3 },
//         elevation: 3,
//     },
//     chevronBtn: {
//         width: 36,
//         height: 36,
//         borderRadius: 18,
//         backgroundColor: 'rgba(255,255,255,0.08)',
//         borderWidth: 1,
//         borderColor: 'rgba(210,140,80,0.4)',
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     filterCenter: {
//         flex: 1,
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         paddingHorizontal: 8,
//     },
//     filterLabel: {
//         color: '#fff',
//         fontSize: 15,
//         fontWeight: '800',
//         textAlign: 'center',
//     },
//     filterSubLabel: {
//         color: '#7C93A6',
//         fontSize: 10,
//         textAlign: 'center',
//         marginTop: 2,
//     },
//     modalOverlay: {
//         flex: 1,
//         backgroundColor: 'rgba(0,0,0,0.55)',
//         alignItems: 'center',
//         justifyContent: 'center',
//         paddingHorizontal: 30,
//     },
//     modalCard: {
//         width: '100%',
//         maxWidth: 340,
//         backgroundColor: T.nav,
//         borderRadius: 20,
//         padding: 18,
//         borderWidth: 1,
//         borderColor: 'rgba(255,255,255,0.1)',
//     },
//     modalYearRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         marginBottom: 16,
//     },
//     modalYearText: {
//         color: '#fff',
//         fontSize: 18,
//         fontWeight: '900',
//         marginHorizontal: 28,
//         minWidth: 60,
//         textAlign: 'center',
//     },
//     monthGrid: {
//         flexDirection: 'row',
//         flexWrap: 'wrap',
//         justifyContent: 'space-between',
//     },
//     monthCell: {
//         width: '31%',
//         paddingVertical: 12,
//         borderRadius: 12,
//         alignItems: 'center',
//         justifyContent: 'center',
//         marginBottom: 10,
//         backgroundColor: 'rgba(255,255,255,0.05)',
//         borderWidth: 1,
//         borderColor: 'transparent',
//     },
//     monthCellCurrent: { borderColor: 'rgba(210,140,80,0.5)' },
//     monthCellActive: { backgroundColor: T.copper },
//     monthCellText: { color: '#A9C0D4', fontSize: 13, fontWeight: '700' },
//     monthCellTextActive: { color: '#fff' },
//     modalCloseBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
//     modalCloseText: { color: '#A9C0D4', fontSize: 13, fontWeight: '700' },
//     center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
//     hint: { color: '#A9C0D4', fontSize: 13, textAlign: 'center', lineHeight: 19 },
//     selectAllRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         paddingHorizontal: 18,
//         paddingBottom: 8,
//     },
//     selectAllText: { color: '#A9C0D4', fontSize: 13, fontWeight: '700', marginLeft: 8 },
//     listContent: { paddingHorizontal: 18, paddingBottom: 90 },
//     row: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         backgroundColor: 'rgba(255,255,255,0.05)',
//         borderRadius: 12,
//         paddingHorizontal: 12,
//         paddingVertical: 10,
//         marginBottom: 8,
//     },
//     checkbox: { marginRight: 10 },
//     checkboxBox: {
//         width: 20,
//         height: 20,
//         borderRadius: 5,
//         borderWidth: 1.5,
//         borderColor: '#6F91AD',
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     checkboxBoxChecked: { backgroundColor: T.copper, borderColor: T.copper },
//     rowInfo: { flex: 1, marginRight: 10 },
//     rowName: { color: '#fff', fontSize: 14, fontWeight: '700' },
//     rowCode: { color: '#7C93A6', fontSize: 11, marginTop: 2 },
//     targetInput: {
//         width: 100,
//         height: 40,
//         borderRadius: 10,
//         borderWidth: 1,
//         borderColor: '#33506A',
//         backgroundColor: 'rgba(0,0,0,0.2)',
//         color: '#fff',
//         paddingHorizontal: 10,
//         fontSize: 14,
//         textAlign: 'right',
//     },
//     targetInputError: { borderColor: '#E38B8B' },
//     saveBtn: {
//         position: 'absolute',
//         left: 18,
//         right: 18,
//         bottom: 16,
//         height: 52,
//         borderRadius: 15,
//         backgroundColor: T.copper,
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     btnDisabled: { opacity: 0.6 },
//     saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
// });

function AliasesDesignPickerModal({
    visible,
    onSelect,
    onClose,
}: {
    visible: boolean;
    onSelect: (d: Design) => void;
    onClose: () => void;
}) {
    const { yearno } = useERP();
    const [designs, setDesigns] = useState<Design[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const loadDesigns = useCallback(async (nextPage = 1, append = false) => {
        if (!visible) return;
        setLoading(true);
        try {
            const response = await DesignAPI.list({
                page: nextPage,
                per_page: 50,
                limit: 50,
                yearno,
                search: search.trim() || undefined,
            } as any);
            const body: any = response.data;
            const rows: Design[] = Array.isArray(body?.data)
                ? body.data
                : Array.isArray(body?.data?.data)
                    ? body.data.data
                    : [];
            const meta = body?.meta ?? body?.data?.meta ?? {};
            setDesigns(previous => append ? [...previous, ...rows] : rows);
            setPage(nextPage);
            setHasMore(Boolean(meta.has_more));
        } catch (error: any) {
            setDesigns([]);
            AppAlert.alert(
                'Design help unavailable',
                String(error?.response?.data?.message || error?.message || 'Unable to load designs.')
            );
        } finally {
            setLoading(false);
        }
    }, [visible, yearno, search]);

    useEffect(() => {
        if (!visible) return;
        const timer = setTimeout(() => loadDesigns(1, false), search.trim() ? 350 : 0);
        return () => clearTimeout(timer);
    }, [visible, search, loadDesigns]);

    const close = () => {
        setSearch('');
        setDesigns([]);
        setPage(1);
        setHasMore(false);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalSheet, styles.aliasDesignSheet]}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Main Design</Text>
                        <TouchableOpacity onPress={close} style={styles.modalCloseBtn}>
                            <Text style={styles.modalCloseTxt}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.modalSearchWrap}>
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search design code / category / weave..."
                            placeholderTextColor={T.muted}
                            style={styles.modalSearch}
                            autoFocus
                        />
                    </View>

                    {/* Fixed-height result frame: search never changes sheet height. */}
                    <View style={styles.aliasDesignListFrame}>
                        {loading && designs.length === 0 ? (
                            <ActivityIndicator color={T.copper} style={{ padding: 24 }} />
                        ) : (
                            <FlatList
                                data={designs}
                                keyExtractor={item => item.id}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.modalRow}
                                        onPress={() => { onSelect(item); close(); }}
                                    >
                                        <Text style={styles.modalRowName}>{designLabel(item)}</Text>
                                        <Text style={styles.modalRowSub}>{item.category} · {item.type}</Text>
                                    </TouchableOpacity>
                                )}
                                ItemSeparatorComponent={() => (
                                    <View style={{ height: 1, backgroundColor: T.border, marginLeft: 16 }} />
                                )}
                                ListEmptyComponent={!loading ? (
                                    <Text style={styles.modalEmptyText}>No designs found</Text>
                                ) : null}
                                ListFooterComponent={hasMore ? (
                                    <TouchableOpacity
                                        disabled={loading}
                                        onPress={() => loadDesigns(page + 1, true)}
                                        style={styles.aliasLoadMore}
                                    >
                                        <Text style={styles.aliasLoadMoreText}>
                                            {loading ? 'Loading…' : 'Load more'}
                                        </Text>
                                    </TouchableOpacity>
                                ) : null}
                            />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function AliasesTab({ design }: { design: Design | null }) {
    const { yearno, prpcode } = useERP();
    const [selectedDesign, setSelectedDesign] = useState<Design | null>(design);
    const [showDesignPicker, setShowDesignPicker] = useState(false);
    const [aliasInput, setAliasInput] = useState('');
    const [aliases, setAliases] = useState<DesignAliasRow[]>([]);
    const [editingClientId, setEditingClientId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const loadAliases = useCallback(async (selected: Design) => {
        setLoading(true);
        try {
            const response = await client.get(`/design-aliases/${encodeURIComponent(selected.id)}`, {
                params: { yearno, prpcode },
            });
            const envelope = unwrapAliasPayload(response.data);
            const rows = Array.isArray(envelope?.aliases) ? envelope.aliases : [];
            setAliases(rows.map((row: any) => ({
                client_id: `erp_${String(row.dsn_code)}`,
                dsn_code: String(row.dsn_code),
                dsn_name: String(row.dsn_name || ''),
                original_name: String(row.dsn_name || ''),
                operation: 'unchanged' as const,
            })));
        } catch (error: any) {
            setAliases([]);
            AppAlert.alert(
                'Aliases unavailable',
                String(error?.response?.data?.message || error?.message || 'Unable to load aliases.')
            );
        } finally {
            setLoading(false);
        }
    }, [yearno, prpcode]);

    const selectDesign = useCallback((selected: Design) => {
        setSelectedDesign(selected);
        setAliasInput('');
        setEditingClientId(null);
        setSearchQuery('');
        void loadAliases(selected);
    }, [loadAliases]);

    useEffect(() => {
        if (design?.id) selectDesign(design);
    }, [design?.id, selectDesign]);

    const visibleAliases = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return aliases.filter(row => {
            if (row.operation === 'delete') return false;
            return !query || row.dsn_name.toLowerCase().includes(query);
        });
    }, [aliases, searchQuery]);

    const beginEdit = (row: DesignAliasRow) => {
        setEditingClientId(row.client_id);
        setAliasInput(row.dsn_name);
    };

    const cancelEdit = () => {
        setEditingClientId(null);
        setAliasInput('');
    };

    const addOrUpdate = () => {
        const name = aliasInput.trim();
        if (!selectedDesign) {
            AppAlert.alert('Select design', 'Please select a Main Design first.');
            return;
        }
        if (!name) {
            AppAlert.alert('Alias required', 'Enter the new alias name.');
            return;
        }
        if (name.length > 40) {
            AppAlert.alert('Alias too long', 'Alias name cannot exceed 40 characters.');
            return;
        }

        const duplicate = aliases.some(row =>
            row.operation !== 'delete' &&
            row.client_id !== editingClientId &&
            row.dsn_name.trim().toUpperCase() === name.toUpperCase()
        );
        if (duplicate) {
            AppAlert.alert('Duplicate alias', 'This alias name is already present in the array.');
            return;
        }

        if (editingClientId) {
            setAliases(previous => previous.map(row => {
                if (row.client_id !== editingClientId) return row;
                const nextOperation = row.dsn_code === null
                    ? 'create'
                    : name.toUpperCase() === row.original_name.toUpperCase()
                        ? 'unchanged'
                        : 'update';
                return { ...row, dsn_name: name, operation: nextOperation };
            }));
            cancelEdit();
            return;
        }

        setAliases(previous => [...previous, {
            client_id: `new_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            dsn_code: null,
            dsn_name: name,
            original_name: '',
            operation: 'create',
        }]);
        setAliasInput('');
    };

    const deleteAlias = (row: DesignAliasRow) => {
        AppAlert.alert('Delete Alias', 'This will soft delete the saved ERP alias when you press Save Aliases.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    setAliases(previous => row.dsn_code === null
                        ? previous.filter(item => item.client_id !== row.client_id)
                        : previous.map(item => item.client_id === row.client_id
                            ? { ...item, operation: 'delete' }
                            : item
                        )
                    );
                    if (editingClientId === row.client_id) cancelEdit();
                },
            },
        ]);
    };

    const saveAliases = async () => {
        if (!selectedDesign) {
            AppAlert.alert('Select design', 'Please select a Main Design first.');
            return;
        }

        const changes = aliases
            .filter(row => row.operation !== 'unchanged')
            .map(row => ({
                dsn_code: row.dsn_code,
                dsn_name: row.dsn_name,
                operation: row.operation,
            }));

        if (changes.length === 0) {
            AppAlert.alert('No changes', 'Add, edit, or delete an alias before saving.');
            return;
        }

        setSaving(true);
        try {
            const response = await client.post('/design-aliases/save', {
                yearno,
                prpcode,
                design_id: selectedDesign.id,
                aliases: changes,
            });
            if (response?.data?.success !== true) {
                throw new Error(response?.data?.message || 'Alias save failed.');
            }
            await loadAliases(selectedDesign);
            cancelEdit();
            AppAlert.alert('Saved', 'Aliases saved successfully in DAPDesign.');
        } catch (error: any) {
            AppAlert.alert(
                'Alias save failed',
                String(error?.response?.data?.message || error?.message || 'Unable to save aliases.')
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>ALIASES FOR DESIGN</Text>
                    <TouchableOpacity style={styles.picker} onPress={() => setShowDesignPicker(true)}>
                        <Text style={styles.pickerText} numberOfLines={1}>
                            {selectedDesign ? `${designLabel(selectedDesign)} (${selectedDesign.type})` : 'Select Main Design'}
                        </Text>
                        <Text style={styles.pickerArrow}>▾</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>{editingClientId ? 'UPDATE ALIAS' : 'ADD NEW ALIAS'}</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            value={aliasInput}
                            onChangeText={setAliasInput}
                            placeholder="Enter customer alias name"
                            placeholderTextColor={T.muted}
                            style={styles.input}
                            maxLength={40}
                            autoCapitalize="characters"
                            editable={Boolean(selectedDesign) && !saving}
                        />
                        <TouchableOpacity
                            style={[styles.addButton, (!selectedDesign || saving) && { opacity: 0.45 }]}
                            disabled={!selectedDesign || saving}
                            onPress={addOrUpdate}
                        >
                            <Text style={styles.addButtonText}>{editingClientId ? 'Update' : '+ Add'}</Text>
                        </TouchableOpacity>
                    </View>
                    {editingClientId && (
                        <TouchableOpacity onPress={cancelEdit} style={{ marginTop: 8 }}>
                            <Text style={{ color: T.copper, fontSize: 12, fontWeight: '700' }}>Cancel update</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.searchContainer}>
                    <Text style={styles.label}>SEARCH ALIASES</Text>
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search added aliases..."
                        placeholderTextColor={T.muted}
                        style={styles.searchInput}
                    />
                </View>

                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>ALIASES LIST ({visibleAliases.length})</Text>
                </View>

                {loading ? (
                    <ActivityIndicator color={T.copper} style={{ padding: 24 }} />
                ) : visibleAliases.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {selectedDesign ? 'No active aliases found.' : 'Select a Main Design to load aliases.'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.listContent}>
                        {visibleAliases.map((row, index) => (
                            <View key={row.client_id}>
                                <View style={[
                                    styles.aliasItem,
                                    editingClientId === row.client_id && styles.aliasItemActive,
                                ]}>
                                    <View style={styles.aliasRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.aliasName}>{row.dsn_name}</Text>
                                            <Text style={styles.aliasCodeText}>
                                                {row.dsn_code ? `ERP code ${row.dsn_code}` : 'New · pending save'}
                                            </Text>
                                        </View>
                                        <View style={styles.aliasActions}>
                                            <TouchableOpacity style={styles.actionButton} onPress={() => beginEdit(row)}>
                                                <Text style={styles.actionButtonText}>Edit</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.deleteButton]}
                                                onPress={() => deleteAlias(row)}
                                            >
                                                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                                {index < visibleAliases.length - 1 && <View style={styles.separator} />}
                            </View>
                        ))}
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.saveButton, (!selectedDesign || saving) && { opacity: 0.45 }]}
                    disabled={!selectedDesign || saving}
                    onPress={saveAliases}
                >
                    <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Aliases'}</Text>
                </TouchableOpacity>
            </ScrollView>

            <AliasesDesignPickerModal
                visible={showDesignPicker}
                onSelect={selectDesign}
                onClose={() => setShowDesignPicker(false)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: T.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
    aliasDesignSheet: { height: '78%' },
    aliasDesignListFrame: { height: 430 },
    modalHandle: { width: 40, height: 4, backgroundColor: T.border, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
    modalTitle: { fontSize: 16, fontWeight: '700', color: T.ink },
    modalCloseBtn: { padding: 4 },
    modalCloseTxt: { fontSize: 16, color: T.muted },
    modalSearchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border },
    modalSearch: { backgroundColor: T.sub, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: T.ink },
    modalRow: { paddingHorizontal: 16, paddingVertical: 12 },
    modalRowName: { fontSize: 14, fontWeight: '600', color: T.ink },
    modalRowSub: { fontSize: 12, color: T.muted, marginTop: 2 },
    modalEmptyText: { padding: 16, color: T.muted, textAlign: 'center' },
    aliasLoadMore: { padding: 14, alignItems: 'center' },
    aliasLoadMoreText: { color: T.copper, fontWeight: '700' },
    container: { padding: 14, paddingBottom: 30, backgroundColor: T.bg },
    header: { marginBottom: 16 },
    headerTitle: { fontSize: 11, fontWeight: '900', color: T.ink, letterSpacing: 0.8, marginBottom: 8 },
    picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, padding: 14 },
    pickerText: { flex: 1, fontSize: 14, fontWeight: '700', color: T.ink },
    pickerArrow: { marginLeft: 8, fontSize: 14, color: T.muted },
    inputContainer: { marginBottom: 16 },
    label: { fontSize: 10, fontWeight: '800', color: T.muted, letterSpacing: 0.5, marginBottom: 6 },
    inputRow: { flexDirection: 'row', gap: 8 },
    input: { flex: 1, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.ink },
    addButton: { backgroundColor: T.copper, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
    addButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    searchContainer: { marginBottom: 16 },
    searchInput: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: T.ink },
    listHeader: { marginBottom: 8 },
    listTitle: { fontSize: 11, fontWeight: '900', color: T.ink, letterSpacing: 0.8 },
    aliasItem: { backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, padding: 12 },
    aliasItemActive: { borderColor: T.copper, borderWidth: 2 },
    aliasRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    aliasName: { fontSize: 14, fontWeight: '600', color: T.ink },
    aliasCodeText: { marginTop: 3, fontSize: 10, color: T.muted },
    aliasActions: { flexDirection: 'row', gap: 8, marginLeft: 8 },
    actionButton: { backgroundColor: T.sub, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    actionButtonText: { fontSize: 12, fontWeight: '700', color: T.copper },
    deleteButton: { backgroundColor: '#FBF3E3', borderWidth: 1, borderColor: '#EAD9B0' },
    deleteButtonText: { color: '#7A5C1E' },
    separator: { height: 1, backgroundColor: T.border, marginVertical: 4 },
    listContent: { paddingVertical: 4 },
    emptyContainer: { alignItems: 'center', padding: 20 },
    emptyText: { fontSize: 13, color: T.muted },
    saveButton: { backgroundColor: T.copper, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

// Export
//   export { AliasesTab };

// ═══════════════════════════════════════════════════════════════
// TAB 4 — YARNS  (Blend → Ply → Items expandable list)
// Paste this in place of the old YarnsTab + ym2 in DesignsScreen.tsx
// (the new `yt` StyleSheet is at the bottom).
//
// CHANGES IN THIS VERSION
//  1. Card now shows Count + Count Type (counttypename)
//  2. Blend / Ply rows look like the Designs list rows:
//     icon box on the left, title + subtitle, count pill + chevron on the right
//  3. Expanded state is clearly visible: highlighted row, copper left border,
//     filled icon box, filled chevron circle (chevron-down), copper outline on the blend card
// ═══════════════════════════════════════════════════════════════

function YarnsTab() {
    const { prpcode: defaultPrpcode, strcode: defaultStrcode, yearno: defaultYearno } = useERP();
    const { width: screenWidth } = useWindowDimensions(); type YarnItem = any;
    type Option = { id: string | number; name?: string;[key: string]: any };
    type PartyOption = { acccode: string; accountname: string;[key: string]: any };

    const [activeTab, setActiveTab] = useState<'Spun' | 'Filaments'>('Spun');
    const [screen, setScreen] = useState<'LIST' | 'SUB_LIST' | 'PARTY' | 'MAIN_FORM' | 'SUB_FORM'>('LIST');
    const [items, setItems] = useState<YarnItem[]>([]);
    const [browseItems, setBrowseItems] = useState<YarnItem[]>([]);
    const [partyItems, setPartyItems] = useState<any[]>([]);
    const [partyData, setPartyData] = useState<PartyOption[]>([]);
    const [browseParent, setBrowseParent] = useState<YarnItem | null>(null);
    const [selectedBrowseItem, setSelectedBrowseItem] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    // expand/collapse state for Blend -> Ply tree
    const [openBlends, setOpenBlends] = useState<Record<string, boolean>>({});
    const [openPlys, setOpenPlys] = useState<Record<string, boolean>>({});

    const [context, setContext] = useState({
        prpcode: defaultPrpcode || 'SIP',
        strcode: defaultStrcode || '002',
        yearno: defaultYearno || '27',
        prptype: '',
    });

    const [blendData, setBlendData] = useState<Option[]>([]);
    const [countData, setCountData] = useState<any[]>([]);
    const [plyData, setPlyData] = useState<any[]>([]);
    const [typeData, setTypeData] = useState<any[]>([]);
    const [lustreData, setLustreData] = useState<any[]>([]);
    const [subTypeData, setSubTypeData] = useState<any[]>([]);

    const [selectedBlend, setSelectedBlend] = useState<Option[]>([]);
    const [selectedCount, setSelectedCount] = useState<any>(null);
    const [selectedPly, setSelectedPly] = useState<any>(null);
    const [selectedType, setSelectedType] = useState<any>(null);
    const [selectedLustre, setSelectedLustre] = useState<any>(null);
    const [selectedSubType, setSelectedSubType] = useState<any>(null);
    const [subBlendList, setSubBlendList] = useState<Option[]>([]);

    const [spunForm, setSpunForm] = useState<any>({
        blend: [], blend_id: [], count: '', count_id: '', count_no: '',
        ply: '', ply_id: '', linkitmcode: '', denier: '', ItmCode: '', others: '',
    });
    const [filamentForm, setFilamentForm] = useState<any>({
        blend: [], blend_id: [], count: '', count_id: '', count_no: '',
        ply: '', ply_id: '', linkitmcode: '', denier: '', ItmCode: '',
        type_id: '', type: '', lustre_id: '', lustre: '', others: '',
    });
    const [subForm, setSubForm] = useState<any>({
        WNameCode: '', WBlend: '', WYarnType: '', mitmcode: '', WCounttype: '',
        count: '', count_id: '', count_no: '', ply: '', ply_id: '',
        linkitmcode: '', denier: '', others: '', subtype_id: '', subtype_name: '',
        ItmCode: '', formula: '',
    });
    const [partyForm, setPartyForm] = useState({ accountname: '', acccode: '', ItemName: '' });

    const [isModifyMode, setIsModifyMode] = useState(false);
    const [modifyItemName, setModifyItemName] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [deleteTargetType, setDeleteTargetType] = useState<'MAIN' | 'SUB'>('MAIN');
    const [deleteVisible, setDeleteVisible] = useState(false);
    const [deleteResultVisible, setDeleteResultVisible] = useState(false);
    const [deleteResultType, setDeleteResultType] = useState<'SUCCESS' | 'PERMISSION' | 'ERROR'>('ERROR');
    const [deleteResultMessage, setDeleteResultMessage] = useState('');
    const [picker, setPicker] = useState<{
        key: string;
        title: string;
        data: any[];
        multiple?: boolean;
        value?: any;
        disabled?: boolean;
    } | null>(null);

    const gridColumns = screenWidth >= 1500 ? 4 : screenWidth >= 1050 ? 3 : screenWidth >= 700 ? 2 : 1;
    // columns of item cards inside the Blend/Ply tree
    const treeCols = screenWidth >= 1500 ? 3 : screenWidth >= 1000 ? 2 : 1;

    const apiGet = useCallback(async (path: string, params: Record<string, any> = {}) => {
        return client.get(path, { params });
    }, []);
    const apiPost = useCallback(async (path: string, body: Record<string, any>) => {
        return client.post(path, body);
    }, []);

    const getPrpType = useCallback(async () => {
        return (await AsyncStorage.getItem('user_prptype')) || '';
    }, []);

    const loadContext = useCallback(async () => {
        const prptype = await getPrpType();
        try {
            const res = await apiPost('/getyarndefault', { prptype, return_json_data: '1' });
            const main = res?.data?.data?.main || {};
            const next = {
                prpcode: main.prpcode || defaultPrpcode || 'SIP',
                strcode: main.yarnstrcode || defaultStrcode || '002',
                yearno: main.yearno || defaultYearno || '27',
                prptype,
            };
            setContext(next);
            return next;
        } catch {
            const next = { ...context, prptype };
            setContext(next);
            return next;
        }
    }, [apiPost, context, defaultPrpcode, defaultStrcode, defaultYearno, getPrpType]);

    const category = activeTab === 'Spun' ? '1' : '2';

    const loadLookups = useCallback(async (ctx = context) => {
        const base = { prptype: ctx.prptype, category: activeTab === 'Spun' ? '1' : '2', txntype: 'yarn_creation_item_master' };
        try {
            const [blend, count, ply, type, lustre, subType] = await Promise.all([
                apiGet('/yarnblend', base),
                apiGet('/yarncount', base),
                apiGet('/yarnply', base),
                apiGet('/yarntype', base),
                apiGet('/yarnlustre', base),
                apiGet('/yarntypesubitem', base),
            ]);
            setBlendData(blend?.data?.data?.data || []);
            setCountData(count?.data?.data?.data || []);
            setPlyData(ply?.data?.data?.data || []);
            setTypeData(type?.data?.data?.data || []);
            setLustreData(lustre?.data?.data?.data || []);
            setSubTypeData(subType?.data?.data?.data || []);
        } catch {
            setBlendData([]); setCountData([]); setPlyData([]); setTypeData([]); setLustreData([]); setSubTypeData([]);
        }
    }, [activeTab, apiGet, context]);

    const loadItems = useCallback(async (tab = activeTab, ctx = context) => {
        setLoading(true);
        try {
            const res = await apiGet('/getyarnmasteritem', {
                prptype: ctx.prptype,
                strcode: ctx.strcode,
                txntype: 'yarn_creation_item_master',
                yarntype: tab === 'Spun' ? '1' : '2',
            });
            setItems(res?.data?.data?.data || []);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [activeTab, apiGet, context]);

    useEffect(() => {
        let alive = true;
        (async () => {
            const ctx = await loadContext();
            if (!alive) return;
            await Promise.all([loadLookups(ctx), loadItems(activeTab, ctx)]);
        })();
        return () => { alive = false; };
    }, [activeTab]); // legacy behaviour: switching Spun/Filament reloads all masters and list

    const resetForms = useCallback(() => {
        setSelectedBlend([]); setSelectedCount(null); setSelectedPly(null);
        setSelectedType(null); setSelectedLustre(null); setSelectedSubType(null);
        setSubBlendList([]);
        setSpunForm({ blend: [], blend_id: [], count: '', count_id: '', count_no: '', ply: '', ply_id: '', linkitmcode: '', denier: '', ItmCode: '', others: '' });
        setFilamentForm({ blend: [], blend_id: [], count: '', count_id: '', count_no: '', ply: '', ply_id: '', linkitmcode: '', denier: '', ItmCode: '', type_id: '', type: '', lustre_id: '', lustre: '', others: '' });
        setSubForm({ WNameCode: '', WBlend: '', WYarnType: '', mitmcode: '', WCounttype: '', count: '', count_id: '', count_no: '', ply: '', ply_id: '', linkitmcode: '', denier: '', others: '', subtype_id: '', subtype_name: '', ItmCode: '', formula: '' });
        setPartyForm({ accountname: '', acccode: '', ItemName: '' });
        setIsModifyMode(false); setModifyItemName('');
    }, []);

    // IMPORTANT: keep the legacy YMS calculation rules.
    // Spun/Sub Item: formula result is rounded UP to the next multiple of 5.
    // Filament: legacy YMS keeps the formula result to 2 decimals.
    const roundDenier = (value: number) =>
        Number.isFinite(value) ? String(Math.ceil(value / 5) * 5) : '';

    const evaluateFormula = (countNo: string, ply: string, formula?: string) => {
        if (!countNo || !ply || !formula) return null;
        try {
            const expr = String(formula)
                .replace(/Count/g, String(Number(countNo)))
                .replace(/ply/g, String(Number(ply)));
            const result = Function(`"use strict"; return (${expr});`)();
            return Number(result);
        } catch {
            return null;
        }
    };

    const calculateDenier = (countNo: string, ply: string, formula?: string) => {
        const result = evaluateFormula(countNo, ply, formula);
        return result == null ? '' : roundDenier(result);
    };

    const calculateFilamentDenier = (countNo: string, ply: string, formula?: string) => {
        const result = evaluateFormula(countNo, ply, formula);
        return result == null ? '' : Number(result).toFixed(2);
    };

    const calculateSubitemDenier = (form: any, formulaOverride?: string) => {
        const formula = String(formulaOverride || form?.formula || '').trim();
        return calculateDenier(String(form?.count_no || ''), String(form?.ply || ''), formula);
    };

    const calculateMainFormDenier = (tab: 'Spun' | 'Filaments', countNo: string, ply: string, formula?: string) =>
        tab === 'Filaments' ? calculateFilamentDenier(countNo, ply, formula) : calculateDenier(countNo, ply, formula);

    const buildMainItem = (countNo: string, count: string, ply: string, blends: any[], other: string) =>
        !countNo || !count || !ply || !blends?.length ? '' :
            [`${countNo}/${ply}`, count, blends.map((b: any) => typeof b === 'object' ? b.name : b).join(' '), other]
                .filter(v => String(v || '').trim()).join(' ');

    const buildFilamentItem = (countNo: string, count: string, ply: string, lustre: string, type: string, other: string) =>
        !countNo || !count || !ply || !lustre || !type ? '' : [`${countNo}/${ply}`, count, lustre, type, other]
            .filter(v => String(v || '').trim()).join(' ');

    const buildSubItem = (countNo: string, ply: string, blends: any[], other: string) => {
        if (!countNo || !ply) return '';
        const total = (blends || []).reduce((sum, b) => sum + Number(b.per || 0), 0);
        if (blends?.length && total !== 100) return '';
        return [`${countNo}/${ply}`, (blends || []).map(b => `${b.name}${b.per ? ` ${b.per}%` : ''}`).join(' '), other]
            .filter(v => String(v || '').trim()).join(' ');
    };

    const findByIdOrName = (list: any[], value: any, keys = ['id', 'name']) =>
        (list || []).find(obj => keys.some(k => String(obj?.[k] ?? '') === String(value ?? ''))) || null;

    const openPicker = (key: string, title: string, data: any[], multiple = false, value?: any, disabled?: boolean) =>
        setPicker({ key, title, data: data || [], multiple, value, disabled });

    const handlePickerSelect = (item: any) => {

        if (!picker) return;
        const { key, multiple, disabled } = picker;
        if (multiple) {
            const current = Array.isArray(picker.value) ? picker.value : [];
            const exists = current.some((x: any) => String(x?.id) === String(item?.id));
            const next = exists ? current.filter((x: any) => String(x?.id) !== String(item?.id)) : [...current, item];
            setPicker({ ...picker, value: next });
            return;
        }

        if (key === 'blend') setSelectedBlend(item ? [item] : []);
        if (key === 'count') setSelectedCount(item);
        if (key === 'ply') setSelectedPly(item);
        if (key === 'type') setSelectedType(item);
        if (key === 'lustre') setSelectedLustre(item);
        if (key === 'subtype') setSelectedSubType(item);
        if (key === 'party') setPartyForm(prev => ({ ...prev, acccode: item?.acccode || '', accountname: item?.accountname || item?.name || '' }));

        if (screen === 'MAIN_FORM') {
            if (activeTab === 'Spun') {
                setSpunForm(prev => {
                    const next = key === 'blend'
                        ? { ...prev, blend_id: [item?.id], blend: [item?.name] }
                        : key === 'count'
                            ? { ...prev, count_id: item?.id || '', count: item?.name || '' }
                            : key === 'ply'
                                ? { ...prev, ply_id: item?.id || '', ply: item?.ply || item?.name || '' }
                                : prev;
                    return {
                        ...next,
                        denier: calculateMainFormDenier('Spun', next.count_no, next.ply, key === 'count' ? item?.formula : selectedCount?.formula),
                        linkitmcode: buildMainItem(next.count_no, next.count, next.ply, next.blend, next.others),
                    };
                });
            } else {
                setFilamentForm(prev => {
                    const next = key === 'blend'
                        ? { ...prev, blend_id: [item?.id], blend: [item?.name] }
                        : key === 'count'
                            ? { ...prev, count_id: item?.id || '', count: item?.name || '' }
                            : key === 'ply'
                                ? { ...prev, ply_id: item?.id || '', ply: item?.ply || item?.name || '' }
                                : key === 'type'
                                    ? { ...prev, type_id: item?.id || '', type: item?.type || item?.name || '' }
                                    : key === 'lustre'
                                        ? { ...prev, lustre_id: item?.id || '', lustre: item?.lustre || item?.name || '' }
                                        : prev;
                    return {
                        ...next,
                        denier: calculateMainFormDenier('Filaments', next.count_no, next.ply, key === 'count' ? item?.formula : selectedCount?.formula),
                        linkitmcode: buildFilamentItem(next.count_no, next.count, next.ply, next.lustre, next.type, next.others),
                    };
                });
            }
        } else if (screen === 'SUB_FORM') {
            setSubForm(prev => {
                if (key === 'ply') {
                    const next = { ...prev, ply_id: item?.id || '', ply: item?.ply || item?.name || '' };
                    return { ...next, denier: calculateDenier(next.count_no, next.ply, prev.formula), linkitmcode: buildSubItem(next.count_no, next.ply, subBlendList, next.others) };
                }
                if (key === 'count') {
                    const next = { ...prev, count_id: item?.id || '', WCounttype: item?.id || '', count: item?.name || '', formula: item?.formula || '' };
                    return { ...next, denier: calculateDenier(next.count_no, next.ply, item?.formula) };
                }
                if (key === 'subtype') return { ...prev, subtype_id: item?.id || '', subtype_name: item?.name || '' };
                return prev;
            });
        }
        setPicker(null);

    };

    const applyMultiPicker = () => {
        if (!picker) return;
        const value = Array.isArray(picker.value) ? picker.value : [];
        if (picker.key === 'blend') {
            setSelectedBlend(value);
            if (screen === 'MAIN_FORM') {
                if (activeTab === 'Spun') {
                    setSpunForm(prev => {
                        const next = { ...prev, blend_id: value.map(x => x.id), blend: value.map(x => x.name) };
                        return { ...next, linkitmcode: buildMainItem(next.count_no, next.count, next.ply, next.blend, next.others) };
                    });
                } else {
                    setFilamentForm(prev => {
                        const next = { ...prev, blend_id: value.map(x => x.id), blend: value.map(x => x.name) };
                        return { ...next, linkitmcode: buildFilamentItem(next.count_no, next.count, next.ply, next.lustre, next.type, next.others) };
                    });
                }
            }
        }
        setPicker(null);
    };

    const loadSubList = useCallback(async (parent: YarnItem) => {
        if (!parent?.itmcode) {
            AppAlert.alert('Error', 'Main item code not found.');
            return;
        }
        setSearch('');
        setLoading(true);
        try {
            const ctx = context.prptype ? context : await loadContext();
            const res = await apiGet('/yarnwbrowse', {
                prptype: parent?.prptype ?? parent?.PrpType ?? parent?.PRPTYPE ?? ctx.prptype,
                mitmcode: parent.itmcode,
                txntype: 'yarn_creation_item_master',
            });
            setBrowseParent(parent);
            setBrowseItems(Array.isArray(res?.data?.data?.maindata) ? res.data.data.maindata : []);
            setScreen('SUB_LIST');
        } catch {
            setBrowseParent(parent); setBrowseItems([]); setScreen('SUB_LIST');
        } finally { setLoading(false); }
    }, [apiGet, context, loadContext]);

    const openAddMain = async () => {
        const ctx = context.prptype ? context : await loadContext();
        resetForms();
        await loadLookups(ctx);
        setScreen('MAIN_FORM');
    };

    const openModifyMain = async (item: YarnItem) => {
        if (!item?.itmcode) return AppAlert.alert('Error', 'Item code not found.');
        setLoading(true);
        try {
            const ctx = context.prptype ? context : await loadContext();

            // Load the exact master lists used by the legacy YMS modify screen.
            await loadLookups(ctx);
            const [showRes, freshCountRes] = await Promise.all([
                apiGet('/yarnitemshow', {
                    itmcode: item.itmcode,
                    strcode: ctx.strcode,
                    prptype: ctx.prptype,
                }),
                apiGet('/yarncount', {
                    prptype: ctx.prptype,
                    category: activeTab === 'Spun' ? '1' : '2',
                    txntype: 'yarn_creation_item_master',
                }),
            ]);

            const main = showRes?.data?.data?.maindata?.[0];
            if (!showRes?.data?.success || !main) {
                throw new Error(showRes?.data?.message || 'Item details not found.');
            }

            // yarnitemshow:
            // maincode = "<count>/<ply> ..."
            // counttype = Count Type master id
            // count = actual numeric count value.
            const mainParts = String(main?.maincode || '').trim().match(/^([^/\s]+)\/([^\s]+)\s*(.*)$/);
            const countNo = String(main?.count ?? mainParts?.[1] ?? '');
            const plyValue = String(main?.WPly ?? mainParts?.[2] ?? '').trim();

            const countTypeId = String(main?.counttype ?? main?.CountTypeId ?? main?.WCounttype ?? '');
            const countTypeName = String(main?.CountType ?? main?.counttypeName ?? '');
            const freshCountData = freshCountRes?.data?.data?.data || [];
            if (freshCountData.length) setCountData(freshCountData);

            const countMaster = freshCountData.length ? freshCountData : countData;
            const countObj =
                findByIdOrName(countMaster, countTypeId) ||
                findByIdOrName(countMaster, countTypeName) ||
                { id: countTypeId, name: countTypeName || countTypeId, formula: '' };

            const plyObj =
                (plyData || []).find(p =>
                    String(p?.ply ?? '').trim() === plyValue
                ) ||
                (plyData || []).find(p =>
                    String(p?.id ?? '').trim() === plyValue
                ) ||
                { id: plyValue, ply: plyValue, name: plyValue };

            let blendItems = Array.isArray(main?.BlendDisplay)
                ? main.BlendDisplay.map((b: any) => ({
                    id: b?.id ?? b?.blendid ?? b?.code,
                    name: b?.name ?? b?.blend ?? b?.BlendName ?? '',
                })).filter((b: any) => b.id !== undefined && b.id !== null)
                : [];

            if (!blendItems.length && main?.blend) {
                blendItems = String(main.blend)
                    .split(/[\/,\s]+/)
                    .filter(Boolean)
                    .map(id => findByIdOrName(blendData, id) || { id, name: id });
            } else {
                blendItems = blendItems.map((b: any) => findByIdOrName(blendData, b.id) || b);
            }

            const base = {
                ItmCode: String(main?.itmcode || item.itmcode),
                linkitmcode: String(main?.maincode || ''),
                denier: String(main?.denier ?? ''),
                count_no: countNo,
                count: String(countObj?.name || countTypeName),
                count_id: String(countObj?.id || countTypeId),
                ply: String(plyObj?.ply || plyValue),
                ply_id: String(plyObj?.id || plyValue),
                blend: blendItems.map((b: any) => b.name).filter(Boolean),
                blend_id: blendItems.map((b: any) => b.id).filter(Boolean),
                others: String(main?.other ?? ''),
                formula: String(countObj?.formula || ''),
            };

            setModifyItemName(String(main?.itmname || item?.WNameCode || item.itmcode));
            setIsModifyMode(true);
            setSelectedBlend(blendItems);
            setSelectedCount(countObj);
            setSelectedPly(plyObj);

            if (activeTab === 'Spun') {
                setSpunForm(base);
            } else {
                const typeObj =
                    findByIdOrName(typeData, main?.Type, ['id', 'type']) ||
                    (main?.Type ? { id: main.Type, type: main.Type } : null);
                const lustreObj =
                    findByIdOrName(lustreData, main?.Lustre, ['id', 'lustre']) ||
                    (main?.Lustre ? { id: main.Lustre, lustre: main.Lustre } : null);

                setSelectedType(typeObj);
                setSelectedLustre(lustreObj);
                setFilamentForm({
                    ...base,
                    type_id: typeObj?.id || '',
                    type: typeObj?.type || main?.Type || '',
                    lustre_id: lustreObj?.id || '',
                    lustre: lustreObj?.lustre || main?.Lustre || '',
                });
            }
            setScreen('MAIN_FORM');
        } catch (e: any) {
            AppAlert.alert('Error', e?.message || 'Unable to load item details.');
        } finally {
            setLoading(false);
        }
    };

    const saveMain = async () => {
        const form = activeTab === 'Spun' ? spunForm : filamentForm;
        const error = activeTab === 'Spun'
            ? (!form.blend_id?.length ? 'Please select Blend' : !form.count_no ? 'Please Enter Count Value' : !form.count_id ? 'Please select Count' : !form.ply_id ? 'Please select Ply' : null)
            : (!form.blend_id?.length ? 'Please select Blend' : !form.count_id ? 'Please select Count Type' : !form.count_no ? 'Please enter Count value' : !form.ply_id ? 'Please select Ply' : !form.type_id ? 'Please Filament select Type' : !form.lustre_id ? 'Please select Lustre' : null);
        if (error) return AppAlert.alert('Validation', error);

        setLoading(true);
        try {
            const ctx = context.prptype ? context : await loadContext();
            const payload: any = {
                maincode: form.linkitmcode,
                denier: form.denier,
                blend: Array.isArray(form.blend_id) ? form.blend_id.join('/') : form.blend_id || '',
                counttype: form.count_id,
                ply: form.ply_id,
                linkitmcode: form.ItmCode || '',
                prptype: ctx.prptype,
                txntype: 'yarn_creation_item_master',
                yarntype: activeTab === 'Spun' ? '1' : '2',
                strcode: ctx.strcode,
                count: form.count_no,
                other: form.others,
            };
            if (activeTab === 'Filaments') {
                payload.lustre = form.lustre_id;
                payload.type = form.type_id;
            }
            if (isModifyMode) payload.itmcode = form.ItmCode || '';

            const res = await apiPost(isModifyMode ? '/yarncreationmodify' : '/yarnadd', payload);
            if (!res?.data?.success) return AppAlert.alert('Warning', res?.data?.message || 'Unable to save item.');

            const code = res?.data?.data?.data?.itmcode || form.ItmCode || '';
            AppAlert.alert('Success', isModifyMode ? `Item ${code} modified successfully.` : `Item ${code} saved successfully.`);
            setScreen('LIST'); resetForms(); await loadItems(activeTab, ctx);
        } catch (e: any) {
            AppAlert.alert('Error', e?.response?.data?.message || 'Something went wrong.');
        } finally { setLoading(false); }
    };

    const openSubCreate = async (parent: YarnItem) => {
        if (!parent?.itmcode) {
            return AppAlert.alert('Error', 'Main item code not found.');
        }
        setSearch('');
        setLoading(true);
        try {
            const ctx = context.prptype ? context : await loadContext();

            // Match legacy YMS exactly: first restore the selected main item
            // through yarnitemshow, then load fresh count/ply/type masters.
            const [showRes, countRes, masterRes, typeRes, plyRes, subTypeRes] = await Promise.all([
                apiGet('/yarnitemshow', {
                    itmcode: parent.itmcode,
                    strcode: ctx.strcode,
                    prptype: ctx.prptype,
                }),
                apiGet('/yarncount', {
                    prptype: ctx.prptype,
                    category: activeTab === 'Spun' ? '1' : '2',
                    txntype: 'yarn_creation_item_master',
                }),
                apiGet('/getyarnmasteritem', {
                    prptype: ctx.prptype,
                    strcode: ctx.strcode,
                    txntype: 'yarn_creation_item_master',
                    yarntype: activeTab === 'Spun' ? '1' : '2',
                }),
                apiGet('/yarntype', {
                    prptype: ctx.prptype,
                    category: activeTab === 'Spun' ? '1' : '2',
                    txntype: 'yarn_creation_item_master',
                }),
                apiGet('/yarnply', {
                    prptype: ctx.prptype,
                    category: activeTab === 'Spun' ? '1' : '2',
                    txntype: 'yarn_creation_item_master',
                }),
                apiGet('/yarntypesubitem', {
                    prptype: ctx.prptype,
                    category: activeTab === 'Spun' ? '1' : '2',
                    txntype: 'yarn_creation_item_master',
                }),
            ]);

            const show = showRes?.data?.data?.maindata?.[0];
            if (!showRes?.data?.success || !show) {
                throw new Error(showRes?.data?.message || 'Main item details not found.');
            }

            const freshCounts = countRes?.data?.data?.data || [];
            const freshPlys = plyRes?.data?.data?.data || [];
            const freshSubTypes = subTypeRes?.data?.data?.data || [];
            const mapped = masterRes?.data?.data?.mapped_data || [];

            setCountData(freshCounts);
            setPlyData(freshPlys);
            setSubTypeData(freshSubTypes);

            const selectedBlendId = String(show?.blend ?? parent?.WBlend ?? '');
            const apiBlendList = Array.isArray(show?.BlendDisplay)
                ? show.BlendDisplay
                    .map((b: any) => ({
                        id: String(b?.id ?? b?.blendid ?? ''),
                        name: b?.name || '',
                        per: String(b?.per ?? ''),
                    }))
                    .filter((b: any) => b.name)
                : [];

            const blendObj = (mapped || []).find((b: any) =>
                String(b?.blendid) === selectedBlendId &&
                String(b?.itmcode) === String(parent.itmcode)
            );

            let fallbackBlendList = (blendObj?.blend_names || []).map((b: any) => ({
                id: String(b?.id ?? ''),
                name: b?.name || '',
                per: '',
            }));
            if (fallbackBlendList.length === 1) fallbackBlendList[0].per = '100';

            const finalBlendList = apiBlendList.length ? apiBlendList : fallbackBlendList;

            const countTypeId = String(show?.CountTypeId ?? show?.WCounttype ?? show?.counttype ?? parent?.WCounttype ?? '');
            const countObj =
                freshCounts.find((c: any) => String(c?.id ?? '') === countTypeId) ||
                freshCounts.find((c: any) => String(c?.name ?? '') === String(show?.CountType ?? '')) ||
                null;

            const plyValue = String(show?.WPly ?? '');
            const plyObj =
                freshPlys.find((p: any) => String(p?.ply ?? '') === plyValue) ||
                freshPlys.find((p: any) => String(p?.id ?? '') === plyValue) ||
                (plyValue ? { id: plyValue, ply: plyValue } : null);

            const subtypeId = String(show?.subyarntype ?? '');
            const subtypeName = String(show?.subyarntypename ?? '');
            const subtypeObj =
                freshSubTypes.find((x: any) => String(x?.id ?? '') === subtypeId) ||
                freshSubTypes.find((x: any) => String(x?.name ?? '') === subtypeName) ||
                (subtypeId || subtypeName ? { id: subtypeId, name: subtypeName } : null);

            setSubBlendList(finalBlendList);
            setSelectedCount(countObj);
            setSelectedPly(plyObj);
            setSelectedSubType(subtypeObj);

            setSubForm({
                WNameCode: String(show?.itmname || parent?.WNameCode || ''),
                WBlend: selectedBlendId,
                WYarnType: String(parent?.WYarnType || (activeTab === 'Spun' ? '1' : '2')),
                mitmcode: String(parent.itmcode),
                WCounttype: countTypeId,
                count: String(countObj?.name || show?.CountType || ''),
                count_id: countTypeId,
                count_no: String(show?.count ?? ''),
                ply: String(plyObj?.ply || plyValue),
                ply_id: String(plyObj?.id || plyValue),
                linkitmcode: String(show?.maincode || ''),
                denier: String(show?.denier ?? ''),
                others: String(show?.other ?? ''),
                subtype_id: subtypeId,
                subtype_name: subtypeName,
                ItmCode: String(parent.itmcode),
                formula: String(countObj?.formula || ''),
                blend: finalBlendList.map((b: any) => b.name),
                blend_id: finalBlendList.map((b: any) => b.id),
            });

            setIsModifyMode(false);
            setModifyItemName('');
            setScreen('SUB_FORM');
        } catch (e: any) {
            AppAlert.alert('Error', e?.response?.data?.message || e?.message || 'Unable to open sub item form.');
        } finally {
            setLoading(false);
        }
    };

    const openSubModify = async (item: any) => {
        if (!item?.itmcode) return AppAlert.alert('Error', 'Sub item code not found.');
        setLoading(true);
        try {
            const ctx = context.prptype ? context : await loadContext();
            const [res, countRes, plyRes, subtypeRes] = await Promise.all([
                apiGet('/yarnitemshow', { itmcode: item.itmcode, strcode: ctx.strcode, prptype: ctx.prptype }),
                apiGet('/yarncount', {
                    prptype: ctx.prptype,
                    category: activeTab === 'Spun' ? '1' : '2',
                    txntype: 'yarn_creation_item_master',
                }),
                apiGet('/yarnply', {
                    prptype: ctx.prptype,
                    category: activeTab === 'Spun' ? '1' : '2',
                    txntype: 'yarn_creation_item_master',
                }),
                apiGet('/yarntypesubitem', {
                    prptype: ctx.prptype,
                    category: activeTab === 'Spun' ? '1' : '2',
                    txntype: 'yarn_creation_item_master',
                }),
            ]);

            const show = res?.data?.data?.maindata?.[0];
            if (!res?.data?.success || !show) {
                throw new Error(res?.data?.message || 'Sub item details not found.');
            }

            const freshCounts = countRes?.data?.data?.data || countData;
            const freshPlys = plyRes?.data?.data?.data || plyData;
            const freshSubTypes = subtypeRes?.data?.data?.data || subTypeData;
            setCountData(freshCounts);
            setPlyData(freshPlys);
            setSubTypeData(freshSubTypes);

            const blends = Array.isArray(show?.BlendDisplay)
                ? show.BlendDisplay.map((b: any) => ({
                    id: String(b?.id ?? b?.blendid ?? ''),
                    name: b?.name || '',
                    per: String(b?.per ?? ''),
                })).filter((b: any) => b.name)
                : [];

            const apiPly = String(show?.WPly ?? '');
            const plyObj =
                freshPlys.find((p: any) => String(p?.ply ?? '') === apiPly) ||
                freshPlys.find((p: any) => String(p?.id ?? '') === apiPly) ||
                { id: apiPly, ply: apiPly };

            const countId = String(show?.CountTypeId ?? show?.WCounttype ?? show?.counttype ?? '');
            const countName = String(show?.CountType ?? show?.counttypeName ?? '');
            const countObj =
                freshCounts.find((c: any) => String(c?.id ?? '') === countId) ||
                freshCounts.find((c: any) => String(c?.name ?? '') === countName) ||
                { id: countId, name: countName, formula: '' };

            const subtypeId = String(show?.subyarntype ?? '');
            const subtypeName = String(show?.subyarntypename ?? '');
            const subtypeObj =
                freshSubTypes.find((x: any) => String(x?.id ?? '') === subtypeId) ||
                freshSubTypes.find((x: any) => String(x?.name ?? '') === subtypeName) ||
                { id: subtypeId, name: subtypeName };

            setSubBlendList(blends);
            setSelectedPly(plyObj);
            setSelectedCount(countObj);
            setSelectedSubType(subtypeObj);

            setSubForm({
                WNameCode: String(browseParent?.WNameCode || show?.itmname || item?.WNameCode || ''),
                WBlend: String(show?.blend ?? ''),
                WYarnType: String(browseParent?.WYarnType || item?.WYarnType || ''),
                mitmcode: String(browseParent?.itmcode || item?.mitmcode || ''),
                WCounttype: countId,
                count: String(countObj?.name || countName),
                count_id: countId,
                count_no: String(show?.count ?? ''),
                ply: String(plyObj?.ply || apiPly),
                ply_id: String(plyObj?.id || apiPly),
                linkitmcode: String(show?.maincode || ''),
                denier: String(show?.denier ?? ''),
                others: String(show?.other ?? ''),
                subtype_id: subtypeId,
                subtype_name: subtypeName,
                ItmCode: String(show?.itmcode || item.itmcode),
                formula: String(countObj?.formula || show?.formula || ''),
                blend: blends.map((b: any) => b.name),
                blend_id: blends.map((b: any) => b.id),
            });

            setModifyItemName(String(show?.itmname || item?.WNameCode || item.itmcode));
            setIsModifyMode(true);
            setScreen('SUB_FORM');
        } catch (e: any) {
            AppAlert.alert('Error', e?.message || 'Unable to load sub item details.');
        } finally {
            setLoading(false);
        }
    };

    const openParty = async (item: any) => {
        if (!item?.itmcode) return AppAlert.alert('Error', 'Item code not found.');
        setLoading(true);
        try {
            const ctx = context.prptype ? context : await loadContext();
            const [partyRes, browseRes] = await Promise.all([
                apiGet('/accountbasic', {
                    prpcode: ctx.prpcode, prptype: ctx.prptype, yearno: ctx.yearno, strcode: ctx.strcode,
                    txntype: 'yarn_creation_item_master', partytype: 'p', type: 'P', page: '', limit: '',
                    search: '', isceo: '', partype: '', grntype: '', parcode: '', fetch: '', acccode: '',
                    billdate: '', strtype: '', isfaint: '',
                }),
                apiGet('/yarnitemd1browse', {
                    itmcode: item.itmcode, prptype: ctx.prptype, strcode: ctx.strcode,
                    txntype: 'yarn_creation_item_master', yarntype: activeTab === 'Spun' ? '1' : '2',
                    prpcode: ctx.prpcode,
                }),
            ]);
            setSelectedBrowseItem(item);
            setPartyData(partyRes?.data?.response?.data || []);
            setPartyItems(browseRes?.data?.data?.maindata || []);
            setPartyForm({ accountname: '', acccode: '', ItemName: '' });
            setScreen('PARTY');
        } catch (e: any) {
            AppAlert.alert('Error', e?.response?.data?.message || 'Unable to load party/item details.');
        } finally { setLoading(false); }
    };

    const addPartyItem = async () => {
        if (!partyForm.acccode) return AppAlert.alert('Validation', 'Party Can not be blank');
        if (!partyForm.ItemName) return AppAlert.alert('Validation', 'Please enter Item value');
        if (!selectedBrowseItem?.itmcode) return AppAlert.alert('Error', 'Please select item from list');
        setLoading(true);
        try {
            const ctx = context.prptype ? context : await loadContext();
            const res = await apiPost('/yarnitemd1add', {
                prptype: ctx.prptype, parcode: partyForm.acccode, parname: partyForm.accountname,
                itmcode: selectedBrowseItem.itmcode, itmname: partyForm.ItemName,
                txntype: 'yarn_creation_item_master', yarntype: activeTab === 'Spun' ? '1' : '2', strcode: ctx.strcode,
            });
            if (!res?.data?.success) return AppAlert.alert('Warning', res?.data?.message || 'Unable to save item.');
            setPartyForm({ accountname: '', acccode: '', ItemName: '' });
            AppAlert.alert('Success', 'Item Saved successfully.');
            const refreshed = await apiGet('/yarnitemd1browse', {
                itmcode: browseParent?.itmcode || selectedBrowseItem?.itmcode,
                prptype: ctx.prptype, strcode: ctx.strcode, txntype: 'yarn_creation_item_master',
                yarntype: activeTab === 'Spun' ? '1' : '2', prpcode: ctx.prpcode,
            });
            setPartyItems(refreshed?.data?.data?.maindata || []);
        } catch (e: any) {
            AppAlert.alert('Error', e?.response?.data?.message || 'Something went wrong.');
        } finally { setLoading(false); }
    };

    const requestDelete = (item: any, type: 'MAIN' | 'SUB') => {
        setDeleteTarget(item); setDeleteTargetType(type); setDeleteVisible(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget || loading) return;
        const itemCode = deleteTargetType === 'SUB'
            ? deleteTarget?.itmcode || ''
            : deleteTarget?.itmcode || deleteTarget?.mitmcode || deleteTarget?.ItmCode || '';
        if (!itemCode) {
            setDeleteVisible(false);
            setDeleteResultType('ERROR');
            setDeleteResultMessage('Item code not found. Unable to delete this item.');
            setDeleteResultVisible(true);
            return;
        }

        setLoading(true);
        try {
            const ctx = context.prptype ? context : await loadContext();
            const res = await apiPost('/yarnitemdelete', {
                prptype: deleteTarget?.prptype ?? deleteTarget?.PrpType ?? deleteTarget?.PRPTYPE ?? ctx.prptype,
                itmcode: itemCode,
                strcode: ctx.strcode,
                txntype: 'yarn_creation_item_master',
            });
            const responseData = res?.data || {};
            const responseObject = responseData?.response || responseData?.data?.response || {};
            const message = responseObject?.message || responseData?.message || responseData?.data?.message || 'Delete response received.';
            const normalized = String(message).trim().toLowerCase();
            const status = String(responseObject?.status ?? '').trim().toUpperCase();
            const explicitSuccess = normalized.includes('delete successful') || normalized.includes('deleted successfully') || normalized.includes('delete successfully') || normalized.includes('successfully deleted');
            const success = responseData?.success === true && (status === 'P' || explicitSuccess);

            setDeleteVisible(false);
            setDeleteResultType(success ? 'SUCCESS' : 'PERMISSION');
            setDeleteResultMessage(String(message));
            setDeleteResultVisible(true);
        } catch (e: any) {
            setDeleteVisible(false);
            setDeleteResultType('ERROR');
            setDeleteResultMessage(e?.response?.data?.response?.message || e?.response?.data?.message || 'Unable to delete item. Please try again.');
            setDeleteResultVisible(true);
        } finally { setLoading(false); }
    };

    const closeCurrent = () => {
        setSearch('');
        if (screen === 'MAIN_FORM') { setScreen('LIST'); resetForms(); return; }
        if (screen === 'SUB_FORM') { setScreen('SUB_LIST'); setIsModifyMode(false); return; }
        if (screen === 'PARTY') { setScreen('SUB_LIST'); return; }
        if (screen === 'SUB_LIST') { setScreen('LIST'); return; }
    };

    const handleDeleteResultOk = async () => {
        const type = deleteResultType;
        setDeleteResultVisible(false);
        if (type !== 'SUCCESS') return;
        if (deleteTargetType === 'MAIN') {
            await loadItems(activeTab, context);
        } else if (browseParent) {
            await loadSubList(browseParent);
        }
        setDeleteTarget(null);
    };

    // Main Spun/Filament search: keep the existing broad search behaviour,
    // but also make slash-pair values reversible. For example, a yarn named
    // `190/1 Den BRIGHT DTY CARORPATI 2` is found by `190`, `190/1`, or `1/190`.
    const normalizeYarnSearchText = (value: any) =>
        String(value ?? '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();

    const getYarnSearchVariants = (value: any) => {
        const q = normalizeYarnSearchText(value);
        if (!q) return [];

        const variants = new Set<string>([q]);
        const slashPair = q.match(/\b(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\b/);

        if (slashPair) {
            const [, first, second] = slashPair;
            variants.add(`${first}/${second}`);
            variants.add(`${second}/${first}`);
            variants.add(`${first} / ${second}`);
            variants.add(`${second} / ${first}`);
            variants.add(`${first} ${second}`);
            variants.add(`${second} ${first}`);

            // Preserve the rest of a longer query too.
            // Example: `1/190 bright` -> `190/1 bright`.
            variants.add(q.replace(slashPair[0], `${second}/${first}`));
        }

        return Array.from(variants);
    };

    const filtered = useMemo(() => {
        const q = normalizeYarnSearchText(search);

        // ✅ Only show items where ply > 0 (hides ply 0 / empty items)
        const validItems = items.filter(item => Number(item?.WPly) > 0);

        if (!q) return validItems;

        const queryVariants = getYarnSearchVariants(q);

        return validItems.filter(item => {
            // Keep the old behaviour: every property of the item remains searchable.
            const searchableText = Object.values(item || {})
                .map(v => normalizeYarnSearchText(v))
                .filter(Boolean)
                .join(' ');

            return queryVariants.some(variant => searchableText.includes(variant));
        });
    }, [items, search]);

    const filteredSub = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return browseItems;
        return browseItems.filter(item => Object.values(item || {}).some(v => String(v ?? '').toLowerCase().includes(q)));
    }, [browseItems, search]);

    const filteredParty = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return partyItems;
        return partyItems.filter(item => Object.values(item || {}).some(v => String(v ?? '').toLowerCase().includes(q)));
    }, [partyItems, search]);

    // ═══════════════════════════════════════════════════════════
    // Blend -> Ply -> Items grouping (built from `filtered`
    //    so search keeps working)
    // ═══════════════════════════════════════════════════════════
    // "COTTON, LINEN" -> "Cotton Linen"
    const toTitle = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

    const blendLabelOf = (item: any) => {
        const names = String(item?.BlendNames || '')
            .split(',')
            .map(x => x.trim())
            .filter(Boolean);
        if (names.length) return names.map(toTitle).join(' ');
        return String(item?.WBlend || '').trim() || 'Unknown';
    };

    const blendGroups = useMemo(() => {
        const map = new Map<string, { key: string; label: string; total: number; plys: Map<string, any[]> }>();

        filtered.forEach((item: any) => {
            const label = blendLabelOf(item);
            const key = label.toUpperCase();
            const ply = String(item?.WPly ?? '').trim() || '-';

            if (!map.has(key)) map.set(key, { key, label, total: 0, plys: new Map() });
            const g = map.get(key)!;
            g.total += 1;
            if (!g.plys.has(ply)) g.plys.set(ply, []);
            g.plys.get(ply)!.push(item);
        });

        return Array.from(map.values())
            .map(g => ({
                key: g.key,
                label: g.label,
                total: g.total,
                plys: Array.from(g.plys.entries())
                    .sort((a, b) => Number(a[0]) - Number(b[0]) || a[0].localeCompare(b[0]))
                    .map(([ply, plyItems]) => ({ ply, items: plyItems })),
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [filtered]);

    const toggleBlend = (key: string) => setOpenBlends(p => ({ ...p, [key]: !p[key] }));
    const togglePly = (key: string) => setOpenPlys(p => ({ ...p, [key]: !p[key] }));

    const field = (
        label: string,
        value: any,
        onChange: (v: string) => void,
        numeric = false,
        editable = true,
        errorText?: string,
    ) => (
        <View style={ym2.field}>
            <Text style={ym2.label}>{label}</Text>
            <View style={[ym2.inputWrap, !editable && ym2.disabledInputWrap, errorText && ym2.errorInputWrap]}>
                <TextInput
                    value={String(value ?? '')}
                    editable={editable && !loading}
                    keyboardType={numeric ? 'numeric' : 'default'}
                    onChangeText={v => {
                        if (numeric && !/^[0-9.]*$/.test(v)) return;
                        onChange(v);
                    }}
                    placeholder={label.replace(' *', '') + '...'}
                    placeholderTextColor={T.muted}
                    style={[ym2.input, !editable && ym2.disabledInput, { width: '-webkit-fill-available' }]}
                />
                {!editable ? <Ionicons name="lock-closed-outline" size={15} color={T.muted} /> : null}
            </View>
            {errorText ? <Text style={ym2.validationText}>{errorText}</Text> : null}
        </View>
    );

    const selectField = (
        label: string,
        valueText: string,
        onPress: () => void,
        required = false,
        disabled = false,
        errorText?: string,
    ) => (
        <View style={ym2.field}>
            <Text style={ym2.label}>{label}{required ? <Text style={ym2.required}> *</Text> : null}</Text>
            <TouchableOpacity
                disabled={disabled || loading}
                style={[ym2.selectWrap, disabled && ym2.disabledInputWrap, errorText && ym2.errorInputWrap]}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <Text numberOfLines={2} style={[ym2.selectText, !valueText && ym2.selectPlaceholder]}>
                    {valueText || 'Choose...'}
                </Text>
                <Ionicons name={disabled ? 'lock-closed-outline' : 'chevron-down'} size={16} color={T.muted} />
            </TouchableOpacity>
            {errorText ? <Text style={ym2.validationText}>{errorText}</Text> : null}
        </View>
    );

    const getHasMultipleBlend = (item: any) => {
        const blendNames = String(item?.BlendNames || '')
            .split(',')
            .map(x => x.trim())
            .filter(Boolean);

        return blendNames.length > 1;
    };

    // Small label + value block used inside the cards
    const statCell = (label: string, value: any, wide = false, lines = 1) => (
        <View style={[yc.stat, wide && yc.statWide]}>
            <Text style={yc.statLabel}>{label}</Text>
            <Text numberOfLines={lines} style={yc.statValue}>{String(value ?? '').trim() || '-'}</Text>
        </View>
    );

    // `inTree` — inside the Blend/Ply tree the card fills its grid cell
    const renderCard = ({ item, index, inTree }: { item: any; index?: number; inTree?: boolean }) => {
        const hasMultipleBlend = getHasMultipleBlend(item);

        return (
            <View style={[yc.card, inTree ? { flex: 1 } : (gridColumns > 1 && { flex: 1, maxWidth: `${100 / gridColumns - 1}%` })]}>
                <View style={yc.cardTop}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={2} style={yc.title}>{item.WNameCode || item.itmname || item.ItmName || item.itmcode || '-'}</Text>
                        <Text style={yc.code}>#{item.itmcode || '-'}</Text>
                    </View>
                    <View style={yc.badge}><Text style={yc.badgeText}>{activeTab === 'Spun' ? 'SPUN' : 'FILAMENT'}</Text></View>
                </View>

                <View style={yc.statGrid}>
                    {statCell('Blend', item.BlendNames || item.WBlend, true, 2)}
                    {statCell('Count', item.WCount || item.count)}
                    {statCell('Count Type', item.counttypename)}
                    {statCell('Ply', item.WPly)}
                    {statCell('Other', item.WOther, false, 2)}
                </View>

                <View style={yc.actions}>
                    <TouchableOpacity style={yc.btn} onPress={() => openModifyMain(item)}>
                        <Ionicons name="create-outline" size={15} color={T.ink} /><Text style={yc.btnText}>Modify</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[yc.btn, yc.btnDanger]} onPress={() => requestDelete(item, 'MAIN')}>
                        <Ionicons name="trash-outline" size={15} color="#B42318" /><Text style={[yc.btnText, { color: '#B42318' }]}>Delete</Text>
                    </TouchableOpacity>
                    {hasMultipleBlend && (
                        <TouchableOpacity style={yc.btn} onPress={() => loadSubList(item)}>
                            <Ionicons name="git-branch-outline" size={15} color={T.ink} /><Text style={yc.btnText}>Sub Items</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };


    const renderSubCard = ({ item }: { item: any }) => (
        <View style={[yc.card, { marginBottom: 10 }, gridColumns > 1 && { flex: 1, maxWidth: `${100 / gridColumns - 1}%` }]}>
            <View style={yc.cardTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={2} style={yc.title}>{item.WNameCode || item.itmname || item.ItmName || item.itmcode || '-'}</Text>
                    <Text style={yc.code}>#{item.itmcode || '-'}</Text>
                </View>
                <View style={yc.badge}><Text style={yc.badgeText}>SUB ITEM</Text></View>
            </View>

            <View style={yc.statGrid}>
                {statCell('Count', item.WCount || item.count)}
                {statCell('Count Type', item.counttypename)}
                {statCell('Ply', item.WPly)}
                {statCell('Other', item.WOther || item.other, false, 2)}
            </View>

            <View style={yc.actions}>
                <TouchableOpacity style={yc.btn} onPress={() => openSubModify(item)}>
                    <Ionicons name="create-outline" size={15} color={T.ink} /><Text style={yc.btnText}>Modify</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[yc.btn, yc.btnDanger]} onPress={() => requestDelete(item, 'SUB')}>
                    <Ionicons name="trash-outline" size={15} color="#B42318" /><Text style={[yc.btnText, { color: '#B42318' }]}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={yc.btn} onPress={() => openParty(item)}>
                    <Ionicons name="people-outline" size={15} color={T.ink} /><Text style={yc.btnText}>Party Items</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderMainForm = () => {
        const filament = activeTab === 'Filaments';
        const form = filament ? filamentForm : spunForm;
        const blendText = (form.blend || []).join(', ');
        return (
            <View style={ym2.page}>
                <View style={ym2.subHeader}>
                    <TouchableOpacity onPress={closeCurrent} style={ym2.backBtn}><Ionicons name="arrow-back" size={20} color="#fff" /></TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={ym2.subHeaderTitle}>{isModifyMode ? `Modify ${filament ? 'Filament' : 'Spun'} Main Item` : `Add ${filament ? 'Filament' : 'Spun'} Main Item`}</Text>
                        {isModifyMode ? <Text style={ym2.subHeaderSub}>{modifyItemName}</Text> : null}
                    </View>
                </View>
                <ScrollView contentContainerStyle={ym2.content} keyboardShouldPersistTaps="handled">
                    <View style={ym2.formCard}>
                        {selectField('Blend', blendText, () => openPicker('blend', 'Select Blend', blendData, true, selectedBlend), true)}
                        {selectField('Count Type', form.count || '', () => openPicker('count', 'Select Count Type', countData, false, selectedCount), true)}
                        {field('Count *', form.count_no, v => {
                            if (filament) setFilamentForm((p: any) => ({ ...p, count_no: v, denier: calculateFilamentDenier(v, p.ply, selectedCount?.formula), linkitmcode: buildFilamentItem(v, p.count, p.ply, p.lustre, p.type, p.others) }));
                            else setSpunForm((p: any) => ({ ...p, count_no: v, denier: calculateDenier(v, p.ply, selectedCount?.formula), linkitmcode: buildMainItem(v, p.count, p.ply, p.blend, p.others) }));
                        }, true)}
                        {selectField('Ply', form.ply || '', () => openPicker('ply', 'Select Ply', plyData, false, selectedPly), true)}
                        {filament && (
                            <>
                                {selectField('Filament Type', form.type || '', () => openPicker('type', 'Select Filament Type', typeData, false, selectedType), true)}
                                {selectField('Lustre', form.lustre || '', () => openPicker('lustre', 'Select Lustre', lustreData, false, selectedLustre), true)}
                            </>
                        )}
                        {field('Other', form.others, v => {
                            if (filament) {
                                setFilamentForm((p: any) => ({
                                    ...p,
                                    others: v,
                                    linkitmcode: buildFilamentItem(p.count_no, p.count, p.ply, p.lustre, p.type, v),
                                }));
                            } else {
                                setSpunForm((p: any) => ({
                                    ...p,
                                    others: v,
                                    linkitmcode: buildMainItem(p.count_no, p.count, p.ply, p.blend, v),
                                }));
                            }
                        })}
                        {field('Main Item *', form.linkitmcode, v => filament
                            ? setFilamentForm((p: any) => ({ ...p, linkitmcode: v }))
                            : setSpunForm((p: any) => ({ ...p, linkitmcode: v })))}
                        {field('Denier *', form.denier, () => { }, false, false)}
                        <View style={ym2.actions}>
                            <TouchableOpacity style={ym2.secondaryBtn} onPress={closeCurrent}><Text style={ym2.secondaryText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={ym2.primaryBtn} onPress={saveMain}>
                                <Ionicons name={isModifyMode ? 'checkmark-circle-outline' : 'save-outline'} size={17} color="#fff" />
                                <Text style={ym2.primaryText}>{isModifyMode ? 'Modify Item' : `Add ${filament ? 'Filament' : 'Spun'} Item`}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    };

    const getSubValidationErrors = () => {
        const errors: Record<string, string> = {};
        if (!subForm.WNameCode) errors.main = 'Main Item is required';
        if (!subBlendList.length) {
            errors.blend = 'Please select Blend';
        } else {
            const total = subBlendList.reduce((sum, b) => sum + Number(b.per || 0), 0);
            if (subBlendList.some(b => !Number.isFinite(Number(b.per)) || Number(b.per) <= 0)) {
                errors.blend = 'Enter a valid percentage for every blend';
            } else if (Math.abs(total - 100) > 0.0001) {
                errors.blend = `Total percentage must be 100%. Current: ${total}%`;
            }
        }
        if (!subForm.count) errors.count = 'Please select Count Type';
        if (!subForm.count_no) errors.countNo = 'Please enter Count value';
        if (!subForm.ply_id) errors.ply = 'Please select Ply';
        if (!subForm.subtype_id) errors.subtype = 'Please select Yarn Type';
        if (!subForm.linkitmcode) errors.name = 'Sub Item Name is required';
        if (!subForm.denier) errors.denier = 'Denier is calculated automatically after Count/Ply/Formula are available';
        return errors;
    };

    const saveSub = async () => {
        const errors = getSubValidationErrors();
        const firstError = Object.values(errors)[0];
        if (firstError) {
            AppAlert.alert('Validation', firstError);
            return;
        }

        setLoading(true);
        try {
            const ctx = context.prptype ? context : await loadContext();

            const payload: any = isModifyMode
                ? {
                    maincode: subForm.linkitmcode,
                    denier: subForm.denier,
                    blend: subBlendList.map(b => b.id).join('/'),
                    count: subForm.count_no,
                    ply: subForm.ply_id,
                    mitmcode: subForm.mitmcode || '',
                    blend_names: subBlendList.map(b => ({
                        id: b.id,
                        name: b.name,
                        per: Number(b.per || 0),
                    })),
                    prptype: ctx.prptype,
                    txntype: 'SUBITEM',
                    yarntype: subForm.WYarnType,
                    strcode: ctx.strcode,
                    linkitmcode: subForm.ItmCode || '',
                    other: subForm.others || '',
                    subyarntype: subForm.subtype_id || '',
                    itmcode: subForm.ItmCode || '',
                }
                : {
                    maincode: subForm.linkitmcode,
                    denier: subForm.denier,
                    blendid: subForm.WBlend,
                    count: subForm.count_no,
                    ply: subForm.ply_id,
                    mitmcode: subForm.mitmcode || '',
                    blend_names: subBlendList.map(b => ({
                        id: b.id,
                        name: b.name,
                        per: Number(b.per || 0),
                    })),
                    prptype: ctx.prptype,
                    txntype: 'yarn_creation_item_master',
                    yarntype: subForm.WYarnType,
                    strcode: ctx.strcode,
                    linkitmcode: subForm.ItmCode || '',
                    other: subForm.others || '',
                    subyarntype: subForm.subtype_id || '',
                };

            const res = await apiPost(
                isModifyMode ? '/yarncreationmodify' : '/addyarnsubitem',
                payload,
            );

            if (!res?.data?.success) {
                return AppAlert.alert(
                    'Warning',
                    res?.data?.message || 'Unable to save sub item.',
                );
            }

            const code = res?.data?.data?.data?.itmcode || subForm.ItmCode || '';
            AppAlert.alert(
                'Success',
                isModifyMode
                    ? `Sub Item ${code} updated successfully.`
                    : `Item ${code} saved successfully.`,
            );

            setIsModifyMode(false);
            setScreen('SUB_LIST');
            if (browseParent) await loadSubList(browseParent);
        } catch (e: any) {
            AppAlert.alert(
                'Error',
                e?.response?.data?.message || 'Something went wrong.',
            );
        } finally {
            setLoading(false);
        }
    };

    const renderSubForm = () => {
        const subErrors = getSubValidationErrors();
        const isSaving = loading;

        return (
            <View style={ym2.page}>
                <View style={ym2.subHeader}>
                    <TouchableOpacity onPress={closeCurrent} style={ym2.backBtn} disabled={isSaving}>
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={ym2.subHeaderTitle}>{isModifyMode ? 'Modify Sub Item' : 'Create Sub Item'}</Text>
                        <Text style={ym2.subHeaderSub}>{modifyItemName || subForm.WNameCode}</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={ym2.content} keyboardShouldPersistTaps="handled">
                    <View style={ym2.formCard}>
                        {field(
                            'Main Item *',
                            subForm.WNameCode,
                            () => { },
                            false,
                            false,
                            subErrors.main,
                        )}

                        <Text style={ym2.label}>Blend <Text style={ym2.required}>*</Text></Text>
                        {subBlendList.map((b, i) => (
                            <View key={`${b.id}-${i}`} style={ym2.blendRow}>
                                <Text numberOfLines={1} style={[ym2.blendName, { flex: 1 }]}>{b.name}</Text>
                                <TextInput
                                    value={String(b.per ?? '')}
                                    editable={!isSaving}
                                    onChangeText={v => {
                                        if (!/^[0-9.]*$/.test(v)) return;
                                        setSubBlendList(prev => {
                                            const nextList = prev.map((x, idx) => idx === i ? { ...x, per: v } : x);
                                            setSubForm(current => ({
                                                ...current,
                                                linkitmcode: buildSubItem(current.count_no, current.ply, nextList, current.others),
                                            }));
                                            return nextList;
                                        });
                                    }}
                                    keyboardType="numeric"
                                    placeholder="%"
                                    placeholderTextColor={T.muted}
                                    style={[ym2.percentInput, isSaving && ym2.disabledInput]}
                                />
                            </View>
                        ))}
                        <Text style={[ym2.totalText, subErrors.blend && ym2.validationText]}>
                            Total: {subBlendList.reduce((sum, b) => sum + Number(b.per || 0), 0)}%
                        </Text>
                        {subErrors.blend ? <Text style={ym2.validationText}>{subErrors.blend}</Text> : null}

                        {field(
                            'Count *',
                            subForm.count_no,
                            v => setSubForm((p: any) => ({
                                ...p,
                                count_no: v,
                                denier: calculateDenier(v, p.ply, p.formula),
                                linkitmcode: buildSubItem(v, p.ply, subBlendList, p.others),
                            })),
                            false,
                            false,
                            subErrors.countNo,
                        )}

                        {selectField(
                            'Ply',
                            subForm.ply || '',
                            () => openPicker('ply', 'Select Ply', plyData, false, selectedPly, true),
                            false,
                            true,
                            subErrors.ply,
                        )}

                        {selectField(
                            'Yarn Type',
                            subForm.subtype_name || '',
                            () => openPicker('subtype', 'Select Yarn Type', subTypeData, false, selectedSubType),
                            true,
                            false,
                            subErrors.subtype,
                        )}

                        {field(
                            'Other',
                            subForm.others,
                            v => setSubForm((p: any) => ({
                                ...p,
                                others: v,
                                linkitmcode: buildSubItem(p.count_no, p.ply, subBlendList, v),
                            })),
                            false,
                            false,
                        )}

                        {field(
                            'Sub Item Name *',
                            subForm.linkitmcode,
                            v => setSubForm((p: any) => ({ ...p, linkitmcode: v })),
                            false,
                            false,
                        )}

                        {field(
                            'Denier *',
                            subForm.denier,
                            () => { },
                            false,
                            false,
                            subErrors.denier,
                        )}

                        <View style={ym2.actions}>
                            <TouchableOpacity style={ym2.secondaryBtn} onPress={closeCurrent} disabled={isSaving}>
                                <Text style={ym2.secondaryText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[ym2.primaryBtn, isSaving && ym2.disabledButton]}
                                onPress={saveSub}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons name={isModifyMode ? 'checkmark-circle-outline' : 'add-circle-outline'} size={17} color="#fff" />
                                )}
                                <Text style={ym2.primaryText}>{isModifyMode ? 'Modify Sub Item' : 'Add Sub Item'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    };

    const renderParty = () => (
        <View style={ym2.page}>
            <View style={ym2.subHeader}>
                <TouchableOpacity onPress={closeCurrent} style={ym2.backBtn}><Ionicons name="arrow-back" size={20} color="#fff" /></TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={ym2.subHeaderTitle}>Party Items</Text>
                    <Text style={ym2.subHeaderSub}>{selectedBrowseItem?.WNameCode || selectedBrowseItem?.itmname || selectedBrowseItem?.itmcode || '-'}</Text>
                </View>
            </View>
            <ScrollView contentContainerStyle={ym2.content} keyboardShouldPersistTaps="handled">
                <View style={ym2.formCard}>
                    {selectField('Party', partyForm.accountname || partyForm.acccode, () => openPicker('party', 'Select Party', partyData, false, partyData.find(p => String(p.acccode) === String(partyForm.acccode))), true)}
                    {field('Item Name *', partyForm.ItemName, v => setPartyForm(p => ({ ...p, ItemName: v })))}
                    <TouchableOpacity style={ym2.primaryBtn} onPress={addPartyItem}>
                        <Ionicons name="add-circle-outline" size={17} color="#fff" /><Text style={ym2.primaryText}>Add Item</Text>
                    </TouchableOpacity>
                </View>
                <Text style={ym2.sectionTitle}>Existing Party Items ({filteredParty.length})</Text>
                <FlatList
                    key={`party-grid-${gridColumns}`}
                    data={filteredParty}
                    keyExtractor={(item, i) => `${item?.id || item?.itmcode || i}`}
                    numColumns={gridColumns}
                    scrollEnabled={false}
                    columnWrapperStyle={gridColumns > 1 ? ym2.gridRow : undefined}
                    renderItem={({ item }) => (
                        <View style={[ym2.listCard, gridColumns > 1 && { flex: 1, maxWidth: `${100 / gridColumns - 1}%` }]}>
                            <Text style={ym2.listTitle}>Item: {item?.ItmName || item?.itmname || item?.ItemName || item?.name || '-'}</Text>
                            <Text style={ym2.listTitle}>Code: {item?.ItmCode || item?.itmcode || item?.ItemCode || item?.code || '-'}</Text>
                            <Text style={ym2.listTitle}>Party: {item?.ParName || item?.accountname || item?.parname || item?.acccode || '-'}</Text>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={ym2.emptySub}>No party items found.</Text>}
                />
            </ScrollView>
        </View>
    );

    const renderSubList = () => (
        <View style={ym2.page}>
            <View style={ym2.subHeader}>
                <TouchableOpacity onPress={closeCurrent} style={ym2.backBtn}><Ionicons name="arrow-back" size={20} color="#fff" /></TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={ym2.subHeaderTitle}>Sub Items</Text>
                    <Text style={ym2.subHeaderSub}>{browseParent?.WNameCode || browseParent?.itmcode || '-'}</Text>
                </View>

                <TouchableOpacity style={ym2.headerAddBtn} onPress={() => openSubCreate(browseParent)}>
                    <Ionicons name="add" size={18} color="#fff" /><Text style={ym2.headerAddText}>Create</Text>
                </TouchableOpacity>
            </View>
            <View style={ym2.toolbar}>
                <View style={ym2.searchWrap}>
                    <Ionicons name="search-outline" size={19} color={T.muted} />
                    <TextInput value={search} onChangeText={setSearch} placeholder="Search sub item..." placeholderTextColor={T.muted} style={ym2.searchInput} />
                    {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={T.muted} /></TouchableOpacity> : null}
                </View>
            </View>
            <ScrollView contentContainerStyle={ym2.content} keyboardShouldPersistTaps="handled">
                <FlatList
                    key={`sub-grid-${gridColumns}`}
                    data={filteredSub}
                    keyExtractor={(item, i) => `${item?.itmcode || i}`}
                    numColumns={gridColumns}
                    scrollEnabled={false}
                    columnWrapperStyle={gridColumns > 1 ? ym2.gridRow : undefined}
                    renderItem={renderSubCard}
                    ListEmptyComponent={<View style={ym2.emptyCard}><Ionicons name="git-branch-outline" size={32} color={T.muted} /><Text style={ym2.emptyTitle}>No sub items</Text></View>}
                />
            </ScrollView>
        </View>
    );

    const body =
        screen === 'MAIN_FORM' ? renderMainForm() :
            screen === 'SUB_FORM' ? renderSubForm() :
                screen === 'PARTY' ? renderParty() :
                    screen === 'SUB_LIST' ? renderSubList() :
                        (
                            <View style={ym2.page}>
                                <View style={ym2.topTabs}>
                                    {(['Spun', 'Filaments'] as const).map(tab => (
                                        <TouchableOpacity key={tab} onPress={() => { setActiveTab(tab); setSearch(''); resetForms(); }} style={[ym2.topTab, activeTab === tab && ym2.topTabActive]}>
                                            <Text style={[ym2.topTabText, activeTab === tab && ym2.topTabTextActive]}>{tab === 'Filaments' ? 'Filament' : 'Spun'}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={ym2.toolbar}>
                                    <View style={ym2.searchWrap}>
                                        <Ionicons name="search-outline" size={19} color={T.muted} />
                                        <TextInput value={search} onChangeText={setSearch} placeholder="Search yarn name / code / count..." placeholderTextColor={T.muted} style={ym2.searchInput} />
                                        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={T.muted} /></TouchableOpacity> : null}
                                    </View>
                                    <TouchableOpacity style={ym2.addButton} onPress={openAddMain}>
                                        <Ionicons name="add" size={18} color="#fff" /><Text style={ym2.addButtonText}>Add {activeTab === 'Spun' ? 'Spun' : 'Filament'} Main Item</Text>
                                    </TouchableOpacity>
                                </View>
                                {loading && <View style={ym2.loadingBar}><ActivityIndicator size="small" color={T.copper} /><Text style={ym2.loadingText}>Loading yarn management data...</Text></View>}

                                {/* Blend -> Ply -> Items tree (Designs-style rows) */}
                                <ScrollView contentContainerStyle={ym2.content} keyboardShouldPersistTaps="handled">
                                    {blendGroups.length === 0 ? (
                                        <View style={ym2.emptyCard}>
                                            <Ionicons name="layers-outline" size={32} color={T.muted} />
                                            <Text style={ym2.emptyTitle}>{loading ? 'Loading...' : 'No items yet'}</Text>
                                            <Text style={ym2.emptySub}>Add one to get started.</Text>
                                        </View>
                                    ) : (
                                        blendGroups.map(group => {
                                            const blendOpen = !!openBlends[group.key];
                                            return (
                                                <View key={group.key} style={[yt.blendWrap, blendOpen && yt.blendWrapOpen]}>
                                                    {/* LEVEL 1: BLEND */}
                                                    <TouchableOpacity
                                                        style={[yt.blendRow, blendOpen && yt.blendRowOpen]}
                                                        activeOpacity={0.7}
                                                        onPress={() => toggleBlend(group.key)}
                                                    >
                                                        <View style={[yt.iconBox, blendOpen && yt.iconBoxOpen]}>
                                                            <Ionicons
                                                                name={blendOpen ? 'folder-open-outline' : 'layers-outline'}
                                                                size={20}
                                                                color={blendOpen ? T.copper : T.muted}
                                                            />
                                                        </View>
                                                        <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                                                            <Text numberOfLines={1} style={yt.blendTitle}>{group.label.toUpperCase()}</Text>
                                                            <Text numberOfLines={1} style={yt.blendSub}>
                                                                BLEND · {group.plys.length} ply · {group.total} items
                                                            </Text>
                                                        </View>
                                                        <View style={[yt.countPill, blendOpen && yt.countPillOpen]}>
                                                            <Text style={[yt.countPillText, blendOpen && yt.countPillTextOpen]}>{group.total}</Text>
                                                        </View>
                                                        <View style={[yt.chevBox, blendOpen && yt.chevBoxOpen]}>
                                                            <Ionicons
                                                                name={blendOpen ? 'chevron-down' : 'chevron-forward'}
                                                                size={16}
                                                                color={blendOpen ? '#fff' : T.muted}
                                                            />
                                                        </View>
                                                    </TouchableOpacity>

                                                    {blendOpen && group.plys.map(p => {
                                                        const plyKey = `${group.key}|${p.ply}`;
                                                        const plyOpen = !!openPlys[plyKey];
                                                        return (
                                                            <View key={plyKey}>
                                                                {/* LEVEL 2: PLY */}
                                                                <TouchableOpacity
                                                                    style={[yt.plyRow, plyOpen && yt.plyRowOpen]}
                                                                    activeOpacity={0.7}
                                                                    onPress={() => togglePly(plyKey)}
                                                                >
                                                                    <View style={[yt.plyIconBox, plyOpen && yt.plyIconBoxOpen]}>
                                                                        <Text style={[yt.plyIconText, plyOpen && yt.plyIconTextOpen]}>{p.ply}</Text>
                                                                    </View>
                                                                    <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                                                                        <Text style={yt.plyTitle}>PLY {p.ply}</Text>
                                                                        <Text style={yt.plySub}>{p.items.length} items</Text>
                                                                    </View>
                                                                    <View style={[yt.countPill, plyOpen && yt.countPillOpen]}>
                                                                        <Text style={[yt.countPillText, plyOpen && yt.countPillTextOpen]}>{p.items.length}</Text>
                                                                    </View>
                                                                    <View style={[yt.chevBox, plyOpen && yt.chevBoxOpen]}>
                                                                        <Ionicons
                                                                            name={plyOpen ? 'chevron-down' : 'chevron-forward'}
                                                                            size={15}
                                                                            color={plyOpen ? '#fff' : T.muted}
                                                                        />
                                                                    </View>
                                                                </TouchableOpacity>

                                                                {/* LEVEL 3: DATA (cards in a grid) */}
                                                                {plyOpen && (
                                                                    <View style={yt.itemsWrap}>
                                                                        {p.items.map((it: any, i: number) => (
                                                                            <View key={`${it?.itmcode || i}`} style={[yt.itemCell, { width: `${100 / treeCols}%` } as any]}>
                                                                                {renderCard({ item: it, index: i, inTree: true })}
                                                                            </View>
                                                                        ))}
                                                                    </View>
                                                                )}
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            );
                                        })
                                    )}
                                </ScrollView>
                            </View>
                        );

    const pickerData = picker?.data || [];
    const pickerValue = picker?.value;
    const pickerLabel = (item: any) => {
        if (picker?.key === 'ply') return String(item?.ply ?? item?.name ?? item?.id ?? '');
        if (picker?.key === 'type') return String(item?.type ?? item?.name ?? item?.id ?? '');
        if (picker?.key === 'lustre') return String(item?.lustre ?? item?.name ?? item?.id ?? '');
        if (picker?.key === 'party') return String(item?.accountname ?? item?.name ?? item?.acccode ?? '');
        return String(item?.name ?? item?.id ?? '');
    };

    const pickerModal = picker ? (
        <>
            {!picker.disabled && (
                <Modal visible transparent animationType="fade" onRequestClose={() => setPicker(null)}>
                    <View style={ym2.modalBackdrop}>
                        <View style={[ym2.pickerModal, { maxHeight: Math.min(screenWidth >= 700 ? 620 : 560, 620) }]}>
                            <View style={ym2.pickerHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={ym2.pickerTitle}>{picker.title}</Text>
                                    {picker.multiple ? <Text style={ym2.pickerHint}>Select one or more, then press Done.</Text> : null}
                                </View>
                                <TouchableOpacity onPress={() => setPicker(null)} style={ym2.iconBtn}><Ionicons name="close" size={20} color={T.ink} /></TouchableOpacity>
                            </View>
                            <FlatList
                                data={pickerData}
                                keyExtractor={(item, i) => `${item?.id ?? item?.acccode ?? i}`}
                                contentContainerStyle={{ padding: 10 }}
                                renderItem={({ item }) => {
                                    const selected = picker.multiple
                                        ? (Array.isArray(pickerValue) && pickerValue.some((x: any) => String(x?.id) === String(item?.id)))
                                        : String(pickerValue?.id ?? pickerValue?.acccode ?? '') === String(item?.id ?? item?.acccode ?? '');
                                    return (
                                        <TouchableOpacity
                                            style={[ym2.pickerRow, selected && ym2.pickerRowSelected]}
                                            onPress={() => {
                                                handlePickerSelect(item)
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={ym2.pickerRowTitle}>{pickerLabel(item)}</Text>
                                                {item?.id !== undefined || item?.acccode ? <Text style={ym2.pickerRowMeta}>{String(item?.id ?? item?.acccode ?? '')}</Text> : null}
                                            </View>
                                            <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={selected ? T.copper : T.muted} />
                                        </TouchableOpacity>
                                    );
                                }}
                                ListEmptyComponent={<Text style={ym2.emptySub}>No options found.</Text>}
                            />
                            {picker.multiple ? (
                                <View style={ym2.pickerFooter}>
                                    <TouchableOpacity style={ym2.secondaryBtn} onPress={() => setPicker(null)}><Text style={ym2.secondaryText}>Cancel</Text></TouchableOpacity>
                                    <TouchableOpacity style={ym2.primaryBtn} onPress={applyMultiPicker}><Text style={ym2.primaryText}>Done</Text></TouchableOpacity>
                                </View>
                            ) : null}
                        </View>
                    </View>
                </Modal>
            )}
        </>
    ) : null;

    const deleteModal = (
        <Modal visible={deleteVisible} transparent animationType="fade" onRequestClose={() => setDeleteVisible(false)}>
            <View style={ym2.modalBackdrop}>
                <View style={ym2.deleteModal}>
                    <View style={ym2.deleteIcon}><Ionicons name="trash-outline" size={24} color="#B42318" /></View>
                    <Text style={ym2.deleteTitle}>{deleteTargetType === 'SUB' ? 'Delete Sub Item' : 'Delete Item'}</Text>
                    <Text style={ym2.deleteMessage}>Are you sure you want to delete this item?</Text>
                    <View style={ym2.deleteInfo}>
                        <Text numberOfLines={2} style={ym2.itemTitle}>{deleteTarget?.WNameCode || deleteTarget?.itmname || deleteTarget?.ItmName || 'Selected Item'}</Text>
                        <Text style={ym2.itemCode}>Item Code: {deleteTarget?.itmcode || '-'}</Text>
                    </View>
                    <Text style={ym2.deleteWarning}>This action cannot be undone.</Text>
                    <View style={ym2.actions}>
                        <TouchableOpacity style={ym2.secondaryBtn} onPress={() => setDeleteVisible(false)}><Text style={ym2.secondaryText}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity style={ym2.dangerBtn} onPress={confirmDelete}><Ionicons name="trash-outline" size={17} color="#fff" /><Text style={ym2.primaryText}>Delete</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const deleteResultModal = (
        <Modal visible={deleteResultVisible} transparent animationType="fade" onRequestClose={() => setDeleteResultVisible(false)}>
            <View style={ym2.modalBackdrop}>
                <View style={ym2.deleteModal}>
                    <View style={[ym2.deleteIcon, deleteResultType === 'SUCCESS' ? { backgroundColor: '#DCFCE7' } : { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name={deleteResultType === 'SUCCESS' ? 'checkmark-circle-outline' : 'information-circle-outline'} size={25} color={deleteResultType === 'SUCCESS' ? '#15803D' : '#B45309'} />
                    </View>
                    <Text style={ym2.deleteTitle}>{deleteResultType === 'SUCCESS' ? 'Delete Successful' : deleteResultType === 'PERMISSION' ? 'Delete Not Allowed' : 'Delete Error'}</Text>
                    <Text style={ym2.deleteMessage}>{deleteResultMessage}</Text>
                    <TouchableOpacity style={ym2.primaryBtn} onPress={handleDeleteResultOk}><Text style={ym2.primaryText}>OK</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return <>{body}{pickerModal}{deleteModal}{deleteResultModal}</>;
}

const ym2 = StyleSheet.create({
    page: { flex: 1, backgroundColor: T.bg },
    topTabs: { flexDirection: 'row', backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border, paddingHorizontal: 14 },
    topTab: { paddingHorizontal: 18, paddingVertical: 12, marginRight: 6 },
    topTabActive: { borderBottomWidth: 2, borderBottomColor: T.copper },
    topTabText: { fontSize: 12, fontWeight: '700', color: T.muted },
    topTabTextActive: { color: T.ink },
    toolbar: { padding: 12, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
    searchWrap: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11 },
    searchInput: { flex: 1, color: T.ink, fontSize: 13, marginLeft: 8, paddingVertical: 8 },
    addButton: { marginTop: 9, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.ink, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9 },
    addButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    loadingBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: T.sub },
    loadingText: { fontSize: 11, color: T.muted },
    content: { padding: 12, paddingBottom: 32 },
    itemCard: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 13, marginBottom: 10 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    itemTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
    itemCode: { fontSize: 10, color: T.muted, marginTop: 3 },
    badge: { backgroundColor: T.sub, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6 },
    badgeText: { fontSize: 9, fontWeight: '800', color: T.muted },
    divider: { height: 1, backgroundColor: T.border, marginVertical: 10 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    infoCell: { flex: 1, minWidth: 90 },
    infoLabel: { fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
    infoValue: { fontSize: 11, fontWeight: '700', color: T.ink },
    cardActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 8, marginTop: 12 },
    outlineBtn: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 5, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 8, backgroundColor: T.surface },
    outlineText: { fontSize: 10, fontWeight: '700', color: T.ink },
    emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70 },
    emptyTitle: { marginTop: 9, fontSize: 13, fontWeight: '800', color: T.ink },
    emptySub: { marginTop: 3, fontSize: 11, color: T.muted },
    subHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.nav, paddingHorizontal: 10, paddingVertical: 11 },
    backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    subHeaderTitle: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '800', marginLeft: 6 },
    parentBanner: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border, paddingHorizontal: 14, paddingVertical: 10 },
    parentCode: { fontSize: 10, fontWeight: '800', color: T.copper },
    parentName: { fontSize: 13, fontWeight: '800', color: T.ink, marginTop: 2 },
    formCard: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14 },
    formTitle: { fontSize: 16, fontWeight: '800', color: T.ink, marginBottom: 14 },
    label: { fontSize: 11, fontWeight: '700', color: T.ink, marginBottom: 6, marginTop: 10 },
    required: { color: '#C0392B' },
    inputWrap: { minHeight: 42, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, borderRadius: 9, justifyContent: 'center' },
    input: { color: T.ink, fontSize: 13, paddingHorizontal: 10, paddingVertical: 9 },
    disabledInputWrap: { backgroundColor: T.border + '55', borderColor: T.border, flexDirection: 'row', alignItems: 'center', paddingRight: 9 },
    disabledInput: { color: T.muted },
    errorInputWrap: { borderColor: T.red, borderWidth: 1.2 },
    validationText: { color: T.red, fontSize: 10, fontWeight: '700', marginTop: 4, lineHeight: 14 },
    disabledButton: { opacity: 0.55 },
    readonlyBox: { backgroundColor: T.sub, borderRadius: 9, padding: 10, marginBottom: 4 },
    readonlyLabel: { fontSize: 9, color: T.muted, textTransform: 'uppercase' },
    readonlyValue: { fontSize: 12, fontWeight: '800', color: T.ink, marginTop: 2 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.ink, borderRadius: 8, paddingHorizontal: 13, paddingVertical: 10 },
    primaryText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    secondaryBtn: { borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, borderRadius: 8, paddingHorizontal: 13, paddingVertical: 10 },
    secondaryText: { color: T.ink, fontSize: 11, fontWeight: '700' },
    blendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.sub, borderRadius: 8, padding: 8, marginBottom: 6 },
    blendName: { fontSize: 11, fontWeight: '700', color: T.ink },
    percentInput: { width: 64, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, borderRadius: 7, color: T.ink, paddingHorizontal: 8, paddingVertical: 7, textAlign: 'right' },
    totalText: { fontSize: 10, color: T.muted, textAlign: 'right', marginTop: 2 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: T.ink, marginBottom: 8, marginTop: 2 },
    listCard: { backgroundColor: T.surface, borderRadius: 10, borderWidth: 1, borderColor: T.border, padding: 12, marginBottom: 8 },
    listTitle: { fontSize: 12, fontWeight: '800', color: T.ink },
    listMeta: { fontSize: 10, color: T.muted, marginTop: 3 },
    iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    field: { marginBottom: 8 },
    selectWrap: { minHeight: 42, borderWidth: 1, borderColor: T.border, backgroundColor: T.sub, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    selectText: { flex: 1, color: T.ink, fontSize: 13, fontWeight: '600', marginRight: 8 },
    selectPlaceholder: { color: T.muted, fontWeight: '400' },
    gridRow: { gap: 10, alignItems: 'stretch' },
    outlineBtnDanger: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 5, borderWidth: 1, borderColor: '#F3C4C0', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 8, backgroundColor: '#FFF8F7' },
    outlineTextDanger: { fontSize: 10, fontWeight: '700', color: '#B42318' },
    headerAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.copper, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
    headerAddText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    subHeaderSub: { color: 'rgba(255,255,255,0.72)', fontSize: 10.5, marginTop: 2, marginLeft: 6 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 18 },
    pickerModal: { width: '100%', maxWidth: 560, backgroundColor: T.surface, borderRadius: 16, overflow: 'hidden' },
    pickerHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: T.border },
    pickerTitle: { fontSize: 16, fontWeight: '800', color: T.ink },
    pickerHint: { fontSize: 11, color: T.muted, marginTop: 2 },
    pickerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: T.border, borderRadius: 9, marginBottom: 7, backgroundColor: T.surface },
    pickerRowSelected: { borderColor: T.copper, backgroundColor: T.sub },
    pickerRowTitle: { fontSize: 13, fontWeight: '700', color: T.ink },
    pickerRowMeta: { fontSize: 10, color: T.muted, marginTop: 2 },
    pickerFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: T.border },
    deleteModal: { width: '100%', maxWidth: 420, backgroundColor: T.surface, borderRadius: 16, padding: 20 },
    deleteIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
    deleteTitle: { fontSize: 19, fontWeight: '800', color: T.ink, textAlign: 'center' },
    deleteMessage: { marginTop: 8, fontSize: 13, lineHeight: 19, color: T.muted, textAlign: 'center' },
    deleteInfo: { marginTop: 16, padding: 12, backgroundColor: T.sub, borderRadius: 10, borderWidth: 1, borderColor: T.border },
    deleteWarning: { marginTop: 12, fontSize: 11, color: '#B42318', textAlign: 'center' },
    dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#C0392B', borderRadius: 8, paddingHorizontal: 13, paddingVertical: 10 },
});

// ✅ Styles for the Blend -> Ply -> Items tree
const yt = StyleSheet.create({
    // ── Blend card ──
    blendWrap: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: T.border, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    blendWrapOpen: { borderColor: T.copper + '77' },
    blendRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderLeftWidth: 4, borderLeftColor: 'transparent', backgroundColor: T.surface },
    blendRowOpen: { borderLeftColor: T.copper, backgroundColor: T.copper + '0F', borderBottomWidth: 1, borderBottomColor: T.border },
    blendTitle: { fontSize: 15, fontWeight: '800', color: T.ink, letterSpacing: 0.2 },
    blendSub: { fontSize: 11, color: T.muted, marginTop: 2 },

    // ── Left icon box ──
    iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
    iconBoxOpen: { backgroundColor: T.copper + '22', borderColor: T.copper + '66' },

    // ── Right side: count + chevron ──
    countPill: { minWidth: 30, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: T.sub, alignItems: 'center', marginRight: 10 },
    countPillOpen: { backgroundColor: T.copper + '22' },
    countPillText: { fontSize: 12, fontWeight: '800', color: T.ink },
    countPillTextOpen: { color: T.copper },
    chevBox: { width: 28, height: 28, borderRadius: 14, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
    chevBoxOpen: { backgroundColor: T.copper, borderColor: T.copper },

    // ── Ply row ──
    plyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingLeft: 18, paddingRight: 14, borderTopWidth: 1, borderTopColor: T.border, borderLeftWidth: 4, borderLeftColor: 'transparent', backgroundColor: T.surface },
    plyRowOpen: { borderLeftColor: T.copper, backgroundColor: T.sub },
    plyIconBox: { width: 30, height: 30, borderRadius: 15, backgroundColor: T.sub, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
    plyIconBoxOpen: { backgroundColor: T.copper, borderColor: T.copper },
    plyIconText: { fontSize: 12, fontWeight: '800', color: T.ink },
    plyIconTextOpen: { color: '#fff' },
    plyTitle: { fontSize: 13, fontWeight: '700', color: T.ink },
    plySub: { fontSize: 11, color: T.muted, marginTop: 2 },

    // ── Items grid inside an opened ply ──
    itemsWrap: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: T.bg, padding: 7, borderTopWidth: 1, borderTopColor: T.border },
    itemCell: { padding: 5 },
});

// ✅ Styles for the item cards (main + sub items)
const yc = StyleSheet.create({
    card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    title: { fontSize: 14, fontWeight: '800', color: T.ink },
    code: { fontSize: 10.5, color: T.muted, marginTop: 3 },
    badge: { backgroundColor: T.sub, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    badgeText: { fontSize: 9, fontWeight: '800', color: T.muted, letterSpacing: 0.5 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, backgroundColor: T.sub, borderRadius: 10, padding: 10 },
    stat: { flexGrow: 1, flexBasis: '22%', minWidth: 72 },
    statWide: { flexBasis: '100%' },
    statLabel: { fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
    statValue: { fontSize: 12, fontWeight: '700', color: T.ink },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    btn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: T.surface },
    btnText: { fontSize: 11, fontWeight: '700', color: T.ink },
    btnDanger: { borderColor: '#F3C4C0', backgroundColor: '#FFF8F7' },
});




function DyeingTab({ design }: { design: Design | null }) {
    const [dyeData, setDyeData] = useState<Record<string, { average: number; recent: any[] }>>({});
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!design) return;
        setLoading(true);
        const all = [...(design.warp_yarns ?? []), ...(design.weft_yarns ?? [])];
        const unique = [...new Set(all.map(y => y.mi_id))];
        Promise.all(unique.map(miId => DesignAPI.yarnDyeing(miId).then(r => ({ miId, data: r.data.data }))))
            .then(results => { const map: any = {}; results.forEach(r => { map[r.miId] = r.data; }); setDyeData(map); })
            .catch(() => { }).finally(() => setLoading(false));
    }, [design?.id]);
    if (!design) return <View style={s.center}><Text style={s.empty}>Select a design from Catalog</Text></View>;
    if (design.type === 'PD') return <View style={s.center}><Text style={s.empty}>Piece-dyed — dyeing costs are per meter</Text></View>;
    if (loading) return <View style={s.center}><ActivityIndicator color={T.copper} /></View>;
    const all = [...(design.warp_yarns ?? []), ...(design.weft_yarns ?? [])];
    const unique = all.filter((y, i, arr) => arr.findIndex(x => x.mi_id === y.mi_id) === i);
    return (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 32 }}>
            <Text style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>Dyeing cost history for {designLabel(design)} yarns (YD)</Text>
            {unique.map(y => {
                const d = dyeData[y.mi_id];
                return (
                    <View key={y.mi_id} style={dy.card}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={dy.name}>{y.name}</Text>
                            <Text style={dy.avg}>Avg ₹{d?.average ?? 0}/kg</Text>
                        </View>
                        {d?.recent?.length > 0 ? d.recent.map((r: any, i: number) => (
                            <View key={i} style={dy.row}>
                                <Text style={dy.rowDate}>{r.created_at?.slice(0, 10)}</Text>
                                <Text style={dy.rowCode}>{r.code}</Text>
                                <Text style={dy.rowAmt}>₹{r.dye_cost}/kg</Text>
                            </View>
                        )) : <Text style={s.empty}>No dyeing history yet</Text>}
                    </View>
                );
            })}
        </ScrollView>
    );
}
const dy = StyleSheet.create({
    card: { backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10 },
    name: { fontSize: 13, fontWeight: '700', color: T.ink },
    avg: { fontSize: 13, fontWeight: '700', color: T.green },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderTopWidth: 1, borderTopColor: T.sub },
    rowDate: { flex: 1, fontSize: 11, color: T.muted },
    rowCode: { fontSize: 11, color: T.ink, marginRight: 8 },
    rowAmt: { fontSize: 12, fontWeight: '700', color: T.copper },
});

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ✅ Adds catalogRefreshKey / handleDesignSaved so that a successful
//    save takes the user back to Catalog and force-refreshes the list.
// ═══════════════════════════════════════════════════════════════
export function DesignsScreen() {
    const context = DEFAULT_ERP_CONTEXT;
    const { canAccess } = usePermission();
    const setHeaderExtras = useHeaderExtrasStore((state) => state.setHeaderExtras);
    const clearHeaderExtras = useHeaderExtrasStore((state) => state.clearHeaderExtras);
    const [tab, setTab] = useState<Tab | null>('Aliases');
    const [selectedDesign, setSelected] = useState<Design | null>(null);
    const [detailDesign, setDetail] = useState<Design | null>(null);
    const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);
    const [editColourway, setEditColourway] = useState<any | null>(null);   // Catalog → colourway Edit

    // One permission-aware source drives the tab header and tab content.
    // A developer only adds a tab to DESIGN_TABS and the registry definition.
    const visibleTabs = useMemo(
        () => DESIGN_TABS.filter(item => canAccess(item.resource)),
        [canAccess],
    );

    const firstAllowedTab = visibleTabs[0]?.key ?? null;

    // FIX: this screen used to render its own hand-rolled header ("MADHUSUDHAN
    // FABRICS" / "Designs" / "Selected: ...") completely separately from
    // AppHeader — that was the second navy header block stacking under the
    // Designs tab. The header is now rendered once, in
    // app/new/(tabs)/_layout.tsx; only the "Selected: code" subtitle still
    // needs to reach it, via the shared extras store.
    useFocusEffect(
        useCallback(() => {
            setHeaderExtras({ subtitle: selectedDesign ? `Selected: ${designLabel(selectedDesign)}` : null });
            return () => clearHeaderExtras();
        }, [selectedDesign, setHeaderExtras, clearHeaderExtras]),
    );

    const openTab = useCallback((nextTab: Tab) => {
        const definition = DESIGN_TABS.find(item => item.key === nextTab);
        if (definition && canAccess(definition.resource)) {
            setTab(nextTab);
            return true;
        }
        setTab(firstAllowedTab);
        return false;
    }, [canAccess, firstAllowedTab]);

    // Live permission changes are applied without logout. If the active tab is
    // denied, move to the first allowed tab and never render denied content.
    useEffect(() => {
        if (visibleTabs.length === 0) {
            if (tab !== null) setTab(null);
            return;
        }

        const activeIsAllowed = tab !== null && visibleTabs.some(item => item.key === tab);
        if (!activeIsAllowed) setTab(firstAllowedTab);
    }, [firstAllowedTab, tab, visibleTabs]);

    const handleSelectDesign = async (d: Design) => {
        setSelected(d);
        setDetail(d);
        try {
            const res = await DesignAPI.get(d.id);
            setDetail({ ...d, ...res.data.data });
            console.log('design res', res);
        } catch { }

        openTab('Design');
    };

    const handleAddSubDesign = async (d: Design) => {
        setEditColourway(null);
        setSelected(d);
        try {
            const res = await DesignAPI.get(d.id);
            setDetail({ ...d, ...res.data.data });
        } catch {
            setDetail(d);
        }
        openTab('Colourway');
    };

    // Catalog → Edit colourway: open the Colourway form pre-filled (edit mode).
    const handleEditColourway = (d: Design, sub: any) => {
        setSelected(d);
        setDetail(d);
        setEditColourway(sub);
        openTab('Colourway');
    };

    const handleColourwayEditDone = (saved: boolean) => {
        setEditColourway(null);
        if (saved) setCatalogRefreshKey(v => v + 1);
        openTab('Catalog');
    };

    // One button: clear the selected design / colourway edit for all tabs.
    const handleClearSelection = () => {
        setSelected(null);
        setDetail(null);
        setEditColourway(null);
    };

    const handleCancelEdit = () => {
        setSelected(null);
        setDetail(null);
    };

    const handleDesignSaved = () => {
        setSelected(null);
        setDetail(null);
        setCatalogRefreshKey(v => v + 1);
        openTab('Catalog');
    };
    // Dyeing Master uses the shared authenticated client directly.
    // This deliberately does NOT add unverified methods to DesignAPI, which
    // keeps the existing client_fix_design.ts contract untouched.
    // useMemo is important here: a new adapter object on every render would
    // retrigger DyeingMasterTab's load effect continuously.
    const dyeingMasterApi = useMemo<DyeingMasterApi>(() => ({
        listColours: async () => {
            const response = await client.get('/design-dyeing/colours', {
                params: {
                    prpcode: context.prpcode,
                    strcode: context.strcode,
                    yearno: context.yearno,
                },
            });
            return response.data?.data ?? [];
        },

        searchMainShades: async (search: string) => {
            const response = await client.get('/design-dyeing/main-shades', {
                params: {
                    prpcode: context.prpcode,
                    strcode: context.strcode,
                    yearno: context.yearno,
                    search: search.trim(),
                },
            });
            return response.data?.data ?? [];
        },

        // Same design list as Colourway → "Select Yarn-Dyed Design" (GET /designs, YD only).
        searchDesigns: async (search: string) => {
            const r = await DesignAPI.list({
                page: 1, per_page: 200, limit: 200, yearno: context.yearno,
                type: 'YD',
                search: search.trim() || undefined,
            } as any);
            const envelope: any = r.data?.data;
            const rows: any[] = Array.isArray(envelope) ? envelope : (envelope?.data ?? []);
            const q = search.trim().toLowerCase();
            return rows
                .filter(d => String(d?.type || '').toUpperCase() === 'YD')
                .filter(d => !q || String(d.code || '').toLowerCase().includes(q)
                    || String(d.category || '').toLowerCase().includes(q)
                    || dsnCodeOf(d).toLowerCase().includes(q))
                .map(d => ({
                    id: String(d.id),
                    code: String(d.code || ''),
                    dsn_code: d.dsn_code != null ? String(d.dsn_code) : null,
                    category: d.category ?? null,
                    type: 'YD',
                }));
        },

        searchJobWorkParties: async (search: string) => {
            const response = await client.get('/design-dyeing/job-work-parties', {
                params: {
                    prpcode: context.prpcode,
                    strcode: context.strcode,
                    yearno: context.yearno,
                    search: search.trim(),
                },
            });

            const rows = response.data?.data ?? [];
            return rows.map((x: any) => ({
                acc_code: String(x.acc_code ?? x.AccCode ?? '').trim(),
                name: String(x.name ?? x.AccName ?? x.accountname ?? '').trim(),
                short_name: x.short_name ?? x.ShtName ?? null,
            })).filter((x: any) => x.acc_code !== '' && x.name !== '');
        },

        saveColour: async (payload) => {
            return client.post('/design-dyeing/colours', {
                ...payload,
                prpcode: context.prpcode,
                strcode: context.strcode,
                yearno: context.yearno,
            });
        },

        updateColour: async (id, payload) => {
            return client.put(`/design-dyeing/colours/${encodeURIComponent(id)}`, {
                ...payload,
                prpcode: context.prpcode,
                strcode: context.strcode,
                yearno: context.yearno,
            });
        },

        deleteColour: async (id) => {
            return client.delete(`/design-dyeing/colours/${encodeURIComponent(id)}`, {
                params: {
                    prpcode: context.prpcode,
                    strcode: context.strcode,
                    yearno: context.yearno,
                },
            });
        },
    }), [context.prpcode, context.strcode, context.yearno]);
    return (
        <ERPContext.Provider value={context}>
            <View style={{ flex: 1, backgroundColor: T.bg }}>
                <View style={s.column}>
                    {visibleTabs.length > 0 ? (
                        <>
                            <TabBar active={tab} tabs={visibleTabs} onChange={openTab} />
                            {selectedDesign && (tab === 'Aliases' || tab === 'Design' || tab === 'Colourway') ? (
                                <View style={s.selBar}>
                                    <Text style={s.selText} numberOfLines={1}>
                                        Selected: <Text style={s.selCode}>{designLabel(selectedDesign)}</Text>
                                        {selectedDesign.type ? `  ·  ${selectedDesign.type}` : ''}
                                        {editColourway?.code ? `  ·  editing ${editColourway.code}` : ''}
                                    </Text>
                                    <TouchableOpacity onPress={handleClearSelection} style={s.selBtn}>
                                        <Text style={s.selBtnText}>✕ Clear</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                            <View style={{ flex: 1 }}>
                                {/* {tab === 'Monthly Sales Target' && canAccess('designs.monthlysalestarget') && <MonthlySalesTargetTab design={detailDesign} />} */}
                                {tab === 'Aliases' && canAccess('designs.aliases') && <AliasesTab design={detailDesign} />}
                                {tab === 'Catalog' && canAccess('designs.catalog') && (
                                    <CatalogTab
                                        key={catalogRefreshKey}
                                        onSelectDesign={handleAddSubDesign}
                                        onEditDesign={handleSelectDesign}
                                        onEditColourway={handleEditColourway}
                                    />
                                )}
                                {tab === 'Design' && canAccess('designs.design') && (
                                    <DesignTab
                                        design={detailDesign}
                                        onRefresh={handleDesignSaved}
                                        onCancelEdit={handleCancelEdit}
                                    />
                                )}
                                {tab === 'Colourway' && canAccess('designs.colourway') && (
                                    <ColourwayTab
                                        design={detailDesign}
                                        onNavigateToCatalog={() => openTab('Catalog')}
                                        editSub={editColourway}
                                        onEditDone={handleColourwayEditDone}
                                        onClear={handleClearSelection}
                                    />
                                )}
                                {tab === 'Yarns' && canAccess('designs.yarns') && <YarnsTab />}
                                {tab === 'Dyeing' && canAccess('designs.dyeing') && (
                                    <DyeingMasterTab api={dyeingMasterApi} />
                                )}
                            </View>
                        </>
                    ) : (
                        <View style={s.center}>
                            <Text style={s.empty}>You do not have access to any Design tab.</Text>
                        </View>
                    )}
                </View>
            </View>
        </ERPContext.Provider>
    );
}

const hdr = StyleSheet.create({
    wrap: { backgroundColor: T.nav, paddingHorizontal: 16, paddingVertical: 12 },
    brand: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 1 },
    title: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
    sub: { fontSize: 11, color: '#fff', marginTop: 2 },
});

const s = StyleSheet.create({
    // Wide screens: content stays in a centred column with side gutters (like the
    // ERP Designing reference). Phones / small tablets: full width.
    column: { flex: 1, width: '100%', maxWidth: 1120, alignSelf: 'center' },
    selBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: T.copper + '14', borderBottomWidth: 1, borderBottomColor: T.copper + '44' },
    selText: { flex: 1, fontSize: 12, color: T.ink },
    selCode: { fontWeight: '800', color: T.ink },
    selBtn: { borderWidth: 1, borderColor: T.copper + '77', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: T.surface },
    selBtnText: { fontSize: 11, fontWeight: '800', color: T.copper },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    empty: { fontSize: 13, color: T.muted, textAlign: 'center' },
});

export default DesignsScreen;