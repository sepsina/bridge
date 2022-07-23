import { Injectable } from '@angular/core';

//import * as gConst from './gConst';
import * as gIF from '../gIF';

@Injectable({
    providedIn: 'root',
})
export class StorageService {

    attrMap = new Map();
    bindsMap = new Map();

    nvAttrMap = new Map();
    nvBindsMap = new Map();

    nvThermostatsMap = new Map();

    constructor() {
        setTimeout(()=>{
            this.init();
        }, 100);
    }

    async init() {
        localStorage.clear();
    }

    /***********************************************************************************************
     * fn          readAllKeys
     *
     * brief
     *
     */
    readAllKeys() {

        for(let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            const val = localStorage.getItem(key);
            if(key.slice(0, 4) == 'attr') {
                this.nvAttrMap.set(key, val);
            }
            if(key.slice(0, 5) == 'binds') {
                this.nvBindsMap.set(key, val);
            }
            if(key.slice(0, 10) == 'thermostat') {
                this.nvThermostatsMap.set(key, val);
            }
        }
    }

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
               keyVal: any): gIF.storedAttr_t {
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
    delStoredAttr(attr: gIF.hostedAttr_t) {

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

        let key = `attr-${params.shortAddr.toString(16).padStart(4, '0').toUpperCase()}`;
        key += `:${params.endPoint.toString(16).padStart(2, '0').toUpperCase()}`;
        key += `:${params.clusterID.toString(16).padStart(4, '0').toUpperCase()}`;
        key += `:${params.attrSetID.toString(16).padStart(4, '0').toUpperCase()}`;
        key += `:${params.attrID.toString(16).padStart(4, '0').toUpperCase()}`;

        return key;
    }

    /***********************************************************************************************
     * fn          setBindsName
     *
     * brief
     *
     */
    setBindsName(name: string,
                 binds: gIF.hostedBinds_t): gIF.storedBinds_t {
        const key = this.bindsKey(binds);
        const val: gIF.hostedBinds_t = this.bindsMap.get(key);
        if(val) {
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
    delStoredBinds(binds: gIF.hostedBinds_t) {

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
        let key = `binds-${binds.srcShortAddr.toString(16).padStart(4, '0').toUpperCase()}`;
        key += `:${binds.srcEP.toString(16).padStart(2, '0').toUpperCase()}`;
        key += `:${binds.clusterID.toString(16).padStart(4, '0').toUpperCase()}`;

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

        if(dns) {
            return JSON.parse(dns);
        }

        return null;
    }

    /***********************************************************************************************
     * fn          thermostatKey
     *
     * brief
     *
     */
    thermostatKey(thermostat: gIF.thermostat_t) {
        let key = `thermostat-${thermostat.shortAddr.toString(16).padStart(4, '0').toUpperCase()}`;
        key += `:${thermostat.endPoint.toString(16).padStart(2, '0').toUpperCase()}`;

        return key;
    }

}
