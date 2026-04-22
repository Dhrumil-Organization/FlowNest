// components/Shared/PartyDropdown.tsx
import React, { useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import theme from '../../android/app/src/theme';
import SearchableDropdown from './SearchableDropdown';

export interface Party { accountname?: string; acccode?: string; Address?: string; email?: string; gstin?: string; ordno?: string;[k: string]: any; }

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


interface Props {
    data: Party[];
    placeholder?: string;
    pageSize?: number;
    onSelect: (item: Party) => void;
    initialValue?: Party | null;
    labelKey?: string | string[];
    valueKey?: string | string[];
    selected?: Party | null;
    setSelected?: (item: Party) => void;
    loading?: boolean;
    type?: string;
    multiple?: boolean;
}

interface BankData {
    BankName?: string;
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

interface PaymentData {
    paycode: string;
    paytype: string;
}

interface BranchData {
    BankBr?: string;
}


interface BeamData {
    BeamUId: string;
    BeamNo: string;
    UBeamNo: string;
    TranDate: string;
    NTranDate: string;
    RollNo: string;
    GTexNo: string;
    WarpLen: string;
    PrpCode: string;
    LngName: string;
    DsnCode: string | null;
    DsnName: string;
    BeamWt: string;
    PipeWt: string;
    YarnWt: string;
    Ends: string;
    Reeds: string;
    IsJobOut: string;
    ischecked: string;
    reason: string;
}
interface Operator {
    EmpCode: string;
    EmpName: string;
    id: string;
    label: string;
    OprCode: string;
    OprName: string

}
interface Employee {
    PrpCode: string;
    EmpName: string;
    EmpCode: string;
    ShtName: string;
    DptCode: string;
    DptName: string;
    DsgCode: string;
    DsgName: string;
    PPrpCode: string;
    PEmpCode: string

}
interface Supervisor {
    PRPCODE: string;
    SupName: string;
    SupCode: string;
    ShtName: string;
    DptCode: string;
    DptName: string;
    DsgCode: string;
    DsgName: string;
    PPrpCode: string;
    PEmpCode: string;

}
interface blend {
    category: string;
    id: string;
    name: string;
    sh_name: string;
    count: string;
    ply: string;
    type: string;
    lustre: string;
}
interface Item {
    ItmCode: string,
    ItmName: string,
    UOM: string,
    Denier: string,
    tag: string,
    Rate: string,
    HsnCode: string,
    GSTGrpCode: string

}
interface SubItem {
    WBlend: string
    WBlendPer: string
    WCount: string
    WDenier: string
    WLustre: string
    WNameCode: string
    WOther: string
    WPly: string
    WType: string
    WYarnType: string
    itmcode: string
    mitmcode: string
    name: string
    sh_name: string
    strcode: string
}



const extractLocation = (addr?: string) => {
    if (!addr) return '';
    const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : addr;
};

const initialsOf = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
};

const PartyDropdown: React.FC<Props> = ({
    data,
    placeholder = 'Choose...',
    pageSize = 10,
    onSelect,
    initialValue = null,
    labelKey,
    valueKey,
    selected,
    setSelected,
    loading = false,
    type,
    multiple = false,
}) => {
    const dropdownRef = useRef<any>(null);

    const renderRowContentEmpty = () => {

        return (
            null
        );
    };
    const renderRowContent = (item: Party, isSelected: boolean) => {
        const location = extractLocation(item.Address);
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.accountname || item.accname)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.accountname || item.accname || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.acccode || '—'}
                    </Text>

                    {item.Address ? (
                        <Text style={rowStyles.Address} numberOfLines={3}>
                            {item.Address}
                        </Text>
                    ) : null}

                    <View style={rowStyles.metaRow}>
                        {location ? (
                            <View style={rowStyles.metaPill}>
                                <Icon name="place" size={14} color={theme.BRAND_ACCENT} />
                                <Text style={rowStyles.metaText}>{location}</Text>
                            </View>
                        ) : null}

                        {item.email ? (
                            <View style={rowStyles.metaPill}>
                                <Icon name="email" size={14} color={theme.MUTED} />
                                <Text style={rowStyles.metaText} numberOfLines={1}>{item.email}</Text>
                            </View>
                        ) : null}

                        {(item.gstin || item.ordno) ? (
                            <View style={rowStyles.metaPill}>
                                <Icon name="fingerprint" size={14} color={theme.MUTED} />
                                <Text style={rowStyles.metaText} numberOfLines={1}>{item.gstin || item.ordno}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </View>
        );
    };
    const renderRowContentItem = (item: Party, isSelected: boolean) => {
        // const location = extractLocation(item.Address);
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.itmname || item.itmname)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.itmname || item.accname || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.itmcode || '—'}
                    </Text>
                </View>
            </View>
        );
    };
    const renderRowContentMachine = (item: Party, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.MacName)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.MacName || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.MacCode || '—'}
                    </Text>
                </View>
            </View>
        );
    };
    const renderRowContentMachine1 = (item: Party, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.MacName)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        Machine : {item.MacName || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        Code : {item.MacCode || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        PrpCode : {item.PrpCode || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        Location : {item.Location || '—'}
                    </Text>
                </View>
            </View>
        );
    };

    const renderRowContentBeamData = (item: BeamData, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.BeamNo)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        BeamNo : {item.BeamNo || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        UBeamNo : {item.UBeamNo || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        WarpLen : {item.WarpLen || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        PrpCode : {item.PrpCode || '—'}
                    </Text>
                </View>
            </View>
        );
    };

    const renderRowContentperson = (item: Employee, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.EmpName)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.EmpName || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.EmpCode || '—'}
                    </Text>
                </View>
            </View>
        );
    };

    const renderRowContentoperator = (item: Operator, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.OprName)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.OprName || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.OprCode || '—'}
                    </Text>
                </View>
            </View>
        );
    };

    const renderRowContentsupervisior = (item: Supervisor, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.SupName)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.SupCode || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.SupName || '—'}
                    </Text>
                </View>
            </View>
        );
    };

    const renderRowContentDesign = (item: DesignData, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.DsnName)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {`${item.DsnName || '—'}`}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        <Text style={[rowStyles.title_caption, isSelected && rowStyles.titleSelected]}>Code : </Text>{`${item.DsnCode || '—'}`}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        <Text style={[rowStyles.title_caption, isSelected && rowStyles.titleSelected]}>BeamNo : </Text> {`${item.BeamNo || '—'} `}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        <Text style={[rowStyles.title_caption, isSelected && rowStyles.titleSelected]}>PlanNo : </Text>{`${item.PlanNo || '—'} `}
                    </Text>
                </View>
            </View>
        );
    };

    const renderRowContentChecker = (item: CheckerData, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.EmpName)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.EmpName || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.EmpCode || '—'}
                    </Text>
                </View>
            </View>
        );
    };

    const renderRowContentGrd = (item: GrdData, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.GrdName)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.GrdName || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.GrdCode || '—'}
                    </Text>
                </View>
            </View>
        );
    };

    const renderRowContentShift = (item: ShiftData, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.ShfName)}</Text>
                </View>

                <View style={rowStyles.main}>
                    {/* <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.ShfName || '—'}
                    </Text> */}
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        <Text style={[rowStyles.title_caption, isSelected && rowStyles.titleSelected]}>Code : </Text>{`${item.ShfCode || '—'}`}
                        {/* {item.ShfCode || '—'} */}
                    </Text>
                </View>
            </View>
        );
    };

    const renderRowContentAdj = (item: AdjData, isSelected: boolean) => {
        // const location = extractLocation(item.Address);
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.ACCNAME)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.ACCNAME || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.BILLNO || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.NVOUDATE || '—'}
                    </Text>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.NETAMT || '—'}
                    </Text>

                    {/* <View style={rowStyles.metaRow}>
                        {location ? (
                            <View style={rowStyles.metaPill}>
                                <Icon name="place" size={14} color={theme.BRAND_ACCENT} />
                                <Text style={rowStyles.metaText}>{location}</Text>
                            </View>
                        ) : null}

                        {item.email ? (
                            <View style={rowStyles.metaPill}>
                                <Icon name="email" size={14} color={theme.MUTED} />
                                <Text style={rowStyles.metaText} numberOfLines={1}>{item.email}</Text>
                            </View>
                        ) : null}

                        {(item.gstin || item.ordno) ? (
                            <View style={rowStyles.metaPill}>
                                <Icon name="fingerprint" size={14} color={theme.MUTED} />
                                <Text style={rowStyles.metaText} numberOfLines={1}>{item.gstin || item.ordno}</Text>
                            </View>
                        ) : null}
                    </View> */}
                </View>
            </View>
        );
    };

    const renderRowContentBank = (item: BankData, isSelected: boolean) => {
        // const location = extractLocation(item.Address);
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.BankName)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.BankName || '—'}
                    </Text>
                </View>
            </View>
        );
    };

    const renderRowContentPayment = (item: PaymentData, isSelected: boolean) => {
        // const location = extractLocation(item.Address);
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.paytype)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.paytype || '—'}
                    </Text>
                </View>
            </View>
        );
    };

    const renderRowContentBranch = (item: BranchData, isSelected: boolean) => {
        // const location = extractLocation(item.Address);
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.BankBr)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.BankBr || '—'}
                    </Text>
                </View>
            </View>
        );
    };

    const renderRowContentblend = (item: blend, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.name)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.name || '—'}
                    </Text>
                    {/* <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.id || '—'}
                    </Text> */}
                </View>
            </View>
        );
    };

    const renderRowContentcount = (item: blend, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.count)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.count || '—'}
                    </Text>
                    {/* <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.id || '—'}
                    </Text> */}
                </View>
            </View>
        );
    };

    const renderRowContentply = (item: blend, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.ply)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.ply || '—'}
                    </Text>
                    {/* <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.id || '—'}
                    </Text> */}
                </View>
            </View>
        );
    };

    const renderRowContenttype = (item: blend, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.type)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.type || '—'}
                    </Text>
                    {/* <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.id || '—'}
                    </Text> */}
                </View>
            </View>
        );
    };

    const renderRowContentlustre = (item: blend, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.lustre)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.lustre || '—'}
                    </Text>
                    {/* <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.id || '—'}
                    </Text> */}
                </View>
            </View>
        );
    };

    const renderRowContentItem1 = (item: Item, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.ItmName)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.ItmName || '—'}
                    </Text>
                    {/* <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.ItmCode || '—'}
                    </Text> */}
                </View>
            </View>
        );
    };

    const renderRowContentSubItem = (item: SubItem, isSelected: boolean) => {
        return (
            <View style={rowStyles.rowInner}>
                <View style={[rowStyles.avatar, isSelected && rowStyles.avatarSelected]}>
                    <Text style={[rowStyles.avatarText]}>{initialsOf(item.WNameCode)}</Text>
                </View>

                <View style={rowStyles.main}>
                    <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.WNameCode || '—'}
                    </Text>
                    {/* <Text style={[rowStyles.title, isSelected && rowStyles.titleSelected]}>
                        {item.itmcode || '—'}
                    </Text> */}
                </View>
            </View>
        );
    };

    return (
        <View>
            {/* If loading: show a disabled trigger with spinner */}
            {loading ? (
                <TouchableOpacity activeOpacity={1} style={[styles.trigger, styles.loadingTrigger]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={theme.BRAND_ACCENT} style={{ marginRight: 10 }} />
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                </TouchableOpacity>
            ) : (
                <SearchableDropdown
                    ref={dropdownRef}
                    data={data}
                    labelKey={labelKey || ''}
                    valueKey={valueKey}
                    placeholder={placeholder}
                    pageSize={pageSize}
                    onSelect={(itemOrItems) => {
                        const item = Array.isArray(itemOrItems) ? itemOrItems[0] : itemOrItems;
                        setSelected?.(item);
                        onSelect(item);
                    }}
                    initialValue={selected ?? initialValue}
                    multiple={multiple}
                    emptyMessage={type == 'bank' ? 'No banks!' : type == 'party' ? "No parties!" : type == 'branch' ? "No branches!" : type == 'payment' ? "No payments!" : type == 'adj' ? "No adjustments!" : 'No items'}
                    renderRowContent={type == 'bank' ? renderRowContentBank
                        : type == 'party' ? renderRowContent
                            : type == 'branch' ? renderRowContentBranch
                                : type == 'payment' ? renderRowContentPayment
                                    : type == 'adj' ? renderRowContentAdj
                                        : type == 'machine' ? renderRowContentMachine
                                            : type == 'design' ? renderRowContentDesign
                                                : type == 'checker' ? renderRowContentChecker
                                                    : type == 'grd' ? renderRowContentGrd
                                                        : type == 'shift' ? renderRowContentShift
                                                            : type == 'item' ? renderRowContentItem
                                                                : type == 'machine1' ? renderRowContentMachine1
                                                                    : type == 'beam' ? renderRowContentBeamData
                                                                        : type == 'employee' ? renderRowContentperson
                                                                            : type == 'operator' ? renderRowContentoperator
                                                                                : type == 'supervisior' ? renderRowContentsupervisior
                                                                                    : type == 'blend' ? renderRowContentblend
                                                                                        : type == 'count' ? renderRowContentcount
                                                                                            : type == 'ply' ? renderRowContentply
                                                                                                : type == 'type' ? renderRowContenttype
                                                                                                    : type == 'lustre' ? renderRowContentlustre
                                                                                                        : type == 'Item1' ? renderRowContentItem1                                                                                                       
                                                                                                        : type == 'SubItem' ? renderRowContentSubItem
                                                                                                            : renderRowContentEmpty}
                />
            )}

            {/* Compact selected card (tap to edit) */}
            {type == 'party' && (<>
                {selected ? (
                    <TouchableOpacity
                        style={styles.selectedCard}
                        onPress={() => dropdownRef.current?.open?.()}
                        activeOpacity={0.8}
                    >
                        <View style={styles.selectedLeft}>
                            <View style={styles.selectedAvatar}>
                                <Text style={styles.selectedAvatarText}>{initialsOf(selected.accountname)}</Text>
                            </View>
                        </View>

                        <View style={styles.selectedBody}>
                            <Text style={styles.selectedTitle}>{selected.accountname}</Text>
                            <Text style={styles.selectedTitle}>{selected.acccode}</Text>
                            <View style={styles.selectedMetaRow}>
                                <Icon name="place" size={14} color={theme.MUTED} style={{ marginRight: 6 }} />
                                <Text style={styles.selectedLocation}>{extractLocation(selected.Address)}</Text>
                            </View>
                        </View>

                        <View style={styles.selectedRight}>
                            <Icon name="edit" size={20} color={theme.MUTED} />
                        </View>
                    </TouchableOpacity>
                ) : null}
            </>)}

        </View>
    );
};

const rowStyles = StyleSheet.create({
    rowInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8, paddingRight: 6 },
    avatar: {
        width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center', marginRight: 8, flexShrink: 0,
    },
    avatarSelected: { backgroundColor: theme.BRAND_ACCENT + '22' },
    avatarText: { color: theme.BRAND_DARK, fontWeight: '800' },

    main: { flex: 1 },
    title: { fontSize: 14, color: theme.TEXT_PRIMARY, fontWeight: '800', flexWrap: 'wrap' },
    title_caption: { fontSize: 12, color: theme.TEXT_PRIMARY, fontWeight: '400', flexWrap: 'wrap' },
    titleSelected: { color: theme.BRAND_DARK },
    Address: { marginTop: 6, color: theme.TEXT_SECONDARY, fontSize: 12, lineHeight: 16 },

    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
    metaPill: { flexDirection: 'row', alignItems: 'center', marginRight: 10, marginBottom: 6 },
    metaText: { marginLeft: 6, color: theme.MUTED, fontSize: 12, maxWidth: 180 },
});

const styles = StyleSheet.create({
    trigger: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: theme.SURFACE, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.BORDER || 'rgba(0,0,0,0.06)',
    },
    loadingTrigger: { opacity: 0.95, justifyContent: 'flex-start' },
    loadingText: { color: theme.TEXT_SECONDARY, fontSize: 13 },

    selectedCard: {
        marginTop: 10, backgroundColor: theme.SURFACE, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.BORDER || 'rgba(0,0,0,0.06)', flexDirection: 'row', alignItems: 'center',
    },
    selectedLeft: { marginRight: 12 },
    selectedAvatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center' },
    selectedAvatarText: { color: theme.BRAND_DARK, fontWeight: '800' },

    selectedBody: { flex: 1 },
    selectedTitle: { fontSize: 13.5, fontWeight: '800', color: theme.BRAND_DARK },
    selectedMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    selectedLocation: { color: theme.MUTED, fontSize: 12 },

    selectedRight: { marginLeft: 12 },
});

export default PartyDropdown;
