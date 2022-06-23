import {Component, Inject, OnInit, AfterViewInit, ViewChild} from '@angular/core';
//import { nsService } from '../ns.service';
import { EventsService } from '../services/events.service';
import { Validators, FormControl } from '@angular/forms';
import { sprintf } from "sprintf-js";
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import * as gIF from '../gIF'

import {AppComponent} from '../app.component'

@Component({
    selector: 'app-edit-scrolls',
    templateUrl: './edit-scrolls.html',
    styleUrls: ['./edit-scrolls.css']
})
export class EditScrolls implements OnInit, AfterViewInit {

    @ViewChild('selList') selList;

    maxPos = 100;
    maxDuration = 2000;

    scrollCtrl = new FormControl('', Validators.required);

    scrolls: gIF.scroll_t[] = [];
    newIdx: number = 0;

    nameCtrl = new FormControl('', Validators.required);
    yPosCtrl = new FormControl(0, [Validators.required, Validators.max(this.maxPos)]);
    durationCtrl = new FormControl(0, [Validators.required, Validators.max(this.maxDuration)]);

    constructor(public dialogRef: MatDialogRef<EditScrolls>,
                @Inject(MAT_DIALOG_DATA) public dlgData: any,
                public events: EventsService) {
        // ---
    }

    /***********************************************************************************************
     * @fn          ngOnInit
     *
     * @brief
     *
     */
    ngOnInit(): void {
        for(let i = 0; i < this.dlgData.scrolls.length; i++){
            let scroll = {} as gIF.scroll_t;
            scroll.name = this.dlgData.scrolls[i].name;
            scroll.yPos = this.dlgData.scrolls[i].yPos;
            scroll.duration = this.dlgData.scrolls[i].duration;
            this.scrolls.push(scroll);
        }
    }
    /***********************************************************************************************
     * @fn          ngAfterViewInit
     *
     * @brief
     *
     */
    ngAfterViewInit(): void {
        setTimeout(() => {
            const scroll = this.scrolls[0];
            if(scroll) {
                this.scrollCtrl.setValue(scroll);
            }
        }, 0);
    }
    /***********************************************************************************************
     * @fn          save
     *
     * @brief
     *
     */
    save() {
        this.dialogRef.close(this.scrolls);
    }
    /***********************************************************************************************
     * @fn          close
     *
     * @brief
     *
     */
    close() {
        this.dialogRef.close();
    }
    /***********************************************************************************************
     * @fn          nameErr
     *
     * @brief
     *
     */
    nameErr() {
        if(this.nameCtrl.hasError('required')){
            return 'You must enter a value';
        }
    }
    /***********************************************************************************************
     * @fn          posErr
     *
     * @brief
     *
     */
    posErr() {
        if(this.yPosCtrl.hasError('required')){
            return 'You must enter a value';
        }
        if(this.yPosCtrl.hasError('max')){
            return sprintf('position must be less than %d %%', this.maxPos);
        }
    }
    /***********************************************************************************************
     * @fn          durationErr
     *
     * @brief
     *
     */
    durationErr() {
        if(this.durationCtrl.hasError('required')){
            return 'You must enter a value';
        }
        if(this.durationCtrl.hasError('max')){
            return sprintf('duration must be less than %d', this.maxDuration);
        }
    }
    /***********************************************************************************************
     * @fn          nameChange
     *
     * @brief
     *
     */
    nameChange(name){
        const scroll = this.scrollCtrl.value;
        if(name){
            if(scroll){
                scroll.name = name;
            }
        }
    }
    /***********************************************************************************************
     * @fn          yPosChange
     *
     * @brief
     *
     */
    yPosChange(pos){
        if(pos > this.maxPos){
            return;
        }
        this.dlgData.scrollRef.scrollTo(0, pos * this.dlgData.imgDim.height / 100, 500);
        const scroll = this.scrollCtrl.value;
        if(scroll){
            scroll.yPos = pos;
        }
    }
    /***********************************************************************************************
     * @fn          durationChange
     *
     * @brief
     *
     */
    durationChange(duration){
        if(duration > this.maxDuration){
            return;
        }
        const scroll = this.scrollCtrl.value;
        if(scroll){
            scroll.duration = duration;
        }
    }
    /***********************************************************************************************
     * @fn          addScroll
     *
     * @brief
     *
     */
    addScroll(){
        let scroll = {} as gIF.scroll_t;
        scroll.name = sprintf('new_%d', this.newIdx++);
        scroll.yPos = 0;
        scroll.duration = 200;

        this.scrolls.push(scroll);
        this.scrollCtrl.setValue(scroll);
    }
    /***********************************************************************************************
     * @fn          delScroll
     *
     * @brief
     *
     */
    delScroll(){
        const scroll = this.scrollCtrl.value;
        let selIdx = this.scrolls.findIndex(item => item === scroll);
        if(selIdx > -1){
            this.scrolls.splice(selIdx, 1);
            selIdx--;
            if(selIdx == -1){
                if(this.scrolls.length){
                    selIdx = 0;
                }
            }
            if(selIdx > -1){
                const scroll = this.scrolls[selIdx];
                this.scrollCtrl.setValue(scroll);
            }
            else {
                this.scrollCtrl.reset();
            }
        }
    }
    /***********************************************************************************************
     * @fn          selChanged
     *
     * @brief
     *
     */
    selChanged(event){
        //console.log(event);
    }

}
