import { Component, Inject, NgZone, AfterViewInit } from '@angular/core';
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

@Component({
    selector: 'app-binds',
    templateUrl: './binds.page.html',
    styleUrls: ['./binds.page.scss'],
})
export class EditBinds implements AfterViewInit {

    allBindSrc: gIF.hostedBinds_t[] = [];
    bindSrc: gIF.hostedBinds_t;
    usedBindDst: gIF.bind_t[] = [];
    freeBindDst: gIF.bind_t[] = [];
    allBindDst: gIF.bind_t[] = [];

    selUsedBindDst: gIF.bind_t = null;
    selFreeBindDst: gIF.bind_t = null;

    bindSourceDesc: gIF.descVal_t[] = [];

    emptyFlag = true;
    noSrcBinds = true;

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
            this.bindSrc = this.allBindSrc[0];
            this.nameFormCtrl.setValue(this.bindSrc.name);
            this.ngZone.run(()=>{
                this.setBinds(this.bindSrc);
            });
            this.setBindSourceDesc(this.bindSrc);
            this.noSrcBinds = false;
        }
        else {
            this.noSrcBinds = true;
            this.emptyFlag = true;
        }
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
        for(const bindDst of this.allBindDst) {
            if(bindDst.clusterID === bindSrc.clusterID){
                this.freeBindDst.push(bindDst);
            }
        }
        for(const bindDst of bindSrc.bindsDst) {
            let idx = this.freeBindDst.findIndex((bind)=>{
                if(bind.extAddr === bindDst.dstExtAddr) {
                    if(bind.endPoint === bindDst.dstEP) {
                        if(bind.clusterID === bindSrc.clusterID) {
                            return true;
                        }
                    }
                }
                return false;
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
        }
        let numBindSrc = 0;
        for(const bind of this.allBindSrc) {
            if(bind.extAddr === bindSrc.extAddr){
                numBindSrc += bind.bindsDst.length;
            }
        }
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
            bind.name = EMPTY_NAME;
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
            bind.name = EMPTY_NAME;
            this.freeBindDst.push(bind);
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
        this.setBindSourceDesc(this.bindSrc);

        this.ngZone.run(()=>{
            this.setBinds(this.bindSrc);
        });
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
            descVal.value = this.utils.extToHex(srcBind.extAddr);
            this.bindSourceDesc.push(descVal);
            descVal = {} as gIF.descVal_t;
            descVal.key = 'node-name:';
            descVal.value = partDesc.devName;
            this.bindSourceDesc.push(descVal);
            descVal = {} as gIF.descVal_t;
            descVal.key = 'label:';
            descVal.value = partDesc.part;
            this.bindSourceDesc.push(descVal);
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

    /***********************************************************************************************
     * fn          usedDrop
     *
     * brief
     *
     */
    usedDrop(event: CdkDragDrop<any[]>) {
        if(event.previousContainer !== event.container){
            let i = this.usedBindDst.findIndex((used)=>{
                if(used.name == EMPTY_NAME){
                    return true;
                }
                return false;
            });
            const empty = {} as gIF.bind_t;
            empty.valid = false;
            empty.name = EMPTY_NAME;

            if(i > -1){
                const bind = this.freeBindDst.splice(event.previousIndex, 1, empty)[0];
                this.usedBindDst.splice(event.currentIndex, 0, bind); // insert

                let bindDst = {} as gIF.bindDst_t;
                bindDst.dstExtAddr = bind.extAddr;
                bindDst.dstEP = bind.endPoint;
                this.bindSrc.bindsDst.push(bindDst);

                if(i >= event.currentIndex){
                    i++;
                }
                this.usedBindDst.splice(i, 1);
            }
        }
        else {
            moveItemInArray(event.container.data,
                            event.previousIndex,
                            event.currentIndex);
        }
    }

    /***********************************************************************************************
     * fn          freeDrop
     *
     * brief
     *
     */
    freeDrop(event: CdkDragDrop<any[]>) {

        if(event.previousContainer !== event.container){
            let i = this.freeBindDst.findIndex((free)=>{
                if(free.name == EMPTY_NAME){
                    return true;
                }
                return false;
            });
            const empty = {} as gIF.bind_t;
            empty.valid = false;
            empty.name = EMPTY_NAME;

            const bind = this.usedBindDst.splice(event.previousIndex, 1, empty)[0];
            this.freeBindDst.splice(event.currentIndex, 0, bind); // insert

            if(i > -1) {
                if(i >= event.currentIndex){
                    i++;
                }
                this.freeBindDst.splice(i, 1);
            }

            let j = this.bindSrc.bindsDst.findIndex((bindDst) => {
                if(bind.extAddr === bindDst.dstExtAddr) {
                    if(bind.endPoint === bindDst.dstEP) {
                        return true;
                    }
                }
                return false;
            });
            if (j > -1) {
                this.bindSrc.bindsDst.splice(j, 1);
            }
        }
        else {
            moveItemInArray(event.container.data,
                            event.previousIndex,
                            event.currentIndex);
        }
    }
}
