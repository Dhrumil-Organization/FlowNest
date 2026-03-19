export interface CustomDrawerProps {
    isVisible: boolean;
    onClose: () => void;
    fromDate: Date;
    toDate: Date;
    selectedYear: string;
    selectedExe: string;
    onFromDateChange: (date: Date) => void;
    onToDateChange: (date: Date) => void;
    onYearChange: (year: string) => void;
    onExeChange: (exe: ExeData) => void;
    onLoadPress: () => void;
    // onLoadPressItem: () => void;
    exeData: ExeData[];
    designData: DesignData[];
    itemData: ItemData[];
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    onDesignSelect: (designs: DesignData[]) => void;
    onItemSelectItem: (designs: ItemData[]) => void;
    selectedItemStatus: ItemStatus;
    onItemStatusChange: (status: ItemStatus) => void;
    setSelectedDesigns: (designs: DesignData[]) => void;
    selectedDesigns: DesignData[];
    setSelectedItems: (items: ItemData[]) => void;
    selectedItems: ItemData[];
    // New prop
}

export interface CustomDrawerReceiveableProps {
    isVisible: boolean;
    onClose: () => void;
    fromDate: Date;
    toDate: Date;
    selectedYear: string;
    selectedExe: string;
    selectedPrpgrp: string;
    selectedPrpgrpAccount: string;
    onFromDateChange: (date: Date) => void;
    onToDateChange: (date: Date) => void;
    onYearChange: (year: string) => void;
    onExeChange: (exe: ExeData) => void;
    onExeChangeReceive: (exe: ReceivablesPrpgroup) => void;
    onExeChangeReceiveAccount: (exeacc: ReceivablesPrpgroupAccount) => void;
    onLoadPress: () => void;
    handleConfirmAction: Function;
    // onLoadPressItem: () => void;
    exeData: ExeData[];
    designData: DesignData[];
    itemData: ItemData[];
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    onDashPrpSelect: (prp: DashPrp[]) => void;
    onDashPartySelect: (party: DashParty[]) => void;
    onDashSexeSelect: (sexe: DashSexe[]) => void;
    onDashAccountSelect: (acc: DashAccount[]) => void;
    onDashSubHeadSelect: (sub: DashSubHead[]) => void;
    onItemSelectItem: (designs: ItemData[]) => void;
    selectedItemStatus: ItemStatus;
    onItemStatusChange: (status: ItemStatus) => void;
    setSelectedDesigns: (designs: DesignData[]) => void;
    selectedDesigns: DesignData[];
    setSelectedDashPrp: (prp: DashPrp[]) => void;
    setSelectedDashParty: (party: DashParty[]) => void;
    setSelectedDashSexe: (sexe: DashSexe[]) => void;
    setSelectedDashAccount: (acc: DashAccount[]) => void;
    setSelectedDashSubHead: (sub: DashSubHead[]) => void;
    selectedDashPrp: DashPrp[];
    selectedDashParty: DashParty[];
    selectedDashSexe: DashSexe[];
    selectedDashAccount: DashAccount[];
    selectedDashSubHead: DashSubHead[];
    setSelectedItems: (items: ItemData[]) => void;
    selectedItems: ItemData[];
    receivables_prpgroup: ReceivablesPrpgroup[];
    receivables_prpgroup_Account: ReceivablesPrpgroupAccount[];
    internal_dropdown: InternalDropdown[];
    onExeChangeInternal: (internal: InternalDropdown) => void;
    selectedInternal: string;
    getdashPrp: DashPrp[];
    getdashParty: DashParty[];
    getdashSexe: DashSexe[];
    getdashAccount: DashAccount[];
    getdashSubHead: DashSubHead[];
    getAccountLoading: boolean;
    dashAccount: Function;
    getdashPropertyLoading: boolean;
    getdashPartyLoading: boolean;
    getdashSubHeadLoading: boolean;
    getdashSexeLoading: boolean;
    getdashAccountLoading: boolean;
    hideprpGroup: boolean;
    // setAccountLoading: void
    // New prop
}

export interface ReceivablesPrpgroup {
    PrpTypeCode: string;
    PrpTypeOf: string;
}

export interface ReceivablesSummary {
    rowid: string;
    AccCode: string;
    AccName: string;
    MHead: string;
    MHName: string;
    sexe: string;
    sename: string;
    crlimit: string;
    crday: string;
    Total: string;
    advance: string;
    onaccount: string;
    slab1: string;
    slab2: string;
    slab3: string;
    slab4: string;
    slab5: string;
    nclramt: string;
    pdcamt: string;
    BrkName: string;

}
export interface ReceivablesDetails {
    rowid: string;
    ACCCODE: string;
    TRANDATE: string;
    NTRANDATE: string;
    TYPE: string;
    VOUNO: string;
    DOCNO: string;
    AMOUNT: string;
    PAID: string;
    BAL: string;
    CUMBAL: string;
    NARR: string;
    Cdate: string;
    DUEDAY: string;
    PTCL: string;
}
export interface ReceivablesPrpgroupAccount {
    acccode: string;
    accname: string;
    accountname: string;
    ParCode: string;
    ParName: string;
    value: string;
    label: string;
    Address: string;
    City: string;
    State: string;
    Cnty: string;
    Zip: string;
    ParType: string;
    MHName: string;
    SHName: string;
    Status: string;
    bkrcode: string;
    bkrname: string;
    sexe: string;
    sexename: string;
}
export interface InternalDropdown {
    lable: string;
    value: string;
}
export interface POTDataProps {
    gePOTData: POTData[];
    searchQueryPOT: string;
    getpayload: CardPayload[]
    token: string
}


export interface ExeData {
    Code: string;
    SalesExecutive: string;
}
export interface CardPayload {
    fromDate: string;
    toDate: string;
    yearno: string;
    sexes: string;
    type: string
    dsncodes: DesignCode[];
    item: ItemCode[];
    prptype: string
    txntype: string
    rowdata: RowSelectData[];
}
export interface StageData {
    stage: string
    qty: string
}

export interface RowSelectData {
    prpcode: string;
    vouno: string;
    voudate: string;
    accname: string;
    uid: string;
    totqty: string;
    sexename: string;
    dsnname: string;
    itmname: string;
    ptype: string;
    producedqty: string;
    prodpending: string;
    pendingperc: string;
}
export interface DesignData {
    DsnCode: string;
    DsnName: string;
}
export interface DashPrp {
    PrpCode: string;
    PrpName: string;
    PrpOf: string;
    PrpOfFull: string;
}
export interface DashParty {
    acccode: string;
    accname: string;
    accountname: string;
    ParCode: string;
    ParName: string;
    value: string;
    label: string;
    Address: string;
    City: string;
    State: string;
    Cnty: string;
    Zip: string;
    ParType: string;
    MHName: string;
    SHName: string;
    Status: string;
    bkrcode: string;
    bkrname: string;
    sexe: string;
    sexename: string;
}
export interface DashSexe {
    Code: string;
    SalesExecutive: string;
}
export interface DashAccount {
    AccCode: string;
    AccName: string;
}
export interface DashSubHead {
    SHName: string;
    SHead: string;
}
export interface DesignCode {
    DsnCode: string;
}

export interface ItemData {
    ItmCode: string;
    ItmName: string;
}
export interface ItemCode {
    ItmCode: string;
}

export interface POTData {
    prpcode: string;
    vouno: string;
    voudate: string;
    accname: string;
    uid: string;
    totqty: string;
    sexename: string;
    dsnname: string;
    itmname: string;
    ptype: string;
    producedqty: string;
    prodpending: string;
    pendingperc: string;
}

export type ItemStatus = 'All' | 'Open' | 'Closed';

export interface LabelMap {
    [key: string]: {
        label: string;
        hide?: boolean;
    };
}