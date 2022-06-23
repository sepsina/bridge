import { Component, Inject, OnInit, AfterViewInit, ElementRef, NgZone, ViewChild } from '@angular/core';
import { SerialLinkService } from '../services/serial-link.service';
import { StorageService } from '../services/storage.service';
import { Validators, FormControl } from '@angular/forms';
import { sprintf } from 'sprintf-js';
import { MatSelectionListChange } from '@angular/material/list';
import { MatSelectChange } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

import * as gConst from '../gConst';
import * as gIF from '../gIF'

@Component({
    selector: 'app-binds',
    templateUrl: './binds.page.html',
    styleUrls: ['./binds.page.scss'],
})
export class EditBinds implements OnInit, AfterViewInit {

    @ViewChild('free_binds') free_binds: ElementRef;

    allBindSrc: gIF.hostedBinds_t[] = [];
    bindSrc: gIF.hostedBinds_t;
    usedBindDst: gIF.bind_t[] = [];
    freeBindDst: gIF.bind_t[] = [];
    allBindDst: gIF.bind_t[] = [];

    selUsedBindDst: gIF.bind_t = null;
    selFreeBindDst: gIF.bind_t = null;

    usedBindDstListSelected: gIF.bind_t[] = [];
    freeBindDstListSelected: gIF.bind_t[] = [];

    bindSourceDesc: gIF.descVal_t[] = [];
    usedBindDstDesc: gIF.descVal_t[] = [];
    freeBindDstDesc: gIF.descVal_t[] = [];

    emptyFlag: boolean = true;
    noSrcBinds: boolean = true;

    nameFormCtrl = new FormControl('', [Validators.required]);

    constructor(private dialogRef: MatDialogRef<EditBinds>,
                @Inject(MAT_DIALOG_DATA) public dlgData: any,
                private serial: SerialLinkService,
                private storage: StorageService,
                private ngZone: NgZone) {
        // ---
    }

    /***********************************************************************************************
     * fn          ngOnInit
     *
     * brief
     *
     */
    ngOnInit(){
        this.refresh();
    }

    /***********************************************************************************************
     * fn          ngAfterViewInit
     *
     * brief
     *
     */
    ngAfterViewInit(): void {
        // make cols same height
        /*let wrBinds = document.getElementById('send_binds');
        let wrBindsBottom = wrBinds.offsetTop + wrBinds.offsetHeight;
        let freeBinds = document.getElementById('free_binds');
        freeBinds.style.border = 'solid red 1px';
        freeBinds.style.height = sprintf('%dpx', Math.round(wrBindsBottom - freeBinds.offsetTop));*/
    }

    /***********************************************************************************************
     * fn          refresh
     *
     * brief
     *
     */
    refresh() {

        this.allBindSrc = JSON.parse(JSON.stringify(Array.from(this.storage.bindsMap.values())));
        let attribs: gIF.hostedAttr_t[] = JSON.parse(JSON.stringify(Array.from(this.storage.attrMap.values())));

        this.allBindDst = [];
        attribs.forEach((attr)=>{
            if(attr.clusterServer){
                let bind = {} as gIF.bind_t;
                bind.valid = true;
                bind.extAddr = attr.extAddr;
                bind.name = attr.name;
                bind.partNum = attr.partNum;
                bind.clusterID = attr.clusterID;
                bind.shortAddr = attr.shortAddr;
                bind.endPoint = attr.endPoint;
                this.allBindDst.push(bind);
            }
        });
        if(this.allBindSrc.length){
            this.bindSrc = this.allBindSrc[0];
            this.nameFormCtrl.setValue(this.bindSrc.name);
            this.setBinds(this.bindSrc);
            this.setBindSourceDesc(this.bindSrc);
            this.noSrcBinds = false;
        }
        else {
            this.noSrcBinds = true;
            this.emptyFlag = true;
        }
        this.deSelAll();

        console.log('all bind destination: ' + JSON.stringify(this.allBindDst));
    }

    /***********************************************************************************************
     * fn          setBinds
     *
     * brief
     *
     */
    public setBinds(bindSrc: gIF.hostedBinds_t){

        this.usedBindDst = [];
        this.freeBindDst = [];

        this.allBindDst.forEach((bindDst)=>{
            if(bindDst.clusterID == bindSrc.clusterID){
                this.freeBindDst.push(bindDst);
            }
        });
        bindSrc.bindsDst.forEach((bindDst)=>{
            let idx = this.freeBindDst.findIndex((bind)=>{
                return(bind.extAddr == bindDst.dstExtAddr &&
                       bind.endPoint  == bindDst.dstEP &&
                       bind.clusterID == bindSrc.clusterID);
            });
            if(idx > -1){
                this.usedBindDst.push(this.freeBindDst[idx]);
                this.freeBindDst.splice(idx, 1);
            }
            else {
                let bind = {} as gIF.bind_t;
                bind.valid = false;
                bind.name = 'unknown';
                this.usedBindDst.push(bind);
            }
        });
        let numBindSrc = 0;
        this.allBindSrc.forEach((bind)=>{
            if(bind.extAddr == bindSrc.extAddr){
                numBindSrc += bind.bindsDst.length;
            }
        });
        this.emptyFlag = true;
        let numEmpty = 0;
        if(numBindSrc < bindSrc.maxBinds){
            numEmpty = bindSrc.maxBinds - numBindSrc;
            this.emptyFlag = false;
        }
        let numUsed = 0;
        if(this.usedBindDst.length < numBindSrc){
            numUsed = numBindSrc - this.usedBindDst.length;
        }
        for(let i = 0; i < numEmpty; i++){
            let bind = {} as gIF.bind_t;
            bind.valid = false;
            bind.name = '--- empty ---';
            this.usedBindDst.push(bind);
        }
        for(let i = 0; i < numUsed; i++){
            let bind = {} as gIF.bind_t;
            bind.valid = false;
            bind.name = '--- used ---';
            this.usedBindDst.push(bind);
        }
        for(let i = this.freeBindDst.length; i < gConst.MAX_SRC_BINDS; i++){
            let bind = {} as gIF.bind_t;
            bind.valid = false;
            bind.name = '--- empty ---';
            this.freeBindDst.push(bind);
        }
        console.log('numBindSrc: ' + numBindSrc);
        console.log('numEmpty: ' + numEmpty);
        console.log('numUsed: ' + numUsed);
    }

    /***********************************************************************************************
     * fn          bindSrcSelected
     *
     * brief
     *
     */
    public bindSrcSelected(event: MatSelectChange){

        console.log('bind source selected: ' + JSON.stringify(this.bindSrc));

        this.nameFormCtrl.setValue(this.bindSrc.name);
        this.setBindSourceDesc(this.bindSrc);

        this.deSelAll();

        this.setBinds(this.bindSrc);
    }

    /***********************************************************************************************
     * fn          setBindSourceDesc
     *
     * brief
     *
     */
    public setBindSourceDesc(srcBind: gIF.hostedBinds_t){

        this.bindSourceDesc = [];
        let partDesc: gIF.part_t = this.dlgData.partMap.get(srcBind.partNum);
        if(partDesc){
            let descVal = {} as gIF.descVal_t;
            descVal.key = 'S/N:';
            descVal.value = this.extToHex(srcBind.extAddr);
            this.bindSourceDesc.push(descVal);
            descVal = {} as gIF.descVal_t;
            descVal.key = 'node-name:';
            descVal.value = partDesc.devName;
            this.bindSourceDesc.push(descVal);
            descVal = {} as gIF.descVal_t;
            descVal.key = 'label:';
            descVal.value = partDesc.part;
            this.bindSourceDesc.push(descVal);
            /*descVal = {} as gIF.descVal_t;
            descVal.key = 'url:';
            descVal.value = partDesc.url;
            this.bindSourceDesc.push(descVal);*/
        }
    }

    /***********************************************************************************************
     * fn          usedBindDstChanged
     *
     * brief
     *
     */
    public usedBindDstChanged(event: MatSelectionListChange){

        console.log('used bind dst selected: ' + JSON.stringify(event.option.value));

        this.selUsedBindDst = event.option.value;

        this.setUsedBindDstDesc(this.selUsedBindDst);
    }

    /***********************************************************************************************
     * fn          setUsedBindDstDesc
     *
     * brief
     *
     */
    public setUsedBindDstDesc(dst: gIF.bind_t){

        this.usedBindDstDesc = [];
        let partDesc: gIF.part_t = this.dlgData.partMap.get(dst.partNum);
        if(partDesc){
            let descVal = {} as gIF.descVal_t;
            descVal.key = 'S/N:';
            descVal.value = this.extToHex(dst.extAddr);
            this.usedBindDstDesc.push(descVal);
            descVal = {} as gIF.descVal_t;
            descVal.key = 'node-name:';
            descVal.value = partDesc.devName;
            this.usedBindDstDesc.push(descVal);
            descVal = {} as gIF.descVal_t;
            descVal.key = 'label:';
            descVal.value = partDesc.part;
            this.usedBindDstDesc.push(descVal);
            /*descVal = {} as gIF.descVal_t;
            descVal.key = 'url:';
            descVal.value = partDesc.url;
            this.usedBindDstDesc.push(descVal);*/
        }
    }

    /***********************************************************************************************
     * fn          freeBindDstChanged
     *
     * brief
     *
     */
    public freeBindDstChanged(event: MatSelectionListChange){

        console.log('free bind dst selected: ' + JSON.stringify(event.option.value));

        this.selFreeBindDst = event.option.value;

        this.setFreeBindDstDesc(this.selFreeBindDst);
    }

    /***********************************************************************************************
     * fn          setFreeBindDstDesc
     *
     * brief
     *
     */
    public setFreeBindDstDesc(target: gIF.bind_t){

        this.freeBindDstDesc = [];
        let partDesc: gIF.part_t = this.dlgData.partMap.get(target.partNum);
        if(partDesc){
            let descVal = {} as gIF.descVal_t;
            descVal.key = 'S/N:';
            descVal.value = this.extToHex(target.extAddr);
            this.freeBindDstDesc.push(descVal);
            descVal = {} as gIF.descVal_t;
            descVal.key = 'node-name:';
            descVal.value = partDesc.devName;
            this.freeBindDstDesc.push(descVal);
            descVal = {} as gIF.descVal_t;
            descVal.key = 'label:';
            descVal.value = partDesc.part;
            this.freeBindDstDesc.push(descVal);
            /*descVal = {} as gIF.descVal_t;
            descVal.key = 'url:';
            descVal.value = partDesc.url;
            this.freeBindDstDesc.push(descVal);*/
        }
    }

    /***********************************************************************************************
     * fn          addBindDst
     *
     * brief
     *
     */
    public addBindDst(){

        console.log('add bind destination: ' +  JSON.stringify(this.selFreeBindDst));
        let numValid: number = 0;
        this.usedBindDst.forEach((bindDst)=>{
            if(bindDst.valid){
                numValid++;
            }
        });
        if(numValid < gConst.MAX_DST_BINDS){
            if(this.selFreeBindDst){
                let bindDst = {} as gIF.bindDst_t;
                bindDst.dstExtAddr = this.selFreeBindDst.extAddr;
                bindDst.dstEP = this.selFreeBindDst.endPoint;
                this.bindSrc.bindsDst.push(bindDst);

                this.setBinds(this.bindSrc);

                this.deSelAll();
            }
        }
    }

    /***********************************************************************************************
     * fn          removeBindDst
     *
     * brief
     *
     */
    public removeBindDst(){

        console.log('remove bind dst: ' + JSON.stringify(this.selUsedBindDst));
        if(this.selUsedBindDst) {
            let idx = this.bindSrc.bindsDst.findIndex((bindDst) => {
                return (this.selUsedBindDst.extAddr == bindDst.dstExtAddr &&
                        this.selUsedBindDst.endPoint == bindDst.dstEP);
            });
            if (idx > -1) {
                this.bindSrc.bindsDst.splice(idx, 1);
            }
            this.setBinds(this.bindSrc);

            this.deSelAll();
        }
    }

    /***********************************************************************************************
     * fn          setFreeBindDstToolTip
     *
     * brief
     *
     *
    public setBindToolTip(bind: gIF.bind_t){

        let idx = this.serial.partDesc.findIndex((desc)=>{
            return(desc.partNum == bind.partNum);
        });
        if(idx > -1){
            bind.tooltip = '';
            bind.tooltip += sprintf('S/N: %s \n', this.extToHex(bind.extAddr));
            bind.tooltip += sprintf('node-name: %s \n', this.serial.partDesc[idx].devName);
            bind.tooltip += sprintf('label: %s \n', this.serial.partDesc[idx].part);
            bind.tooltip += sprintf('url: %s \n', this.serial.partDesc[idx].url);
        }
    }
    */
    /***********************************************************************************************
     * fn          showTooltip
     *
     * brief
     *
     */
    showTooltip(tt: MatTooltip,
                bind: gIF.bind_t){
        let ttMsg = '';
        ttMsg += sprintf('S/N: %s \n', this.extToHex(bind.extAddr));
        let partDesc: gIF.part_t = this.dlgData.partMap.get(bind.partNum);
        if(partDesc){
            ttMsg += sprintf('node-name: %s \n', partDesc.devName);
            ttMsg += sprintf('part: %s \n', partDesc.part);
            ttMsg += sprintf('url: %s \n', partDesc.url);
        }
        tt.message = ttMsg;
        tt.showDelay = 500;
        tt.tooltipClass = "bind-tooltip";
        tt.show();
    }

    /***********************************************************************************************
     * fn          wrSrcBinds
     *
     * brief
     *
     */
    public wrSrcBinds(){
        this.serial.wrBinds(JSON.stringify(this.bindSrc));
    }

    /***********************************************************************************************
     * fn          wrBindLoc
     *
     * brief
     *
     */
    async wrBindName() {
        this.bindSrc.name = this.nameFormCtrl.value;
        await this.storage.setBindsName(this.nameFormCtrl.value,
                                        this.bindSrc);
    }

    /***********************************************************************************************
     * fn          deSelAll
     *
     * brief
     *
     */
    private deSelAll() {
        this.selUsedBindDst = null;
        this.usedBindDstListSelected = [];
        this.usedBindDstDesc = [];

        this.selFreeBindDst = null;
        this.freeBindDstListSelected = [];
        this.freeBindDstDesc = [];
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

    /***********************************************************************************************
     * fn          close
     *
     * brief
     *
     */
    close() {
        this.dialogRef.close();
    }

    /***********************************************************************************************
     * fn          save
     *
     * brief
     *
     *
    save() {
        this.dialogRef.close();
    }
    */
}
