// // components/Shared/PartyDropdownAdj.tsx
// import React, { useEffect, useRef, useState } from 'react';
// import {
//     View,
//     Text,
//     TouchableOpacity,
//     StyleSheet,
//     ActivityIndicator,
//     TextInput,
//     FlatList,
//     Platform,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialIcons';
// import theme from '../../android/app/src/theme';
// import SearchableDropdownAdj from './SearchableDropdownAdj';

// export interface AdjData {
//     UROWID: string;
//     BILLFROM?: string;
//     TTYPE?: string;
//     PARCODE?: string;
//     ACCNAME?: string;
//     VOUNO?: string;
//     NVOUDATE?: string;
//     BILLNO?: string;
//     NBILLDATE?: string;
//     BILLQTY?: string;
//     NETAMT?: string;
//     BALAMT?: string;
//     BALAMT1?: string; // Received (editable)
//     ZUID?: string;
//     ZSRNO?: string;
//     CONTRANAME?: string;
//     DueDay?: string;
//     NVOUDATE1?: string;
//     ORDERNO?: string;
//     // internal
//     __key?: string;
//     [k: string]: any;
// }

// export interface D1Row {
//     UId: string | null;
//     SrNo: number | null;
//     SUId: string | null;
//     SetAmt: string | null;
//     TType: string | null;
//     SSrNo: string | null;
//     BillNo: string | null;
//     BillDate: string | null;
//     nBillDate: string | null;
//     NetAmt: string | null;
//     [k: string]: any;
// }

// interface Props {
//     data: AdjData[];
//     placeholder?: string;
//     pageSize?: number;
//     onSelect: (itemOrItems: AdjData[] | AdjData) => void;
//     initialValue?: AdjData[] | AdjData | null;
//     labelKey?: string | string[];
//     valueKey?: string | string[];
//     selected?: AdjData[];
//     setSelected?: (items: AdjData[] | null) => void;
//     loading?: boolean;
//     multiple?: boolean;

//     // authoritative form arrays and helpers from parent
//     formD2?: AdjData[] | null;
//     formD1?: D1Row[] | null;
//     formUId?: string | null;
//     onUpdateD2?: (d2: AdjData[]) => void;
//     onUpdateD1?: (d1: D1Row[]) => void;
// }

// const initialsOf = (name?: string) => {
//     if (!name) return '?';
//     const parts = String(name).trim().split(/\s+/);
//     if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
//     return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
// };

// const PartyDropdownAdj: React.FC<Props> = ({
//     data,
//     placeholder = 'Choose adjustment...',
//     pageSize = 10,
//     onSelect,
//     initialValue = null,
//     labelKey = ['BILLNO', 'NVOUDATE', 'NETAMT'],
//     valueKey = 'UROWID',
//     selected = [],
//     setSelected,
//     loading = false,
//     multiple = true,
//     formD2 = null,
//     formD1 = null,
//     formUId = null,
//     onUpdateD2,
//     onUpdateD1,
// }) => {
//     const dropdownRef = useRef<any>(null);

//     const [localSelected, setLocalSelected] = useState<AdjData[]>([]);

//     // consider many representations as "blank"
//     const isBlank = (v: any) => {
//         if (v === null || v === undefined) return true;
//         const s = String(v).trim();
//         if (s === '') return true;
//         // treat -1 and zero-like as blank for defaults (you can tweak)
//         if (s === '0' || s === '0.00' || s === '.00' || s === '-1') return true;
//         return false;
//     };

//     // D1 row empty check (ignore SrNo)
//     const isEmptyD1Row = (r: Partial<D1Row> | any) => {
//         const keysToCheck = ['SUId', 'SetAmt', 'TType', 'SSrNo', 'BillNo', 'BillDate', 'nBillDate', 'NetAmt'];
//         return keysToCheck.every(k => isBlank(r[k]));
//     };

//     const formatAdjDate = (raw?: string | null) => {
//         if (!raw) return '—';
//         const s = String(raw).trim();
//         if (/[^\d]/.test(s)) {
//             const d = new Date(s);
//             if (!isNaN(d.getTime())) {
//                 const dd = String(d.getDate()).padStart(2, '0');
//                 const mm = String(d.getMonth() + 1).padStart(2, '0');
//                 const yyyy = d.getFullYear();
//                 return `${dd}-${mm}-${yyyy}`;
//             }
//             return s;
//         }
//         if (/^\d{8}$/.test(s)) {
//             const yyyy = s.slice(0, 4);
//             const mm = s.slice(4, 6);
//             const dd = s.slice(6, 8);
//             if (Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) {
//                 return `${dd}-${mm}-${yyyy}`;
//             }
//         }
//         return s;
//     };

//     const synthAdjFromD1 = (d1: any): AdjData => {
//         const sr = d1.SrNo ?? Math.floor(Math.random() * 1000000);
//         const key = `d1-${String(sr)}`;
//         return {
//             UROWID: String(d1.SUId ?? d1.SrNo ?? `d1-${sr}`),
//             BILLNO: d1.BillNo ?? '',
//             NVOUDATE: d1.BillDate ?? d1.nBillDate ?? '',
//             NBILLDATE: d1.nBillDate ?? '',
//             NETAMT: d1.NetAmt ?? d1.SetAmt ?? '',
//             BALAMT: d1.NetAmt ?? '',
//             BALAMT1: d1.SetAmt ?? d1.NetAmt ?? '',
//             ACCNAME: d1.ACCNAME ?? '',
//             ZUID: d1.SUId ?? null,
//             ZSRNO: d1.SSrNo ?? null,
//             __key: key,
//         } as AdjData;
//     };

//     const adjToD1Row = (adj: AdjData, nextSrNo: number): D1Row => {
//         const ik = adj.__key ?? '';
//         const m = /^d1-(\d+)$/.exec(ik);
//         const sr = m ? Number(m[1]) : nextSrNo;
//         return {
//             UId: formUId ?? null,
//             SrNo: sr,
//             SUId: adj.ZUID ?? adj.UROWID ?? null,
//             SetAmt: adj.BALAMT1 ?? adj.BALAMT ?? '',
//             TType: adj.TTYPE ?? null,
//             SSrNo: adj.ZSRNO ?? null,
//             BillNo: adj.BILLNO ?? '',
//             BillDate: adj.NVOUDATE ?? adj.NBILLDATE ?? '',
//             nBillDate: adj.NBILLDATE ?? '',
//             NetAmt: adj.NETAMT ?? '',
//         } as D1Row;
//     };

//     const nextSrNoFor = (existingD1: D1Row[] | null) => {
//         if (Array.isArray(existingD1) && existingD1.length > 0) {
//             const max = existingD1.reduce((m, r) => Math.max(m, Number(r.SrNo ?? 0)), 0);
//             return max + 1;
//         }
//         return 1;
//     };

//     const makeKeyForServerItem = (it: AdjData, idx?: number) => {
//         if (it.__key) return it.__key;
//         // avoid ambiguous keys for -1 etc by adding index/timestamp fallback
//         if (it.UROWID && String(it.UROWID) !== '-1') return `urowid-${String(it.UROWID)}`;
//         if (it.ZUID && String(it.ZUID) !== '-1') return `zuid-${String(it.ZUID)}`;
//         if (it.BILLNO) return `billno-${String(it.BILLNO)}`;
//         return `new-${Date.now()}-${idx ?? Math.floor(Math.random() * 1000000)}`;
//     };

//     const computeMaxExistingSrNo = (existingD1: D1Row[] | null, items: AdjData[]) => {
//         let max = 0;
//         if (Array.isArray(existingD1)) {
//             existingD1.forEach(r => {
//                 const v = Number(r.SrNo ?? 0);
//                 if (!isNaN(v) && v > max) max = v;
//             });
//         }
//         (items || []).forEach(it => {
//             const ik = it.__key ?? '';
//             const m = /^d1-(\d+)$/.exec(ik);
//             if (m) {
//                 const n = Number(m[1]);
//                 if (!isNaN(n) && n > max) max = n;
//             }
//         });
//         return max;
//     };

//     useEffect(() => {
//         if (Array.isArray(formD2) && formD2.length > 0) {
//             const withKeys = formD2.map((it, idx) => ({ ...it, __key: makeKeyForServerItem(it, idx) }));
//             setLocalSelected(withKeys);
//             return;
//         }

//         if (Array.isArray(formD1) && formD1.length > 0) {
//             const cleanedFormD1 = (formD1 as D1Row[]).filter(row => !isEmptyD1Row(row));

//             const mapped: AdjData[] = cleanedFormD1.map((d1row) => {
//                 const found = (Array.isArray(data) ? data : []).find(it =>
//                     (it.ZUID && d1row.SUId && String(it.ZUID) === String(d1row.SUId)) ||
//                     (it.BILLNO && d1row.BillNo && String(it.BILLNO) === String(d1row.BillNo)) ||
//                     (it.ZSRNO && d1row.SSrNo && String(it.ZSRNO) === String(d1row.SSrNo))
//                 );

//                 if (found) {
//                     const key = `d1-${String(d1row.SrNo ?? Math.floor(Math.random() * 1000000))}`;
//                     return {
//                         ...found,
//                         BALAMT1: (d1row.SetAmt ?? found.BALAMT1 ?? found.BALAMT ?? '') as any,
//                         __key: key,
//                     } as AdjData;
//                 }

//                 return synthAdjFromD1(d1row);
//             });

//             setLocalSelected(mapped);
//             try { onUpdateD2?.(mapped); } catch { }
//             try { onUpdateD1?.(cleanedFormD1); } catch { }
//             return;
//         }

//         if (Array.isArray(selected) && selected.length > 0) {
//             const withKeys = selected.map((it, idx) => ({ ...it, __key: makeKeyForServerItem(it, idx) }));
//             setLocalSelected(withKeys);
//             return;
//         }
//         if (Array.isArray(initialValue) && initialValue.length > 0) {
//             const withKeys = (initialValue as AdjData[]).map((it, idx) => ({ ...it, __key: makeKeyForServerItem(it, idx) }));
//             setLocalSelected(withKeys);
//             return;
//         }

//         setLocalSelected([]);
//     }, [formD2, formD1, data, selected, initialValue]);

//     // central emitter
//     const emitUpdateToParent = (items: AdjData[]) => {
//         // ensure unique keys
//         const withKeys = items.map((it, idx) => ({ ...it, __key: makeKeyForServerItem(it, idx) }));
//         setLocalSelected(withKeys);
//         try { onSelect?.(withKeys); } catch { }
//         try { setSelected?.(withKeys.length ? withKeys : null); } catch { }
//         try { onUpdateD2?.(withKeys); } catch { }

//         if (typeof onUpdateD1 === 'function') {
//             const currentD1 = Array.isArray(formD1) ? (formD1 as D1Row[]).filter(r => !isEmptyD1Row(r)) : [];
//             const maxExistingSr = computeMaxExistingSrNo(currentD1, withKeys);
//             const startSr = maxExistingSr + 1;
//             let nextAllocate = startSr;

//             const newD1: D1Row[] = withKeys.map((adj) => {
//                 const ik = adj.__key ?? '';
//                 const m = /^d1-(\d+)$/.exec(ik);
//                 if (m) {
//                     const sr = Number(m[1]);
//                     const existing = currentD1.find(r => Number(r.SrNo) === sr);
//                     if (existing) {
//                         return {
//                             ...existing,
//                             SetAmt: adj.BALAMT1 ?? adj.BALAMT ?? existing.SetAmt ?? '',
//                             BillNo: adj.BILLNO ?? existing.BillNo ?? '',
//                             BillDate: adj.NVOUDATE ?? existing.BillDate ?? '',
//                             nBillDate: adj.NBILLDATE ?? existing.nBillDate ?? '',
//                             NetAmt: adj.NETAMT ?? existing.NetAmt ?? '',
//                         } as D1Row;
//                     }
//                     return {
//                         ...adjToD1Row(adj, sr),
//                         SrNo: sr,
//                     } as D1Row;
//                 }

//                 const found = currentD1.find(r =>
//                     (r.SUId && adj.ZUID && String(r.SUId) === String(adj.ZUID)) ||
//                     (r.BillNo && adj.BILLNO && String(r.BillNo) === String(adj.BILLNO)) ||
//                     (r.SSrNo && adj.ZSRNO && String(r.SSrNo) === String(adj.ZSRNO))
//                 );
//                 if (found) {
//                     return {
//                         ...found,
//                         SetAmt: adj.BALAMT1 ?? adj.BALAMT ?? found.SetAmt ?? '',
//                         BillNo: adj.BILLNO ?? found.BillNo ?? '',
//                         BillDate: adj.NVOUDATE ?? found.BillDate ?? '',
//                         nBillDate: adj.NBILLDATE ?? found.nBillDate ?? '',
//                         NetAmt: adj.NETAMT ?? found.NetAmt ?? '',
//                     } as D1Row;
//                 }

//                 const assignedSr = nextAllocate;
//                 nextAllocate += 1;
//                 return adjToD1Row(adj, assignedSr);
//             });

//             try { onUpdateD1?.(newD1); } catch { }
//         }
//     };

//     // NEW: improved selection handler that assigns SrNo / d1- keys immediately for new items
//     const handleDropdownSelect = (itemOrItems: any) => {
//         const items = Array.isArray(itemOrItems) ? itemOrItems : itemOrItems ? [itemOrItems] : [];
//         if (items.length === 0) return;

//         // normalize incoming
//         const normalized: AdjData[] = items.map((it: AdjData, i) => {
//             const copy: AdjData = { ...it, BALAMT1: it.BALAMT1 ?? it.BALAMT ?? '' };
//             // don't set __key here; we'll assign based on real existing SrNo below
//             return copy;
//         });

//         // clean current authoritative d1 (non-empty) for SrNo calculation
//         const currentD1 = Array.isArray(formD1) ? (formD1 as D1Row[]).filter(r => !isEmptyD1Row(r)) : [];
//         // compute max existing SrNo considering both currentD1 and already selected items
//         const maxExistingSr = computeMaxExistingSrNo(currentD1, localSelected);
//         let nextAllocate = maxExistingSr + 1;

//         const combined = [...localSelected];

//         normalized.forEach((sel) => {
//             // compute identification to detect existing (prefer ZUID > UROWID > BILLNO)
//             const selId = String(sel.ZUID ?? sel.UROWID ?? sel.BILLNO ?? JSON.stringify(sel));
//             const exists = combined.some(c => {
//                 const cid = String(c.ZUID ?? c.UROWID ?? c.BILLNO ?? JSON.stringify(c));
//                 return cid === selId;
//             });
//             if (exists) {
//                 // update BALAMT1 if selection provides it
//                 combined.forEach((c, idx) => {
//                     const cid = String(c.ZUID ?? c.UROWID ?? c.BILLNO ?? JSON.stringify(c));
//                     if (cid === selId && (sel.BALAMT1 ?? '') !== '') {
//                         combined[idx] = { ...c, BALAMT1: sel.BALAMT1 };
//                     }
//                 });
//             } else {
//                 // new item -> assign a unique d1-<sr> key immediately so keys and SrNo used are unique
//                 const assignedSr = nextAllocate++;
//                 const key = `d1-${assignedSr}`;
//                 const itemWithKey: AdjData = {
//                     ...sel,
//                     __key: key,
//                     BALAMT1: sel.BALAMT1 ?? sel.BALAMT ?? '',
//                 };
//                 combined.push(itemWithKey);
//             }
//         });

//         emitUpdateToParent(combined);
//     };

//     const removeItem = (it: AdjData) => {
//         const key = it.__key ?? String(it.UROWID ?? it.ZUID ?? it.BILLNO ?? JSON.stringify(it));
//         const next = localSelected.filter(s => (s.__key ?? String(s.UROWID ?? s.ZUID ?? s.BILLNO ?? JSON.stringify(s))) !== key);
//         emitUpdateToParent(next);

//         if (typeof onUpdateD1 === 'function') {
//             const currentD1 = Array.isArray(formD1) ? [...formD1] : [];
//             const filteredD1 = currentD1.filter(r => {
//                 const rowKey = `d1-${String(r.SrNo ?? '')}`;
//                 if (rowKey === key) return false;
//                 const id = String(r.SUId ?? r.BillNo ?? r.SSrNo ?? '');
//                 return id !== (it.ZUID ?? it.UROWID ?? it.BILLNO ?? '');
//             });
//             try { onUpdateD1?.(filteredD1); } catch { }
//         }
//     };

//     const updateItemField = (it: AdjData, key: string, value: any) => {
//         const next = localSelected.map(s => {
//             if ((s.__key ?? String(s.UROWID ?? s.BILLNO ?? JSON.stringify(s))) === (it.__key ?? String(it.UROWID ?? it.BILLNO ?? JSON.stringify(it)))) {
//                 return { ...s, [key]: value };
//             }
//             return s;
//         });
//         emitUpdateToParent(next);
//     };

//     const renderSelectedCard = ({ item }: { item: AdjData }) => {
//         return (
//             <View style={styles.card}>
//                 <View style={styles.cardBody}>
//                     <View style={styles.cardTitleRow}>
//                         <Text style={styles.cardTitle} numberOfLines={1}>{''}</Text>
//                         <TouchableOpacity onPress={() => removeItem(item)} style={styles.smallDelBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
//                             <Icon name="close" size={18} color={theme.MUTED} />
//                         </TouchableOpacity>
//                     </View>

//                     <View style={styles.metaRow}>
//                         <View style={styles.metaPill}>
//                             <Icon name="receipt" size={14} color={theme.BRAND_ACCENT} />
//                             <Text style={styles.metaPillText}>Bill</Text>
//                             <Text style={styles.metaPillValue} numberOfLines={1}>{item.BILLNO ?? '—'}</Text>
//                         </View>

//                         <View style={styles.metaPill}>
//                             <Icon name="calendar-today" size={14} color={theme.MUTED} />
//                             <Text style={styles.metaPillText}>Bill date</Text>
//                             <Text style={styles.metaPillValue}>{formatAdjDate(item.NVOUDATE ?? item.NBILLDATE)}</Text>
//                         </View>

//                         <View style={styles.metaPill}>
//                             <Icon name="paid" size={14} color={theme.BRAND_DARK} />
//                             <Text style={styles.metaPillText}>Balance</Text>
//                             <Text style={styles.metaPillValue}>{item.BALAMT ?? item.NETAMT ?? '—'}</Text>
//                         </View>
//                     </View>

//                     <View style={styles.receivedRow}>
//                         <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//                             <Icon name="arrow-downward" size={16} color={theme.TEXT_SECONDARY} />
//                             <Text style={styles.receivedLabel}> Received</Text>
//                         </View>

//                         <TextInput
//                             value={String(item.BALAMT1 ?? '')}
//                             onChangeText={(t) => updateItemField(item, 'BALAMT1', t)}
//                             keyboardType={Platform.OS === 'android' ? 'numeric' : 'numbers-and-punctuation'}
//                             placeholder="0.00"
//                             style={styles.receivedInput}
//                             returnKeyType="done"
//                         />
//                     </View>
//                 </View>
//             </View>
//         );
//     };

//     const dropdownRowRenderer = (it: AdjData, isSelected: boolean) => {
//         const billDate = formatAdjDate(it.NVOUDATE ?? it.NBILLDATE);
//         const bal = it.BALAMT ?? it.NETAMT ?? '—';
//         return (
//             <View style={rowStyles.rowInner}>
//                 <View style={rowStyles.main}>
//                     <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]} numberOfLines={1}>
//                         {it.BILLNO ?? '—'}
//                     </Text>

//                     <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
//                         <Icon name="calendar-today" size={14} color={theme.MUTED} />
//                         <Text style={[rowStyles.metaText, { marginLeft: 8 }]}>
//                             <Text>Bill date: </Text>
//                             <Text style={{ fontWeight: '700', color: theme.TEXT_PRIMARY }}>{billDate}</Text>
//                         </Text>
//                     </View>

//                     <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
//                         <Icon name="account-balance-wallet" size={14} color={theme.BRAND_ACCENT} />
//                         <Text style={[rowStyles.metaText, { marginLeft: 8 }]}>
//                             <Text>Balance: </Text>
//                             <Text style={{ fontWeight: '700', color: theme.TEXT_PRIMARY }}>{bal}</Text>
//                         </Text>
//                     </View>
//                 </View>
//             </View>
//         );
//     };

//     return (
//         <View>
//             {loading ? (
//                 <TouchableOpacity activeOpacity={1} style={[styles.trigger, styles.loadingTrigger]}>
//                     <ActivityIndicator size="small" color={theme.BRAND_ACCENT} />
//                     <Text style={{ marginLeft: 8, color: theme.TEXT_SECONDARY }}>Loading...</Text>
//                 </TouchableOpacity>
//             ) : (
//                 <View>
//                     <SearchableDropdownAdj
//                         ref={dropdownRef}
//                         data={data}
//                         labelKey={labelKey}
//                         valueKey={valueKey}
//                         placeholder={placeholder}
//                         pageSize={pageSize}
//                         onSelect={handleDropdownSelect}
//                         initialValue={localSelected}
//                         multiple={multiple}
//                         emptyMessage="No adjustments"
//                         renderRowContent={(item: AdjData, isSelected: boolean) => dropdownRowRenderer(item, isSelected)}
//                     />

//                     <View style={{ marginTop: 10 }}>
//                         {localSelected.length === 0 ? null : (
//                             <FlatList
//                                 data={localSelected}
//                                 keyExtractor={(it, idx) => String(it.__key ?? it.UROWID ?? it.BILLNO ?? idx)}
//                                 renderItem={renderSelectedCard}
//                                 ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
//                                 scrollEnabled={false}
//                             />
//                         )}
//                     </View>
//                 </View>
//             )}
//         </View>
//     );
// };

// const styles = StyleSheet.create({
//     trigger: {
//         flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
//         backgroundColor: theme.SURFACE, paddingHorizontal: 12, paddingVertical: 10,
//         borderRadius: 10, borderWidth: 1, borderColor: theme.BORDER || 'rgba(0,0,0,0.06)',
//     },
//     loadingTrigger: { opacity: 0.95, justifyContent: 'center' },

//     card: {
//         flexDirection: 'row',
//         backgroundColor: theme.SURFACE,
//         borderRadius: 10,
//         padding: 10,
//         borderWidth: 1,
//         borderColor: theme.BORDER || 'rgba(0,0,0,0.06)',
//         alignItems: 'center',
//     },
//     cardBody: { flex: 1 },
//     cardTitleRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//     },
//     cardTitle: { fontSize: 13.5, fontWeight: '800', color: theme.BRAND_DARK },
//     smallDelBtn: { padding: 6, borderRadius: 8 },

//     metaRow: {
//         flexDirection: 'row',
//         marginTop: 8,
//         gap: 8,
//         flexWrap: 'wrap',
//     },
//     metaPill: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         backgroundColor: '#F6F7FA',
//         paddingHorizontal: 8,
//         paddingVertical: 6,
//         borderRadius: 8,
//         borderWidth: 1,
//         borderColor: theme.BORDER || 'rgba(0,0,0,0.06)',
//         marginRight: 6,
//     },
//     metaPillText: {
//         marginLeft: 6,
//         fontSize: 11,
//         color: theme.TEXT_SECONDARY,
//         fontWeight: '700',
//         marginRight: 6,
//     },
//     metaPillValue: {
//         fontSize: 12,
//         color: theme.BRAND_DARK,
//         fontWeight: '800',
//     },

//     receivedRow: {
//         marginTop: 10,
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//     },
//     receivedLabel: {
//         fontSize: 12,
//         color: theme.TEXT_SECONDARY,
//         marginLeft: 6,
//         fontWeight: '700',
//     },
//     receivedInput: {
//         minWidth: 120,
//         paddingVertical: 8,
//         paddingHorizontal: 12,
//         backgroundColor: '#fff',
//         borderRadius: 8,
//         borderWidth: 1,
//         borderColor: theme.BORDER || 'rgba(0,0,0,0.06)',
//         fontSize: 13,
//         color: theme.BRAND_DARK,
//         textAlign: 'right',
//     },

//     cardRight: { marginLeft: 10, alignItems: 'center' },
//     iconBtn: { padding: 6 },
// });

// const rowStyles = StyleSheet.create({
//     rowInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8, paddingRight: 6 },
//     avatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center', marginRight: 8, flexShrink: 0 },
//     avatarSelected: { backgroundColor: theme.BRAND_ACCENT + '22' },
//     avatarText: { color: theme.BRAND_DARK, fontWeight: '800' },

//     main: { flex: 1 },
//     title: { fontSize: 14, color: theme.TEXT_PRIMARY, fontWeight: '800', flexWrap: 'wrap' },
//     titleSelected: { color: theme.BRAND_DARK },
//     Address: { marginTop: 6, color: theme.TEXT_SECONDARY, fontSize: 12, lineHeight: 16 },

//     metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
//     metaPill: { flexDirection: 'row', alignItems: 'center', marginRight: 10, marginBottom: 6 },
//     metaText: { marginLeft: 6, color: theme.MUTED, fontSize: 12, maxWidth: 180 },
// });

// export default PartyDropdownAdj;
// components/Shared/PartyDropdownAdj.tsx
import theme from '@/components/theme';
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import SearchableDropdownAdj from './SearchableDropdownAdj';

export interface AdjData {
    UROWID: string;
    BILLFROM?: string;
    TTYPE?: string;
    PARCODE?: string;
    ACCNAME?: string;
    VOUNO?: string;
    NVOUDATE?: string;
    BILLNO?: string;
    NBILLDATE?: string;
    BILLQTY?: string;
    NETAMT?: string;
    BALAMT?: string;
    BALAMT1?: string; // Received (editable)
    ZUID?: string;
    ZSRNO?: string;
    CONTRANAME?: string;
    DueDay?: string;
    NVOUDATE1?: string;
    ORDERNO?: string;
    // internal
    __key?: string;
    [k: string]: any;
}

export interface D1Row {
    UId: string | null;
    SrNo: number | null;
    SUId: string | null;
    SetAmt: string | null;
    TType: string | null;
    SSrNo: string | null;
    BillNo: string | null;
    BillDate: string | null;
    nBillDate: string | null;
    NetAmt: string | null;
    [k: string]: any;
}

interface Props {
    data: AdjData[];
    placeholder?: string;
    pageSize?: number;
    onSelect: (itemOrItems: AdjData[] | AdjData) => void;
    initialValue?: AdjData[] | AdjData | null;
    labelKey?: string | string[];
    valueKey?: string | string[];
    selected?: AdjData[];
    setSelected?: (items: AdjData[] | null) => void;
    loading?: boolean;
    multiple?: boolean;

    // authoritative form arrays and helpers from parent
    formD2?: AdjData[] | null;
    formD1?: D1Row[] | null;
    formUId?: string | null;
    onUpdateD2?: (d2: AdjData[]) => void;
    onUpdateD1?: (d1: D1Row[]) => void;
}

const initialsOf = (name?: string) => {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
};

const PartyDropdownAdj: React.FC<Props> = ({
    data,
    placeholder = 'Choose adjustment...',
    pageSize = 10,
    onSelect,
    initialValue = null,
    labelKey = ['BILLNO', 'NVOUDATE', 'NETAMT'],
    valueKey = 'UROWID',
    selected = [],
    setSelected,
    loading = false,
    multiple = true,
    formD2 = null,
    formD1 = null,
    formUId = null,
    onUpdateD2,
    onUpdateD1,
}, ref) => {
    const dropdownRef = useRef<any>(null);

    // localSelected holds AdjData items that we render as selected cards
    const [localSelected, setLocalSelected] = useState<AdjData[]>([]);
    // local id counter to create frontend-unique ids
    const [localIdSeq, setLocalIdSeq] = useState<number>(1);
    const genLocalId = (prefix = 'local') => {
        const id = `${prefix}-${Date.now()}-${localIdSeq}`;
        setLocalIdSeq(s => s + 1);
        return id;
    };

    // Expose methods via forwardRef
    useImperativeHandle(ref, () => ({
        clearAllSelections: () => {
            if (dropdownRef.current) {
                dropdownRef.current.clearAllSelections?.();
            }
            // Also clear local state
            setLocalSelected([]);
            emitUpdateToParent([]);
        }
    }));


    // Helper: consider many representations as "blank"
    const isBlank = (v: any) => {
        if (v === null || v === undefined) return true;
        const s = String(v).trim();
        if (s === '') return true;
        if (s === '0' || s === '0.00' || s === '.00' || s === '-1') return true;
        return false;
    };

    // Helper: determine if a D1 row is effectively empty (ignores SrNo as requested)
    const isEmptyD1Row = (r: Partial<D1Row> | any) => {
        // fields to check (SrNo intentionally not checked)
        const keysToCheck = ['SUId', 'SetAmt', 'TType', 'SSrNo', 'BillNo', 'BillDate', 'nBillDate', 'NetAmt'];
        return keysToCheck.every(k => isBlank(r[k]));
    };

    // Helper: format date-like strings to DD-MM-YYYY if possible
    const formatAdjDate = (raw?: string | null) => {
        if (!raw) return '—';
        const s = String(raw).trim();
        // if contains non-digit and is parseable by Date
        if (/[^\d]/.test(s)) {
            const d = new Date(s);
            if (!isNaN(d.getTime())) {
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${dd}-${mm}-${yyyy}`;
            }
            return s;
        }
        // if exactly 8 digits -> assume yyyyMMdd
        if (/^\d{8}$/.test(s)) {
            const yyyy = s.slice(0, 4);
            const mm = s.slice(4, 6);
            const dd = s.slice(6, 8);
            // simple validation
            if (Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) {
                return `${dd}-${mm}-${yyyy}`;
            }
        }
        // fallback
        return s;
    };

    // synthAdjFromD1: create AdjData representation for a d1 row (used when defaults exist in form.d1)
    const synthAdjFromD1 = (d1: any): AdjData => {
        const sr = d1.SrNo ?? Math.floor(Math.random() * 1000000);
        const key = `d1-${String(sr)}`;
        return {
            UROWID: String(d1.SUId ?? d1.SrNo ?? `d1-${sr}`),
            BILLNO: d1.BillNo ?? '',
            NVOUDATE: d1.BillDate ?? d1.nBillDate ?? '',
            NBILLDATE: d1.nBillDate ?? '',
            NETAMT: d1.NetAmt ?? '',
            BALAMT: d1.NetAmt ?? '',
            BALAMT1: d1.SetAmt ?? '',
            ACCNAME: d1.ACCNAME ?? '',
            ZUID: d1.SUId ?? null,
            ZSRNO: d1.SSrNo ?? null,
            __key: key,
        } as AdjData;
    };

    // adjToD1Row: map AdjData -> D1Row (preserve SrNo if possible)
    const adjToD1Row = (adj: AdjData, nextSrNo: number): D1Row => {
        // if internal key is d1-<n>, reuse SrNo
        const ik = adj.__key ?? '';
        const m = /^d1-(\d+)$/.exec(ik);
        const sr = m ? Number(m[1]) : nextSrNo;
        return {
            UId: formUId ?? null,
            SrNo: sr,
            SUId: adj.ZUID ?? adj.UROWID ?? null,
            SetAmt: adj.BALAMT1 ?? adj.BALAMT ?? '',
            TType: adj.TTYPE ?? null,
            SSrNo: adj.ZSRNO ?? null,
            BillNo: adj.BILLNO ?? '',
            BillDate: adj.NVOUDATE ?? adj.NBILLDATE ?? '',
            nBillDate: adj.NBILLDATE ?? '',
            NetAmt: adj.NETAMT ?? '',
        } as D1Row;
    };

    // nextSrNoFor: compute next SrNo from existing d1 (non-empty)
    const nextSrNoFor = (existingD1: D1Row[] | null) => {
        if (Array.isArray(existingD1) && existingD1.length > 0) {
            const max = existingD1.reduce((m, r) => Math.max(m, Number(r.SrNo ?? 0)), 0);
            return max + 1;
        }
        return 1;
    };

    // Helper to create __key for server items / new items


    // Prefer billno as the stable key for UI; fallback to other ids or timestamp+idx
    // prefer frontend-local id, then billno, then existing __key, then server ids, then fallback
    const makeKeyForServerItem = (it: AdjData, idx?: number) => {
        // keep existing __localId or __key if present
        if ((it as any).__localId) return (it as any).__localId;
        if (it.__key) return it.__key;
        // prefer billno for readability but still generate a local id so keys are always unique
        if (it.BILLNO && String(it.BILLNO).trim() !== '') {
            const candidate = `billno-${String(it.BILLNO)}`;
            // but still attach a local id to guarantee uniqueness
            const local = genLocalId('bill');
            return `${candidate}::${local}`;
        }
        if (it.UROWID) return `urowid-${String(it.UROWID)}`;
        if (it.ZUID) return `zuid-${String(it.ZUID)}`;
        // final guaranteed-unique id
        return genLocalId('new');
    };

    // Update stableKeyForRender to use same logic
    const stableKeyForRender = (it: AdjData, idx?: number) => {
        return getItemKey(it) + '-' + (idx ?? 0);
    }



    // Compute maximum SrNo available from current D1 (non-empty) and from localSelected d1- keys
    const computeMaxExistingSrNo = (existingD1: D1Row[] | null, items: AdjData[]) => {
        let max = 0;
        if (Array.isArray(existingD1)) {
            existingD1.forEach(r => {
                const v = Number(r.SrNo ?? 0);
                if (!isNaN(v) && v > max) max = v;
            });
        }
        // also inspect selected items that were synthesized from d1 (have __key d1-<n>)
        (items || []).forEach(it => {
            const ik = it.__key ?? '';
            const m = /^d1-(\d+)$/.exec(ik);
            if (m) {
                const n = Number(m[1]);
                if (!isNaN(n) && n > max) max = n;
            }
        });
        return max;
    };

    useEffect(() => {
        if (Array.isArray(formD1) && formD1.length > 0) {
            const cleanedFormD1 = (formD1 as D1Row[]).filter(row => !isEmptyD1Row(row));
            const mapped: AdjData[] = cleanedFormD1.map((d1row) => {
                const found = (Array.isArray(data) ? data : []).find(it =>
                    (it.BILLNO && d1row.BillNo && String(it.BILLNO) === String(d1row.BillNo)) ||
                    (it.NVOUDATE && d1row.BillDate && String(it.NVOUDATE) === String(d1row.BillDate))
                );
                if (found) {
                    return {
                        ...found,
                        BALAMT1: d1row.SetAmt ?? found.BALAMT ?? found.NETAMT ?? '',
                        __key: `d1-${String(d1row.SrNo)}`,
                    } as AdjData;
                }
                return synthAdjFromD1(d1row);
            });
            setLocalSelected(mapped);
            try { onUpdateD2?.(mapped); } catch { }
            return;
        }
        if (Array.isArray(selected) && selected.length > 0) {
            const withKeys = selected.map((it, idx) => ({ ...it, __key: makeKeyForServerItem(it, idx) }));
            setLocalSelected(withKeys);
            return;
        }
        if (Array.isArray(initialValue) && initialValue.length > 0) {
            const withKeys = (initialValue as AdjData[]).map((it, idx) => ({ ...it, __key: makeKeyForServerItem(it, idx) }));
            setLocalSelected(withKeys);
            return;
        }
        setLocalSelected([]);
    }, [formD1, data, selected, initialValue]); // Removed formD2 dependency





    const makeEmptyD1Placeholder = (): D1Row => ({
        UId: formUId ?? null,
        SrNo: null,
        SUId: null,
        SetAmt: null,
        TType: null,
        SSrNo: null,
        BillNo: null,
        BillDate: null,
        nBillDate: null,
        NetAmt: null,
    });
    const emitUpdateToParent = (items: AdjData[]) => {
        const finalItems = items.map((item) => {
            return {
                ...item,
                BALAMT1: item.BALAMT1, // No auto-fill, allow empty or valid
            };
        });

        setLocalSelected(finalItems);
        onSelect?.(finalItems);
        onUpdateD2?.(finalItems);

        if (onUpdateD1 && Array.isArray(formD1)) {
            const currentD1 = formD1.filter(r => !isEmptyD1Row(r));
            const maxExistingSr = computeMaxExistingSrNo(currentD1, finalItems);
            const d1Rows = finalItems.map((adj, index) => {
                const srNo = adj.__d1SrNo || (maxExistingSr + 1 + index);
                return {
                    ...adjToD1Row(adj, srNo),
                    SetAmt: adj.BALAMT1 ?? '', // Allow empty or valid
                };
            });
            onUpdateD1(d1Rows);
        }
    };





    const getItemKey = (item: AdjData): string => {
        // Use BILLNO + BillDate as unique key (since SSrNo is -1 for both)
        if (item.BILLNO && item.NVOUDATE) {
            return `bill-${String(item.BILLNO)}-${String(item.NVOUDATE)}`;
        }
        if (item.BILLNO) {
            return `billno-${String(item.BILLNO)}`;
        }
        if (item.UROWID && String(item.UROWID).trim() !== '') {
            return `urowid-${String(item.UROWID)}`;
        }
        if (item.ZUID && String(item.ZUID).trim() !== '') {
            return `zuid-${String(item.ZUID)}`;
        }
        return `fallback-${JSON.stringify({ BILLNO: item.BILLNO, NVOUDATE: item.NVOUDATE })}`;
    };




    const handleDropdownSelect = (itemOrItems: any) => {
        const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
        if (!items.length) return;

        const existingBALAMT1 = new Map<string, string>();
        localSelected.forEach((s) => {
            const key = getItemKey(s);
            if (s.BALAMT1 && s.BALAMT1 !== '' && s.BALAMT1 !== '0' && s.BALAMT1 !== '0.00') {
                existingBALAMT1.set(key, s.BALAMT1);
            }
        });

        const uniqueItemsMap = new Map<string, AdjData>();
        [...localSelected, ...items].forEach((it) => {
            const key = getItemKey(it);
            const existingItem = uniqueItemsMap.get(key);
            if (!existingItem) {
                uniqueItemsMap.set(key, {
                    ...it,
                    BALAMT1: existingBALAMT1.get(key) || it.BALAMT1 || it.BALAMT || it.NETAMT || '',
                });
            }
        });

        const combined = Array.from(uniqueItemsMap.values());
        emitUpdateToParent(combined); // Ensure parent is updated
    };





    // Update removeItem function to use same key logic
    const removeItem = (it: AdjData) => {
        const key = getItemKey(it);
        const next = localSelected.filter(s => getItemKey(s) !== key);
        emitUpdateToParent(next);

        // also attempt to remove from formD1 if present by calling onUpdateD1
        if (typeof onUpdateD1 === 'function') {
            const currentD1 = Array.isArray(formD1) ? [...formD1] : [];
            const filteredD1 = currentD1.filter(r => {
                // Match by same criteria
                const rKey = getItemKey({
                    UROWID: r.SUId || '',
                    BILLNO: r.BillNo || '',
                    ZUID: r.SUId || ''
                } as AdjData);
                return rKey !== key;
            });
            try { onUpdateD1?.(filteredD1); } catch { }
        }
    };

    const updateItemField = (it: AdjData, key: string, value: any) => {
        const updatedItems = localSelected.map((s) => {
            if (getItemKey(s) === getItemKey(it)) {
                // Only update BALAMT1 if it's valid
                if (key === 'BALAMT1') {
                    const balance = parseFloat(s.BALAMT || '0') || 0;
                    const received = parseFloat(value) || 0;
                    if (received <= balance || value === '') {
                        return { ...s, [key]: value };
                    }
                    // Else: return unchanged
                    return s;
                }
                // For other keys, update normally
                return { ...s, [key]: value };
            }
            return s;
        });
        setLocalSelected(updatedItems);
        emitUpdateToParent(updatedItems);
    };




    // render selected card (main UI for selected item)
    // renderSelectedCard function को update करें
    const renderSelectedCard = ({ item }: { item: AdjData }) => {
        return (
            <View style={styles.card}>
                <View style={styles.cardBody}>
                    <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.ACCNAME ?? '—'}</Text>
                        <TouchableOpacity onPress={() => removeItem(item)} style={styles.smallDelBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Icon name="close" size={18} color={theme.MUTED} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaPill}>
                            <Icon name="receipt" size={14} color={theme.BRAND_ACCENT} />
                            <Text style={styles.metaPillText}>Bill</Text>
                            <Text style={styles.metaPillValue} numberOfLines={1}>{item.BILLNO ?? '—'}</Text>
                        </View>

                        <View style={styles.metaPill}>
                            <Icon name="calendar-today" size={14} color={theme.MUTED} />
                            <Text style={styles.metaPillText}>Bill date</Text>
                            <Text style={styles.metaPillValue}>{formatAdjDate(item.NVOUDATE ?? item.NBILLDATE)}</Text>
                        </View>

                        <View style={styles.metaPill}>
                            <Icon name="paid" size={14} color={theme.BRAND_DARK} />
                            <Text style={styles.metaPillText}>Balance</Text>
                            <Text style={styles.metaPillValue}>{item.BALAMT ?? item.NETAMT ?? '—'}</Text>
                        </View>
                    </View>

                    <View style={styles.receivedRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Icon name="arrow-downward" size={16} color={theme.TEXT_SECONDARY} />
                            <Text style={styles.receivedLabel}> Received</Text>
                        </View>

                        <TextInput
                            value={String(item.BALAMT1 ?? '')}
                            onChangeText={(t) => {
                                const numericValue = t.replace(/[^0-9.]/g, '');
                                const balance = parseFloat(item.BALAMT || '0') || 0;
                                const received = parseFloat(numericValue) || 0;

                                // Validation: Received <= Balance
                                if (received <= balance || numericValue === '') {
                                    updateItemField(item, 'BALAMT1', numericValue);
                                }
                                // Else: ignore the change or show error
                            }}
                            keyboardType={Platform.OS === 'android' ? 'numeric' : 'numbers-and-punctuation'}
                            placeholder={item.BALAMT || item.NETAMT || "0.00"}
                            style={styles.receivedInput}
                            returnKeyType="done"
                        />


                    </View>
                </View>
            </View>
        );
    };

    // row renderer for dropdown items - custom content if SearchableDropdownAdj supports renderRowContent
    const dropdownRowRenderer = (it: AdjData, isSelected: boolean) => {
        const billDate = formatAdjDate(it.NVOUDATE ?? it.NBILLDATE);
        const bal = it.BALAMT ?? it.NETAMT ?? '—';
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={rowStyles.avatarText}>{initialsOf(it.ACCNAME)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]} numberOfLines={1}>
                        {it.BILLNO ?? '—'}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                        <Icon name="calendar-today" size={14} color={theme.MUTED} />
                        <Text style={[rowStyles.metaText, { marginLeft: 8 }]}>
                            <Text>Bill date: </Text>
                            <Text style={{ fontWeight: '700', color: theme.TEXT_PRIMARY }}>{billDate}</Text>
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                        <Icon name="account-balance-wallet" size={14} color={theme.BRAND_ACCENT} />
                        <Text style={[rowStyles.metaText, { marginLeft: 8 }]}>
                            <Text>Balance: </Text>
                            <Text style={{ fontWeight: '700', color: theme.TEXT_PRIMARY }}>{bal}</Text>
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View>
            {loading ? (
                <TouchableOpacity activeOpacity={1} style={[styles.trigger, styles.loadingTrigger]}>
                    <ActivityIndicator size="small" color={theme.BRAND_ACCENT} />
                    <Text style={{ marginLeft: 8, color: theme.TEXT_SECONDARY }}>Loading...</Text>
                </TouchableOpacity>
            ) : (
                <View>
                    <SearchableDropdownAdj
                        ref={dropdownRef}
                        data={data}
                        labelKey={labelKey}
                        valueKey={valueKey}
                        placeholder={placeholder}
                        pageSize={pageSize}
                        onSelect={handleDropdownSelect}
                        initialValue={localSelected}
                        multiple={multiple}
                        emptyMessage="No adjustments"
                        renderRowContent={(item: AdjData, isSelected: boolean) => dropdownRowRenderer(item, isSelected)}
                        onUpdateD2={onUpdateD2}
                        setLocalSelected={setLocalSelected}
                        onUpdateD1={onUpdateD1}
                        makeEmptyD1Placeholder={makeEmptyD1Placeholder}
                        setSelected={setSelected}
                    />

                    {/* selected items list (cards). user can remove or edit Received */}
                    <View style={{ marginTop: 10 }}>
                        {localSelected.length === 0 ? null : (
                            <FlatList
                                data={localSelected}
                                keyExtractor={(it, idx) => stableKeyForRender(it, idx)}
                                renderItem={renderSelectedCard}
                                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                                scrollEnabled={false}
                            />
                        )}
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    trigger: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.SURFACE, paddingHorizontal: 12, paddingVertical: 10,
        borderRadius: 10, borderWidth: 1, borderColor: theme.BORDER || 'rgba(0,0,0,0.06)',
    },
    loadingTrigger: { opacity: 0.95, justifyContent: 'center' },

    card: {
        flexDirection: 'row',
        backgroundColor: theme.SURFACE,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: theme.BORDER || 'rgba(0,0,0,0.06)',
        alignItems: 'center',
    },
    cardBody: { flex: 1 },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardTitle: { fontSize: 13.5, fontWeight: '800', color: theme.BRAND_DARK },
    smallDelBtn: { padding: 6, borderRadius: 8 },

    metaRow: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 8,
        flexWrap: 'wrap',
    },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F6F7FA',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.BORDER || 'rgba(0,0,0,0.06)',
        marginRight: 6,
    },
    metaPillText: {
        marginLeft: 6,
        fontSize: 11,
        color: theme.TEXT_SECONDARY,
        fontWeight: '700',
        marginRight: 6,
    },
    metaPillValue: {
        fontSize: 12,
        color: theme.BRAND_DARK,
        fontWeight: '800',
    },

    receivedRow: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    receivedLabel: {
        fontSize: 12,
        color: theme.TEXT_SECONDARY,
        marginLeft: 6,
        fontWeight: '700',
    },
    receivedInput: {
        minWidth: 120,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.BORDER || 'rgba(0,0,0,0.06)',
        fontSize: 13,
        color: theme.BRAND_DARK,
        textAlign: 'right',
    },

    cardRight: { marginLeft: 10, alignItems: 'center' },
    iconBtn: { padding: 6 },
});

const rowStyles = StyleSheet.create({
    rowInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8, paddingRight: 6 },
    avatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center', marginRight: 8, flexShrink: 0 },
    avatarSelected: { backgroundColor: theme.BRAND_ACCENT + '22' },
    avatarText: { color: theme.BRAND_DARK, fontWeight: '800' },

    main: { flex: 1 },
    title: { fontSize: 14, color: theme.TEXT_PRIMARY, fontWeight: '800', flexWrap: 'wrap' },
    titleSelected: { color: theme.BRAND_DARK },
    Address: { marginTop: 6, color: theme.TEXT_SECONDARY, fontSize: 12, lineHeight: 16 },

    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
    metaPill: { flexDirection: 'row', alignItems: 'center', marginRight: 10, marginBottom: 6 },
    metaText: { marginLeft: 6, color: theme.MUTED, fontSize: 12, maxWidth: 180 },
});

// export default PartyDropdownAdj;
export default React.forwardRef(PartyDropdownAdj);
