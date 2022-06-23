
export enum eRxState {
    E_STATE_RX_WAIT_START,
    E_STATE_RX_WAIT_TYPELSB,
    E_STATE_RX_WAIT_TYPEMSB,
    E_STATE_RX_WAIT_LENLSB,
    E_STATE_RX_WAIT_LENMSB,
    E_STATE_RX_WAIT_CRC,
    E_STATE_RX_WAIT_DATA
}

export interface rdHost_t {
    queue: number[];
    busy: boolean;
    tmoRef: any;
    rdType: string;
    idx: number;
    retryCnt: number;
}

export interface slCmd_t {
    seqNum: number;
    ttl: number;
    cmdID: number;
    hostShortAddr: number;
    ip: string;
    port: number;
}

export interface dataHost_t {
    shortAddr: number;
    extAddr: number;
    numAttrSets: number;
    numSrcBinds: number;
}
export interface attrSet_t {
    hostShortAddr: number;
    partNum: number;
    clusterServer: number;
    extAddr: number;
    shortAddr: number;
    endPoint: number;
    clusterID: number;
    attrSetID: number;
    attrMap: number;
    valsLen: number;
    attrVals: number[];
}
export interface attrSpec_t {
    attrID: number;
    isVisible: boolean;
    isSensor: boolean;
    hasHistory: boolean;
    formatedVal: string;
    timestamp: number;
    attrVal: number;
}
export interface nsPos_t {
    x: number;
    y: number;
}
export interface ngStyle_t {
    color: string;
    bgColor: string;
    fontSize: number;
    //border: string;
    borderWidth: number;
    borderStyle: string;
    borderColor: string;
    borderRadius: number;
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
}
export interface valCorr_t{
    units: number;
    slope: number;
    offset: number;
}

export interface hostedSet_t {
    timestamp: number;
    hostShortAddr: number;
    partNum: number;
    extAddr: number;
    shortAddr: number;
    endPoint: number;
    clusterID: number;
    attrSetID: number;
    setVals: any;
}

export interface hostedAttr_t {
    drag: boolean;
    isSel: boolean;
    timestamp: number;
    pos: nsPos_t;
    name: string;
    style: ngStyle_t;
    valCorr: valCorr_t;
    hostShortAddr: number;
    partNum: number;
    clusterServer: number;
    extAddr: number;
    shortAddr: number;
    endPoint: number;
    clusterID: number;
    attrSetID: number;
    attrID: number;
    isValid: boolean;
    isSensor:boolean;
    formatedVal: string;
    timestamps: number[];
    attrVals: number[];
}

export interface attrKey_t {
    shortAddr: number;
    endPoint: number;
    clusterID: number;
    attrSetID: number;
    attrID: number;
}

export interface storedAttr_t {
    attrName: string;
    pos: nsPos_t;
    style: ngStyle_t;
    valCorr: valCorr_t;
}

export interface bindDst_t {
    dstExtAddr: number;
    dstEP: number;
}
export interface hostedBinds_t {
    timestamp: number;
    name: string;
    partNum: number;
    hostShortAddr: number;
    extAddr: number;
    srcShortAddr: number;
    srcEP: number;
    clusterID: number;
    maxBinds: number;
    bindsDst: bindDst_t[];
}
export interface srcBinds_t {
    partNum: number;
    hostShortAddr: number;
    extAddr: number;
    srcShortAddr: number;
    srcEP: number;
    clusterID: number;
    maxBinds: number;
    bindsDst: bindDst_t[];
}
export interface bind_t {
    valid: boolean;
    partNum: number;
    extAddr: number;
    name: string;
    clusterID: number;
    shortAddr: number;
    endPoint: number;
}

export interface storedBinds_t {
    bindsName: string;
}

export interface descVal_t {
    key: string;
    value: string
}

export  interface partDesc_t {
    partNum: number;
    devName: string;
    part: string;
    url: string;
}

export  interface part_t {
    devName: string;
    part: string;
    url: string;
}

export interface scroll_t {
    name: string;
    yPos: number;
    duration: number
}

export interface udpZclReq_t {
    ip: string;
    port: number;
    shortAddr: number;
    endPoint: number;
    clusterID: number;
    hasRsp: number;
    cmdLen: number;
    cmd: number[]
}

export interface dns_t {
    user: string;
    psw: string;
    domain: string;
    token: string;
}

export interface slMsg_t {
    type: number;
    msg: number[];
}

export interface hostCmd_t {
    shortAddr: number;
    type: number;
    idx: number;
    retryCnt: number;
    param:string;
}

export interface udpCmd_t {
    seqNum: number;
    ttl: number;
    cmdID: number;
    hostShortAddr: number;
    ip: string;
    port: number;
}

export interface imgDim_t {
    width: number;
    height: number;
}

export interface workerCmd_t {
    type: number;
    cmd: any;
}





