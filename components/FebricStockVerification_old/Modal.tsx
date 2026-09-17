export interface FormStateType {
    values: {
        [key: string]: any;
    };
}
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
    getAllPropertyData: [];
    FormState: {};
    setFormState: React.Dispatch<React.SetStateAction<FormStateType>>;
    getAllYearData: [];
    getAllStoreData: [];
    getAllStockData: []
    setAllStockData: React.Dispatch<React.SetStateAction<FormStateType>>;
    token: string;
    // New prop
}
export interface POTDataProps {
    gePOTData: POTData[];
    searchQueryPOT: string;
    getpayload: CardPayload[]
    token: string
    parentDesignData: any[];
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

