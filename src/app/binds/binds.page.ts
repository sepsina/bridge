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
    usedBindDst: gIF.bind_t[] = [];
    freeBindDst: gIF.bind_t[] = [];
    allBindDst: gIF.bind_t[] = [];

    selUsedBindDst: gIF.bind_t = null;
    selFreeBindDst: gIF.bind_t = null;

    bindSourceDesc: gIF.descVal_t[] = [];

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
        }

        setTimeout(() => {
            const boxHeight = this.bindBoxRef.nativeElement.offsetHeight;
            let boxNum = this.usedBindDst.length;
            if(boxNum > 4){
                boxNum = 4;
            }
            const wrapHeight = boxNum * boxHeight;
            this.wrapRef.nativeElement.style.height = `${wrapHeight}px`;
        }, 200);
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
                bind.name = UNKNOWN_NAME;
                this.usedBindDst.push(bind);
            }
        }
        let numBindSrc = 0;
        for(const bind of this.allBindSrc) {
            if(bind.extAddr === bindSrc.extAddr){
                numBindSrc += bind.bindsDst.length;
            }
        }
        let numEmpty = 0;
        if(numBindSrc < bindSrc.maxBinds){
            numEmpty = bindSrc.maxBinds - numBindSrc;
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
            bind.name = USED_NAME;
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
        if(this.bindSrc){
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

    /***********************************************************************************************
     * fn          usedDrop
     *
     * brief
     *
     */
    usedDrop(event: CdkDragDrop<any[]>) {

        let idx = 0;
        let len = 0;
        let fullFlag = true;

        const empty = {} as gIF.bind_t;
        empty.valid = false;
        empty.name = EMPTY_NAME;

        if(event.previousContainer !== event.container){
            idx = 0;
            len = this.usedBindDst.length;
            fullFlag = true;
            while(idx < len){
                if(this.usedBindDst[idx].name === EMPTY_NAME){
                    fullFlag = false;
                    break;
                }
                idx++;
            }
            if(fullFlag === true){
                return;
            }

            const bind = this.freeBindDst.splice(event.previousIndex, 1, empty)[0];
            this.usedBindDst.splice(event.currentIndex, 0, bind); // insert

            let done = false;
            idx = event.currentIndex + 1;
            len = this.usedBindDst.length
            while(idx < len){
                if(this.usedBindDst[idx].name == EMPTY_NAME){
                    this.usedBindDst.splice(idx, 1);
                    done = true;
                    break;
                }
                idx++;
            }
            if(done == false){
                idx = 0;
                while(idx < event.currentIndex){
                    if(this.usedBindDst[idx].name == EMPTY_NAME){
                        this.usedBindDst.splice(idx, 1);
                        break;
                    }
                    idx++;
                }
            }

            let bindDst = {} as gIF.bindDst_t;
            bindDst.dstExtAddr = bind.extAddr;
            bindDst.dstEP = bind.endPoint;
            this.bindSrc.bindsDst.push(bindDst);
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

        let idx = 0;
        let len = 0;

        const empty = {} as gIF.bind_t;
        empty.valid = false;
        empty.name = EMPTY_NAME;

        if(event.previousContainer !== event.container){
            const bind = this.usedBindDst.splice(event.previousIndex, 1, empty)[0];
            this.freeBindDst.splice(event.currentIndex, 0, bind); // insert

            let done = false;
            idx = event.currentIndex + 1;
            len = this.freeBindDst.length
            while(idx < len){
                if(this.freeBindDst[idx].name == EMPTY_NAME){
                    this.freeBindDst.splice(idx, 1);
                    done = true;
                    break;
                }
                idx++;
            }
            if(done == false){
                idx = 0;
                while(idx < event.currentIndex){
                    if(this.freeBindDst[idx].name == EMPTY_NAME){
                        this.freeBindDst.splice(idx, 1);
                        break;
                    }
                    idx++;
                }
            }
            idx = 0;
            len = this.bindSrc.bindsDst.length;
            while(idx < len){
                if(this.bindSrc.bindsDst[idx].dstExtAddr === bind.extAddr){
                    if(this.bindSrc.bindsDst[idx].dstEP === bind.endPoint){
                        this.bindSrc.bindsDst.splice(idx, 1);
                        break;
                    }
                }
                idx++;
            }
        }
        else {
            moveItemInArray(event.container.data,
                            event.previousIndex,
                            event.currentIndex);
        }
    }
}
