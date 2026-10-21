import AppAlert from '@/common/utils/appAlert';
// ChequeForm.tsx (NEW ERP re-skin — all state, effects, validation and save
// handlers above `return` are the original code, unchanged; only the JSX and
// styles below were rebuilt with the NEW ERP theme / erpUi kit)
import Icon from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
// import { launchImageLibrary } from 'react-native-image-picker';
import { Btn, Card, CONTENT_MAX, Field, Metric, SectionHead, useSotLayout } from '@/src/components/erpUi';
import { S, T } from '@/src/theme';
import * as ImagePicker from 'expo-image-picker';
// import CameraPage from './CameraPage'; // modal camera component
// Local NEW ERP copies of the shared pickers (the @/Shared originals are used by legacy screens)
import PartyDropdown from './PartyDropdown';
import PartyDropdownAdj from './PartyDropdownAdj';
import PartyDropdownType from './PartyDropdownType';
import SearchableDropdown from './SearchableDropdown';
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
    // NEW UI (presentation only)
    onBack?: () => void;
    mode?: 'add' | 'edit';
    // ShowChequeData: (form: any) => Promise<any>;
}

const formatDisplayDate = (d?: Date | string | null) => {
    if (!d) return '';
    let date: Date;
    // If it's already "YYYY-MM-DD", parse as LOCAL noon (no tz shift)
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split('-').map(Number);
        date = new Date(y, (m || 1) - 1, day || 1, 12, 0, 0, 0);
    } else {
        date = typeof d === 'string' ? new Date(d) : d;
    }
    if (isNaN(date.getTime())) return '';
    try {
        return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
    } catch {
        const dd = date.getDate().toString().padStart(2, '0');
        const mm = (date.getMonth() + 1).toString().padStart(2, '0');
        const yy = date.getFullYear();
        return `${dd}-${mm}-${yy}`;
    }
};

// Date → "YYYY-MM-DD" (accepts Date or existing ISO string)
const toISODate = (d?: Date | string | null) => {
    if (!d) return '';
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// "YYYY-MM-DD" → Date at LOCAL NOON (never shifts a day)
const fromISODate = (s: string) => {
    if (!s) return new Date();
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
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
    getSaveLoading,
    // NEW UI (presentation only)
    onBack,
    mode = 'add',

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
    //     if (!isConnected) return AppAlert.alert('Offline', 'You are offline.');
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
        // if (!isConnected) return AppAlert.alert('Offline', 'You are offline.');

        try {
            // Request media library permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                AppAlert.alert('Permission Required', 'Please allow access to the gallery to select an image.');
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
            AppAlert.alert('Error', 'Failed to pick image.');
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
                AppAlert.alert('Validation', 'Please select Payment Type.');
                return;
            }
            if ((!accCode || String(accCode).trim() === '') && !isPLN) {
                AppAlert.alert('Validation', 'Please select Party.');
                return;
            }
            if ((!accName || String(accName).trim() === '') && isPLN) {
                AppAlert.alert('Validation', 'Please Enter Party.');
                return;
            }

            if (!amountRaw || numericAmount <= 0) {
                AppAlert.alert('Validation', 'Please enter a valid Amount greater than 0.');
                return;
            }

            if (!bankName || String(bankName).trim() === '') {
                console.log('Payment::', form.PayType);
                if (form.PayType == 'NEFT' || form.PayType == 'RTGS') {
                    // AppAlert.alert('Validation', 'Please select Bank.');
                    // return;
                } else {
                    AppAlert.alert('Validation', 'Please select Bank.');
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
            // AppAlert.alert("Saved", "Part 1 saved");
        } catch (err) {
            AppAlert.alert("Error", `${err.response?.data?.message || err.message || err || 'Save failed'}`);
        }
    };

    const handleSavePart2 = async () => {
        // example behavior preserved
        try {
            await onSavePart2?.({ ...form, AdjType });
            // AppAlert.alert('Saved', 'Form saved');
        } catch (err) {
            console.error(err);
            AppAlert.alert("Error", `${err.response?.data?.message || err.message || err || 'Save failed'}`);
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
            AppAlert.alert('Validation', 'Please select a Property.');
            return;
        }
        if (!form.EDate) {
            AppAlert.alert('Validation', 'Please select collection date.');
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
            AppAlert.alert('Error', 'Could not fetch cheque data.');
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




    // ---------------------------------------------------------------
    // NEW ERP presentation helpers (display only — no business logic)
    // ---------------------------------------------------------------
    const { isPhone, width: winW, gutter } = useSotLayout();
    const twoCol = winW >= 900;
    const half = isPhone ? styles.fieldFull : styles.fieldHalf;
    const isEdit = mode === 'edit';

    // start each step at the top of the form (presentation only)
    const scrollRef = React.useRef<any>(null);
    useEffect(() => {
        try { scrollRef.current?.scrollTo?.({ x: 0, y: 0, animated: false }); } catch { }
    }, [step]);

    const num = (v: any) => {
        const n = parseFloat(String(v ?? '').replace(/,/g, ''));
        return Number.isFinite(n) ? n : 0;
    };
    const inr = (n: number, dp = 2) =>
        `₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;

    // same sum the save validation uses (form.d1 SetAmt vs form.Amount)
    const d1List: any[] = Array.isArray(form.d1) ? form.d1 : [];
    const adjustedSum = d1List.reduce((sum, item) => sum + (parseFloat(item?.SetAmt) || 0), 0);
    const chequeAmt = parseFloat(form.Amount) || 0;
    const unadjusted = chequeAmt - adjustedSum;
    const overAdjusted = adjustedSum > chequeAmt;

    const payLabel = String(selectedpayment?.paytype ?? selectedPayment?.paytype ?? form.PayType ?? '');
    const propLabel = String(selectedProperty?.LngName ?? form.PrpCode ?? '');
    const partyLabel = String(form.AccName ?? '');
    const bankOptional = form.PayType == 'NEFT' || form.PayType == 'RTGS';

    const label = (text: string, required?: boolean) => (
        <Text style={styles.label}>
            {text}
            {required ? <Text style={{ color: T.red }}> *</Text> : null}
        </Text>
    );

    const webDate = (value: string, onPick: (v: string) => void, ariaLabel: string, max?: string, min?: string) => (
        <View style={styles.dateBox}>
            <Icon name="event" size={17} color={T.copper} />
            {React.createElement('input', {
                type: 'date',
                value,
                ...(max ? { max } : {}),
                ...(min ? { min } : {}),
                'aria-label': ariaLabel,
                onChange: (e: any) => {
                    const v = e.target.value; // "YYYY-MM-DD"
                    if (v) {
                        // Same rule as the native picker (maximumDate / minimumDate): typed dates outside the range are rejected
                        if (max && v > max) {
                            AppAlert.alert('Validation', 'Only today or past dates are allowed.');
                            return;
                        }
                        if (min && v < min) {
                            AppAlert.alert('Validation', 'Please select a valid date.');
                            return;
                        }
                        onPick(v);
                    }
                },
                style: {
                    flex: 1,
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: T.ink,
                    fontSize: 14,
                    fontWeight: 700,
                    padding: 0,
                    minWidth: 0,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                } as any,
            })}
        </View>
    );

    const nativeDate = (value: string, placeholder: string, onPress: () => void) => (
        <TouchableOpacity
            activeOpacity={0.85}
            style={styles.dateBox}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${placeholder}: ${value ? formatDisplayDate(value) : 'not set'}`}
        >
            <Icon name="event" size={17} color={T.copper} />
            <Text style={[styles.dateText, !value && styles.placeholderText]} numberOfLines={1}>
                {value ? formatDisplayDate(value) : placeholder}
            </Text>
            <Icon name="expand-more" size={20} color={T.muted} />
        </TouchableOpacity>
    );

    const moneyBox = (props: any, big?: boolean) => (
        <View style={[styles.moneyBox, big && styles.moneyBoxBig]}>
            <Text style={[styles.rupee, big && { fontSize: 17 }]}>₹</Text>
            <TextInput
                placeholderTextColor={T.muted}
                style={[styles.moneyInput, big && styles.moneyInputBig]}
                {...props}
            />
        </View>
    );

    const recapRow = (k: string, v: any, color?: string) => (
        <View style={styles.recapRow} key={k}>
            <Text style={styles.recapKey}>{k}</Text>
            <Text style={[styles.recapVal, color ? { color } : null]} numberOfLines={2}>
                {v !== undefined && v !== null && String(v).trim() !== '' ? String(v) : '—'}
            </Text>
        </View>
    );

    const stepPill = (n: 1 | 2, text: string) => {
        const active = step === n;
        const done = n === 1 && step === 2;
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => { setStep(n); }}
                style={[styles.stepPill, active && styles.stepPillOn, isPhone && !active && styles.stepPillDot]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Step ${n}: ${text}`}
            >
                <View style={[styles.stepDot, active && styles.stepDotActive, done && styles.stepDotDone]}>
                    {done ? <Icon name="check" size={12} color="#fff" /> : <Text style={[styles.stepNum, (active || done) && { color: '#fff' }]}>{n}</Text>}
                </View>
                {!isPhone || active ? (
                    <Text style={[styles.stepText, active && styles.stepTextOn]} numberOfLines={1}>{text}</Text>
                ) : null}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.screen}>
            {/* ---------- Title + stepper ---------- */}
            <View style={styles.topBar}>
                <View style={[styles.topInner, { paddingHorizontal: gutter }]}>
                    {onBack ? (
                        <TouchableOpacity
                            onPress={onBack}
                            style={styles.backBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Back"
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                            <Icon name="arrow-back" size={18} color={T.nav} />
                        </TouchableOpacity>
                    ) : null}
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.eyebrow} numberOfLines={1}>{isEdit ? 'EDIT COLLECTION' : 'ADD COLLECTION'}</Text>
                        <Text style={styles.topTitle} numberOfLines={1}>{isEdit ? 'Edit cheque entry' : 'Cheque entry'}</Text>
                    </View>
                    <View style={styles.stepRow}>
                        {stepPill(1, isPhone ? 'Details' : 'Payment details')}
                        <View style={styles.stepLine} />
                        {stepPill(2, isPhone ? 'Adjust' : 'Adjust bills')}
                    </View>
                </View>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: step === 2 ? '100%' : '50%' }]} />
                </View>
            </View>

            <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={[styles.container, { paddingHorizontal: gutter }]}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.inner}>
                    {step === 1 && (
                        <View style={twoCol ? styles.cols : styles.stack}>
                            <View style={twoCol ? styles.colMain : styles.stack}>
                                {/* ---- Party & date ---- */}
                                <Card style={styles.block}>
                                    <SectionHead title="Party & date" meta="Where and when the payment was collected" />
                                    <View style={styles.formGrid}>
                                        {/* Property */}
                                        <View style={[styles.fieldFull, styles.field]}>
                                            {label('Select Property', true)}
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
                                                icon="business"
                                                title="Select property"
                                            />
                                        </View>

                                        {/* Collection Date */}
                                        <View style={[half, styles.field]}>
                                            {label('Collection Date')}
                                            {Platform.OS === 'web' ? (
                                                webDate(
                                                    toISODate(form.EDate),
                                                    (v) => setForm(prev => ({ ...prev, EDate: v })),
                                                    'Collection date',
                                                    toISODate(new Date()),
                                                )
                                            ) : (
                                                <>
                                                    {nativeDate(form.EDate, 'Select collection date', () => setCollectionDatePickerVisible(true))}
                                                    <DateTimePickerModal
                                                        isVisible={collectionDatePickerVisible}
                                                        mode="date"
                                                        onConfirm={(date) => {
                                                            const selectedDate = new Date(date);
                                                            selectedDate.setHours(12, 0, 0, 0); // 👈 noon prevents tz shift
                                                            setForm(prev => ({ ...prev, EDate: toISODate(selectedDate) }));
                                                            setCollectionDatePickerVisible(false);
                                                        }}
                                                        onCancel={() => setCollectionDatePickerVisible(false)}
                                                        headerTextIOS="Pick Collection Date"
                                                        locale="en_GB"
                                                        maximumDate={new Date()}
                                                    />
                                                </>
                                            )}
                                        </View>

                                        {/* Payment Type */}
                                        <View style={[half, styles.field]}>
                                            {label('Payment Type', true)}
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

                                        {/* Party - CONDITIONAL RENDERING */}
                                        <View style={[styles.fieldFull, styles.field]}>
                                            {label(isPLN ? 'Party Name' : 'Select Party', true)}
                                            {isPLN ? (
                                                // Show simple TextInput for PLN
                                                <Field
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
                                    </View>
                                </Card>

                                {/* ---- Bank & cheque ---- */}
                                <Card style={styles.block}>
                                    <SectionHead
                                        title="Bank & cheque"
                                        meta={bankOptional ? 'Bank is optional for NEFT / RTGS' : 'Bank is required for cheque payments'}
                                    />
                                    <View style={styles.formGrid}>
                                        <View style={[half, styles.field]}>
                                            {label('Bank', true)}
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

                                        <View style={[half, styles.field]}>
                                            {label('Branch')}
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

                                        {/* Cheque No */}
                                        <Field
                                            style={half}
                                            label="Cheque No"
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
                                            hint="Up to 6 digits"
                                        />

                                        {/* Cheque Date */}
                                        <View style={[half, styles.field]}>
                                            {label('Cheque Date')}
                                            {Platform.OS === 'web' ? (
                                                webDate(
                                                    toISODate(form.ChqDate),
                                                    (v) => setForm(prev => ({ ...prev, ChqDate: v })),
                                                    'Cheque date',
                                                )
                                            ) : (
                                                nativeDate(form.ChqDate, 'Select cheque date', () => setChequeDatePickerVisible(true))
                                            )}
                                        </View>
                                    </View>

                                    {Platform.OS !== 'web' && (
                                        <DateTimePickerModal
                                            isVisible={chequeDatePickerVisible}
                                            mode="date"
                                            onConfirm={(date) => {
                                                const selectedDate = new Date(date);
                                                selectedDate.setHours(12, 0, 0, 0); // 👈 noon prevents tz shift
                                                setForm(prev => ({ ...prev, ChqDate: toISODate(selectedDate) }));
                                                setChequeDatePickerVisible(false);
                                            }}
                                            onCancel={() => setChequeDatePickerVisible(false)}
                                            headerTextIOS="Pick Cheque Date"
                                            locale="en_GB"
                                            maximumDate={new Date(2099, 11, 31)}
                                        />
                                    )}
                                </Card>
                            </View>

                            <View style={twoCol ? styles.colSide : styles.stack}>
                                {/* ---- Amount ---- */}
                                <Card style={styles.block}>
                                    <SectionHead title="Amount" meta="TDS and discount cannot exceed the amount" />
                                    <View style={styles.field}>
                                        {label('Amount', true)}
                                        {moneyBox({
                                            value: form.Amount,
                                            onChangeText: (t) => setForm(prev => ({ ...prev, Amount: t })),
                                            keyboardType: 'numeric',
                                            placeholder: '0.00',
                                            accessibilityLabel: 'Amount',
                                        }, true)}
                                    </View>
                                    <View style={styles.formGrid}>
                                        {/* TDS Amount */}
                                        <View style={[styles.fieldHalfTight, styles.field]}>
                                            {label('TDS Amount')}
                                            {moneyBox({
                                                value: form.TDSAmt,
                                                onChangeText: (t) => {
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
                                                        AppAlert.alert('Validation', 'TDS Amount cannot exceed Amount or be negative.');
                                                        setForm(prev => ({ ...prev, TDSAmt: '0' }));
                                                    } else {
                                                        setForm(prev => ({ ...prev, TDSAmt: validatedValue }));
                                                    }
                                                },
                                                keyboardType: 'numeric',
                                                placeholder: '0.00',
                                                maxLength: 16,
                                                accessibilityLabel: 'TDS Amount',
                                            })}
                                        </View>

                                        {/* Discount Amount */}
                                        <View style={[styles.fieldHalfTight, styles.field]}>
                                            {label('Discount Amount')}
                                            {moneyBox({
                                                value: form.DisAmt,
                                                onChangeText: (t) => {
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
                                                        AppAlert.alert('Validation', 'Discount Amount cannot exceed Amount or be negative.');
                                                        setForm(prev => ({ ...prev, DisAmt: '0' }));
                                                    } else {
                                                        setForm(prev => ({ ...prev, DisAmt: validatedValue }));
                                                    }
                                                },
                                                keyboardType: 'numeric',
                                                placeholder: '0.00',
                                                maxLength: 16,
                                                accessibilityLabel: 'Discount Amount',
                                            })}
                                        </View>
                                    </View>

                                    {/* readable totals */}
                                    <View style={styles.totals}>
                                        <View style={styles.totalRow}>
                                            <Text style={styles.totalKey}>Cheque amount</Text>
                                            <Text style={styles.totalBig} numberOfLines={1}>{inr(chequeAmt)}</Text>
                                        </View>
                                        <View style={styles.totalRow}>
                                            <Text style={styles.totalKey}>TDS</Text>
                                            <Text style={styles.totalVal} numberOfLines={1}>{inr(num(form.TDSAmt))}</Text>
                                        </View>
                                        <View style={styles.totalRow}>
                                            <Text style={styles.totalKey}>Discount</Text>
                                            <Text style={styles.totalVal} numberOfLines={1}>{inr(num(form.DisAmt))}</Text>
                                        </View>
                                    </View>
                                </Card>

                                {/* ---- Remarks & attachment ---- */}
                                <Card style={styles.block}>
                                    <SectionHead title="Remarks & attachment" />
                                    {/* Notes */}
                                    <Field
                                        label="Notes"
                                        value={form.Remark}
                                        onChangeText={(t) => setForm(prev => ({ ...prev, Remark: t }))}
                                        multiline
                                        placeholder="Optional notes"
                                    />

                                    {/* Attachment */}
                                    <View style={styles.field}>
                                        {label('Attachment (single image)')}
                                        {form.AttachImage ? (
                                            <View style={styles.attachRow}>
                                                <TouchableOpacity
                                                    onPress={() => setPreviewVisible(true)}
                                                    accessibilityRole="button"
                                                    accessibilityLabel="Preview attachment"
                                                >
                                                    <Image
                                                        source={{ uri: form.AttachImage }}
                                                        style={styles.preview}
                                                    />
                                                </TouchableOpacity>

                                                <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
                                                    <View>
                                                        <Text style={styles.attachTitle}>Image attached</Text>
                                                        <Text style={styles.attachHint}>Tap the thumbnail to preview</Text>
                                                    </View>
                                                    <Btn
                                                        kind="ghost"
                                                        compact
                                                        icon="delete-outline"
                                                        label="Remove"
                                                        onPress={removeAttachment}
                                                        style={{ alignSelf: 'flex-start' }}
                                                    />
                                                </View>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.dropZone}
                                                onPress={pickFromGallery}
                                                activeOpacity={0.85}
                                                accessibilityRole="button"
                                                accessibilityLabel="Gallery"
                                            >
                                                <View style={styles.dropIcon}>
                                                    <Icon name="photo-library" size={20} color={T.copper} />
                                                </View>
                                                <View style={{ flex: 1, minWidth: 0 }}>
                                                    <Text style={styles.dropTitle}>Choose from gallery</Text>
                                                    <Text style={styles.attachHint}>Attach a photo of the cheque (optional)</Text>
                                                </View>
                                                <Icon name="chevron-right" size={20} color={T.muted} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </Card>
                            </View>
                        </View>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && AdjType === 'ADJ' && (
                        <View style={twoCol ? styles.cols : styles.stack}>
                            <View style={twoCol ? styles.colMain : styles.stack}>
                                <Card style={styles.block}>
                                    <SectionHead
                                        title="Adjust Account"
                                        meta="Pick bills, then enter the amount received"
                                    />

                                    <View style={styles.adjSummary}>
                                        <Metric label={isPhone ? 'Amount' : 'Cheque amount'} value={inr(chequeAmt, 0)} />
                                        <Metric label="Adjusted" value={inr(adjustedSum, 0)} color={T.green} />
                                        <Metric
                                            label={overAdjusted ? 'Over by' : 'Unadjusted'}
                                            value={inr(Math.abs(unadjusted), 0)}
                                            color={overAdjusted ? T.red : T.pd}
                                            align="right"
                                        />
                                    </View>
                                    {overAdjusted ? (
                                        <View style={styles.warn}>
                                            <Icon name="error-outline" size={16} color={T.red} />
                                            <Text style={styles.warnText}>
                                                Adjusted total is more than the cheque amount — reduce the received amounts before saving.
                                            </Text>
                                        </View>
                                    ) : null}

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
                                </Card>
                            </View>

                            <View style={twoCol ? styles.colSide : styles.stack}>
                                <Card style={styles.block}>
                                    <SectionHead title="Collection summary" meta="From step 1 — go back to change" />
                                    <View style={styles.recap}>
                                        {recapRow('Property', propLabel)}
                                        {recapRow('Collection date', formatDisplayDate(form.EDate))}
                                        {recapRow('Party', partyLabel)}
                                        {recapRow('Payment type', payLabel)}
                                        {recapRow('Bank', form.BankName)}
                                        {recapRow('Branch', form.BankBr)}
                                        {recapRow('Cheque no', form.ChqNo)}
                                        {recapRow('Cheque date', formatDisplayDate(form.ChqDate))}
                                        {recapRow('TDS', inr(num(form.TDSAmt)))}
                                        {recapRow('Discount', inr(num(form.DisAmt)))}
                                        {recapRow('Notes', form.Remark)}
                                    </View>
                                    <View style={styles.recapTotal}>
                                        <Text style={styles.totalKey}>Cheque amount</Text>
                                        <Text style={styles.totalBig} numberOfLines={1}>{inr(chequeAmt)}</Text>
                                    </View>
                                </Card>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* ---------- Sticky action bar ---------- */}
            {(step === 1 || (step === 2 && AdjType === 'ADJ')) ? (
                <View style={styles.saveBar}>
                    <View style={[styles.saveInner, { paddingHorizontal: gutter }]}>
                        {step === 2 ? (
                            <Btn
                                kind="ghost"
                                icon="arrow-back"
                                label={isPhone ? '' : 'Previous'}
                                onPress={goPrev}
                                style={isPhone ? { width: 48, paddingHorizontal: 0 } : undefined}
                            />
                        ) : null}
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.saveTitle} numberOfLines={1}>
                                {partyLabel || 'No party selected'}
                            </Text>
                            <Text style={styles.saveMeta} numberOfLines={1}>
                                {step === 1
                                    ? `${inr(chequeAmt)}${payLabel ? ` · ${payLabel}` : ''}`
                                    : isPhone
                                        ? `${inr(adjustedSum, 0)} adjusted`
                                        : `${inr(adjustedSum, 0)} of ${inr(chequeAmt, 0)} adjusted`}
                            </Text>
                        </View>
                        {step === 1 ? (
                            <Btn
                                label={AdjType === 'ACC' ? 'Save' : 'Next'}
                                icon={AdjType === 'ACC' ? 'check' : 'arrow-forward'}
                                onPress={goNext}
                                style={isPhone ? { minWidth: 120 } : { minWidth: 200 }}
                            />
                        ) : (
                            <Btn
                                label={getSaveLoading ? 'Saving...' : 'Save'}
                                icon="save"
                                onPress={goNext}
                                style={isPhone ? { minWidth: 120 } : { minWidth: 200 }}
                            />
                        )}
                    </View>
                </View>
            ) : null}

            {/* CAMERA MODAL (disabled in the original as well) */}

            {/* PREVIEW MODAL */}
            <Modal
                visible={isPreviewVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPreviewVisible(false)}
            >
                <View style={styles.fullscreenOverlay}>
                    <TouchableOpacity
                        style={styles.closePreviewBtn}
                        onPress={() => setPreviewVisible(false)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Close preview"
                    >
                        <Icon name="close" size={24} color="#fff" />
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
                        <Text style={styles.eyebrow}>START A COLLECTION</Text>
                        <Text style={styles.initialTitle}>Choose date & property</Text>

                        <View style={[styles.field, { marginTop: 14 }]}>
                            {label('Collection Date')}
                            {Platform.OS === 'web' ? (
                                webDate(
                                    toISODate(form.EDate),
                                    (v) => setForm(prev => ({ ...prev, EDate: v })),
                                    'Collection date',
                                    toISODate(new Date()),
                                    '2000-01-01',
                                )
                            ) : (
                                <>
                                    {nativeDate(form.EDate, 'Select collection date', () => setCollectionDatePickerVisible(true))}
                                    <DateTimePickerModal
                                        isVisible={collectionDatePickerVisible}
                                        mode="date"
                                        onConfirm={(date) => {
                                            const selectedDate = new Date(date);
                                            selectedDate.setHours(12, 0, 0, 0); // 👈 noon
                                            setForm(prev => ({ ...prev, EDate: toISODate(selectedDate) }));
                                            setCollectionDatePickerVisible(false);
                                        }}
                                        onCancel={() => setCollectionDatePickerVisible(false)}
                                        headerTextIOS="Pick Collection Date"
                                        locale="en_GB"
                                        minimumDate={new Date(2000, 0, 1)}
                                        maximumDate={new Date()}
                                    />
                                </>
                            )}
                        </View>

                        <View style={[styles.field, { marginTop: 12 }]}>
                            {label('Select Property', true)}
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
                                icon="business"
                                title="Select property"
                            />
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 }}>
                            <Btn
                                label="OK"
                                icon="check"
                                onPress={handleInitialOk}
                                disabled={!form.PrpCode || !form.EDate}
                                loading={initialLoading}
                                style={{ minWidth: 140 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
            {/* ---------- END INITIAL BLOCKING MODAL ---------- */}
        </View>
    );
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: T.bg },

    // title + stepper bar
    topBar: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
    topInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.alt,
    },
    eyebrow: { fontSize: 10, fontWeight: '800', color: T.copper, letterSpacing: 1.2 },
    topTitle: { fontSize: 16, fontWeight: '900', color: T.nav, marginTop: 1 },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    stepLine: { width: 10, height: 2, borderRadius: 1, backgroundColor: T.border },
    stepPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 36,
        paddingLeft: 4,
        paddingRight: 10,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.surface,
    },
    stepPillDot: { paddingRight: 4 },
    stepPillOn: { borderColor: `${T.nav}55`, backgroundColor: `${T.nav}0A` },
    stepDot: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: T.alt,
    },
    stepDotActive: { backgroundColor: T.nav },
    stepDotDone: { backgroundColor: T.green },
    stepNum: { fontSize: 12, fontWeight: '900', color: T.muted },
    stepText: { fontSize: 12, fontWeight: '700', color: T.muted },
    stepTextOn: { color: T.nav, fontWeight: '800' },
    progressTrack: { height: 3, backgroundColor: T.hair },
    progressFill: { height: 3, backgroundColor: T.copper },

    // content
    container: { paddingTop: 14, paddingBottom: 28 },
    inner: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
    cols: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    colMain: { flex: 6, minWidth: 0, gap: 14 },
    colSide: { flex: 5, minWidth: 0, gap: 14 },
    stack: { gap: 12 },
    block: { gap: 12 },

    // form grid
    formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    field: { gap: 6 },
    fieldFull: { width: '100%' },
    fieldHalf: { flexGrow: 1, flexBasis: '40%', minWidth: 220 },
    fieldHalfTight: { flexGrow: 1, flexBasis: '40%', minWidth: 140 },
    label: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.5, textTransform: 'uppercase' },

    dateBox: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.surface,
    },
    dateText: { flex: 1, fontSize: 14, fontWeight: '700', color: T.ink },
    placeholderText: { color: T.muted, fontWeight: '600' },

    moneyBox: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.border,
        backgroundColor: T.surface,
    },
    moneyBoxBig: { height: 52, borderColor: `${T.nav}55` },
    rupee: { fontSize: 14, fontWeight: '800', color: T.copper },
    moneyInput: {
        flex: 1,
        minWidth: 0,
        paddingVertical: 0,
        fontSize: 14,
        fontWeight: '700',
        color: T.ink,
        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null),
    },
    moneyInputBig: { fontSize: 20, fontWeight: '900', color: T.nav },

    totals: {
        backgroundColor: `${T.copper}12`,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: `${T.copper}30`,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, gap: 10 },
    totalKey: { fontSize: 12, fontWeight: '700', color: T.muted },
    totalVal: { fontSize: 13.5, fontWeight: '800', color: T.ink },
    totalBig: { fontSize: 17, fontWeight: '900', color: T.nav },

    // attachment
    attachRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    preview: { width: 88, height: 88, borderRadius: 10, borderWidth: 1, borderColor: T.border, resizeMode: 'cover' },
    attachTitle: { fontSize: 13.5, fontWeight: '800', color: T.ink },
    attachHint: { fontSize: 11.5, fontWeight: '600', color: T.muted, marginTop: 1 },
    dropZone: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 60,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: `${T.copper}66`,
        backgroundColor: `${T.copper}08`,
    },
    dropIcon: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${T.copper}16`,
    },
    dropTitle: { fontSize: 13.5, fontWeight: '800', color: T.nav },

    // step 2
    adjSummary: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: T.sub,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.hair,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    warn: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        padding: 10,
        borderRadius: 10,
        backgroundColor: `${T.red}0D`,
        borderWidth: 1,
        borderColor: `${T.red}33`,
    },
    warnText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '700', color: T.red },
    recap: { borderRadius: 10, borderWidth: 1, borderColor: T.hair, overflow: 'hidden' },
    recapRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: T.hair,
    },
    recapKey: { fontSize: 11, fontWeight: '800', color: T.muted, letterSpacing: 0.3, textTransform: 'uppercase', paddingTop: 1 },
    recapVal: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '700', color: T.ink, textAlign: 'right' },
    recapTotal: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: `${T.copper}12`,
        borderWidth: 1,
        borderColor: `${T.copper}30`,
    },

    // sticky save bar
    saveBar: { backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
    saveInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        width: '100%',
        maxWidth: CONTENT_MAX,
        alignSelf: 'center',
    },
    saveTitle: { fontSize: 13.5, fontWeight: '800', color: T.ink },
    saveMeta: { fontSize: 11.5, fontWeight: '700', color: T.muted, marginTop: 1 },

    // preview modal
    fullscreenOverlay: {
        flex: 1,
        backgroundColor: 'rgba(13,27,42,0.96)',
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
        top: Platform.OS === 'ios' ? 50 : 24,
        right: 20,
        zIndex: 10,
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.16)',
    },

    /* initial modal styles */
    initialModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(13,27,42,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    initialModalCard: {
        width: '100%',
        maxWidth: 460,
        backgroundColor: T.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: T.border,
        padding: 18,
        ...S.sheet,
    },
    initialTitle: { fontSize: 17, fontWeight: '900', color: T.nav, marginTop: 2 },
});

export default ChequeForm;
