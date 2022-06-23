import {Injectable, OnDestroy} from '@angular/core';
import {EventsService} from "./events.service";
import {UtilsService} from './utils.service';
import * as gConst from '../gConst';
import * as gIF from '../gIF'

@Injectable({
    providedIn: 'root'
})
export class PortService implements OnDestroy{

    private searchPortFlag = false;
    private validPortFlag = false;
    private portOpenFlag = false;
    private portIdx = 0;

    private testPortTMO = null;
    private findPortTMO = null;

    private crc: number;
    private calcCRC: number;
    private msgIdx: number;
    private isEsc = false;
    private rxBuf = new ArrayBuffer(1024);
    private rxMsg = new Uint8Array(this.rxBuf);
    private rxState: gIF.eRxState = gIF.eRxState.E_STATE_RX_WAIT_START;

    private msgType: number;
    private msgLen: number;

    private seqNum = 0;

    private hostCmdQueue: gIF.hostCmd_t[] = [];
    private hostCmdFlag = false;
    private hostCmdTmoRef;
    private runTmoRef = null;

    private comFlag = false;

    private slPort = {} as any;
    private comPorts = [];
    private SerialPort = window.nw.require('chrome-apps-serialport').SerialPort;

    constructor(private events: EventsService,
                private utils: UtilsService) {
        this.events.subscribe('wr_binds', (binds)=>{
            this.wrBinds(binds);
        });
        this.events.subscribe('zcl_cmd', (cmd)=>{
            this.udpZclCmd(cmd);
        });
    }

    /***********************************************************************************************
     * fn          checkCom
     *
     * brief
     *
     */
    async checkCom() {

        if(this.comFlag == false){
            if(this.searchPortFlag == false) {
                setTimeout(() => {
                    this.listComPorts();
                }, 100);
            }
        }
        this.comFlag = false;
        setTimeout(()=>{
            this.checkCom();
        }, 10000);
    }

    /***********************************************************************************************
     * fn          ngOnDestroy
     *
     * brief
     *
     */
    ngOnDestroy() {
        // ---
    }

    /***********************************************************************************************
     * fn          closeComPort
     *
     * brief
     *
     */
    closeComPort() {
        this.validPortFlag = false;
        this.portOpenFlag = false;
        console.log('close serial port');
        if(typeof(this.slPort.close) === 'function'){
            this.slPort.close((err)=>{
                if(err) {
                    console.log(`port close err: ${err.message}`);
                }
            });
        }
    }

    /***********************************************************************************************
     * fn          listComPorts
     *
     * brief
     *
     */
    listComPorts(){
        this.hostCmdQueue = [];
        this.hostCmdFlag = false;

        this.searchPortFlag = true;
        this.validPortFlag = false;
        if(this.portOpenFlag == true){
            this.closeComPort();
        }
        this.SerialPort.list().then((ports)=>{
            this.comPorts = ports;
            if(ports.length){
                this.portIdx = 0;
                setTimeout(()=>{
                    this.findComPort();
                }, 100);
            }
            else {
                this.searchPortFlag = false;
                console.log('no com ports');
            }
        });
    }

    /***********************************************************************************************
     * fn          findComPort
     *
     * brief
     *
     */
    private findComPort(){
        if(this.validPortFlag == false) {
            if(this.portOpenFlag == true){
                this.closeComPort();
            }
            let portPath = this.comPorts[this.portIdx].path;
            console.log('testing: ', portPath);
            let portOpt = {
                baudrate: 115200,
                autoOpen: false
            };
            this.slPort = new this.SerialPort(portPath, portOpt);
            this.slPort.on('open', ()=>{
                this.slPort.on('data', (data)=>{
                    this.slOnData(data);
                });
            });
            let openErr = false;
            this.slPort.open((err)=>{
                if(err) {
                    openErr = true;
                    console.log(`open err on ${portPath}: ${err.message}`);
                }
                else {
                    this.portOpenFlag = true;
                    this.testPortTMO = setTimeout(()=>{
                        this.testPortTMO = null;
                        console.log('test port tmo');
                        this.closeComPort();
                    }, 1000);
                    this.testPortReq();
                   }
            });
            this.portIdx++;
            if(this.portIdx < this.comPorts.length){
                this.findPortTMO = setTimeout(() => {
                    this.findPortTMO = null;
                    this.findComPort();
                }, openErr ? 200 : 2000);
            }
            else {
                this.searchPortFlag = false;
                this.findPortTMO = null;
            }
        }
    }

    /***********************************************************************************************
     * fn          slOnData
     *
     * brief
     *
     */
    private slOnData(msg) {

        let pkt = new Uint8Array(msg);
        for(let i = 0; i < pkt.length; i++){
            let rxByte = pkt[i];
            switch(rxByte){
                case gConst.SL_START_CHAR: {
                    this.msgIdx = 0;
                    this.isEsc = false;
                    this.rxState = gIF.eRxState.E_STATE_RX_WAIT_TYPELSB;
                    break;
                }
                case gConst.SL_ESC_CHAR: {
                    this.isEsc = true;
                    break;
                }
                case gConst.SL_END_CHAR: {
                    if(this.crc == this.calcCRC) {
                        let slMsg: gIF.slMsg_t = {
                            type: this.msgType,
                            msg: Array.from(this.rxMsg).slice(0, this.msgIdx)
                        };
                        setTimeout(()=>{
                            this.processMsg(slMsg);
                        }, 0);
                    }
                    this.rxState = gIF.eRxState.E_STATE_RX_WAIT_START;
                    break;
                }
                default: {
                    if(this.isEsc == true){
                        rxByte ^= 0x10;
                        this.isEsc = false;
                    }
                    switch(this.rxState) {
                        case gIF.eRxState.E_STATE_RX_WAIT_START: {
                            // ---
                            break;
                        }
                        case gIF.eRxState.E_STATE_RX_WAIT_TYPELSB: {
                            this.msgType = rxByte;
                            this.rxState = gIF.eRxState.E_STATE_RX_WAIT_TYPEMSB;
                            this.calcCRC = rxByte;
                            break;
                        }
                        case gIF.eRxState.E_STATE_RX_WAIT_TYPEMSB: {
                            this.msgType += rxByte << 8;
                            this.rxState = gIF.eRxState.E_STATE_RX_WAIT_LENLSB;
                            this.calcCRC ^= rxByte;
                            break;
                        }
                        case gIF.eRxState.E_STATE_RX_WAIT_LENLSB: {
                            this.msgLen = rxByte;
                            this.rxState = gIF.eRxState.E_STATE_RX_WAIT_LENMSB;
                            this.calcCRC ^= rxByte;
                            break;
                        }
                        case gIF.eRxState.E_STATE_RX_WAIT_LENMSB: {
                            this.msgLen += rxByte << 8;
                            this.rxState = gIF.eRxState.E_STATE_RX_WAIT_CRC;
                            this.calcCRC ^= rxByte;
                            break;
                        }
                        case gIF.eRxState.E_STATE_RX_WAIT_CRC: {
                            this.crc = rxByte;
                            this.rxState = gIF.eRxState.E_STATE_RX_WAIT_DATA;
                            break;
                        }
                        case gIF.eRxState.E_STATE_RX_WAIT_DATA: {
                            if(this.msgIdx < this.msgLen){
                                this.rxMsg[this.msgIdx++] = rxByte;
                                this.calcCRC ^= rxByte;
                            }
                            break;
                        }
                    }
                }
            }
        }
    }

    /***********************************************************************************************
     * fn          processMsg
     *
     * brief
     *
     */
    private processMsg(msg: gIF.slMsg_t){

        this.comFlag = true;

        let dataArray = new Uint8Array(msg.msg);
        switch(msg.type) {
            case gConst.SL_MSG_TESTPORT: {
                let rxView = new DataView(this.rxBuf);
                let idNum: number;
                //let byteData: number;
                let msgIdx = 0;
                let msgSeqNum = rxView.getUint8(msgIdx++);
                if(msgSeqNum == this.seqNum) {
                    idNum = rxView.getUint32(msgIdx, gConst.LE);
                    msgIdx += 4;
                    if(idNum === 0x67190110){
                        if(this.findPortTMO){
                            clearTimeout(this.findPortTMO);
                            this.findPortTMO = null;
                        }
                        if(this.testPortTMO){
                            clearTimeout(this.testPortTMO);
                            this.testPortTMO = null;
                            this.validPortFlag = true;
                            this.searchPortFlag = false;
                            console.log('port valid');
                        }
                    }
                }
                break;
            }
            case gConst.SL_MSG_HOST_ANNCE: {
                let slMsg = new DataView(dataArray.buffer);
                let dataHost = {} as gIF.dataHost_t;
                let idx = 0;
                dataHost.shortAddr = slMsg.getUint16(idx, gConst.LE);
                idx += 2;
                dataHost.extAddr = slMsg.getFloat64(idx, gConst.LE);
                idx += 8;
                dataHost.numAttrSets = slMsg.getInt8(idx++);
                dataHost.numSrcBinds = slMsg.getInt8(idx++);
                let ttl = slMsg.getUint16(idx, gConst.LE);

                let msg = this.utils.timeStamp();
                msg += ` host annce -> shortAddr: 0x${dataHost.shortAddr.toString(16).padStart(4, '0').toUpperCase()},`;
                msg += ` extAddr: ${this.extToHex(dataHost.extAddr)},`;
                msg += ` numAttrSets: ${dataHost.numAttrSets},`;
                msg += ` numSrcBinds: ${dataHost.numSrcBinds}`;
                console.log(msg);

                if(this.hostCmdQueue.length > 15){
                    this.hostCmdQueue = [];
                    this.hostCmdFlag = false;
                }

                //if(this.hostCmdQueue.length < 1000) {
                    if(dataHost.numAttrSets > 0) {
                        let cmd: gIF.hostCmd_t = {
                            shortAddr: dataHost.shortAddr,
                            type: gConst.RD_ATTR,
                            idx: 0,
                            retryCnt: gConst.RD_HOST_RETRY_CNT,
                            param: ''
                        };
                        this.hostCmdQueue.push(cmd);
                    }
                    if(dataHost.numSrcBinds > 0) {
                        let cmd: gIF.hostCmd_t = {
                            shortAddr: dataHost.shortAddr,
                            type: gConst.RD_BINDS,
                            idx: 0,
                            retryCnt: gConst.RD_HOST_RETRY_CNT,
                            param: ''
                        };
                        this.hostCmdQueue.push(cmd);
                    }
                    if(this.hostCmdQueue.length > 0) {
                        if(this.hostCmdFlag == false) {
                            this.hostCmdFlag = true;
                            this.runHostCmd();
                        }
                        if(this.runTmoRef === null) {
                            this.runTmoRef = setTimeout(() => {
                                this.runTmoRef = null;
                                this.hostCmdFlag = true;
                                this.runHostCmd();
                            }, 3000);
                        }
                    }
                //}
                //else {
                //    console.log('*** OVERLOAD ***');
                //}
                break;
            }
            case gConst.SL_MSG_LOG: {
                let idx = dataArray.indexOf(10);
                if(idx > -1){
                    dataArray[idx] = 32;
                }
                console.log(String.fromCharCode.apply(null, dataArray));
                break;
            }
            case gConst.SL_MSG_READ_ATTR_SET_AT_IDX: {
                let rxSet = {} as gIF.attrSet_t;
                let rxView = new DataView(dataArray.buffer);
                let msgIdx = 0;
                let msgSeqNum = rxView.getUint8(msgIdx++);
                if(msgSeqNum == this.seqNum){
                    rxSet.hostShortAddr = this.hostCmdQueue[0].shortAddr;
                    let status = rxView.getUint8(msgIdx++);
                    if(status == gConst.SL_CMD_OK) {
                        let memIdx = rxView.getInt8(msgIdx++);
                        rxSet.partNum = rxView.getUint32(msgIdx, gConst.LE);
                        msgIdx += 4;
                        rxSet.clusterServer = rxView.getUint8(msgIdx++);
                        rxSet.extAddr = rxView.getFloat64(msgIdx, gConst.LE);
                        msgIdx += 8;
                        rxSet.shortAddr = rxView.getUint16(msgIdx, gConst.LE);
                        msgIdx += 2;
                        rxSet.endPoint = rxView.getUint8(msgIdx++);
                        rxSet.clusterID = rxView.getUint16(msgIdx, gConst.LE);
                        msgIdx += 2;
                        rxSet.attrSetID = rxView.getUint16(msgIdx, gConst.LE);
                        msgIdx += 2;
                        rxSet.attrMap = rxView.getUint16(msgIdx, gConst.LE);
                        msgIdx += 2;
                        rxSet.valsLen = rxView.getUint8(msgIdx++);
                        rxSet.attrVals = [];
                        for(let i =  0; i < rxSet.valsLen; i++){
                            rxSet.attrVals[i] = rxView.getUint8(msgIdx++);
                        }

                        this.events.publish('attr_set', JSON.stringify(rxSet));

                        let cmd = this.hostCmdQueue.shift();
                        cmd.idx = memIdx + 1;
                        cmd.retryCnt = gConst.RD_HOST_RETRY_CNT;
                        this.hostCmdQueue.push(cmd);
                        this.runHostCmd();
                    }
                    else {
                        this.hostCmdQueue.shift();
                        if(this.hostCmdQueue.length > 0){
                            this.runHostCmd();
                        }
                        else {
                            this.seqNum = ++this.seqNum % 256;
                            clearTimeout(this.hostCmdTmoRef);
                            this.hostCmdFlag = false;
                        }
                    }
                }
                break;
            }
            case gConst.SL_MSG_READ_BINDS_AT_IDX: {
                let rxBinds = {} as gIF.srcBinds_t;
                let rxView = new DataView(dataArray.buffer);
                let msgIdx = 0;
                let msgSeqNum = rxView.getUint8(msgIdx++);
                if(msgSeqNum == this.seqNum){
                    rxBinds.hostShortAddr = this.hostCmdQueue[0].shortAddr;
                    let status = rxView.getUint8(msgIdx++);
                    if(status == gConst.SL_CMD_OK) {
                        let memIdx = rxView.getInt8(msgIdx++);
                        rxBinds.partNum = rxView.getUint32(msgIdx, gConst.LE);
                        msgIdx += 4;
                        rxBinds.extAddr = rxView.getFloat64(msgIdx, gConst.LE);
                        msgIdx += 8;
                        rxBinds.srcShortAddr = rxView.getUint16(msgIdx, gConst.LE);
                        msgIdx += 2;
                        rxBinds.srcEP = rxView.getUint8(msgIdx++);
                        rxBinds.clusterID = rxView.getUint16(msgIdx, gConst.LE);
                        msgIdx += 2;
                        rxBinds.maxBinds = rxView.getUint8(msgIdx++);
                        let numBinds = rxView.getUint8(msgIdx++);
                        rxBinds.bindsDst = [];
                        for(let i = 0; i < numBinds; i++){
                            let bindDst = {} as gIF.bindDst_t;
                            bindDst.dstExtAddr = rxView.getFloat64(msgIdx, gConst.LE);
                            msgIdx += 8;
                            bindDst.dstEP = rxView.getUint8(msgIdx++);
                            rxBinds.bindsDst.push(bindDst);
                        }

                        this.events.publish('src_binds', JSON.stringify(rxBinds));

                        let cmd = this.hostCmdQueue.shift();
                        cmd.idx = memIdx + 1;
                        cmd.retryCnt = gConst.RD_HOST_RETRY_CNT;
                        this.hostCmdQueue.push(cmd);
                        this.runHostCmd();
                    }
                    else {
                        this.hostCmdQueue.shift();
                        if(this.hostCmdQueue.length > 0){
                            this.runHostCmd();
                        }
                        else {
                            this.seqNum = ++this.seqNum % 256;
                            clearTimeout(this.hostCmdTmoRef);
                            this.hostCmdFlag = false;
                        }
                    }
                }
                break;
            }
            case gConst.SL_MSG_WRITE_SRC_BINDS: {
                let rxView = new DataView(dataArray.buffer);
                let msgIdx = 0;
                let msgSeqNum = rxView.getUint8(msgIdx++);
                if(msgSeqNum == this.seqNum){
                    let status = rxView.getUint8(msgIdx++);
                    if(status == gConst.SL_CMD_OK) {
                        console.log('wr binds status: OK');
                    }
                    else {
                        console.log('wr binds status: FAIL');
                    }
                    this.hostCmdQueue.shift();
                    if(this.hostCmdQueue.length > 0){
                        this.runHostCmd();
                    }
                    else {
                        this.seqNum = ++this.seqNum % 256;
                        clearTimeout(this.hostCmdTmoRef);
                        this.hostCmdFlag = false;
                    }
                }
                break;
            }
            case gConst.SL_MSG_ZCL_CMD: {
                let rxView = new DataView(dataArray.buffer);
                let msgIdx = 0;
                let msgSeqNum = rxView.getUint8(msgIdx++);
                if(msgSeqNum == this.seqNum){
                    // ---
                    this.hostCmdQueue.shift();
                    if(this.hostCmdQueue.length > 0){
                        this.runHostCmd();
                    }
                    else {
                        this.seqNum = ++this.seqNum % 256;
                        clearTimeout(this.hostCmdTmoRef);
                        this.hostCmdFlag = false;
                    }
                }
                break;
            }
            default: {
                console.log('unsupported sl command!');
                break;
            }
        }
    }

    /***********************************************************************************************
     * fn          runHostCmd
     *
     * brief
     *
     */
    private runHostCmd(){

        clearTimeout(this.hostCmdTmoRef);

        if(this.runTmoRef){
            clearTimeout(this.runTmoRef);
            this.runTmoRef = null;
        }

        let hostCmd = this.hostCmdQueue[0];
        if(hostCmd) {
            switch (hostCmd.type) {
                case gConst.RD_ATTR: {
                    //setTimeout(() => {
                        this.reqAttrAtIdx();
                    //}, gConst.REQ_TMO);
                    break;
                }
                case gConst.RD_BINDS: {
                    //setTimeout(() => {
                        this.reqBindsAtIdx();
                    //}, gConst.REQ_TMO);
                    break;
                }
                case gConst.WR_BINDS: {
                    //setTimeout(() => {
                        this.wrBindsReq();
                    //}, gConst.REQ_TMO);
                    break;
                }
                case gConst.ZCL_CMD: {
                    //setTimeout(() => {
                        this.udpZclReq();
                    //}, gConst.REQ_TMO);
                    break;
                }
            }
        }
        this.hostCmdTmoRef = setTimeout(()=>{
            this.hostCmdTmo();
        }, gConst.RD_HOST_TMO);

    }

    /***********************************************************************************************
     * fn          hostCmdTmo
     *
     * brief
     *
     */
    private hostCmdTmo(){

        console.log("--- READ_HOST_TMO ---");

        if(this.hostCmdQueue.length == 0){
            this.hostCmdFlag = false;
            return;
        }
        let hostCmd = this.hostCmdQueue.shift();
        if(hostCmd.retryCnt){
            hostCmd.retryCnt--;
            this.hostCmdQueue.push(hostCmd);
        }
        if(this.hostCmdQueue.length == 0){
            this.hostCmdFlag = false;
            return;
        }

        let cmd = this.hostCmdQueue[0];
        switch(cmd.type){
            case gConst.RD_ATTR: {
                this.reqAttrAtIdx();
                break;
            }
            case gConst.RD_BINDS: {
                this.reqBindsAtIdx();
                break;
            }
            case gConst.WR_BINDS: {
                this.wrBindsReq();
                break;
            }
            case gConst.ZCL_CMD: {
                this.udpZclReq();
                break;
            }
        }

        this.hostCmdTmoRef = setTimeout(()=>{
            this.hostCmdTmo();
        }, gConst.RD_HOST_TMO);
    }

    /***********************************************************************************************
     * fn          testPortReq
     *
     * brief
     *
     */
    private testPortReq(){

        let pktBuf = new ArrayBuffer(64);
        let pktData = new Uint8Array(pktBuf);
        let pktView = new DataView(pktBuf);
        let slMsgBuf = new Uint8Array(128);
        let i: number;
        let msgIdx: number;

        this.seqNum = ++this.seqNum % 256;
        msgIdx = 0;
        pktView.setUint16(msgIdx, gConst.SL_MSG_TESTPORT, gConst.LE);
        msgIdx += 2;
        msgIdx += (2 + 1); // len + crc
        // cmd data
        pktView.setUint8(msgIdx++, this.seqNum);
        pktView.setUint32(msgIdx, 0x67190110, gConst.LE);
        msgIdx += 4;
        let msgLen = msgIdx;
        let dataLen = msgLen - gConst.HEAD_LEN;
        pktView.setUint16(gConst.LEN_IDX, dataLen, gConst.LE);
        let crc = 0;
        for(i = 0; i < msgLen; i++){
            crc ^= pktData[i];
        }
        pktView.setUint8(gConst.CRC_IDX, crc);

        msgIdx = 0;
        slMsgBuf[msgIdx++] = gConst.SL_START_CHAR;
        for(i = 0; i < msgLen; i++) {
            if(pktData[i] < 0x10){
                pktData[i] ^= 0x10;
                slMsgBuf[msgIdx++] = gConst.SL_ESC_CHAR;
            }
            slMsgBuf[msgIdx++] = pktData[i];
        }
        slMsgBuf[msgIdx++] = gConst.SL_END_CHAR;

        let slMsgLen = msgIdx;
        let slMsg = slMsgBuf.slice(0, slMsgLen);
        this.slPort.write(slMsg, "utf8", ()=>{
            // ---
        });
    }

    /***********************************************************************************************
     * fn          reqAttrAtIdx
     *
     * brief
     *
     */
    private reqAttrAtIdx(){

        let hostCmd = this.hostCmdQueue[0];

        if(hostCmd.shortAddr == undefined){
            console.log('--- REQ_ATTR_AT_IDX HOST UNDEFINED ---');
            return; // EMBEDDED RETURN
        }
        let pktBuf = new ArrayBuffer(64);
        let pktData = new Uint8Array(pktBuf);
        let pktView = new DataView(pktBuf);
        let slMsgBuf = new Uint8Array(128);
        let i: number;
        let msgIdx: number;

        this.seqNum = ++this.seqNum % 256;
        msgIdx = 0;
        pktView.setUint16(msgIdx, gConst.SL_MSG_READ_ATTR_SET_AT_IDX, gConst.LE);
        msgIdx += 2;
        msgIdx += (2 + 1); // len + crc
        // cmd data
        pktView.setUint8(msgIdx++, this.seqNum);
        pktView.setUint16(msgIdx, hostCmd.shortAddr, gConst.LE);
        msgIdx += 2;
        pktView.setUint8(msgIdx++, hostCmd.idx);

        let msgLen = msgIdx;
        let dataLen = msgLen - gConst.HEAD_LEN;
        pktView.setUint16(gConst.LEN_IDX, dataLen, gConst.LE);
        let crc = 0;
        for(i = 0; i < msgLen; i++){
            crc ^= pktData[i];
        }
        pktView.setUint8(gConst.CRC_IDX, crc);

        msgIdx = 0;
        slMsgBuf[msgIdx++] = gConst.SL_START_CHAR;
        for(i = 0; i < msgLen; i++) {
            if(pktData[i] < 0x10){
                pktData[i] ^= 0x10;
                slMsgBuf[msgIdx++] = gConst.SL_ESC_CHAR;
            }
            slMsgBuf[msgIdx++] = pktData[i];
        }
        slMsgBuf[msgIdx++] = gConst.SL_END_CHAR;

        let slMsgLen = msgIdx;
        let slMsg = slMsgBuf.slice(0, slMsgLen);
        this.slPort.write(slMsg, "utf8", ()=>{
            // ---
        });
    }

    /***********************************************************************************************
     * fn          reqBindsAtIdx
     *
     * brief
     *
     */
    private reqBindsAtIdx(){

        let hostCmd = this.hostCmdQueue[0];

        if(hostCmd.shortAddr == undefined){
            console.log('----- REQ_BINDS_AT_IDX HOST UNDEFINED -----');
            return; // EMBEDDED RETURN
        }
        let pktBuf = new ArrayBuffer(64);
        let pktData = new Uint8Array(pktBuf);
        let pktView = new DataView(pktBuf);
        let slMsgBuf = new Uint8Array(128);
        let i: number;

        this.seqNum = ++this.seqNum % 256;
        let msgIdx = 0;
        pktView.setUint16(msgIdx, gConst.SL_MSG_READ_BINDS_AT_IDX, gConst.LE);
        msgIdx += 2;
        msgIdx += (2 + 1); // len + crc
        // cmd data
        pktView.setUint8(msgIdx++, this.seqNum);
        pktView.setUint16(msgIdx, hostCmd.shortAddr, gConst.LE);
        msgIdx += 2;
        pktView.setUint8(msgIdx++, hostCmd.idx);

        let msgLen = msgIdx;
        let dataLen = msgLen - gConst.HEAD_LEN;
        pktView.setUint16(gConst.LEN_IDX, dataLen, gConst.LE);
        let crc = 0;
        for(i = 0; i < msgLen; i++){
            crc ^= pktData[i];
        }
        pktView.setUint8(gConst.CRC_IDX, crc);

        msgIdx = 0;
        slMsgBuf[msgIdx++] = gConst.SL_START_CHAR;
        for(i = 0; i < msgLen; i++) {
            if(pktData[i] < 0x10){
                pktData[i] ^= 0x10;
                slMsgBuf[msgIdx++] = gConst.SL_ESC_CHAR;
            }
            slMsgBuf[msgIdx++] = pktData[i];
        }
        slMsgBuf[msgIdx++] = gConst.SL_END_CHAR;

        let slMsgLen = msgIdx;
        let slMsg = slMsgBuf.slice(0, slMsgLen);
        this.slPort.write(slMsg, "utf8", ()=>{
            // ---
        });
    }

    /***********************************************************************************************
     * fn          wrBinds
     *
     * brief
     *
     */
    wrBinds(binds: string){

        let cmd: gIF.hostCmd_t = {
            shortAddr: 0,   // not used
            type: gConst.WR_BINDS,
            idx: 0,         // not used
            retryCnt: gConst.RD_HOST_RETRY_CNT,
            param: binds
        };
        this.hostCmdQueue.push(cmd);
        if(this.hostCmdFlag == false){
            this.hostCmdFlag = true;
            this.runHostCmd();
        }
    }

    /***********************************************************************************************
     * fn          wrBindsReq
     *
     * brief
     *
     */
    private wrBindsReq(){

        let hostCmd = this.hostCmdQueue[0];
        let bindSrc: gIF.hostedBinds_t = JSON.parse(hostCmd.param);

        let pktBuf = new ArrayBuffer(64);
        let pktData = new Uint8Array(pktBuf);
        let pktView = new DataView(pktBuf);
        let slMsgBuf = new Uint8Array(128);
        let msgIdx: number;
        let i: number;

        this.seqNum = ++this.seqNum % 256;
        msgIdx = 0;
        pktView.setUint16(msgIdx, gConst.SL_MSG_WRITE_SRC_BINDS, gConst.LE);
        msgIdx += 2;
        msgIdx += (2 + 1); // len + crc
        // cmd data
        pktView.setUint8(msgIdx++, this.seqNum);
        pktView.setUint16(msgIdx, bindSrc.hostShortAddr, gConst.LE);
        msgIdx += 2;
        pktView.setUint16(msgIdx, bindSrc.srcShortAddr, gConst.LE);
        msgIdx += 2;
        pktView.setUint8(msgIdx++, bindSrc.srcEP);
        pktView.setUint16(msgIdx, bindSrc.clusterID, gConst.LE);
        msgIdx += 2;
        let bindsLenIdx = msgIdx;
        msgIdx += 1; // bindsLen;
        let lenStart = msgIdx;
        pktView.setUint8(msgIdx++, bindSrc.bindsDst.length);
        for(i = 0; i < bindSrc.bindsDst.length; i++){
            pktView.setFloat64(msgIdx, bindSrc.bindsDst[i].dstExtAddr, gConst.LE);
            msgIdx += 8;
            pktView.setUint8(msgIdx++, bindSrc.bindsDst[i].dstEP);
        }

        let msgLen = msgIdx;
        pktView.setUint8(bindsLenIdx, (msgLen - lenStart)); // update len field
        let dataLen = msgLen - gConst.HEAD_LEN;
        pktView.setUint16(gConst.LEN_IDX, dataLen, gConst.LE);
        let crc = 0;
        for(i = 0; i < msgLen; i++){
            crc ^= pktData[i];
        }
        pktView.setUint8(gConst.CRC_IDX, crc);

        msgIdx = 0;
        slMsgBuf[msgIdx++] = gConst.SL_START_CHAR;
        for(i = 0; i < msgLen; i++) {
            if(pktData[i] < 0x10){
                pktData[i] ^= 0x10;
                slMsgBuf[msgIdx++] = gConst.SL_ESC_CHAR;
            }
            slMsgBuf[msgIdx++] = pktData[i];
        }
        slMsgBuf[msgIdx++] = gConst.SL_END_CHAR;

        let slMsgLen = msgIdx;
        let slMsg = slMsgBuf.slice(0, slMsgLen);
        this.slPort.write(slMsg, "utf8", ()=>{
            // ---
        });
    }

    /***********************************************************************************************
     * fn          udpZclCmd
     *
     * brief
     *
     */
    udpZclCmd(zclCmd: string){

        let cmd: gIF.hostCmd_t = {
            shortAddr: 0,   // not used
            type: gConst.ZCL_CMD,
            idx: 0,         // not used
            retryCnt: 0,
            param: zclCmd
        };
        this.hostCmdQueue.push(cmd);
        if(this.hostCmdFlag == false){
            this.hostCmdFlag = true;
            this.runHostCmd();
        }
    }

    /***********************************************************************************************
     * fn          udpZclReq
     *
     * brief
     *
     */
    private udpZclReq(){

        let hostCmd = this.hostCmdQueue[0];
        let req: gIF.udpZclReq_t = JSON.parse(hostCmd.param);

        let pktBuf = new ArrayBuffer(64);
        let pktData = new Uint8Array(pktBuf);
        let pktView = new DataView(pktBuf);
        let slMsgBuf = new Uint8Array(128);
        let msgIdx: number;
        let i: number;

        this.seqNum = ++this.seqNum % 256;
        msgIdx = 0;
        pktView.setUint16(msgIdx, gConst.SL_MSG_ZCL_CMD, gConst.LE);
        msgIdx += 2;
        msgIdx += (2 + 1); // len + crc
        // cmd data
        pktView.setUint8(msgIdx++, this.seqNum);
        pktView.setUint16(msgIdx, req.shortAddr, gConst.LE);
        msgIdx += 2;
        pktView.setUint8(msgIdx++, req.endPoint);
        pktView.setUint16(msgIdx, req.clusterID, gConst.LE);
        msgIdx += 2;
        pktView.setUint8(msgIdx++, req.hasRsp);
        pktView.setUint8(msgIdx++, req.cmdLen);
        for(let i = 0; i < req.cmdLen; i++){
            pktView.setUint8(msgIdx++, req.cmd[i]);
        }
        let msgLen = msgIdx;
        let dataLen = msgLen - gConst.HEAD_LEN;
        pktView.setUint16(gConst.LEN_IDX, dataLen, gConst.LE);
        let crc = 0;
        for(i = 0; i < msgLen; i++){
            crc ^= pktData[i];
        }
        pktView.setUint8(gConst.CRC_IDX, crc);

        msgIdx = 0;
        slMsgBuf[msgIdx++] = gConst.SL_START_CHAR;
        for(i = 0; i < msgLen; i++) {
            if(pktData[i] < 0x10){
                pktData[i] ^= 0x10;
                slMsgBuf[msgIdx++] = gConst.SL_ESC_CHAR;
            }
            slMsgBuf[msgIdx++] = pktData[i];
        }
        slMsgBuf[msgIdx++] = gConst.SL_END_CHAR;

        let slMsgLen = msgIdx;
        let slMsg = slMsgBuf.slice(0, slMsgLen);
        this.slPort.write(slMsg, "utf8", ()=>{
            // ---
        });
    }

    /***********************************************************************************************
     * fn          extToHex
     *
     * brief
     *
     */
    private extToHex(extAddr: number) {

        let ab = new ArrayBuffer(8);
        let dv = new DataView(ab);
        dv.setFloat64(0, extAddr);
        let extHex = [];
        for(let i = 0; i < 8; i++){
            extHex[i] = ('0' + dv.getUint8(i).toString(16)).slice(-2);
        }
        return extHex.join(':');
    }

}








