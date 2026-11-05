export type Carton = {
    CartNo: string; TranType: any; PUId: any; PSrNo: any; PSubSr: any;
    ItmCode: string; ItmName: string; MerCode: any; MerName: string; GrdCode: any; GrdName: string;
    ShdCode: any; ShdName: string; Denier: number; Chees: number; Wt: number; MItmCode: string;
    BalUnknown?: boolean; // QR without chees (short label): balance is not known on the device
};
