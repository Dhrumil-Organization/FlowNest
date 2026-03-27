// ChequeForm.tsx (updated with initial blocking modal)
import React, { useMemo, useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    ScrollView,
    Modal,
    Platform,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import theme from '../../android/app/src/theme';
import CameraPage from './CameraPage'; // modal camera component
import SearchableDropdown from '../Shared/SearchableDropdown';
import PartyDropdown from '../Shared/PartyDropdown';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

interface PropertyData {
    PrpCode: string;
    LngName: string;
    ShtName: string;
    PrpOf: string;
    PrpOfFull: string;
}
interface PartyData {
    ordno: string;
    acccode: string;
    accname: string;
    address: string;
    gstin: string;
    email: string;
}

export interface Party {
    accname?: string;
    accode?: string;
    address?: string;
    email?: string;
    gstin?: string;
    ordno?: string;
    [k: string]: any;
}
interface BankData {
    BankName: string;
}
interface BranchData {
    BankBr: string;
}

interface Props {
    token: string;
    isConnected: boolean | null;
    username: string;
    onSavePart1?: (payload: any) => Promise<any>;
    onSavePart2?: (payload: any) => Promise<any>;
    getPropertyData: PropertyData[];
    getPartyData: PartyData[];
    setSelectedProperty: (property: PropertyData | null) => void;
    selectedProperty: PropertyData | null;
    setSelectedParty: (party: PartyData | null) => void;
    selectedParty: PartyData | null;
    selected?: Party | null;
    setSelected?: (item: Party | null) => void;
    getPartyLoading?: boolean;
    getBankData?: BankData[];
    setSelectedBank?: (item: BankData | null) => void;
    selectedBank?: BankData | null;
    setSelectedbank?: (item: BankData | null) => void;
    selectedbank?: BankData | null;
    getBankLoading?: boolean;
    getBranchData?: BranchData[];
    setSelectedBranch?: (item: BranchData | null) => void;
    selectedBranch?: BranchData | null;
    setSelectedbranch?: (item: BranchData | null) => void;
    selectedbranch?: BranchData | null;
    getBranchLoading?: boolean;
    form: any;
    setForm: (form: any) => void;
    ShowChequeData: Function;
    initialLoading: boolean;
    initialModalVisible: boolean;
    setInitialModalVisible: (initialModalVisible: boolean) => void;
    // ShowChequeData: (form: any) => Promise<any>;
}

const formatDisplayDate = (d?: Date | string | null) => {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    try {
        return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    } catch {
        const dd = date.getDate().toString().padStart(2, '0');
        const mm = (date.getMonth() + 1).toString().padStart(2, '0');
        const yy = date.getFullYear();
        return `${dd}-${mm}-${yy}`;
    }
};

const toISODate = (d: Date) => {
    if (!d) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const ChequeForm: React.FC<Props> = ({
    token,
    isConnected,
    username,
    onSavePart1,
    onSavePart2,
    getPropertyData,
    getPartyData,
    setSelectedProperty,
    selectedProperty,
    setSelectedParty,
    selectedParty,
    selected,
    setSelected,
    getPartyLoading,
    getBankData,
    setSelectedBank,
    selectedBank,
    selectedbank,
    setSelectedbank,
    getBankLoading,
    getBranchData,
    setSelectedBranch,
    selectedBranch,
    selectedbranch,
    setSelectedbranch,
    getBranchLoading,
    form,
    setForm,
    ShowChequeData,
    initialLoading,
    // setInitialLoading,
    initialModalVisible,
    setInitialModalVisible
}) => {
    const [step, setStep] = useState<number>(1);

    // AdjType from form or default ACC
    const tabs = form.AdjType ? form.AdjType : 'ACC';
    const [AdjType, setMode] = useState<'ADJ' | 'ACC'>(tabs as 'ADJ' | 'ACC');

    const [chequeDatePickerVisible, setChequeDatePickerVisible] = useState(false);
    const [collectionDatePickerVisible, setCollectionDatePickerVisible] = useState(false);
    const [isCameraModalVisible, setCameraModalVisible] = useState(false);
    const [isPreviewVisible, setPreviewVisible] = useState(false);

    // initial-blocking modal visibility + local loading while ShowChequeData runs
    // const [initialModalVisible, setInitialModalVisible] = useState<boolean>(false);
    // const [initialLoading, setInitialLoading] = useState<boolean>(false);

    // keep "selectedX" objects in sync when form.* keys change OR when data arrays load
    useEffect(() => {
        // property
        if (form.PrpCode && Array.isArray(getPropertyData)) {
            const found = getPropertyData.find(p => String(p.PrpCode) === String(form.PrpCode));
            setSelectedProperty(found ?? null);
        } else {
            setSelectedProperty(null);
        }
    }, [form.PrpCode, getPropertyData]);

    useEffect(() => {
        // party
        if (form.AccCode && Array.isArray(getPartyData)) {
            const found = getPartyData.find(p => String(p.acccode) === String(form.AccCode));
            setSelectedParty(found ?? null);
            setSelected?.(found ?? null);
        } else {
            setSelectedParty(null);
            setSelected?.(null);
        }
    }, [form.AccCode, getPartyData]);

    useEffect(() => {
        // bank
        if (form.BankName && Array.isArray(getBankData)) {
            const found = getBankData.find(b => String(b.BankName) === String(form.BankName));
            setSelectedBank?.(found ?? null);
            setSelectedbank?.(found ?? null);
        } else {
            setSelectedBank?.(null);
            setSelectedbank?.(null);
        }
    }, [form.BankName, getBankData]);

    useEffect(() => {
        // branch
        if (form.BankBr && Array.isArray(getBranchData)) {
            const found = getBranchData.find(b => String(b.BankBr) === String(form.BankBr));
            setSelectedBranch?.(found ?? null);
            setSelectedbranch?.(found ?? null);
        } else {
            setSelectedBranch?.(null);
            setSelectedbranch?.(null);
        }
    }, [form.BankBr, getBranchData]);

    // Show initial blocking modal when either EDate or PrpCode missing
    useEffect(() => {
        // show modal only if either missing
        if (!form.EDate || !form.PrpCode) {
            setInitialModalVisible(true);
        } else {
            // setInitialModalVisible(false);
        }
    }, [form.EDate, form.PrpCode]);

    // gallery pick -> set form.attachment
    const pickFromGallery = async () => {
        if (!isConnected) return Alert.alert('Offline', 'You are offline.');
        try {
            const res = await launchImageLibrary({
                mediaType: 'photo',
                includeBase64: true,
                quality: 0.8,
                selectionLimit: 1,
            });

            if (res.assets?.[0]) {
                const a = res.assets[0];

                // Always convert to dataURL base64
                if (a.base64 && a.type) {
                    const dataUrl = `data:${a.type};base64,${a.base64}`;
                    setForm(prev => ({ ...prev, AttachImage: dataUrl }));
                } else if (a.uri) {
                    // fallback URI (works too)
                    setForm(prev => ({ ...prev, AttachImage: a.uri }));
                }
            }
        } catch (err) {
            console.log("gallery error", err);
        }
    };

    // camera capture -> set form.attachment
    const handleCameraCapture = (dataUrl: string) => {
        // dataUrl is already base64 dataURL
        setForm(prev => ({ ...prev, AttachImage: dataUrl }));
        setCameraModalVisible(false);
    };

    const removeAttachment = () => setForm(prev => ({ ...prev, AttachImage: null }));

    const goNext = () => {
        if (step === 1) {
            if (AdjType === 'ACC') {
                handleSavePart1();
                return;
            }
            setStep(2);
        } else {
            handleSavePart1();
            handleSavePart2();
        }
    };
    const goPrev = () => setStep((s) => Math.max(1, s - 1));

    const handleSavePart1 = async () => {
        try {
            await onSavePart1?.({
                ...form,
                AdjType,
            });
            Alert.alert("Saved", "Part 1 saved");
        } catch (err) {
            Alert.alert("Error", "Could not save part1");
        }
    };

    const handleSavePart2 = async () => {
        // example behavior preserved
        try {
            await onSavePart2?.({ ...form, AdjType});
            Alert.alert('Saved', 'Form saved');
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Could not save part 2');
        }
    };

    const resetAll = () => {
        setForm({
            EDate: "",
            PrpCode: "",
            AccCode: "",
            BankName: "",
            BankBr: "",
            ChqNo: "",
            ChqDate: "",
            Amount: "",
            Remark: "",
            AttachImage: null,
        });
    };

    // initial modal OK handler: require both EDate and PrpCode and then call ShowChequeData
    // ChequeForm: initial modal OK handler
    const handleInitialOk = async () => {
        // client-side validation
        if (!form.PrpCode) {
            Alert.alert('Validation', 'Please select a Property.');
            return;
        }
        if (!form.EDate) {
            Alert.alert('Validation', 'Please select collection date.');
            return;
        }

        try {
            // show local loader in parent by keeping modal visible and relying on parent's initialLoading
            // call parent function explicitly and pass the form
            console.log('[ChequeForm] calling ShowChequeData with form:', form);
            await ShowChequeData(form); // <-- important: pass the form and await
            // after await, parent should setInitialModalVisible(false) and clear initialLoading
        } catch (err) {
            console.error('[ChequeForm] ShowChequeData error', err);
            Alert.alert('Error', 'Could not fetch cheque data.');
        }
    };


    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.modeRow}>
                {step === 1 && (<TouchableOpacity style={[styles.modeBtn, AdjType === 'ACC' && styles.modeBtnActive]} onPress={() => setMode('ACC')}>
                    <Text style={[styles.modeText, AdjType === 'ACC' && styles.modeTextActive]}>On Account</Text>
                </TouchableOpacity>)}

                <TouchableOpacity style={[styles.modeBtn, AdjType === 'ADJ' && styles.modeBtnActive]} onPress={() => setMode('ADJ')}>
                    <Text style={[styles.modeText, AdjType === 'ADJ' && styles.modeTextActive]}>Adjust</Text>
                </TouchableOpacity>
            </View>

            {step === 1 && (
                <View style={styles.card}>
                    {/* Collection Date */}
                    <Text style={styles.label}>Collection Date</Text>
                    <TouchableOpacity activeOpacity={0.85} style={styles.dateTrigger} onPress={() => setCollectionDatePickerVisible(true)}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.dateTriggerText, !form.EDate && styles.placeholderText]}>
                                {form.EDate ? formatDisplayDate(form.EDate) : "Select collection date"}
                            </Text>
                        </View>
                        <Icon name="calendar-today" size={18} color={theme.TEXT_SECONDARY} />
                    </TouchableOpacity>

                    <DateTimePickerModal
                        isVisible={collectionDatePickerVisible}
                        mode="date"
                        onConfirm={(date) => setForm(prev => ({ ...prev, EDate: toISODate(date) }))}
                        onCancel={() => setCollectionDatePickerVisible(false)}
                        headerTextIOS="Pick Collection Date"
                        locale="en_GB"
                        maximumDate={new Date(2099, 11, 31)}
                    />

                    {/* Property */}
                    <View style={{ marginBottom: 10 }} >
                        <Text style={styles.label}>Select Property <Text style={{ color: 'red' }}>*</Text></Text>

                        <SearchableDropdown
                            data={getPropertyData}
                            labelKey="LngName"
                            valueKey="PrpCode"
                            placeholder="Choose property..."
                            pageSize={10}
                            initialValue={selectedProperty ?? null}
                            onSelect={(item) => {
                                setForm(prev => ({ ...prev, PrpCode: item.PrpCode, AccCode: "", BankName: "", BankBr: "" }));
                                setSelectedProperty(item);
                            }}
                            multiple={false}
                            emptyMessage="No properties available"
                        />
                    </View>

                    {/* Party */}
                    <View style={{ marginBottom: 10 }} >
                        <Text style={styles.label}>Select Party <Text style={{ color: 'red' }}>*</Text></Text>

                        <PartyDropdown
                            data={getPartyData}
                            placeholder="Choose party..."
                            labelKey="accname"
                            valueKey="acccode"
                            pageSize={12}
                            initialValue={selectedParty ?? null}
                            selected={selected ?? null}
                            loading={Boolean(getPartyLoading)}
                            type="party"
                            onSelect={(item) => {
                                setForm(prev => ({ ...prev, AccCode: item.acccode, AccName: item.accname }));
                                setSelectedParty(item);
                                setSelected?.(item);
                            }}
                            setSelected={(val) => {
                                if (!val) {
                                    setForm(prev => ({ ...prev, AccCode: '' }));
                                    setSelectedParty(null);
                                    setSelected?.(null);
                                } else {
                                    setForm(prev => ({ ...prev, AccCode: val.acccode }));
                                    setSelectedParty(val as PartyData);
                                    setSelected?.(val as PartyData);
                                }
                            }}
                        />
                    </View>

                    {/* Bank + Branch */}
                    <View style={styles.twoColRow}>
                        <View style={styles.col} >
                            <Text style={styles.label}>Bank <Text style={{ color: 'red' }}>*</Text></Text>

                            <PartyDropdown
                                data={getBankData || []}
                                placeholder="Choose Bank..."
                                labelKey="BankName"
                                valueKey="BankName"
                                pageSize={12}
                                initialValue={selectedBank ?? null}
                                selected={selectedbank ?? null}
                                loading={Boolean(getBankLoading)}
                                type="bank"
                                onSelect={(item) => {
                                    setForm(prev => ({ ...prev, BankName: item.BankName }));
                                    setSelectedBank?.(item);
                                    setSelectedbank?.(item);
                                }}
                                setSelected={(val) => {
                                    if (!val) setForm(prev => ({ ...prev, BankName: '' }));
                                    else setForm(prev => ({ ...prev, BankName: val.BankName }));
                                }}
                            />
                        </View>

                        <View style={styles.col} >
                            <Text style={styles.label}>Branch <Text style={{ color: 'red' }}>*</Text></Text>

                            <PartyDropdown
                                data={getBranchData || []}
                                placeholder="Choose Branch..."
                                labelKey="BankBr"
                                valueKey="BankBr"
                                pageSize={12}
                                initialValue={selectedBranch ?? null}
                                selected={selectedbranch ?? null}
                                loading={Boolean(getBranchLoading)}
                                type="branch"
                                onSelect={(item) => {
                                    setForm(prev => ({ ...prev, BankBr: item.BankBr }));
                                    setSelectedBranch?.(item);
                                    setSelectedbranch?.(item);
                                }}
                                setSelected={(val) => {
                                    if (!val) setForm(prev => ({ ...prev, BankBr: '' }));
                                    else setForm(prev => ({ ...prev, BankBr: val.BankBr }));
                                }}
                            />
                        </View>
                    </View>

                    {/* Cheque No + Cheque Date */}
                    <View style={styles.twoColRow1}>
                        <View style={styles.col1}>
                            <Text style={styles.label}>Cheque No</Text>
                            <TextInput
                                style={styles.input}
                                value={form.ChqNo}
                                onChangeText={(t) => setForm(prev => ({ ...prev, ChqNo: t }))}
                                keyboardType="numeric"
                                placeholder="e.g. 001234"
                            />
                        </View>

                        <View style={styles.col1}>
                            <Text style={styles.label}>Cheque Date</Text>
                            <TouchableOpacity activeOpacity={0.85} style={styles.dateTrigger} onPress={() => setChequeDatePickerVisible(true)}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.dateTriggerText, !form.ChqDate && styles.placeholderText]}>
                                        {form.ChqDate ? formatDisplayDate(form.ChqDate) : "Select cheque date"}
                                    </Text>
                                </View>
                                <Icon name="calendar-today" size={18} color={theme.TEXT_SECONDARY} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <DateTimePickerModal
                        isVisible={chequeDatePickerVisible}
                        mode="date"
                        onConfirm={(date) => setForm(prev => ({ ...prev, ChqDate: toISODate(date) }))}
                        onCancel={() => setChequeDatePickerVisible(false)}
                        headerTextIOS="Pick Cheque Date"
                        locale="en_GB"
                        maximumDate={new Date(2099, 11, 31)}
                    />

                    {/* Amount */}
                    <Text style={styles.label}>Amount</Text>
                    <TextInput
                        style={styles.input}
                        value={form.Amount}
                        onChangeText={(t) => setForm(prev => ({ ...prev, Amount: t }))}
                        keyboardType="numeric"
                        placeholder="0.00"
                    />

                    {/* Notes */}
                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                        style={[styles.input, { minHeight: 80 }]}
                        value={form.Remark}
                        onChangeText={(t) => setForm(prev => ({ ...prev, Remark: t }))}
                        multiline
                        placeholder="Optional notes"
                    />

                    {/* Attachment */}
                    <Text style={[styles.label, { marginTop: 6 }]}>Attachment (single image)</Text>
                    <View style={styles.attachRow}>
                        {form.AttachImage ? (
                            <>
                                <TouchableOpacity onPress={() => setPreviewVisible(true)}>
                                    <Image
                                        source={{ uri: form.AttachImage }}
                                        style={styles.preview}
                                    />
                                </TouchableOpacity>

                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <TouchableOpacity style={styles.ghostBtn} onPress={() => setCameraModalVisible(true)}>
                                        <Icon name="edit" size={18} color={theme.TEXT_SECONDARY} />
                                        <Text style={styles.ghostText}>Replace</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.ghostBtn} onPress={removeAttachment}>
                                        <Icon name="delete" size={18} color={theme.TEXT_SECONDARY} />
                                        <Text style={styles.ghostText}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity style={styles.primaryAttach} onPress={pickFromGallery}>
                                    <Icon name="photo-library" size={18} color="#fff" />
                                    <Text style={styles.attachText}>Gallery</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.primaryAttach, { marginLeft: 8 }]}
                                    onPress={() => setCameraModalVisible(true)}
                                >
                                    <Icon name="photo-camera" size={18} color="#fff" />
                                    <Text style={styles.attachText}>Camera</Text>
                                </TouchableOpacity>
                            </>
                        )}

                    </View>

                    {/* Nav */}
                    <View style={styles.navRow}>
                        <View style={{ width: 12 }} />
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity style={[styles.saveBtn, { minWidth: 120 }]} onPress={goNext} disabled={!isConnected}>
                            <Text style={styles.saveText}>{AdjType === 'ACC' ? 'Save' : 'Next'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* STEP 2 */}
            {step === 2 && AdjType === 'ADJ' && (
                <View style={styles.card}>
                    <Text style={styles.label}>Adjust Account</Text>
                    <TextInput style={styles.input} value={''} onChangeText={() => { }} placeholder="Account name / code" />

                    <Text style={styles.label}>Reason</Text>
                    <TextInput style={[styles.input, { minHeight: 100 }]} value={''} onChangeText={() => { }} multiline />

                    <View style={styles.navRow}>
                        <TouchableOpacity style={styles.ghostBtn} onPress={goPrev}>
                            <Icon name="arrow-back" size={18} color={theme.TEXT_SECONDARY} />
                            <Text style={styles.ghostText}>Previous</Text>
                        </TouchableOpacity>

                        <View style={{ flex: 1 }} />

                        <TouchableOpacity style={styles.saveBtn} onPress={goNext} disabled={!isConnected}>
                            <Text style={styles.saveText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* CAMERA MODAL */}
            <Modal visible={isCameraModalVisible} animationType="slide" onRequestClose={() => setCameraModalVisible(false)}>
                <CameraPage
                    isConnected={isConnected}
                    token={token}
                    onCapture={(dataUrl) => {
                        handleCameraCapture(dataUrl);
                    }}
                    onClose={() => setCameraModalVisible(false)}
                />
            </Modal>

            {/* PREVIEW MODAL */}
            <Modal
                visible={isPreviewVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPreviewVisible(false)}
            >
                <View style={styles.fullscreenOverlay}>
                    <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setPreviewVisible(false)} activeOpacity={0.8}>
                        <Icon name="close" size={28} color="#fff" />
                    </TouchableOpacity>

                    {form.AttachImage && (
                        <Image
                            source={{ uri: form.AttachImage }}
                            style={styles.fullscreenImage}
                        />
                    )}
                </View>
            </Modal>

            {/* ---------- INITIAL BLOCKING MODAL ---------- */}
            <Modal
                visible={initialModalVisible}
                animationType="slide"
                transparent={true}
                // prevent hardware back from closing modal by providing no-op onRequestClose
                onRequestClose={() => { /* intentionally do nothing (no cancel) */ }}
            >
                <View style={styles.initialModalBackdrop}>
                    <View style={styles.initialModalCard}>
                        <Text style={[styles.label, { marginBottom: 8 }]}>Collection Date</Text>
                        <TouchableOpacity activeOpacity={0.85} style={styles.dateTrigger} onPress={() => setCollectionDatePickerVisible(true)}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.dateTriggerText, !form.EDate && styles.placeholderText]}>
                                    {form.EDate ? formatDisplayDate(form.EDate) : "Select collection date"}
                                </Text>
                            </View>
                            <Icon name="calendar-today" size={18} color={theme.TEXT_SECONDARY} />
                        </TouchableOpacity>

                        <DateTimePickerModal
                            isVisible={collectionDatePickerVisible}
                            AdjType="date"
                            onConfirm={(date) => setForm(prev => ({ ...prev, EDate: toISODate(date) }))}
                            onCancel={() => setCollectionDatePickerVisible(false)}
                            headerTextIOS="Pick Collection Date"
                            locale="en_GB"
                            maximumDate={new Date(2099, 11, 31)}
                        />

                        <View style={{ marginTop: 12 }}>
                            <Text style={styles.label}>Select Property <Text style={{ color: 'red' }}>*</Text></Text>
                            <SearchableDropdown
                                data={getPropertyData}
                                labelKey="LngName"
                                valueKey="PrpCode"
                                placeholder="Choose property..."
                                pageSize={10}
                                initialValue={selectedProperty ?? null}
                                onSelect={(item) => {
                                    setForm(prev => ({ ...prev, PrpCode: item.PrpCode, AccCode: "", BankName: "", BankBr: "" }));
                                    setSelectedProperty(item);
                                }}
                                multiple={false}
                                emptyMessage="No properties available"
                            />
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 }}>
                            <TouchableOpacity
                                style={[styles.saveBtn, { minWidth: 120, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                                onPress={handleInitialOk}
                                disabled={initialLoading || !form.PrpCode || !form.EDate}
                            >
                                {initialLoading ? <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /> : null}
                                <Text style={styles.saveText}>OK</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* ---------- END INITIAL BLOCKING MODAL ---------- */}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16, paddingBottom: 48 },
    modeRow: { flexDirection: 'row', marginBottom: 12 },
    modeBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.04)', marginRight: 8 },
    modeBtnActive: { backgroundColor: theme.BRAND_ACCENT },
    modeText: { color: theme.TEXT_SECONDARY, fontWeight: '600' },
    modeTextActive: { color: '#fff' },

    card: { backgroundColor: theme.SURFACE, borderRadius: 12, padding: 12, elevation: 2, shadowColor: theme.SHADOW, marginBottom: 12 },

    twoColRow: { flexDirection: 'row', justifyContent: 'space-between' },
    twoColRow1: { display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' },
    col: { flex: 1, marginRight: 8 },
    col1: { width: '48%', marginRight: 8 },
    label: { color: theme.TEXT_SECONDARY, fontSize: 12, fontWeight: '600', marginBottom: 6 },
    input: { backgroundColor: '#F6F7FA', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10, color: theme.BRAND_DARK },
    dateTrigger: { backgroundColor: '#F6F7FA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    dateTriggerText: { fontSize: 14, color: theme.TEXT_PRIMARY, fontWeight: '600' },

    placeholderText: { color: theme.MUTED },

    attachRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    primaryAttach: { backgroundColor: theme.BRAND_PRIMARY, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
    attachText: { color: '#fff', marginLeft: 8, fontWeight: '700' },
    preview: { width: 96, height: 96, borderRadius: 8, resizeMode: 'cover' },

    ghostBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    ghostText: { marginLeft: 6, color: theme.TEXT_SECONDARY },

    navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
    saveBtn: { backgroundColor: theme.BRAND_ACCENT, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    saveText: { color: '#fff', fontWeight: '800' },

    fullscreenOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    closePreviewBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        right: 20,
        zIndex: 10,
        padding: 6,
    },

    /* initial modal styles */
    initialModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        padding: 20,
    },
    initialModalCard: {
        backgroundColor: theme.SURFACE,
        borderRadius: 12,
        padding: 16,
        elevation: 4,
    },
});

export default ChequeForm;
