import { Injectable } from '@angular/core';
import { SerialLinkService } from './serial-link.service';
import { EventsService } from './events.service';
import { StorageService } from './storage.service';
import { UtilsService } from './utils.service';
import { sprintf } from "sprintf-js";

import * as gConst from '../gConst';
import * as gIF from '../gIF'

import { decode, encode } from "base64-arraybuffer"

const UDP_PORT = 22802;

@Injectable({
    providedIn: 'root'
})
export class UdpService {

    private dgram;
    udpSocket;

    msgBuf = new ArrayBuffer(1024);
    msg: DataView = new DataView(this.msgBuf);

    constructor(private serial: SerialLinkService,
                private events: EventsService,
                private storage: StorageService,
                private utils: UtilsService) {
        this.dgram = window.nw.require('dgram');
        this.udpSocket = this.dgram.createSocket('udp4');
        this.udpSocket.on('message', (msg, rinfo)=>{
            this.udpOnMsg(msg, rinfo);
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
     * fn          udpOnMsg
     *
     * brief
     *
     */
    public udpOnMsg(msg, rem) {

        let msgBuf = this.utils.bufToArrayBuf(msg);
        let dataView = new DataView(msgBuf);

        let msgIdx = 0;
        let pktIdx = 0;
        let pktFunc = dataView.getUint16(pktIdx, gConst.LE);
        pktIdx += 2;
        switch(pktFunc){
            case gConst.BRIDGE_ID_REQ: { //--------------------------------------------------------
                //let rnd = 0; //Math.floor(Math.random() * 100) + 50;
                //setTimeout(()=>{
                    this.msg.setUint16(0, gConst.BRIDGE_ID_RSP, gConst.LE);

                    let bufData = this.utils.arrayBufToBuf(this.msgBuf.slice(0, 2));
                    this.udpSocket.send(bufData, 0, 2, rem.port, rem.address, (err)=>{
                        if(err){
                            console.log('UDP ERR: ' + JSON.stringify(err));
                        }
                    });
                //}, rnd);
                break;
            }
            case gConst.ON_OFF_ACTUATORS: { //-----------------------------------------------------
                this.msg.setUint16(msgIdx, pktFunc, gConst.LE);
                msgIdx += 2;
                let startIdx = dataView.getUint16(pktIdx, gConst.LE);
                pktIdx += 2;
                this.msg.setUint16(msgIdx, startIdx, gConst.LE);
                msgIdx += 2;
                let numIdx = msgIdx;
                let numVals = 0;
                this.msg.setUint16(msgIdx, numVals, gConst.LE);
                msgIdx += 2;
                let doneIdx = msgIdx;
                this.msg.setUint8(msgIdx, 1);
                msgIdx++;
                let valIdx = 0;
                for(let attrSet of this.serial.setMap.values()){
                    if(attrSet.clusterID == gConst.CLUSTER_ID_GEN_ON_OFF) {
                        if (valIdx >= startIdx) {
                            numVals++;
                            this.msg.setUint32(msgIdx, attrSet.partNum, gConst.LE);
                            msgIdx += 4;
                            this.msg.setUint16(msgIdx, attrSet.shortAddr, gConst.LE);
                            msgIdx += 2;
                            this.msg.setUint8(msgIdx, attrSet.endPoint);
                            msgIdx++;
                            this.msg.setUint8(msgIdx, attrSet.setVals.state);
                            msgIdx++;
                            this.msg.setUint8(msgIdx, attrSet.setVals.level);
                            msgIdx++;
                            this.msg.setUint8(msgIdx, attrSet.setVals.name.length);
                            msgIdx++;
                            for (let i = 0; i < attrSet.setVals.name.length; i++) {
                                this.msg.setUint8(msgIdx, attrSet.setVals.name.charCodeAt(i));
                                msgIdx++;
                            }
                        }
                        valIdx++;
                    }
                    if(msgIdx > 500){
                        this.msg.setUint8(doneIdx, 0);
                        break; // exit for-loop
                    }
                }
                if(numVals){
                    this.msg.setUint16(numIdx, numVals, gConst.LE);
                }

                const len = msgIdx;
                let bufData = this.utils.arrayBufToBuf(this.msgBuf.slice(0, len));
                this.udpSocket.send(bufData, 0, len, rem.port, rem.address, (err)=>{
                    if(err){
                        console.log('UDP ERR: ' + JSON.stringify(err));
                    }
                });
                break;
            }
            case gConst.T_SENSORS: { //------------------------------------------------------------
                this.msg.setUint16(msgIdx, pktFunc, gConst.LE);
                msgIdx += 2;
                let startIdx = dataView.getUint16(pktIdx, gConst.LE);
                pktIdx += 2;
                this.msg.setUint16(msgIdx, startIdx, gConst.LE);
                msgIdx += 2;
                let numIdx = msgIdx;
                let numVals = 0;
                this.msg.setUint16(msgIdx, numVals, gConst.LE);
                msgIdx += 2;
                let doneIdx = msgIdx;
                this.msg.setUint8(msgIdx, 1);
                msgIdx++;
                let valIdx = 0;
                for(let attrSet of this.serial.setMap.values()){
                    if(attrSet.clusterID == gConst.CLUSTER_ID_MS_TEMPERATURE_MEASUREMENT) {
                        if(valIdx >= startIdx) {
                            numVals++;
                            this.msg.setUint32(msgIdx, attrSet.partNum, gConst.LE);
                            msgIdx += 4;
                            this.msg.setUint16(msgIdx, attrSet.shortAddr, gConst.LE);
                            msgIdx += 2;
                            this.msg.setUint8(msgIdx, attrSet.endPoint);
                            msgIdx++;
                            this.msg.setInt16(msgIdx, (10 * attrSet.setVals.t_val), gConst.LE);
                            msgIdx += 2;
                            this.msg.setUint16(msgIdx, attrSet.setVals.units, gConst.LE);
                            msgIdx += 2;
                            this.msg.setUint8(msgIdx, attrSet.setVals.name.length);
                            msgIdx++;
                            for (let i = 0; i < attrSet.setVals.name.length; i++) {
                                this.msg.setUint8(msgIdx, attrSet.setVals.name.charCodeAt(i));
                                msgIdx++;
                            }
                        }
                        valIdx++;
                    }
                    if(msgIdx > 500){
                        this.msg.setUint8(doneIdx, 0);
                        break; // exit for-loop
                    }
                }
                if(numVals){
                    this.msg.setUint16(numIdx, numVals, gConst.LE);
                }

                const len = msgIdx;
                let bufData = this.utils.arrayBufToBuf(this.msgBuf.slice(0, len));
                this.udpSocket.send(bufData, 0, len, rem.port, rem.address, (err)=>{
                    if(err){
                        console.log('UDP ERR: ' + JSON.stringify(err));
                    }
                });
                break;
            }
            case gConst.RH_SENSORS: { //------------------------------------------------------------
                this.msg.setUint16(msgIdx, pktFunc, gConst.LE);
                msgIdx += 2;
                let startIdx = dataView.getUint16(pktIdx, gConst.LE);
                pktIdx += 2;
                this.msg.setUint16(msgIdx, startIdx, gConst.LE);
                msgIdx += 2;
                let numIdx = msgIdx;
                let numVals = 0;
                this.msg.setUint16(msgIdx, numVals, gConst.LE);
                msgIdx += 2;
                let doneIdx = msgIdx;
                this.msg.setUint8(msgIdx, 1);
                msgIdx++;
                let valIdx = 0;
                for(let attrSet of this.serial.setMap.values()){
                    if(attrSet.clusterID == gConst.CLUSTER_ID_MS_RH_MEASUREMENT) {
                        if(valIdx >= startIdx) {
                            numVals++;
                            this.msg.setUint32(msgIdx, attrSet.partNum, gConst.LE);
                            msgIdx += 4;
                            this.msg.setUint16(msgIdx, attrSet.shortAddr, gConst.LE);
                            msgIdx += 2;
                            this.msg.setUint8(msgIdx, attrSet.endPoint);
                            msgIdx++;
                            this.msg.setUint16(msgIdx, (10 * attrSet.setVals.rh_val), gConst.LE);
                            msgIdx += 2;
                            this.msg.setUint8(msgIdx, attrSet.setVals.name.length);
                            msgIdx++;
                            for (let i = 0; i < attrSet.setVals.name.length; i++) {
                                this.msg.setUint8(msgIdx, attrSet.setVals.name.charCodeAt(i));
                                msgIdx++;
                            }
                        }
                        valIdx++;
                    }
                    if(msgIdx > 500){
                        this.msg.setUint8(doneIdx, 0);
                        break; // exit for-loop
                    }
                }
                if(numVals){
                    this.msg.setUint16(numIdx, numVals, gConst.LE);
                }

                const len = msgIdx;
                let bufData = this.utils.arrayBufToBuf(this.msgBuf.slice(0, len));
                this.udpSocket.send(bufData, 0, len, rem.port, rem.address, (err)=>{
                    if(err){
                        console.log('UDP ERR: ' + JSON.stringify(err));
                    }
                });
                break;
            }
            case gConst.UDP_ZCL_CMD: { //----------------------------------------------------------
                let udpZclCmd = {} as gIF.udpZclReq_t;
                udpZclCmd.ip = msg.remoteAddress;
                udpZclCmd.port = msg.remotePort;
                udpZclCmd.shortAddr = dataView.getUint16(pktIdx, gConst.LE);
                pktIdx += 2;
                udpZclCmd.endPoint = dataView.getUint8(pktIdx);
                pktIdx++;
                udpZclCmd.clusterID = dataView.getUint16(pktIdx, gConst.LE);
                pktIdx += 2;
                udpZclCmd.hasRsp = dataView.getUint8(pktIdx);
                pktIdx++;
                udpZclCmd.cmdLen = dataView.getUint8(pktIdx);
                pktIdx++;
                udpZclCmd.cmd = [];
                for(let i = 0; i < udpZclCmd.cmdLen; i++){
                    udpZclCmd.cmd[i] = dataView.getUint8(pktIdx);
                    pktIdx++;
                }
                this.serial.udpZclCmd(JSON.stringify(udpZclCmd));
                break;
            }
            default: //----------------------------------------------------------------------------
                // ---
                break;
        }
    }

    /***********************************************************************************************
     * fn          bufferToString
     *
     * brief
     *
     *
    private bufferToString(buffer: ArrayBuffer): string {
        const chrCodes = new Uint8Array(buffer);
        return btoa(String.fromCharCode.apply(null, chrCodes));
    }
    */
    /***********************************************************************************************
     * fn          stringToBuffer
     *
     * brief
     *
     *
    private stringToBuffer(base64String: string): ArrayBuffer {
        const str = atob(base64String);
        let buf = new ArrayBuffer(str.length);
        let bufView = new Uint8Array(buf);
        for(let i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }
    */
}
