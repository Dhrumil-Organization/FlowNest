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
    Animated,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';
// import { launchImageLibrary } from 'react-native-image-picker';
import * as ImagePicker from 'expo-image-picker';
import theme from '@/components/theme';
import CameraPage from './CameraPage'; // modal camera component
import SearchableDropdown from '@/Shared/SearchableDropdown';
import PartyDropdown from '@/Shared/PartyDropdown';
import PartyDropdownType from '@/Shared/PartyDropdownType';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PartyDropdownAdj from '@/Shared/PartyDropdownAdj';

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
    accountname: string;
    address: string;
    gstin: string;
    email: string;
}

export interface Party {
    accountname?: string;
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

interface PaymentData {
    PayCode: string;
    PayType: string;
}
interface AdjData {

    UROWID: string;
    BILLFROM: string;
    TTYPE: string;
    PARCODE: string;
    ACCNAME: string;
    VOUNO: string;
    NVOUDATE: string;
    BILLNO: string;
    NBILLDATE: string;
    BILLQTY: string;
    NETAMT: string;
    BALAMT: string;
    BALAMT1: string;
    ZUID: string;
    ZSRNO: string;
    CONTRANAME: string;
    DueDay: string;
    NVOUDATE1: string;
    ORDERNO: string;

}

interface Props {
    token: string;
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
    ShowAdjustmentData: Function;
    initialLoading: boolean;
    initialModalVisible: boolean;
    setInitialModalVisible: (initialModalVisible: boolean) => void;
    getPaymentData?: PaymentData[];
    setSelectedPayment?: (item: PaymentData | null) => void;
    selectedPayment?: PaymentData | null;
    getPaymentLoading?: boolean;
    selectedpayment?: PaymentData | null;
    setSelectedpayment?: (item: PaymentData | null) => void;
    getAdjData?: AdjData[];
    setSelectedAdj?: (item: AdjData | null) => void;
    selectedAdj?: AdjData | null;
    getAdjLoading?: boolean;
    selectedadj?: AdjData | null;
    setSelectedadj?: (item: AdjData | null) => void;
    getSaveLoading?: boolean;
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
    ShowAdjustmentData,
    initialLoading,
    // setInitialLoading,
    initialModalVisible,
    setInitialModalVisible,
    getPaymentData,
    setSelectedPayment,
    selectedPayment,
    getPaymentLoading,
    selectedpayment,
    setSelectedpayment,
    getAdjData,
    setSelectedAdj,
    selectedAdj,
    getAdjLoading,
    selectedadj,
    setSelectedadj,
    getSaveLoading

}) => {
    const [step, setStep] = useState<number>(1);

    const [customPartyName, setCustomPartyName] = useState<string>('');
    // AdjType from form or default ACC
    const tabs = form.AdjType ? form.AdjType : 'ADJ';
    const [AdjType, setMode] = useState<'ADJ' | 'ACC'>(tabs as 'ADJ' | 'ACC');

    const [chequeDatePickerVisible, setChequeDatePickerVisible] = useState(false);
    const [collectionDatePickerVisible, setCollectionDatePickerVisible] = useState(false);
    const [isCameraModalVisible, setCameraModalVisible] = useState(false);
    const [isPreviewVisible, setPreviewVisible] = useState(false);
    const partyD1CacheRef = React.useRef<Record<string, any[]>>({});
    const [lastPartyOnNext, setLastPartyOnNext] = useState<string | null>(null);
    const dropdownAdjRef = React.useRef<any>(null);


    const isPLN = useMemo(() => {
        return String(form.PrpCode).toUpperCase() === 'PLN';
    }, [form.PrpCode]);

    // Effect to sync customPartyName with form.AccName
    useEffect(() => {
        if (isPLN) {
            setCustomPartyName(form.AccName || '');
        }
    }, [isPLN, form.AccName]);

    // Handle custom party name input
    const handleCustomPartyNameChange = (text: string) => {
        setCustomPartyName(text);
        setForm(prev => ({
            ...prev,
            AccName: text,
            AccCode: '', // Ensure AccCode is empty
            AccCodeName: text // Optional: if you want to store the name in both fields
        }));
    };

    // initial-blocking modal visibility + local loading while ShowChequeData runs
    // const [initialModalVisible, setInitialModalVisible] = useState<boolean>(false);
    // const [initialLoading, setInitialLoading] = useState<boolean>(false);

    // keep "selectedX" objects in sync when form.* keys change OR when data arrays load

    // Restore or clear form.d1 when party changes
    // In ChequeForm.tsx - update the party change effect
    useEffect(() => {
        const acc = form.AccCode ?? '';
        if (!acc) {
            // no party selected -> clear d1
            setForm(prev => ({ ...prev, d1: [] }));

            // IMPORTANT: Also clear d2 (adjustments) when party changes
            setForm(prev => ({
                ...prev,
                d1: [],
                d2: []
            }));

            // Clear the adjustments dropdown selections
            if (dropdownAdjRef.current) {
                dropdownAdjRef.current.clearAllSelections?.();
            }
            return;
        }

        const key = String(acc);
        const cached = partyD1CacheRef.current[key];

        if (Array.isArray(cached) && cached.length > 0) {
            // restore cached d1 for this party
            setForm(prev => ({ ...prev, d1: cached }));
        } else {
            // no cache for this party -> clear d1 and d2
            setForm(prev => ({
                ...prev,
                d1: [],
                d2: []
            }));

            // Clear the adjustments dropdown selections
            if (dropdownAdjRef.current) {
                dropdownAdjRef.current.clearAllSelections?.();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.AccCode]);



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
            // setInitialModalVisible(true);
        } else {
            // setInitialModalVisible(false);
        }
    }, [form.EDate, form.PrpCode]);

    // gallery pick -> set form.attachment
    // const pickFromGallery = async () => {
    //     if (!isConnected) return Alert.alert('Offline', 'You are offline.');
    //     try {
    //         const res = await launchImageLibrary({
    //             mediaType: 'photo',
    //             includeBase64: true,
    //             quality: 0.8,
    //             selectionLimit: 1,
    //         });

    //         if (res.assets?.[0]) {
    //             const a = res.assets[0];

    //             // Always convert to dataURL base64
    //             if (a.base64 && a.type) {
    //                 const dataUrl = `data:${a.type};base64,${a.base64}`;
    //                 setForm(prev => ({ ...prev, AttachImage: dataUrl }));
    //             } else if (a.uri) {
    //                 // fallback URI (works too)
    //                 setForm(prev => ({ ...prev, AttachImage: a.uri }));
    //             }
    //         }
    //     } catch (err) {
    //         console.log("gallery error", err);
    //     }
    // };
    const pickFromGallery = async () => {
        // if (!isConnected) return Alert.alert('Offline', 'You are offline.');

        try {
            // Request media library permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow access to the gallery to select an image.');
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, // Set to `true` if you want cropping
                quality: 0.8,
                base64: true, // To get base64 data (similar to `includeBase64: true`)
                exif: false, // Disable EXIF data if not needed
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                let imageUri = asset.uri;

                // If base64 is available, use it (Expo returns `base64` in asset)
                if (asset.base64) {
                    const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
                    setForm(prev => ({ ...prev, AttachImage: dataUrl }));
                } else {
                    // Fallback to URI (works in most cases)
                    setForm(prev => ({ ...prev, AttachImage: imageUri }));
                }
            }
        } catch (err) {
            console.log("Gallery error:", err);
            Alert.alert('Error', 'Failed to pick image.');
        }
    };

    // camera capture -> set form.attachment
    const handleCameraCapture = (dataUrl: string) => {
        // dataUrl is already base64 dataURL
        setForm(prev => ({ ...prev, AttachImage: dataUrl }));
        setCameraModalVisible(false);
    };

    const removeAttachment = () => setForm(prev => ({ ...prev, AttachImage: null }));

    // console.log('Payment:', form.PayType);

    const goNext = async () => {
        // Validate required fields on Next from Step 1
        if (step === 1) {
            // If AdjType is ACC you previously returned early — keep same behaviour but still validate if you want
            // The user asked validation for Payment type, Party, Amount, Bank — apply only when user actually wants to go to Step 2
            // Validate required fields:
            const payType = form.PayType ?? form.PayType?.toString() ?? '';
            const accCode = form.AccCode ?? '';
            const accName = form.AccName ?? '';
            const amountRaw = form.Amount ?? '';
            const bankName = form.BankName ?? '';

            // Normalize amount: allow strings with commas
            const numericAmount = parseFloat(String(amountRaw).replace(/,/g, '')) || 0;

            if (!payType || String(payType).trim() === '') {
                Alert.alert('Validation', 'Please select Payment Type.');
                return;
            }
            if ((!accCode || String(accCode).trim() === '') && !isPLN) {
                Alert.alert('Validation', 'Please select Party.');
                return;
            }
            if ((!accName || String(accName).trim() === '') && isPLN) {
                Alert.alert('Validation', 'Please Enter Party.');
                return;
            }

            if (!amountRaw || numericAmount <= 0) {
                Alert.alert('Validation', 'Please enter a valid Amount greater than 0.');
                return;
            }

            if (!bankName || String(bankName).trim() === '') {
                console.log('Payment::', form.PayType);
                if (form.PayType == 'NEFT' || form.PayType == 'RTGS') {
                    // Alert.alert('Validation', 'Please select Bank.');
                    // return;
                } else {
                    Alert.alert('Validation', 'Please select Bank.');
                    return;
                }
            }

            // Save current form.d1 into cache for this party (so switching away & back can restore)
            try {
                const key = String(accCode);
                partyD1CacheRef.current[key] = Array.isArray(form.d1) ? form.d1 : [];
                setLastPartyOnNext(key);
            } catch (e) {
                console.warn('partyD1 cache write failed', e);
            }

            // If AdjType is ACC your old code returned early — preserve that behaviour:
            if (AdjType === 'ACC') {
                // If ACC you earlier returned; keep same behavior (don't go to step 2)
                // You might still want to call handleSavePart1() here — but preserving original flow.
                return;
            }

            // proceed to step 2
            setStep(2);
            return;
        }

        // If already in step 2, perform "save" action
        if (step === 2) {
            // call save handlers as earlier
            // try {
            //     await handleSavePart1();
            // } catch (err) {
            //     console.warn('save part1 failed', err);
            // }
            // Optionally continue to final save
            try {
                await handleSavePart2();
            } catch (err) {
                console.warn('save part2 failed', err);
            }
        }
    };

    // const goPrev = () => setStep((s) => Math.max(1, s - 1));    
    const goPrev = () => {
        setStep((s) => {
            const ns = Math.max(1, s - 1);
            // if returning to step 1, clear relevant fields (you asked "piche aaya to wapis wo khalii")
            if (ns === 1) {
                // resetAll();
            }
            return ns;
        });
    };


    const handleSavePart1 = async () => {
        try {
            await onSavePart1?.({
                ...form,
                AdjType,
            });
            // Alert.alert("Saved", "Part 1 saved");
        } catch (err) {
            Alert.alert("Error", `${err.response?.data?.message || err.message || err || 'Save failed'}`);
        }
    };

    const handleSavePart2 = async () => {
        // example behavior preserved
        try {
            await onSavePart2?.({ ...form, AdjType });
            // Alert.alert('Saved', 'Form saved');
        } catch (err) {
            console.error(err);
             Alert.alert("Error", `${err.response?.data?.message || err.message || err || 'Save failed'}`);
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


    // Animated progress: 0 -> step1, 1 -> step2
    const progressAnim = React.useRef(new Animated.Value(step === 2 ? 1 : 0)).current;

    // drive animated width (we'll read as interpolate later)
    React.useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: step === 2 ? 1 : 0,
            duration: 300,
            useNativeDriver: false, // width animation requires non-native driver
        }).start();
    }, [step, progressAnim]);

    // derive a width value for the progress fill based on container width
    // choose a fixed track width (we use 120 here) so fill animates correctly
    const TRACK_WIDTH = 250;
    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [TRACK_WIDTH * 0.06, TRACK_WIDTH], // small dot to full track
    });

    console.log('form.d1', form.d1);



    return (
        <>
            <View style={styles.stepperContainer}>
                <View style={styles.stepperInner}>
                    {/* progress line background */}
                    <View style={styles.progressTrack} />

                    {/* animated progress fill */}
                    <Animated.View
                        style={[styles.progressFill, { width: progressWidth }]}
                        pointerEvents="none"
                    />

                    {/* Step 1 */}
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => { setStep(1); }}
                        style={[styles.stepWrap, { alignItems: 'flex-end' }]}
                    >
                        <View style={[styles.stepDot, step === 1 ? styles.stepDotActive : step === 2 ? styles.stepDotDone : null]}>
                            {step === 2 ? <Icon name="check" size={12} color="#fff" /> : <Text style={styles.stepNum}>1</Text>}
                        </View>
                        {/* <Text style={[styles.stepLabelSmall, step === 1 && styles.stepLabelActive]}>Part 1</Text> */}
                    </TouchableOpacity>

                    {/* Step 2 */}
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => { setStep(2); }}
                        style={[styles.stepWrap, { alignItems: 'flex-start' }]}
                    >
                        <View style={[styles.stepDot, step === 2 ? styles.stepDotActive : null]}>
                            <Text style={styles.stepNum}>2</Text>
                        </View>
                        {/* <Text style={[styles.stepLabelSmall, step === 2 && styles.stepLabelActive]}>Finish</Text> */}
                    </TouchableOpacity>
                </View>
            </View>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                {/* <View style={styles.modeRow}>
                {step === 1 && (<TouchableOpacity style={[styles.modeBtn, AdjType === 'ACC' && styles.modeBtnActive]} onPress={() => setMode('ACC')}>
                    <Text style={[styles.modeText, AdjType === 'ACC' && styles.modeTextActive]}>On Account</Text>
                </TouchableOpacity>)}

                <TouchableOpacity style={[styles.modeBtn, AdjType === 'ADJ' && styles.modeBtnActive]} onPress={() => setMode('ADJ')}>
                    <Text style={[styles.modeText, AdjType === 'ADJ' && styles.modeTextActive]}>Adjust</Text>
                </TouchableOpacity>
            </View> */}
                {/* --- Stepper (place after ScrollView open) --- */}



                {step === 1 && (
                    <View style={styles.card}>
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
                        {/* Collection Date */}
                        <View style={styles.twoColRow1}>
                            <View style={styles.col1} >
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
                                    // onConfirm={(date) => setForm(prev => ({ ...prev, EDate: toISODate(date) }))}
                                    onConfirm={(date) => {
                                        const selectedDate = new Date(date);
                                        selectedDate.setHours(0, 0, 0, 0);
                                        setForm(prev => ({ ...prev, EDate: toISODate(selectedDate) }));
                                        setCollectionDatePickerVisible(false);
                                        // Force UI update
                                        setTimeout(() => { }, 100); // Small delay to ensure state update
                                    }}

                                    onCancel={() => setCollectionDatePickerVisible(false)}
                                    headerTextIOS="Pick Collection Date"
                                    locale="en_GB"
                                    // maximumDate={new Date(2099, 11, 31)}
                                    // minimumDate={new Date(2000, 0, 1)} // Allow dates from 1st Jan 2000
                                    maximumDate={new Date()} // Only allow today or past dates
                                />
                            </View>

                            <View style={styles.col1} >
                                <Text style={styles.label}>Select Payment Type <Text style={{ color: 'red' }}>*</Text></Text>

                                <PartyDropdown
                                    data={getPaymentData || []}
                                    placeholder="Choose Payment..."
                                    labelKey="paytype"
                                    valueKey="paycode"
                                    pageSize={12}
                                    initialValue={selectedPayment ?? null}
                                    selected={selectedpayment ?? null}
                                    loading={Boolean(getPaymentLoading)}
                                    type="payment"
                                    onSelect={(item) => {
                                        setForm(prev => ({ ...prev, PayType: item.paycode }));
                                        setSelectedPayment?.(item);
                                        setSelectedpayment?.(item);
                                    }}
                                    setSelected={(val) => {
                                        if (!val) setForm(prev => ({ ...prev, PayType: '' }));
                                        else setForm(prev => ({ ...prev, PayType: val.paycode }));
                                    }}
                                />
                            </View>
                        </View>

                        {/* Party - CONDITIONAL RENDERING */}
                        <View style={{ marginBottom: 10 }} >
                            <Text style={styles.label}>
                                {isPLN ? 'Party Name' : 'Select Party'} <Text style={{ color: 'red' }}>*</Text>
                            </Text>

                            {isPLN ? (
                                // Show simple TextInput for PLN
                                <TextInput
                                    style={styles.input}
                                    value={customPartyName}
                                    onChangeText={handleCustomPartyNameChange}
                                    placeholder="Enter party name..."
                                    autoCapitalize="words"
                                />
                            ) : (
                                // Show PartyDropdown for non-PLN
                                <PartyDropdown
                                    data={getPartyData}
                                    placeholder="Choose party..."
                                    labelKey={["accountname", "acccode"]}
                                    valueKey="acccode"
                                    pageSize={12}
                                    initialValue={selectedParty ?? null}
                                    selected={selected ?? null}
                                    loading={Boolean(getPartyLoading)}
                                    type="party"
                                    onSelect={(item) => {
                                        setForm(prev => ({
                                            ...prev,
                                            AccCode: item.acccode,
                                            AccName: item.accountname
                                        }));
                                        setSelectedParty(item);
                                        setSelected?.(item);
                                    }}
                                    setSelected={(val) => {
                                        if (!val) {
                                            setForm(prev => ({
                                                ...prev,
                                                AccCode: '',
                                                AccName: '',
                                                ParAdd: ''
                                            }));
                                            setSelectedParty(null);
                                            setSelected?.(null);
                                        } else {
                                            setForm(prev => ({
                                                ...prev,
                                                AccCode: val.acccode,
                                                AccName: val.accountname,
                                                ParAdd: val.Address
                                            }));
                                            setSelectedParty(val as PartyData);
                                            setSelected?.(val as PartyData);
                                        }
                                    }}
                                />
                            )}
                        </View>

                        {/* Bank + Branch */}
                        <View style={styles.twoColRow}>
                            <View style={styles.col} >
                                <Text style={styles.label}>Bank <Text style={{ color: 'red' }}>*</Text></Text>

                                <PartyDropdownType
                                    data={getBankData || []}
                                    placeholder="Choose Bank..."
                                    labelKey="BankName"
                                    valueKey="BankName"
                                    pageSize={12}
                                    initialValue={selectedBank ?? form.BankName ?? null}
                                    selected={selectedbank ?? form.BankName ?? null}
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
                                <Text style={styles.label}>Branch</Text>

                                <PartyDropdownType
                                    data={getBranchData || []}
                                    placeholder="Choose Branch..."
                                    labelKey="BankBr"
                                    valueKey="BankBr"
                                    pageSize={12}
                                    initialValue={selectedBranch ?? form.BankBr ?? null}
                                    selected={selectedbranch ?? form.BankBr ?? null}
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
                            {/* <View style={styles.col1}>
                                <Text style={styles.label}>Cheque No</Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.ChqNo}
                                    onChangeText={(t) => setForm(prev => ({ ...prev, ChqNo: t }))}
                                    keyboardType="numeric"
                                    placeholder="e.g. 001234"
                                />
                            </View> */}
                            <View style={styles.col1}>
                                <Text style={styles.label}>Cheque No</Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.ChqNo}
                                    onChangeText={(t) => {
                                        // Remove non-numeric characters
                                        const numericValue = t.replace(/[^0-9]/g, '');
                                        // Truncate to 6 digits
                                        const truncatedValue = numericValue.slice(0, 6);
                                        setForm(prev => ({ ...prev, ChqNo: truncatedValue }));
                                    }}
                                    keyboardType="numeric"
                                    placeholder="e.g. 001234"
                                    maxLength={6} // Optional: Prevents keyboard input beyond 6 chars
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

                        {/* Amount */}
                        <Text style={styles.label}>Amount <Text style={{ color: 'red' }}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            value={form.Amount}
                            onChangeText={(t) => setForm(prev => ({ ...prev, Amount: t }))}
                            keyboardType="numeric"
                            placeholder="0.00"
                        />
                        <View style={styles.twoColRow1}>

                            {/* TDS Amount */}
                            <View style={styles.col1}>
                                <Text style={styles.label}>TDS Amount</Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.TDSAmt}
                                    onChangeText={(t) => {
                                        // Remove all non-numeric characters except decimal point
                                        let numericValue = t.replace(/[^0-9.]/g, '');

                                        // Don't allow more than one decimal point
                                        const decimalCount = (numericValue.match(/\./g) || []).length;
                                        if (decimalCount > 1) {
                                            numericValue = numericValue.substring(0, numericValue.lastIndexOf('.'));
                                        }

                                        // Don't allow negative values
                                        if (numericValue.startsWith('-')) {
                                            numericValue = numericValue.substring(1);
                                        }

                                        // Split into integer and decimal parts
                                        const parts = numericValue.split('.');
                                        let integerPart = parts[0] || '';
                                        let decimalPart = parts[1] || '';

                                        // Limit integer part to 12 digits (14 total - 2 decimal)
                                        if (integerPart.length > 12) {
                                            integerPart = integerPart.slice(0, 12);
                                        }

                                        // Limit decimal part to 2 digits
                                        if (decimalPart.length > 2) {
                                            decimalPart = decimalPart.slice(0, 2);
                                        }

                                        // Combine parts
                                        const validatedValue = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;

                                        // Parse the validated value to a number
                                        const tdsValue = parseFloat(validatedValue) || 0;
                                        const amountValue = parseFloat(form.Amount) || 0;

                                        // Check if TDS Amount exceeds Amount or is negative
                                        if (tdsValue > amountValue || tdsValue < 0) {
                                            Alert.alert('Validation', 'TDS Amount cannot exceed Amount or be negative.');
                                            setForm(prev => ({ ...prev, TDSAmt: '0' }));
                                        } else {
                                            setForm(prev => ({ ...prev, TDSAmt: validatedValue }));
                                        }
                                    }}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                    maxLength={16}
                                />
                            </View>

                            {/* Discount Amount */}
                            <View style={styles.col1}>
                                <Text style={styles.label}>Discount Amount</Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.DisAmt}
                                    onChangeText={(t) => {
                                        // Remove all non-numeric characters except decimal point
                                        let numericValue = t.replace(/[^0-9.]/g, '');

                                        // Don't allow more than one decimal point
                                        const decimalCount = (numericValue.match(/\./g) || []).length;
                                        if (decimalCount > 1) {
                                            numericValue = numericValue.substring(0, numericValue.lastIndexOf('.'));
                                        }

                                        // Don't allow negative values
                                        if (numericValue.startsWith('-')) {
                                            numericValue = numericValue.substring(1);
                                        }

                                        // Split into integer and decimal parts
                                        const parts = numericValue.split('.');
                                        let integerPart = parts[0] || '';
                                        let decimalPart = parts[1] || '';

                                        // Limit integer part to 12 digits (14 total - 2 decimal)
                                        if (integerPart.length > 12) {
                                            integerPart = integerPart.slice(0, 12);
                                        }

                                        // Limit decimal part to 2 digits
                                        if (decimalPart.length > 2) {
                                            decimalPart = decimalPart.slice(0, 2);
                                        }

                                        // Combine parts
                                        const validatedValue = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;

                                        // Parse the validated value to a number
                                        const disValue = parseFloat(validatedValue) || 0;
                                        const amountValue = parseFloat(form.Amount) || 0;

                                        // Check if Discount Amount exceeds Amount or is negative
                                        if (disValue > amountValue || disValue < 0) {
                                            Alert.alert('Validation', 'Discount Amount cannot exceed Amount or be negative.');
                                            setForm(prev => ({ ...prev, DisAmt: '0' }));
                                        } else {
                                            setForm(prev => ({ ...prev, DisAmt: validatedValue }));
                                        }
                                    }}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                    maxLength={16}
                                />
                            </View>
                        </View>



                        <DateTimePickerModal
                            isVisible={chequeDatePickerVisible}
                            mode="date"
                            // onConfirm={(date) => setForm(prev => ({ ...prev, ChqDate: toISODate(date) }))}
                            onConfirm={(date) => {
                                const selectedDate = new Date(date);
                                selectedDate.setHours(0, 0, 0, 0);
                                setForm(prev => ({ ...prev, ChqDate: toISODate(selectedDate) }));
                                setChequeDatePickerVisible(false);
                                // Force UI update
                                setTimeout(() => { }, 100); // Small delay to ensure state update
                            }}
                            onCancel={() => setChequeDatePickerVisible(false)}
                            headerTextIOS="Pick Cheque Date"
                            locale="en_GB"
                            maximumDate={new Date(2099, 11, 31)}
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
                                        {/* <TouchableOpacity style={styles.ghostBtn} onPress={() => setCameraModalVisible(true)}>
                                            <Icon name="edit" size={18} color={theme.TEXT_SECONDARY} />
                                            <Text style={styles.ghostText}>Replace</Text>
                                        </TouchableOpacity> */}

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
                            <TouchableOpacity style={[styles.saveBtn, { minWidth: 120 }]} onPress={goNext}>
                                <Text style={styles.saveText}>{AdjType === 'ACC' ? 'Save' : 'Next'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* STEP 2 */}
                {step === 2 && AdjType === 'ADJ' && (
                    <View style={styles.card}>
                        <Text style={styles.label}>Adjust Account</Text>
                        {/* <Text style={styles.label}>{JSON.stringify(getAdjData)}</Text> */}
                        {/* <View style={styles.col1} > */}
                        {/* <Text style={styles.label}>Select Payment Type <Text style={{ color: 'red' }}>*</Text></Text> */}


                        {/* <PartyDropdownAdj
                            data={getAdjData || []}
                            placeholder="Choose Adjustment..."
                            labelKey={["BILLNO", "NVOUDATE", "NETAMT"]}
                            valueKey="UROWID"
                            pageSize={12}
                            initialValue={selectedAdj ?? []}
                            selected={selectedadj ?? []}
                            loading={Boolean(getAdjLoading)}
                            multiple={true}


                            formD2={Array.isArray(form.d2) ? form.d2 : []}


                            onSelect={(itemOrItems) => {
                                // optional: keep selectedAdj state (first item) if you still want it
                                const items = Array.isArray(itemOrItems) ? itemOrItems : (itemOrItems ? [itemOrItems] : []);
                                setSelectedAdj?.(items.length ? items[0] : null);
                                setSelectedadj?.(items.length ? items[0] : null);

                                // map raw items to the shape you store in form.d2 (if necessary)
                                const mapped = items.map((it: any) => ({
                                    BILLNO: it.BILLNO,
                                    NVOUDATE: it.NVOUDATE,
                                    NETAMT: it.NETAMT,
                                    UROWID: it.UROWID,
                                    BILLFROM: it.BILLFROM,
                                    TTYPE: it.TTYPE,
                                    PARCODE: it.PARCODE,
                                    ACCNAME: it.ACCNAME,
                                    VOUNO: it.VOUNO,
                                    NBILLDATE: it.NBILLDATE,
                                    BILLQTY: it.BILLQTY,
                                    BALAMT: it.BALAMT,
                                    BALAMT1: it.BALAMT1,
                                    ZUID: it.ZUID,
                                    ZSRNO: it.ZSRNO,
                                    CONTRANAME: it.CONTRANAME,
                                    DueDay: it.DueDay,
                                    NVOUDATE1: it.NVOUDATE1,
                                    ORDERNO: it.ORDERNO,
                                }));
                                // write into form.d2 so the component (and rest of form) uses the latest
                                setForm(prev => ({ ...prev, d2: mapped }));
                            }}


                            onUpdateD2={(d2) => {
                                // ensure normalised array exists
                                const normalized = Array.isArray(d2) ? d2 : [];
                                setForm(prev => ({ ...prev, d2: normalized }));

                                // keep single-selected states in sync (optional)
                                setSelectedAdj?.(normalized.length ? normalized[0] : null);
                                setSelectedadj?.(normalized.length ? normalized[0] : null);
                            }}


                            setSelected={(val) => {
                                if (!val) {
                                    setForm(prev => ({ ...prev, d2: [] }));
                                } else {
                                    const items = Array.isArray(val) ? val : [val];
                                    const mapped = items.map((it: any) => ({
                                        BILLNO: it.BILLNO,
                                        NVOUDATE: it.NVOUDATE,
                                        NETAMT: it.NETAMT,
                                        UROWID: it.UROWID,
                                        BILLFROM: it.BILLFROM,
                                        TTYPE: it.TTYPE,
                                        PARCODE: it.PARCODE,
                                        ACCNAME: it.ACCNAME,
                                        VOUNO: it.VOUNO,
                                        NBILLDATE: it.NBILLDATE,
                                        BILLQTY: it.BILLQTY,
                                        BALAMT: it.BALAMT,
                                        BALAMT1: it.BALAMT1,
                                        ZUID: it.ZUID,
                                        ZSRNO: it.ZSRNO,
                                        CONTRANAME: it.CONTRANAME,
                                        DueDay: it.DueDay,
                                        NVOUDATE1: it.NVOUDATE1,
                                        ORDERNO: it.ORDERNO,
                                    }));
                                    setForm(prev => ({ ...prev, d2: mapped }));
                                }
                            }}
                        /> */}

                        <PartyDropdownAdj
                            ref={dropdownAdjRef}
                            data={getAdjData || []}
                            placeholder="Choose Adjustment..."
                            labelKey={["BILLNO", "NVOUDATE", "NETAMT"]}
                            valueKey="UROWID"
                            pageSize={12}
                            initialValue={selectedAdj ?? []}
                            selected={selectedadj ?? []}
                            loading={Boolean(getAdjLoading)}
                            multiple={true}
                            formD1={Array.isArray(form.d1) ? form.d1 : []} // Only pass formD1, NOT formD2
                            formUId={form.UId ?? null}
                            onUpdateD1={(d1) => setForm(prev => ({ ...prev, d1: d1 || [] }))}
                            onSelect={(items) => {
                                const mappedItems = Array.isArray(items) ? items : [items];
                                setForm(prev => ({ ...prev, d2: mappedItems }));
                            }}
                        />




                        {/* </View> */}
                        {/* <TextInput style={styles.input} value={''} onChangeText={() => { }} placeholder="Account name / code" /> */}

                        {/* <Text style={styles.label}>Reason</Text> */}
                        {/* <TextInput style={[styles.input, { minHeight: 100 }]} value={''} onChangeText={() => { }} multiline /> */}

                        <View style={styles.navRow}>
                            <TouchableOpacity style={styles.ghostBtn} onPress={goPrev}>
                                <Icon name="arrow-back" size={18} color={theme.TEXT_SECONDARY} />
                                <Text style={styles.ghostText}>Previous</Text>
                            </TouchableOpacity>

                            <View style={{ flex: 1 }} />

                            <TouchableOpacity style={styles.saveBtn} onPress={goNext}>
                                <Text style={styles.saveText}>{getSaveLoading ? 'Saving...' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* CAMERA MODAL */}
                <Modal visible={isCameraModalVisible} animationType="slide" onRequestClose={() => setCameraModalVisible(false)}>
                    <CameraPage
                        onCapture={(dataUrl) => {
                            handleCameraCapture(dataUrl);
                        }}
                        onClose={() => setCameraModalVisible(false)}
                        isConnected={true} // Pass your connection status here
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
                                // maximumDate={new Date(2099, 11, 31)}
                                minimumDate={new Date(2000, 0, 1)} // Allow dates from 1st Jan 2000
                                maximumDate={new Date()} // Only allow today or past dates
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

        </>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16, paddingBottom: 48, marginTop: 0 },
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
    /* Stepper / progress small right aligned */
    /* Stepper / progress full-width inside its area */
    stepperContainer: {
        height: 50,
        width: '100%',
        paddingVertical: 6,
        backgroundColor: 'F6F7FA',
        // keep stepper inside normal layout flow
    },
    stepperInner: {
        width: '100%',               // full width now
        alignSelf: 'stretch',
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        paddingHorizontal: 16,       // left/right padding for spacing
    },
    progressTrack: {
        position: 'absolute',
        left: 56,                    // leave space for left dot
        right: 56,                   // leave space for right dot
        height: 4,
        borderRadius: 3,
        backgroundColor: theme.BORDER || '#e6eef4',
        top: 22,
        zIndex: 0,
        overflow: 'hidden',
    },
    progressFill: {
        position: 'absolute',
        left: 56,                    // match track insets
        right: 56,                   // match track insets
        height: 4,
        borderRadius: 3,
        backgroundColor: theme.BRAND_ACCENT,
        top: 22,
        zIndex: 1,
        // width is controlled by scaleX transform above
    },
    stepWrap: {
        width: 56,                   // slightly smaller to match new insets
        alignItems: 'center',
        zIndex: 2,
    },
    stepDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: theme.BORDER || '#d8e8f2',
        backgroundColor: theme.SURFACE,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: theme.SHADOW,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
    },
    stepDotActive: {
        backgroundColor: theme.BRAND_ACCENT,
        borderColor: theme.BRAND_ACCENT,
    },
    stepDotDone: {
        backgroundColor: theme.BRAND_PRIMARY || theme.BRAND_ACCENT,
        borderColor: theme.BRAND_PRIMARY || theme.BRAND_ACCENT,
    },
    stepNum: {
        fontSize: 12,
        fontWeight: '900',
        color: theme.TEXT_SECONDARY,
    },
    stepLabelSmall: {
        marginTop: 6,
        fontSize: 11,
        fontWeight: '700',
        color: theme.TEXT_SECONDARY,
    },
    stepLabelActive: {
        color: theme.BRAND_DARK,
        fontWeight: '900',
    },
});

export default ChequeForm;
