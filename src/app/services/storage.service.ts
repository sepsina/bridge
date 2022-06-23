import { Injectable } from '@angular/core';

//import * as gConst from './gConst';
import * as gIF from '../gIF';

@Injectable({
    providedIn: 'root'
})
export class StorageService {

    attrMap = new Map();
    bindsMap = new Map();

    nvAttrMap = new Map();
    nvBindsMap = new Map();

    constructor() {
        setTimeout(()=>{
            this.init();
        }, 100);
    }

    async init() {
        localStorage.clear();
        //await this.storage.defineDriver(CordovaSQLiteDriver);
        //await this.storage.create();
        //await this.storage.clear();
    }

    /***********************************************************************************************
     * fn          readAllKeys
     *
     * brief
     *
     */
    readAllKeys(){
        for(let i = 0; i < localStorage.length; i++){
            let key = localStorage.key(i);
            const val = localStorage.getItem(key);
            if(key.slice(0, 4) == 'attr') {
                this.nvAttrMap.set(key, val);
            }
            if(key.slice(0, 5) == 'binds') {
                this.nvBindsMap.set(key, val);
            }
        }
    }

    /***********************************************************************************************
     * fn          setAttrNameAndStyle
     *
     * brief
     *
     *
    setAttrNameAndStyle(name: string,
                        style: gIF.ngStyle_t,
                        attr: gIF.hostedAttr_t): Promise<gIF.storedAttr_t> {

        return new Promise((resolve, reject)=>{
            const key = this.attrKey(attr);
            const val: gIF.hostedAttr_t = this.attrMap.get(key);
            if(val){
                let storedAttr = {} as gIF.storedAttr_t;
                storedAttr.attrName = name;
                storedAttr.pos = val.pos;
                storedAttr.style = style;
                this.storage.set(key, JSON.stringify(storedAttr)).then(()=>{
                    val.name = name;
                    val.style = style;
                    this.nvAttrMap.set(key, storedAttr);
                    resolve(storedAttr);
                }).catch((err)=>{
                    reject(err);
                });
            }
            else {
                console.log('NO VALID ATTR');
                reject(new Error('No valid attr'));
            }
        });
     }
    */
    /***********************************************************************************************
     * fn          setAttrNameAndStyle
     *
     * brief
     *
     */
    setAttrNameAndStyle(name: string,
                        style: gIF.ngStyle_t,
                        valCorr: gIF.valCorr_t,
                        keyVal: any): gIF.storedAttr_t {

        let key: string = keyVal.key;
        let selAttr: gIF.hostedAttr_t = keyVal.value;
        let storedAttr = {} as gIF.storedAttr_t;

        storedAttr.attrName = name;
        storedAttr.pos = selAttr.pos;
        storedAttr.style = style;
        storedAttr.valCorr = valCorr;

        localStorage.setItem(key, JSON.stringify(storedAttr));

        selAttr.name = name;
        selAttr.style = style;
        selAttr.valCorr = valCorr;

        this.nvAttrMap.set(key, storedAttr);

        return storedAttr;

    }

    /***********************************************************************************************
     * fn          setAttrPos
     *
     * brief
     *
     */
    setAttrPos(pos: gIF.nsPos_t,
               keyVal: any): gIF.storedAttr_t{

        let key: string = keyVal.key;
        let selAttr: gIF.hostedAttr_t = keyVal.value;
        let storedAttr = {} as gIF.storedAttr_t;

        storedAttr.attrName = selAttr.name;
        storedAttr.pos = pos;
        storedAttr.style = selAttr.style;
        storedAttr.valCorr = selAttr.valCorr;

        localStorage.setItem(key, JSON.stringify(storedAttr));

        selAttr.pos = pos;

        return storedAttr;

    }

    /***********************************************************************************************
     * fn          delStoredAttr
     *
     * brief
     *
     */
    delStoredAttr(attr: gIF.hostedAttr_t){

        const key = this.attrKey(attr);

        localStorage.removeItem(key);

        this.attrMap.delete(key);
        this.nvAttrMap.delete(key);

        return key;

    }

    /***********************************************************************************************
     * fn          attrKey
     *
     * brief
     *
     */
    attrKey(params: any) {

        let key = 'attr-';
        key += ('000' + params.shortAddr.toString(16)).slice(-4).toUpperCase() + ':';
        key += ('0'   + params.endPoint.toString(16)).slice(-2).toUpperCase() + ':';
        key += ('000' + params.clusterID.toString(16)).slice(-4).toUpperCase() + ':';
        key += ('000' + params.attrSetID.toString(16)).slice(-4).toUpperCase() + ':';
        key += ('000' + params.attrID.toString(16)).slice(-4).toUpperCase();

        return key;
    }

    /***********************************************************************************************
     * fn          setBindsName
     *
     * brief
     *
     */
    setBindsName(name: string,
                 binds: gIF.hostedBinds_t): gIF.storedBinds_t{

        const key = this.bindsKey(binds);
        const val: gIF.hostedBinds_t = this.bindsMap.get(key);
        if(val){
            let storedBinds = {} as gIF.storedBinds_t;
            storedBinds.bindsName = name;
            localStorage.setItem(key, JSON.stringify(storedBinds));
            val.name = name;
            this.nvBindsMap.set(key, storedBinds);
            return storedBinds;
        }
        else {
            console.log('NO VALID BINDS');
            return null;
        }
    }

    /***********************************************************************************************
     * fn          delStoredBinds
     *
     * brief
     *
     */
    delStoredBinds(binds: gIF.hostedBinds_t){

        const key = this.bindsKey(binds);

        localStorage.removeItem(key);

        this.bindsMap.delete(key);
        this.nvBindsMap.delete(key);

        return key;
    }

    /***********************************************************************************************
     * fn          bindsKey
     *
     * brief
     *
     */
    bindsKey(binds: gIF.hostedBinds_t) {

        let key = 'binds-';
        key += ('000' + binds.srcShortAddr.toString(16)).slice(-4).toUpperCase() + ':';
        key += ('0'   + binds.srcEP.toString(16)).slice(-2).toUpperCase() + ':';
        key += ('000' + binds.clusterID.toString(16)).slice(-4).toUpperCase();

        return key;
    }

    /***********************************************************************************************
     * fn          setScrolls
     *
     * brief
     *
     */
    setScrolls(scrolls: gIF.scroll_t[]) {

        localStorage.setItem('scrolls', JSON.stringify(scrolls));
    }
    /***********************************************************************************************
     * fn          getScrolls
     *
     * brief
     *
     */
    getScrolls(): string {

        return localStorage.getItem('scrolls');

    }

    /***********************************************************************************************
     * fn          setPublicIP
     *
     * brief
     *
     */
    setPublicIP(ip: string) {

        localStorage.setItem('public-ip', ip);
    }
    /***********************************************************************************************
     * fn          getPublicIP
     *
     * brief
     *
     */
    getPublicIP(): string {

        return localStorage.getItem('public-ip');
    }


    /***********************************************************************************************
     * fn          setFreeDNS
     *
     * brief
     *
     */
    setFreeDNS(dns: gIF.dns_t) {

        localStorage.setItem('free-dns', JSON.stringify(dns));


    }
    /***********************************************************************************************
     * fn          getFreeDNS
     *
     * brief
     *
     */
    getFreeDNS(): gIF.dns_t {

        const dns = localStorage.getItem('free-dns');

        if(dns){
            return JSON.parse(dns);
        }

        return null;

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
