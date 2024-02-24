///<reference types="chrome"/>
import {Injectable} from '@angular/core';
import {EventsService} from './events.service';
import {UtilsService} from './utils.service';
import * as gConst from '../gConst';
import * as gIF from '../gIF';

const UDP_PORT = 18870;
const TCP_PORT = 10167;

@Injectable({
    providedIn: 'root',
})
export class PortService {

    private seqNum = 0;
    private tcpCmdQueue: gIF.tcpCmd_t[] = [];

    private dgram: any;
    udpSocket: any;

    private net: any;
    tcpClient: any;
    tcpCmd: gIF.tcpCmd_t;
    tcpTmo = null;
    tcpFlag = false;

    //dummy= 0;

    private msgBuf = new ArrayBuffer(256);
    private msg: DataView = new DataView(this.msgBuf);

    //tcpBuf = window.nw.Buffer.alloc(256);

    constructor(private events: EventsService,
                private utils: UtilsService) {
        this.events.subscribe('wr_bind', (bind)=>{
            this.wrBind(bind);
        });
        this.events.subscribe('zcl_cmd', (cmd)=>{
            this.udpZclCmd(cmd);
        });
        this.dgram = window.nw.require('dgram');
        this.udpSocket = this.dgram.createSocket('udp4');
        this.udpSocket.on('message', (msg, rinfo)=>{
            this.processMsg(msg, rinfo);
        });
        this.udpSocket.on('error', (err)=>{
            console.log(`server error:\n${err.stack}`);
        });
        this.udpSocket.on('listening', ()=>{
            let address = this.udpSocket.address();
            console.log(`server listening ${address.address}:${address.port}`);
        });
        this.udpSocket.bind(UDP_PORT, ()=>{
            this.udpSocket.setBroadcast(true);
        });

        this.net = window.nw.require('net');
        this.tcpClient = new this.net.Socket();

        this.tcpClient.on('data', (msg: any)=>{
            this.tcpMsg(msg);
        });
        this.tcpClient.on('close', (hadErr: boolean)=>{
            this.tcpFlag = false;
        });
        this.tcpClient.on('ready', ()=>{
            this.tcpSendCmd();
        });
        this.tcpClient.on('error', ()=>{
            console.log('--- error ---');
        });
        this.tcpClient.on('timeout', ()=>{
            console.log('--- timeout ---');
            //---
        });

        setTimeout(() => {
            this.tcpTask();
        }, 100);
    }

    /***********************************************************************************************
     * fn          tcpTask
     *
     * brief
     *
     */
    public tcpTask(){

        if(this.tcpFlag === false){
            if(this.tcpCmdQueue.length > 0){
                this.tcpFlag = true;
                this.tcpCmd = this.tcpCmdQueue.shift();
                const param: gIF.rdAtIdxParam_t = JSON.parse(this.tcpCmd.param);

                this.tcpClient.connect({
                    port: param.port,
                    host: param.ip,
                    noDelay: true,
                });
            }
        }
        setTimeout(() => {
            this.tcpTask();
        }, 100);
    }

    /***********************************************************************************************
     * fn          tcpSendCmd
     *
     * brief
     *
     */
    public tcpSendCmd(){

        switch(this.tcpCmd.type){
            case gConst.RD_ATTR: {
                this.reqAttrAtIdx();
                break;
            }
            case gConst.RD_BIND: {
                this.reqBindAtIdx();
                break;
            }
            case gConst.WR_BIND: {
                this.wrBindReq();
                break;
            }
            case gConst.ZCL_CMD: {
                this.zclReq();
                break;
            }
            default: {
                //---
                break;
            }
        }
    }

    /***********************************************************************************************
     * fn          tcpKill
     *
     * brief
     *
     */
    public tcpKill(){
        this.tcpFlag = false;
        this.tcpClient.destroy();
        console.log('--- tcp TMO ---');
    }

    /***********************************************************************************************
     * fn          closeSocket
     *
     * brief
     *
     */
    public closeSocket() {
        this.udpSocket.close();
    }

    /***********************************************************************************************
     * fn          processMsg
     *
     * brief
     *
     */
    private processMsg(msg, rem) {

        let msgBuf = this.utils.bufToArrayBuf(msg);
        let msgView = new DataView(msgBuf);
        let msgIdx = 0;

        let cmdID = msgView.getUint16(msgIdx, gConst.LE);
        msgIdx += 2;
        switch(cmdID) {
            case gConst.SL_MSG_HOST_ANNCE: {
                let dataHost = {} as gIF.dataHost_t;
                dataHost.shortAddr = msgView.getUint16(msgIdx, gConst.LE);
                msgIdx += 2;
                dataHost.extAddr = msgView.getFloat64(msgIdx, gConst.LE);
                msgIdx += 8;
                dataHost.numAttrSets = msgView.getInt8(msgIdx++);
                dataHost.numSrcBinds = msgView.getInt8(msgIdx++);
                let ttl = msgView.getUint16(msgIdx, gConst.LE);

                let log = 'host ->';
                log += ` short: 0x${dataHost.shortAddr.toString(16).padStart(4, '0').toUpperCase()},`;
                log += ` ext: ${this.utils.extToHex(dataHost.extAddr)},`;
                log += ` numAttr: ${dataHost.numAttrSets},`;
                log += ` numBinds: ${dataHost.numSrcBinds}`;
                this.utils.sendMsg(log);

                if(this.tcpCmdQueue.length > 15) {
                    this.tcpCmdQueue = [];
                }
                const param: gIF.rdAtIdxParam_t = {
                    ip: rem.address,
                    //port: rem.port,
                    port: TCP_PORT,
                    shortAddr: dataHost.shortAddr,
                    idx: 0,
                }
                if(dataHost.numAttrSets > 0) {
                    let cmd: gIF.tcpCmd_t = {
                        type: gConst.RD_ATTR,
                        //retryCnt: gConst.RD_HOST_RETRY_CNT,
                        param: JSON.stringify(param)
                    };
                    this.tcpCmdQueue.push(cmd);
                }
                if(dataHost.numSrcBinds > 0) {
                    let cmd: gIF.tcpCmd_t = {
                        type: gConst.RD_BIND,
                        //retryCnt: gConst.RD_HOST_RETRY_CNT,
                        param: JSON.stringify(param)
                    };
                    this.tcpCmdQueue.push(cmd);
                }
                break;
            }
        }
    }

    /***********************************************************************************************
     * fn          tcpMsg
     *
     * brief
     *
     */
    private tcpMsg(msg: any) {

        let msgBuf = this.utils.bufToArrayBuf(msg);
        let msgView = new DataView(msgBuf);
        let msgIdx = 0;

        let cmdID = msgView.getUint16(msgIdx, gConst.LE);
        msgIdx += 2;
        switch(cmdID) {
            case gConst.SL_MSG_READ_ATTR_SET_AT_IDX: {
                let rxSet = {} as gIF.attrSet_t;
                let msgSeqNum = msgView.getUint8(msgIdx++);
                //if(msgSeqNum == this.seqNum) {
                    clearTimeout(this.tcpTmo);
                    const param: gIF.rdAtIdxParam_t = JSON.parse(this.tcpCmd.param);
                    rxSet.hostShortAddr = param.shortAddr;
                    rxSet.ip = param.ip;
                    rxSet.port = param.port;
                    let status = msgView.getUint8(msgIdx++);
                    if(status == gConst.SL_CMD_OK) {
                        let memIdx = msgView.getUint8(msgIdx++);
                        rxSet.partNum = msgView.getUint32(msgIdx, gConst.LE);
                        msgIdx += 4;
                        rxSet.clusterServer = msgView.getUint8(msgIdx++);
                        rxSet.extAddr = msgView.getFloat64(msgIdx, gConst.LE);
                        msgIdx += 8;
                        rxSet.shortAddr = msgView.getUint16(msgIdx, gConst.LE);
                        msgIdx += 2;
                        rxSet.endPoint = msgView.getUint8(msgIdx++);
                        rxSet.clusterID = msgView.getUint16(msgIdx, gConst.LE);
                        msgIdx += 2;
                        rxSet.attrSetID = msgView.getUint16(msgIdx, gConst.LE);
                        msgIdx += 2;
                        rxSet.attrMap = msgView.getUint16(msgIdx, gConst.LE);
                        msgIdx += 2;
                        rxSet.valsLen = msgView.getUint8(msgIdx++);
                        rxSet.attrVals = [];
                        for(let i = 0; i < rxSet.valsLen; i++) {
                            rxSet.attrVals[i] = msgView.getUint8(msgIdx++);
                        }

                        this.events.publish('attr_set', JSON.stringify(rxSet));

                        param.idx = memIdx + 1;
                        this.tcpCmd.param = JSON.stringify(param);
                        //this.tcpCmd.retryCnt = gConst.RD_HOST_RETRY_CNT;
                        this.tcpSendCmd();
                    }
                    else {
                        this.tcpClient.end();
                        /*
                        this.tcpTmo = setTimeout(() => {
                            this.tcpKill();
                        }, 300);
                        */
                    }
                //}
                break;
            }
            case gConst.SL_MSG_READ_BIND_AT_IDX: {
                let rxBind = {} as gIF.clusterBind_t;
                let msgSeqNum = msgView.getUint8(msgIdx++);
                if(msgSeqNum == this.seqNum) {
                    clearTimeout(this.tcpTmo);
                    const param: gIF.rdAtIdxParam_t = JSON.parse(this.tcpCmd.param);
                    rxBind.hostShortAddr = param.shortAddr;
                    rxBind.ip = param.ip;;
                    rxBind.port = param.port;
                    let status = msgView.getUint8(msgIdx++);
                    if(status == gConst.SL_CMD_OK) {
                        let memIdx = msgView.getUint8(msgIdx++);
                        rxBind.partNum = msgView.getUint32(msgIdx, gConst.LE);
                        msgIdx += 4;
                        rxBind.extAddr = msgView.getFloat64(msgIdx, gConst.LE);
                        msgIdx += 8;
                        rxBind.srcShortAddr = msgView.getUint16(msgIdx, gConst.LE);
                        msgIdx += 2;
                        rxBind.srcEP = msgView.getUint8(msgIdx++);
                        rxBind.clusterID = msgView.getUint16(msgIdx, gConst.LE);
                        msgIdx += 2;
                        rxBind.dstExtAddr = msgView.getFloat64(msgIdx, gConst.LE);
                        msgIdx += 8;
                        rxBind.dstEP = msgView.getUint8(msgIdx++);

                        this.events.publish('cluster_bind', JSON.stringify(rxBind));

                        param.idx = memIdx + 1;
                        this.tcpCmd.param = JSON.stringify(param);
                        //this.tcpCmd.retryCnt = gConst.RD_HOST_RETRY_CNT;
                        this.tcpSendCmd();
                    }
                    else {
                        this.tcpClient.end();
                        /*
                        this.tcpTmo = setTimeout(() => {
                            this.tcpKill();
                        }, 100);
                        */
                    }
                }
                break;
            }
            case gConst.SL_MSG_WRITE_BIND: {
                let msgSeqNum = msgView.getUint8(msgIdx++);
                if(msgSeqNum == this.seqNum) {
                    clearTimeout(this.tcpTmo);
                    let status = msgView.getUint8(msgIdx++);
                    if(status == gConst.SL_CMD_OK) {
                        this.utils.sendMsg('wr binds status: OK');
                    }
                    else {
                        this.utils.sendMsg('wr binds status: FAIL');
                    }
                    this.tcpClient.end();
                    /*
                    this.tcpTmo = setTimeout(() => {
                        this.tcpKill();
                    }, 100);
                    */
                }
                break;
            }
            case gConst.SL_MSG_ZCL_CMD: {
                let msgSeqNum = msgView.getUint8(msgIdx++);
                if(msgSeqNum == this.seqNum) {
                    clearTimeout(this.tcpTmo);
                    this.tcpClient.end();
                    /*
                    this.tcpTmo = setTimeout(() => {
                        this.tcpKill();
                    }, 100);
                    */
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
     * fn          reqAttrAtIdx
     *
     * brief
     *
     */
    private reqAttrAtIdx() {

        const param: gIF.rdAtIdxParam_t = JSON.parse(this.tcpCmd.param);

        let idx: number;

        this.seqNum = ++this.seqNum % 256;
        idx = 0;
        this.msg.setUint16(idx, gConst.SL_MSG_READ_ATTR_SET_AT_IDX, gConst.LE);
        idx += 2;
        const lenIdx = idx;
        this.msg.setUint8(idx++, 0);
        // cmd data
        const dataStartIdx = idx;
        this.msg.setUint8(idx++, this.seqNum);
        this.msg.setUint16(idx, param.shortAddr, gConst.LE);
        idx += 2;
        this.msg.setUint8(idx++, param.idx);

        let dataLen = idx - dataStartIdx;
        this.msg.setUint8(lenIdx, dataLen);

        this.tcpSend(idx);
    }

    /***********************************************************************************************
     * fn          reqBindsAtIdx
     *
     * brief
     *
     */
    private reqBindAtIdx() {

        const param: gIF.rdAtIdxParam_t = JSON.parse(this.tcpCmd.param);

        let idx: number;

        this.seqNum = ++this.seqNum % 256;
        idx = 0;
        this.msg.setUint16(idx, gConst.SL_MSG_READ_BIND_AT_IDX, gConst.LE);
        idx += 2;
        const lenIdx = idx;
        this.msg.setUint8(idx++, 0);
        // cmd data
        const dataStartIdx = idx;
        this.msg.setUint8(idx++, this.seqNum);
        this.msg.setUint16(idx, param.shortAddr, gConst.LE);
        idx += 2;
        this.msg.setUint8(idx++, param.idx);

        let dataLen = idx - dataStartIdx;
        this.msg.setUint8(lenIdx, dataLen);

        this.tcpSend(idx);
    }

    /***********************************************************************************************
     * fn          wrBinds
     *
     * brief
     *
     */
    wrBind(bind: string) {
        let cmd: gIF.tcpCmd_t = {
            type: gConst.WR_BIND,
            //retryCnt: gConst.RD_HOST_RETRY_CNT,
            param: bind,
        };
        this.tcpCmdQueue.push(cmd);
    }

    /***********************************************************************************************
     * fn          wrBindsReq
     *
     * brief
     *
     */
    private wrBindReq() {

        let bindSrc: gIF.hostedBind_t = JSON.parse(this.tcpCmd.param);

        let idx: number;

        this.seqNum = ++this.seqNum % 256;
        idx = 0;
        this.msg.setUint16(idx, gConst.SL_MSG_WRITE_BIND, gConst.LE);
        idx += 2;
        const lenIdx = idx;
        this.msg.setUint8(idx++, 0);
        // cmd data
        const dataStartIdx = idx;
        this.msg.setUint8(idx++, this.seqNum);
        this.msg.setUint16(idx, bindSrc.hostShortAddr, gConst.LE);
        idx += 2;
        this.msg.setFloat64(idx, bindSrc.extAddr, gConst.LE);
        idx += 8;
        this.msg.setUint8(idx++, bindSrc.srcEP);
        this.msg.setUint16(idx, bindSrc.clusterID, gConst.LE);
        idx += 2;
        this.msg.setFloat64(idx, bindSrc.dstExtAddr, gConst.LE);
        idx += 8;
        this.msg.setUint8(idx++, bindSrc.dstEP);

        let dataLen = idx - dataStartIdx;
        this.msg.setUint8(lenIdx, dataLen);

        this.tcpSend(idx);
    }

    /***********************************************************************************************
     * fn          udpZclCmd
     *
     * brief
     *
     */
    udpZclCmd(zclCmd: string) {
        let cmd: gIF.tcpCmd_t = {
            type: gConst.ZCL_CMD,
            //retryCnt: 0,
            param: zclCmd,
        };
        this.tcpCmdQueue.push(cmd);
    }

    /***********************************************************************************************
     * fn          zclReq
     *
     * brief
     *
     */
    private zclReq() {

        let req: gIF.udpZclReq_t = JSON.parse(this.tcpCmd.param);

        let idx: number;

        this.seqNum = ++this.seqNum % 256;
        idx = 0;
        this.msg.setUint16(idx, gConst.SL_MSG_ZCL_CMD, gConst.LE);
        idx += 2;
        const lenIdx = idx;
        this.msg.setUint8(idx++, 0);
        // cmd data
        const dataStartIdx = idx;
        this.msg.setUint8(idx++, this.seqNum);
        this.msg.setFloat64(idx, req.extAddr, gConst.LE);
        idx += 8;
        this.msg.setUint8(idx++, req.endPoint);
        this.msg.setUint16(idx, req.clusterID, gConst.LE);
        idx += 2;
        this.msg.setUint8(idx++, req.hasRsp);
        this.msg.setUint8(idx++, req.cmdLen);
        for(let i = 0; i < req.cmdLen; i++) {
            this.msg.setUint8(idx++, req.cmd[i]);
        }

        let dataLen = idx - dataStartIdx;
        this.msg.setUint8(lenIdx, dataLen);

        this.tcpSend(idx);
    }

    /***********************************************************************************************
     * fn          tcpSend
     *
     * brief
     *
     */
    private tcpSend(len: number) {

        const bufData = this.utils.arrayBufToBuf(this.msgBuf.slice(0, len));
        //const bufData = this.utils.arrayBufToBuf(this.msgBuf);

        this.tcpClient.write(bufData);
    }

}
