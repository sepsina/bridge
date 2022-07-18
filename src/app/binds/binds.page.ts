import { Component, Inject, NgZone, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { SerialLinkService } from '../services/serial-link.service';
import { StorageService } from '../services/storage.service';
import { UtilsService } from '../services/utils.service';
import { Validators, FormControl } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

import * as gConst from '../gConst';
import * as gIF from '../gIF'
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

const EMPTY_NAME = '--- empty ---';
const UNKNOWN_NAME = 'unknown';
const USED_NAME = '--- used ---';

@Component({
    selector: 'app-binds',
    templateUrl: './binds.page.html',
    styleUrls: ['./binds.page.scss'],
})
export class EditBinds implements AfterViewInit {

    @ViewChild('bindBoxRef', {read: ElementRef, static:false}) bindBoxRef: ElementRef;
    @ViewChild('usedWrapRef', {read: ElementRef, static:false}) wrapRef: ElementRef;

    allBindSrc: gIF.hostedBinds_t[] = [];
    bindSrc = {} as gIF.hostedBinds_t;
    //usedBindDst: gIF.bind_t[] = [];
    freeBindDst: gIF.bind_t[] = [];
    allBindDst: gIF.bind_t[] = [];

    srcValid = false;
    //selUsedBindDst: gIF.bind_t = null;
    //selFreeBindDst: gIF.bind_t = null;

    selBindDst: gIF.bind_t;

    bindSrcDesc: gIF.descVal_t[] = [];
    bindDstDesc: gIF.descVal_t[] = [];

    nameFormCtrl = new FormControl('', [Validators.required]);

    constructor(private dialogRef: MatDialogRef<EditBinds>,
                @Inject(MAT_DIALOG_DATA) public dlgData: any,
                private serial: SerialLinkService,
                private storage: StorageService,
                private utils: UtilsService,
                private ngZone: NgZone) {
        // ---
    }

    /***********************************************************************************************
     * fn          ngAfterViewInit
     *
     * brief
     *
     */
     ngAfterViewInit(){
        setTimeout(() => {
            this.refresh();
        }, 0);
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
        for(const attr of attribs) {
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
        }
        if(this.allBindSrc.length){
            this.srcValid = true;
            this.bindSrc = this.allBindSrc[0];
            this.nameFormCtrl.setValue(this.bindSrc.name);
            this.ngZone.run(()=>{
                this.setBinds(this.bindSrc);
            });
            this.setBindSrcDesc(this.bindSrc);
        }
    }

    /***********************************************************************************************
     * fn          setBinds
     *
     * brief
     *
     */
    public setBinds(bindSrc: gIF.hostedBinds_t){

        let i = 0;
        const invalidDst = {} as gIF.bind_t;
        invalidDst.valid = false;
        invalidDst.name = '- - -';
        invalidDst.extAddr = 0;
        invalidDst.endPoint = 0;

        this.freeBindDst = [];
        this.freeBindDst.push(invalidDst);
        this.selBindDst = this.freeBindDst[0];

        for(i = 0; i < this.allBindDst.length; i++){
            if(this.allBindDst[i].clusterID === bindSrc.clusterID){
                this.freeBindDst.push(this.allBindDst[i]);
            }
        }
        this.bindDstDesc = [];
        if(bindSrc.bindsDst.length > 0){
            for(i = 0; i < this.freeBindDst.length; i++){
                if(this.freeBindDst[i].extAddr === bindSrc.bindsDst[0].dstExtAddr){
                    if(this.freeBindDst[i].endPoint === bindSrc.bindsDst[0].dstEP){
                        this.selBindDst = this.freeBindDst[i];
                        this.setBindDstDesc(this.selBindDst);
                        break;
                    }
                }
            }
        }
    }

    /***********************************************************************************************
     * fn          bindSrcSelected
     *
     * brief
     *
     */
    public bindSrcSelected(event: MatSelectChange){

        this.nameFormCtrl.setValue(this.bindSrc.name);
        this.setBindSrcDesc(this.bindSrc);

        this.ngZone.run(()=>{
            this.setBinds(this.bindSrc);
        });
    }

    /***********************************************************************************************
     * fn          bindDstSelected
     *
     * brief
     *
     */
     public bindDstSelected(event: MatSelectChange){
        this.setBindDstDesc(event.value);
    }

    /***********************************************************************************************
     * fn          setBindSourceDesc
     *
     * brief
     *
     */
    public setBindSrcDesc(srcBind: gIF.hostedBinds_t){

        this.bindSrcDesc = [];
        let partDesc: gIF.part_t = this.dlgData.partMap.get(srcBind.partNum);
        if(partDesc){
            let descVal = {} as gIF.descVal_t;
            descVal.key = 'S/N:';
            descVal.value = this.utils.extToHex(srcBind.extAddr);
            this.bindSrcDesc.push(descVal);
            descVal = {} as gIF.descVal_t;
            descVal.key = 'node-name:';
            descVal.value = partDesc.devName;
            this.bindSrcDesc.push(descVal);
            descVal = {} as gIF.descVal_t;
            descVal.key = 'label:';
            descVal.value = partDesc.part;
            this.bindSrcDesc.push(descVal);
        }
    }

    /***********************************************************************************************
     * fn          setBindSourceDesc
     *
     * brief
     *
     */
     public setBindDstDesc(bind: gIF.bind_t){

        this.bindDstDesc = [];
        let partDesc: gIF.part_t = this.dlgData.partMap.get(bind.partNum);
        if(partDesc){
            let descVal = {} as gIF.descVal_t;
            descVal.key = 'S/N:';
            descVal.value = this.utils.extToHex(bind.extAddr);
            this.bindDstDesc.push(descVal);
            descVal = {} as gIF.descVal_t;
            descVal.key = 'node-name:';
            descVal.value = partDesc.devName;
            this.bindDstDesc.push(descVal);
            descVal = {} as gIF.descVal_t;
            descVal.key = 'label:';
            descVal.value = partDesc.part;
            this.bindDstDesc.push(descVal);
        }
    }

    /***********************************************************************************************
     * fn          showTooltip
     *
     * brief
     *
     */
    showTooltip(tt: MatTooltip,
                bind: gIF.bind_t){
        let ttMsg = '';
        ttMsg += `S/N: ${this.utils.extToHex(bind.extAddr)} \n`;
        let partDesc: gIF.part_t = this.dlgData.partMap.get(bind.partNum);
        if(partDesc){
            ttMsg += `node-name: ${partDesc.devName} \n`;
            ttMsg += `part: ${partDesc.part} \n`;
            ttMsg += `url: ${partDesc.url} \n`;
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

        if(this.bindSrc){
            this.bindSrc.bindsDst = [];
            if(this.selBindDst.valid){
                const bindDst = {} as gIF.bindDst_t;
                bindDst.dstExtAddr = this.selBindDst.extAddr;
                bindDst.dstEP = this.selBindDst.endPoint;
                this.bindSrc.bindsDst.push(bindDst);
            }
            this.serial.wrBinds(JSON.stringify(this.bindSrc));
        }
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
     * fn          close
     *
     * brief
     *
     */
    close() {
        this.dialogRef.close();
    }

}
