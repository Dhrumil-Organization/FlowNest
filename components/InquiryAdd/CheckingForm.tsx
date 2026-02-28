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
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import theme from '../../android/app/src/theme';
import CameraPage from './CameraPage'; // modal camera component
import SearchableDropdown from '../Shared/SearchableDropdown';
import PartyDropdown from '../Shared/PartyDropdown';
import PartyDropdownType from '../Shared/PartyDropdownType';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PartyDropdownAdj from '../Shared/PartyDropdownAdj';

interface PropertyData {
    PrpCode: string;
    LngName: string;
    ShtName: string;
    PrpOf: string;
    PrpOfFull: string;
    // 
    itmcode: string;
    itmname: string;
    lastrate: string;
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
interface YearMainData {
    YearNo: string;
    YearName: string;
}

interface MachineData {
    MacCode: string;
    MacName: string;
}

interface DesignData {
    PrpCode: string;
    UId: string;
    PlanUId: string;
    BeamUId: string;
    MacCode: string;
    MacName: string;
    BeamNo: string;
    PlanNo: string;
    DsnCode: string;
    DsnName: string;
    TakaNo: string;
    WarpLen: string;
    QltWt: string;
    islasttakatrack: string;
    Status: string;
    ordno: string;
    acccode: string;
    accname: string;
    address: string;
    gstin: string;
    email: string;
}

interface CheckerData {
    PrpCode: string;
    EmpName: string;
    EmpCode: string;
    ShtName: string;
    DptCode: string;
    DptName: string;
    DsgCode: string;
    DsgName: string;
    PPrpCode: string;
    PEmpCode: string;
    // 
    itmcode: string;
    itmname: string;
    lastrate: string;
}

interface GrdData {
    GrdCode: string;
    GrdName: string;
}

interface ShiftData {
    ShfCode: string;
    ShfName: string;
    StartTime: string;
    EndTime: string;
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
    isConnected: boolean | null;
    username: string;
    onSavePart1?: (payload: any) => Promise<any>;
    onSavePart2?: (payload: any) => Promise<any>;
    onSaveFaults?: (payload: any) => Promise<any>;
    getPropertyData: PropertyData[];
    getPartyData: PartyData[];
    setSelectedProperty: (property: PropertyData | null) => void;
    selectedProperty: PropertyData | null;
    selectedYearNo: YearMainData | null;
    setSelectedYearNo: (yearno: YearMainData | null) => void;
    setSelectedParty: (party: PartyData | null) => void;
    selectedParty: PartyData | null;
    selected?: Party | null;
    setSelected?: (item: Party | null) => void;
    selectedMachine1?: MachineData | null;
    setSelectedMachine1?: (mac: MachineData | null) => void;
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
    getMainYearData?: YearMainData[];
    getMachineData?: MachineData[];
    setSelectedMachine: (mac: MachineData | null) => void;
    selectedMachine: MachineData | null;
    getMachineLoading: boolean;
    // 
    getDesignData?: DesignData[];
    setSelectedDesign: (des: DesignData | null) => void;
    selectedDesign: DesignData | null;
    getDesignLoading: boolean;
    selectedDesign1: DesignData | null;
    setSelectedDesign1: (des: DesignData | null) => void;
    // 
    getCheckerData?: CheckerData[];
    setSelectedChecker: (checker: CheckerData | null) => void;
    selectedChecker: CheckerData | null;
    getCheckerLoading: boolean;
    selectedChecker1: CheckerData | null;
    setSelectedChecker1: (checker: CheckerData | null) => void;
    // 
    getGrdData?: GrdData[];
    setSelectedGrd: (grd: GrdData | null) => void;
    selectedGrd: GrdData | null;
    getGrdLoading: boolean;
    selectedGrd1: GrdData | null;
    setSelectedGrd1: (grd: GrdData | null) => void;
    // 
    getShiftData?: ShiftData[];
    setSelectedShift: (shift: ShiftData | null) => void;
    selectedShift: ShiftData | null;
    getShiftLoading: boolean;
    selectedShift1: ShiftData | null;
    setSelectedShift1: (shift: ShiftData | null) => void;
    getFaultsLoading: boolean;
    navigation: any;
    onExeChange: (exe: PropertyData) => void;
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

const CheckingForm: React.FC<Props> = ({
    token,
    isConnected,
    username,
    onSavePart1,
    onSavePart2,
    onSaveFaults,
    getPropertyData,
    getPartyData,
    setSelectedProperty,
    selectedProperty,
    selectedYearNo,
    setSelectedYearNo,
    setSelectedParty,
    selectedParty,
    selected,
    setSelected,
    selectedMachine1,
    setSelectedMachine1,
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
    getMainYearData,
    // 
    getMachineData,
    setSelectedMachine,
    selectedMachine,
    getMachineLoading,
    // 
    getDesignData,
    setSelectedDesign,
    selectedDesign,
    getDesignLoading,
    selectedDesign1,
    setSelectedDesign1,
    // 
    getCheckerData,
    setSelectedChecker,
    selectedChecker,
    getCheckerLoading,
    selectedChecker1,
    setSelectedChecker1,
    // 
    getGrdData,
    setSelectedGrd,
    selectedGrd,
    getGrdLoading,
    selectedGrd1,
    setSelectedGrd1,
    // 
    getShiftData,
    setSelectedShift,
    selectedShift,
    getShiftLoading,
    selectedShift1,
    setSelectedShift1,
    getFaultsLoading,
    navigation,
    onExeChange

}) => {
    const [step, setStep] = useState<number>(1);

    const [customPartyName, setCustomPartyName] = useState<string>('');
    // AdjType from form or default ACC
    const tabs = form.AdjType ? form.AdjType : 'ADJ';
    const [AdjType, setMode] = useState<'ADJ' | 'ACC'>(tabs as 'ADJ' | 'ACC');

    const [chequeDatePickerVisible, setChequeDatePickerVisible] = useState(false);
    const [collectionDatePickerVisible, setCollectionDatePickerVisible] = useState(false);
    const [checkingDatePickerVisible, setCheckingDatePickerVisible] = useState(false);
    const [isCameraModalVisible, setCameraModalVisible] = useState(false);
    const [isPreviewVisible, setPreviewVisible] = useState(false);
    const partyD1CacheRef = React.useRef<Record<string, any[]>>({});
    const [lastPartyOnNext, setLastPartyOnNext] = useState<string | null>(null);
    const dropdownAdjRef = React.useRef<any>(null);

    console.log('CheckingForm:', getMainYearData);
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
        // Parse Qty, QltWt, and Wt as floats (default to 0 if invalid)
        const parsedQty = parseFloat(form.Qty) || 0;
        const parsedQltWt = parseFloat(form.QltWt) || 0;

        // Calculate Wt = Qty * QltWt (fixed to 2 decimal places)
        const calculatedWt = (parsedQty * parsedQltWt).toFixed(2);

        // Calculate AvgWt = (Wt * 100) / Qty (fixed to 2 decimal places)
        const calculatedAvgWt = parsedQty > 0
            ? ((parseFloat(calculatedWt) * 100) / parsedQty).toFixed(2)
            : "0.00"; // Avoid division by zero

        // Update form.Wt and form.AvgWt
        setForm(prev => ({
            ...prev,
            Wt: calculatedWt,
            AvgWt: calculatedAvgWt,
        }));
    }, [form.Qty]); // Re-run when Qty or QltWt changes

    // useEffect(() => {
    //     // Parse Qty, QltWt, and Wt as floats (default to 0 if invalid)
    //     const parsedQty = parseFloat(form.Qty) || 0;
    //     const parsedQltWt = parseFloat(form.QltWt) || 0;

    //     // Calculate Wt = Qty * QltWt (fixed to 2 decimal places)
    //     const calculatedWt = (parsedQty).toFixed(2);

    //     // Calculate AvgWt = (Wt * 100) / Qty (fixed to 2 decimal places)
    //     const calculatedAvgWt = parsedQty > 0
    //         ? ((parseFloat(calculatedWt) * 100) / parsedQty).toFixed(2)
    //         : "0.00"; // Avoid division by zero

    //     // Update form.Wt and form.AvgWt
    //     setForm(prev => ({
    //         ...prev,
    //         // Wt: calculatedWt,
    //         AvgWt: calculatedAvgWt,
    //     }));
    // }, [form.Wt]); // Re-run when Qty or QltWt changes




    useEffect(() => {
        // property
        if (form.itmcode && Array.isArray(getPropertyData)) {
            const found = getPropertyData.find(p => String(p.itmcode) === String(form.itmcode));
            setSelectedProperty(found ?? null);
        } else {
            setSelectedProperty(null);
        }
    }, [form.itmcode, getPropertyData]);

    useEffect(() => {
        // party
        if (form.MacCode && Array.isArray(getMachineData)) {
            const found = getMachineData.find(p => String(p.MacCode) === String(form.MacCode));
            setSelectedMachine(found ?? null);
            setSelectedMachine1?.(found ?? null);
        } else {
            setSelectedMachine(null);
            setSelectedMachine1?.(null);
        }
    }, [form.MacCode, getMachineData]);

    // For Design
    useEffect(() => {
        if (form.acccode && Array.isArray(getDesignData)) {
            const found = getDesignData.find(p => String(p.acccode) === String(form.acccode));
            setSelectedDesign(found ?? null);
            setSelectedDesign1?.(found ?? null);
        } else {
            setSelectedDesign(null);
            setSelectedDesign1?.(null);
        }
    }, [form.acccode, getDesignData]);

    // For Grd
    useEffect(() => {
        if (form.GrdCode && Array.isArray(getGrdData)) {
            const found = getGrdData.find(p => String(p.GrdCode) === String(form.GrdCode));
            setSelectedGrd(found ?? null);
            setSelectedGrd1?.(found ?? null);
        } else {
            setSelectedGrd(null);
            setSelectedGrd1?.(null);
        }
    }, [form.GrdCode, getGrdData]);

    // For Shift
    useEffect(() => {
        if (form.ShfCode && Array.isArray(getShiftData)) {
            const found = getShiftData.find(p => String(p.ShfCode) === String(form.ShfCode));
            setSelectedShift(found ?? null);
            setSelectedShift1?.(found ?? null);
        } else {
            setSelectedShift(null);
            setSelectedShift1?.(null);
        }
    }, [form.ShfCode, getShiftData]);

    // For Checker
    // useEffect(() => {
    //     if (form.itmcode && Array.isArray(getCheckerData)) {
    //         const found = getCheckerData.find(p => String(p.itmcode) === String(form.itmcode));
    //         setSelectedChecker(found ?? null);
    //         setSelectedChecker1?.(found ?? null);
    //     } else {
    //         setSelectedChecker(null);
    //         setSelectedChecker1?.(null);
    //     }
    // }, [form.itmcode, getCheckerData]);

    useEffect(() => {
        if (getCheckerData && getCheckerData?.length > 0 && !selectedProperty) {
            onExeChange(getCheckerData[0]);
        }
    }, [getCheckerData, selectedProperty, onExeChange]);

    // useEffect(() => {
    //     // party
    //     if (form.AccCode && Array.isArray(getPartyData)) {
    //         const found = getPartyData.find(p => String(p.acccode) === String(form.AccCode));
    //         setSelectedParty(found ?? null);
    //         setSelected?.(found ?? null);
    //     } else {
    //         setSelectedParty(null);
    //         setSelected?.(null);
    //     }
    // }, [form.AccCode, getPartyData]);

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

    // console.log('Payment:', form.PayType);

    // const goNext = async () => {
    //     // Validate required fields on Next from Step 1
    //     if (step === 1) {
    //         // If AdjType is ACC you previously returned early — keep same behaviour but still validate if you want
    //         // The user asked validation for Payment type, Party, Amount, Bank — apply only when user actually wants to go to Step 2
    //         // Validate required fields:
    //         const MacCode = form.MacCode ?? form.MacCode?.toString() ?? '';
    //         const ShfCode = form.ShfCode ?? form.ShfCode?.toString() ?? '';
    //         const DsnCode = form.DsnCode ?? form.DsnCode?.toString() ?? '';
    //         const Qty = form.Qty ?? form.Qty?.toString() ?? '';
    //         const GrdCode = form.GrdCode ?? form.GrdCode?.toString() ?? '';
    //         const accCode = form.AccCode ?? '';
    //         const accName = form.AccName ?? '';
    //         const amountRaw = form.Amount ?? '';
    //         const bankName = form.BankName ?? '';

    //         // Normalize amount: allow strings with commas
    //         // const numericAmount = parseFloat(String(amountRaw).replace(/,/g, '')) || 0;

    //         if (!MacCode || String(MacCode).trim() === '') {
    //             Alert.alert('Validation', 'Please select Machine.');
    //             return;
    //         } else if (!ShfCode || String(ShfCode).trim() === '') {
    //             Alert.alert('Validation', 'Please select Shift.');
    //             return;

    //         } else if (!DsnCode || String(DsnCode).trim() === '') {
    //             Alert.alert('Validation', 'Please select Design.');
    //             return;

    //         } else if (!Qty || String(Qty).trim() === '') {
    //             Alert.alert('Validation', 'Please enter Mtrs.');
    //             return;

    //         } else if (!GrdCode || String(GrdCode).trim() === '') {
    //             Alert.alert('Validation', 'Please select Grade.');
    //             return;
    //         }
    //         else {
    //             // Save current form.d1 into cache for this party (so switching away & back can restore)


    //             // proceed to step 2
    //             // setStep(2);
    //             try {
    //                 await handleSavePart2();
    //             } catch (err) {
    //                 console.warn('save part2 failed', err);
    //             }
    //             return;
    //         }
    //     }

    //     // If already in step 2, perform "save" action
    //     // if (step === 2) {
    //     //     // call save handlers as earlier
    //     //     // try {
    //     //     //     await handleSavePart1();
    //     //     // } catch (err) {
    //     //     //     console.warn('save part1 failed', err);
    //     //     // }
    //     //     // Optionally continue to final save
    //     //     try {
    //     //         await handleSavePart2();
    //     //     } catch (err) {
    //     //         console.warn('save part2 failed', err);
    //     //     }
    //     // }
    // };
    const goNext = async () => {
        // Validate required fields on Next from Step 1
        if (step === 1) {

            // Normalize amount: allow strings with commas
            // const numericAmount = parseFloat(String(amountRaw).replace(/,/g, '')) || 0;

            // if (!MacCode || String(MacCode).trim() === '') {
            //     Alert.alert('Validation', 'Please select Machine.');
            //     return;
            // } else if (!ShfCode || String(ShfCode).trim() === '') {
            //     Alert.alert('Validation', 'Please select Shift.');
            //     return;

            // } else if (!DsnCode || String(DsnCode).trim() === '') {
            //     Alert.alert('Validation', 'Please select Design.');
            //     return;

            // } else if (!Qty || String(Qty).trim() === '') {
            //     Alert.alert('Validation', 'Please enter Mtrs.');
            //     return;

            // } else if (!GrdCode || String(GrdCode).trim() === '') {
            //     Alert.alert('Validation', 'Please select Grade.');
            //     return;
            // }
            // else {
            // Save current form.d1 into cache for this party (so switching away & back can restore)


            // proceed to step 2
            setStep(2);
            // try {
            //     await handleSavePart2();
            // } catch (err) {
            //     console.warn('save part2 failed', err);
            // }
            return;
            // }
        }

        // If already in step 2, perform "save" action
        // if (step === 2) {
        //     // call save handlers as earlier
        //     // try {
        //     //     await handleSavePart1();
        //     // } catch (err) {
        //     //     console.warn('save part1 failed', err);
        //     // }
        //     // Optionally continue to final save
        //     try {
        //         await handleSavePart2();
        //     } catch (err) {
        //         console.warn('save part2 failed', err);
        //     }
        // }
    };

    const goFaults = async () => {
        // Validate required fields on Next from Step 1
        if (step === 1) {
            // If AdjType is ACC you previously returned early — keep same behaviour but still validate if you want
            // The user asked validation for Payment type, Party, Amount, Bank — apply only when user actually wants to go to Step 2
            // Validate required fields:
            const MacCode = form.MacCode ?? form.MacCode?.toString() ?? '';
            const ShfCode = form.ShfCode ?? form.ShfCode?.toString() ?? '';

            // Normalize amount: allow strings with commas
            // const numericAmount = parseFloat(String(amountRaw).replace(/,/g, '')) || 0;

            if (!MacCode || String(MacCode).trim() === '') {
                Alert.alert('Validation', 'Please select Machine.');
                return;
            } else if (!ShfCode || String(ShfCode).trim() === '') {
                Alert.alert('Validation', 'Please select Shift.');
                return;
            }
            else {
                // Save current form.d1 into cache for this party (so switching away & back can restore)


                // proceed to step 2
                // setStep(2);
                try {
                    await handleSaveFaults();
                } catch (err) {
                    console.warn('save part2 failed', err);
                }
                return;
            }
        }

        // If already in step 2, perform "save" action
        // if (step === 2) {
        //     // call save handlers as earlier
        //     // try {
        //     //     await handleSavePart1();
        //     // } catch (err) {
        //     //     console.warn('save part1 failed', err);
        //     // }
        //     // Optionally continue to final save
        //     try {
        //         await handleSavePart2();
        //     } catch (err) {
        //         console.warn('save part2 failed', err);
        //     }
        // }
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
            Alert.alert("Error", "Could not save part1");
        }
    };

    const handleSavePart2 = async () => {
        // example behavior preserved
        try {
            await onSavePart2?.({ ...form });
            // Alert.alert('Saved', 'Form saved');
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Could not save part 2');
        }
    };
    const handleSaveFaults = async () => {
        // example behavior preserved
        try {
            await onSaveFaults?.({ ...form });
            // Alert.alert('Saved', 'Form saved');
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

    const viewDataAndClose = () => {
        // setSuccessModalVisible(false);
        navigation.navigate('Taka Checking Entry View Data');
    };



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
                        {/* <View style={{ marginBottom: 10 }} >
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
                        </View> */}
                        {/* <View style={styles.twoColRow123}>
                            <View style={styles.col1} >
                                <Text style={styles.label}>Select Year <Text style={{ color: 'red' }}>*</Text></Text>

                                <SearchableDropdown
                                    data={getMainYearData}
                                    labelKey="YearName"
                                    valueKey="YearNo"
                                    placeholder="Choose year..."
                                    pageSize={10}
                                    initialValue={selectedYearNo ?? null}
                                    onSelect={(item) => {
                                        setForm(prev => ({ ...prev, YearNo: item.YearNo }));
                                        setSelectedYearNo(item);
                                    }}
                                    multiple={false}
                                    emptyMessage="No years available"
                                />
                            </View>
                            <View style={styles.col1} >
                                <Text style={styles.label}>Checking Date</Text>
                                <TouchableOpacity activeOpacity={0.85}
                                    style={[
                                        styles.dateTrigger,
                                        { opacity: 0.6 } // Optional: Visual feedback for disabled state
                                    ]}
                                    onPress={() => setCheckingDatePickerVisible(true)}
                                    disabled={true} >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.dateTriggerText, !form.ChkDate && styles.placeholderText]}>
                                            {form.ChkDate ? formatDisplayDate(form.ChkDate) : "Select Checking date"}
                                        </Text>
                                    </View>
                                    <Icon name="calendar-today" size={18} color={theme.TEXT_SECONDARY} />
                                </TouchableOpacity>

                                <DateTimePickerModal
                                    isVisible={checkingDatePickerVisible}
                                    mode="date"

                                    // onConfirm={(date) => setForm(prev => ({ ...prev, EDate: toISODate(date) }))}
                                    onConfirm={(date) => {
                                        const selectedDate = new Date(date);
                                        selectedDate.setHours(0, 0, 0, 0);
                                        setForm(prev => ({ ...prev, ChkDate: toISODate(selectedDate) }));
                                        setCheckingDatePickerVisible(false);
                                        // Force UI update
                                        setTimeout(() => { }, 100); // Small delay to ensure state update
                                    }}

                                    onCancel={() => setCheckingDatePickerVisible(false)}
                                    headerTextIOS="Pick Checking Date"
                                    locale="en_GB"
                                    // maximumDate={new Date(2099, 11, 31)}
                                    // minimumDate={new Date(2000, 0, 1)} // Allow dates from 1st Jan 2000
                                    maximumDate={new Date()} // Only allow today or past dates
                                />
                            </View>
                        </View> */}
                        {/* Machine - CONDITIONAL RENDERING */}
                        {/* <View style={styles.twoColRow123}>
                            <View style={styles.col1}>
                                <Text style={styles.label}>
                                    {isPLN ? 'Machine' : 'Select Machine'} <Text style={{ color: 'red' }}>*</Text>
                                </Text>
                                <PartyDropdown
                                    data={getMachineData}
                                    placeholder="Choose machine..."
                                    labelKey={["MacName", "MacCode"]}
                                    valueKey="MacCode"
                                    pageSize={12}
                                    initialValue={selectedMachine ?? null}
                                    selected={selected ?? null}
                                    loading={Boolean(getMachineLoading)}
                                    type="machine"
                                    onSelect={(item) => {
                                        setForm(prev => ({
                                            ...prev,
                                            MacCode: item.MacCode,
                                            MacName: item.MacName
                                        }));
                                        setSelectedParty(item);
                                        setSelected?.(item);
                                    }}
                                    setSelected={(val) => {
                                        if (!val) {
                                            setForm(prev => ({
                                                ...prev,
                                                MacCode: '',
                                                MacName: '',

                                            }));
                                            setSelectedParty(null);
                                            setSelected?.(null);
                                        } else {
                                            setForm(prev => ({
                                                ...prev,
                                                MacCode: val.MacCode,
                                                MacName: val.MacName,

                                            }));
                                            setSelectedMachine(val as MachineData);
                                            setSelected?.(val as MachineData);
                                        }
                                    }}
                                />

                            </View>

                            <View style={styles.col1}>
                                <Text style={styles.label}> {'Select Shift'} <Text style={{ color: 'red' }}>*</Text>
                                </Text>
                                <PartyDropdown
                                    data={getShiftData}
                                    placeholder="Choose shift.."
                                    labelKey={["ShfName", "ShfCode"]}
                                    valueKey="ShfCode"
                                    pageSize={12}
                                    initialValue={selectedShift ?? null}
                                    selected={selectedShift1 ?? null}
                                    loading={Boolean(getShiftLoading)}
                                    type="shift"
                                    onSelect={(item) => {
                                        setForm(prev => ({
                                            ...prev,
                                            ShfCode: item.ShfCode,
                                            ShfName: item.ShfName
                                        }));
                                        setSelectedShift(item);
                                        setSelectedShift1?.(item);
                                    }}
                                    setSelected={(val) => {
                                        if (!val) {
                                            setForm(prev => ({
                                                ...prev,
                                                ShfCode: '',
                                                ShfName: '',

                                            }));
                                            setSelectedShift(null);
                                            setSelectedShift1?.(null);
                                        } else {
                                            setForm(prev => ({
                                                ...prev,
                                                ShfCode: val.ShfCode,
                                                ShfName: val.ShfName,

                                            }));
                                            setSelectedShift(val as ShiftData);
                                            setSelectedShift1?.(val as ShiftData);
                                        }
                                    }}
                                />

                            </View>
                        </View> */}

                        {/* Design - CONDITIONAL RENDERING */}
                        <View style={{ marginBottom: 10 }} >
                            <Text style={styles.label}> {'Select Party'} <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            <PartyDropdown
                                data={getDesignData}
                                placeholder="Choose party..."
                                labelKey={["accname", "acccode"]}
                                valueKey="acccode"
                                pageSize={12}
                                initialValue={selectedDesign ?? null}
                                selected={selectedDesign1 ?? null}
                                loading={Boolean(getDesignLoading)}
                                type="party"
                                onSelect={(item) => {
                                    setForm(prev => ({
                                        ...prev,
                                        acccode: item.acccode,
                                        accname: item.accname
                                    }));
                                    setSelectedDesign(item);
                                    setSelectedDesign1?.(item);
                                }}
                                setSelected={(val) => {
                                    if (!val) {
                                        setForm(prev => ({
                                            ...prev,
                                            acccode: '',
                                            accname: '',

                                        }));
                                        setSelectedDesign(null);
                                        setSelectedDesign1?.(null);
                                    } else {
                                        setForm(prev => ({
                                            ...prev,
                                            acccode: val.acccode,
                                            accname: val.accname,

                                        }));
                                        setSelectedDesign(val as DesignData);
                                        setSelectedDesign1?.(val as DesignData);
                                    }
                                }}
                            />

                        </View>

                        {/* Checker - CONDITIONAL RENDERING */}
                        <View style={{ marginBottom: 10 }} >
                            <Text style={styles.label}> {'Select Item'} <Text style={{ color: 'red' }}>*</Text>
                            </Text>
                            {/* <PartyDropdown
                                data={getCheckerData}
                                placeholder="Choose items..."
                                labelKey={["itmname", "itmcode"]}
                                valueKey="itmcode"
                                pageSize={12}
                                initialValue={selectedChecker ?? null}
                                selected={selectedChecker1 ?? null}
                                loading={Boolean(getCheckerLoading)}
                                type="item"
                                multiple={true}
                                onSelect={(item) => {
                                    setForm(prev => ({
                                        ...prev,
                                        itmcode: item?.itmcode || '',
                                        itmname: item?.itmname || '',
                                    }));
                                    setSelectedChecker(item);
                                    setSelectedChecker1?.(item);
                                }}
                                setSelected={(val) => {
                                    if (!val) {
                                        setForm(prev => ({
                                            ...prev,
                                            itmcode: '',
                                            itmname: '',

                                        }));
                                        setSelectedChecker(null);
                                        setSelectedChecker1?.(null);
                                    } else {
                                        setForm(prev => ({
                                            ...prev,
                                            itmcode: val?.itmcode || '',
                                            itmname: val?.itmname || '',

                                        }));
                                        setSelectedChecker(val as CheckerData);
                                        setSelectedChecker1?.(val as CheckerData);
                                    }
                                }}
                            /> */}
                            <SearchableDropdown
                                data={getCheckerData}
                                labelKey={["itmname", "itmcode"]}
                                valueKey="itmcode"
                                placeholder="Choose item..."
                                pageSize={10}
                                initialValue={selectedProperty ?? []} // Ensure this is an array
                                // onSelect={(items) => {
                                //     // items is an array of selected objects
                                //     setSelectedProperty(items);
                                //     // Extract itmcode values and pass as array to parent
                                //     const selectedCodes = items.map(item => item.itmcode);
                                //     setForm(prev => ({ ...prev, itmcode: selectedCodes }));
                                // }}
                                onSelect={(items) => {
                                    console.log("Selected items:", items); // Debug
                                    setSelectedProperty(items);
                                    const selectedCodes = items.map(item => item.itmcode);
                                    setForm(prev => ({ ...prev, itmcode: selectedCodes }));
                                }}

                                multiple={true}
                                emptyMessage="No items available"
                            />


                        </View>

                        <View style={styles.twoColRow1}>
                            {/* Beam */}
                            <View style={styles.col1} >
                                <Text style={styles.label}>Beam <Text style={{ color: 'red' }}>*</Text></Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.BeamNo}
                                    onChangeText={(t) => setForm(prev => ({ ...prev, BeamNo: t }))}
                                    editable={false}
                                // keyboardType="numeric"
                                // placeholder="0.00"
                                />
                            </View>
                            <View style={styles.col1} >
                                {/* Taka No */}
                                <Text style={styles.label}>Taka No <Text style={{ color: 'red' }}>*</Text></Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.TakaNo}
                                    onChangeText={(t) => setForm(prev => ({ ...prev, TakaNo: t }))}
                                    // keyboardType="numeric"
                                    placeholder="Enter taka no..."
                                />
                            </View>
                        </View>

                        <View style={styles.twoColRow1}>
                            {/* Mtrs */}
                            <View style={styles.col1}>
                                <Text style={styles.label}>
                                    Mtrs <Text style={{ color: 'red' }}>*</Text>
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.Qty}
                                    onChangeText={(t) => {
                                        const enteredValue = parseFloat(t) || 0;
                                        const warpLen = parseFloat(form.WarpLen) || 0;

                                        if (enteredValue > warpLen) {
                                            Alert.alert(
                                                "Validation",
                                                `Mtrs ${enteredValue} should be less than or equal to the total warp length (${warpLen}).`,
                                                [{ text: "OK", onPress: () => { } }],
                                                { cancelable: false }
                                            );
                                            setTimeout(() => {
                                                setForm(prev => ({ ...prev, Qty: "0" }));
                                            }, 2000);
                                            return;
                                        }
                                        setForm(prev => ({ ...prev, Qty: t }));
                                    }}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                />
                            </View>
                            <View style={styles.col1} >
                                {/* Weight */}
                                <Text style={styles.label}>Weight <Text style={{ color: 'red' }}>*</Text></Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.Wt}
                                    // onChangeText={(t) => setForm(prev => ({ ...prev, Wt: t }))}
                                    onChangeText={(t) => {
                                        const enteredValue = parseFloat(t) || 0;
                                        const qty = parseFloat(form.Qty) || 0;
                                        const calculatedWt = (enteredValue).toFixed(2);

                                        if (enteredValue && qty) {
                                            const calculatedAvgWt = qty > 0
                                                ? ((parseFloat(calculatedWt) * 100) / qty).toFixed(2)
                                                : "0.00"; // Avoid division by zero

                                            setForm(prev => ({
                                                ...prev,
                                                // Wt: calculatedWt,
                                                AvgWt: calculatedAvgWt,
                                            }));
                                        }
                                        setForm(prev => ({ ...prev, Wt: t }));
                                    }}
                                    //         Alert.alert(
                                    //             "Validation",
                                    //             `Mtrs ${enteredValue} should be less than or equal to the total warp length (${warpLen}).`,
                                    //             [{ text: "OK", onPress: () => { } }],
                                    //             { cancelable: false }
                                    //         );
                                    //         setTimeout(() => {
                                    //             setForm(prev => ({ ...prev, Qty: "0" }));
                                    //         }, 2000);
                                    //         return;
                                    //     }
                                    //     setForm(prev => ({ ...prev, Qty: t }));
                                    // }}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                />
                            </View>
                        </View>
                        <View style={styles.twoColRow123}>
                            <View style={styles.col1} >
                                {/* Avg. Weight */}
                                <Text style={styles.label}>Avg. Weight <Text style={{ color: 'red' }}>*</Text></Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.AvgWt}
                                    onChangeText={(t) => setForm(prev => ({ ...prev, AvgWt: t }))}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                />
                            </View>

                            {/* Grd - CONDITIONAL RENDERING */}
                            <View style={styles.col1}>
                                <Text style={styles.label}> {'Select Grade'} <Text style={{ color: 'red' }}>*</Text>
                                </Text>
                                <PartyDropdown
                                    data={getGrdData}
                                    placeholder="Choose grd.."
                                    labelKey={["GrdName", "GrdCode"]}
                                    valueKey="GrdCode"
                                    pageSize={12}
                                    initialValue={selectedGrd ?? null}
                                    selected={selectedGrd1 ?? null}
                                    loading={Boolean(getGrdLoading)}
                                    type="grd"
                                    onSelect={(item) => {
                                        setForm(prev => ({
                                            ...prev,
                                            GrdCode: item.GrdCode,
                                            GrdName: item.GrdName
                                        }));
                                        setSelectedGrd(item);
                                        setSelectedGrd1?.(item);
                                    }}
                                    setSelected={(val) => {
                                        if (!val) {
                                            setForm(prev => ({
                                                ...prev,
                                                GrdCode: '',
                                                GrdName: '',

                                            }));
                                            setSelectedGrd(null);
                                            setSelectedGrd1?.(null);
                                        } else {
                                            setForm(prev => ({
                                                ...prev,
                                                GrdCode: val.GrdCode,
                                                GrdName: val.GrdName,

                                            }));
                                            setSelectedGrd(val as GrdData);
                                            setSelectedGrd1?.(val as GrdData);
                                        }
                                    }}
                                />

                            </View>
                        </View>

                        <View style={styles.twoColRow1}>
                            {/* Mending require? */}
                            <View style={styles.col1}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                    <TouchableOpacity
                                        onPress={() => setForm(prev => ({ ...prev, isMending: prev.isMending === 1 ? 0 : 1 }))}
                                        style={{ flexDirection: 'row', alignItems: 'center' }}
                                    >
                                        <View style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: 4,
                                            borderWidth: 1.5,
                                            borderColor: theme.BRAND_ACCENT,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginRight: 8,
                                            backgroundColor: form.isMending === 1 ? theme.BRAND_ACCENT : 'transparent'
                                        }}>
                                            {form.isMending === 1 && <Icon name="check" size={14} color="#fff" />}
                                        </View>
                                        <Text style={styles.label}>Mending require?</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Last taka? */}
                            <View style={styles.col1}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                    <TouchableOpacity
                                        onPress={() => setForm(prev => ({ ...prev, islasttaka: prev.islasttaka === 1 ? 0 : 1 }))}
                                        style={{ flexDirection: 'row', alignItems: 'center' }}
                                    >
                                        <View style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: 4,
                                            borderWidth: 1.5,
                                            borderColor: theme.BRAND_ACCENT,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginRight: 8,
                                            backgroundColor: form.islasttaka === 1 ? theme.BRAND_ACCENT : 'transparent'
                                        }}>
                                            {form.islasttaka === 1 && <Icon name="check" size={14} color="#fff" />}
                                        </View>
                                        <Text style={styles.label}>Last taka?</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>




                        {/* Nav */}
                        <View style={styles.navRow}>
                            <View style={{ width: 12 }} />
                            <View style={{ flex: 1 }} />
                            <TouchableOpacity style={[styles.saveBtn, { minWidth: 120 }]} onPress={goNext} disabled={!isConnected}>
                                <Text style={styles.saveText}>{AdjType === 'ACC' ? 'Save' : 'Next'}</Text>
                            </TouchableOpacity>
                        </View>
                        {/* <View style={styles.navRow}>
                            <TouchableOpacity style={styles.ghostBtn} onPress={goPrev}>
                                <Icon name="arrow-back" size={18} color={theme.TEXT_SECONDARY} />
                                <Text style={styles.ghostText}>Previous</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.faultsBtn12} onPress={goFaults} disabled={!isConnected}>
                                <Text style={styles.saveText}>{getFaultsLoading ? 'Loading...' : `Select Faults [ ${form?.d2 ? form.d2.length : 0} ]`}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.faultsBtn} onPress={viewDataAndClose} disabled={!isConnected}>
                                <Text style={styles.saveText}>{'View Data'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={goNext} disabled={!isConnected}>
                                <Text style={styles.saveText}>{getSaveLoading ? 'Saving...' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View> */}
                    </View>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                    <View style={styles.card}>
                        <Text style={styles.label}>Adjust Account</Text>

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
                        <View style={styles.navRow}>
                            <TouchableOpacity style={styles.ghostBtn} onPress={goPrev}>
                                <Icon name="arrow-back" size={18} color={theme.TEXT_SECONDARY} />
                                <Text style={styles.ghostText}>Previous</Text>
                            </TouchableOpacity>

                            <View style={{ flex: 1 }} />

                            <TouchableOpacity style={styles.saveBtn} onPress={goNext} disabled={!isConnected}>
                                <Text style={styles.saveText}>{getSaveLoading ? 'Saving...' : 'Save'}</Text>
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
                                // maximumDate={new Date(2099, 11, 31)}
                                minimumDate={new Date(2000, 0, 1)} // Allow dates from 1st Jan 2000
                                maximumDate={new Date()} // Only allow today or past dates
                            />

                            {/* <View style={{ marginTop: 12 }}>
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
                            </View> */}

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
    twoColRow123: { display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 10 },
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

    navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, justifyContent: 'space-between' },
    saveBtn: { backgroundColor: theme.BRAND_ACCENT, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    faultsBtn: { backgroundColor: theme.BRAND_GRADIENT_START, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    faultsBtn12: { backgroundColor: theme.BRAND_GRADIENT_END, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
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

export default CheckingForm;
