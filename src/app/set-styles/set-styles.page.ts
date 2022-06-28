import { Component, OnInit, Inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { SerialLinkService } from '../services/serial-link.service';
import { StorageService } from '../services/storage.service';
import { Validators, FormGroup, FormControl } from '@angular/forms';
import { EventsService } from '../services/events.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import * as gConst from '../gConst';
import * as gIF from '../gIF'

@Component({
    selector: 'app-set-styles',
    templateUrl: './set-styles.page.html',
    styleUrls: ['./set-styles.page.scss'],
})
export class SetStyles implements OnInit, AfterViewInit {

    @ViewChild('testView') testView: ElementRef;

    //selAttr: gIF.hostedAttr_t;
    maxFontSize: number = 50;
    maxBorderWidth: number = 10;
    maxBorderRadius: number = 20;
    maxPaddingTop: number = 20;
    maxPaddingRight: number = 20;
    maxPaddingBottom: number = 20;
    maxPaddingLeft: number = 20;

    formGroup: FormGroup;
    name: string;
    style = {} as gIF.ngStyle_t;
    valCorr = {} as gIF.valCorr_t;
    selAttr: gIF.hostedAttr_t;

    hasUnits = false;
    unitSel = [];
    unitsCtrl = new FormControl('', Validators.required);

    constructor(public dialogRef: MatDialogRef<SetStyles>,
                @Inject(MAT_DIALOG_DATA) public keyVal: any,
                public events: EventsService,
                public serialLink: SerialLinkService,
                public storage: StorageService) {
        this.selAttr = this.keyVal.value;
    }

    ngAfterViewInit(): void {
        this.testView.nativeElement.style.color = this.selAttr.style.color;
        this.testView.nativeElement.style.backgroundColor = this.selAttr.style.bgColor;
        this.testView.nativeElement.style.fontSize = `${this.selAttr.style.fontSize}px`;

        this.testView.nativeElement.style.borderColor = this.selAttr.style.borderColor;
        this.testView.nativeElement.style.borderWidth = `${this.selAttr.style.borderWidth}px`;
        this.testView.nativeElement.style.borderStyle = this.selAttr.style.borderStyle;
        this.testView.nativeElement.style.borderRadius = `${this.selAttr.style.borderRadius}px`;

        this.testView.nativeElement.style.paddingTop = `${this.selAttr.style.paddingTop}px`;
        this.testView.nativeElement.style.paddingRight = `${this.selAttr.style.paddingRight}px`;
        this.testView.nativeElement.style.paddingBottom = `${this.selAttr.style.paddingBottom}px`;
        this.testView.nativeElement.style.paddingLeft = `${this.selAttr.style.paddingLeft}px`;
    }

    ngOnInit() {
        this.name = this.selAttr.name;
        this.valCorr = this.selAttr.valCorr;
        this.style.color = this.selAttr.style.color;
        this.style.bgColor = this.selAttr.style.bgColor;
        this.style.fontSize = this.selAttr.style.fontSize;

        this.style.borderColor = this.selAttr.style.borderColor;
        this.style.borderWidth = this.selAttr.style.borderWidth;
        this.style.borderStyle = this.selAttr.style.borderStyle;
        this.style.borderRadius = this.selAttr.style.borderRadius;

        this.style.paddingTop = this.selAttr.style.paddingTop;
        this.style.paddingRight = this.selAttr.style.paddingRight;
        this.style.paddingBottom = this.selAttr.style.paddingBottom;
        this.style.paddingLeft = this.selAttr.style.paddingLeft;

        this.formGroup = new FormGroup({
            name: new FormControl(
                this.name,
                [
                    Validators.required
                ]
            ),
            offset: new FormControl(
                this.valCorr.offset,
                [
                    Validators.required
                ]
            ),
            color: new FormControl(
                this.style.color,
                [
                    Validators.required
                ]
            ),
            bgColor: new FormControl(
                this.style.bgColor,
                [
                    Validators.required
                ]
            ),
            fontSize: new FormControl(
                this.style.fontSize,
                [
                    Validators.required,
                    Validators.max(this.maxFontSize)
                ]
            ),
            borderColor: new FormControl(
                this.style.borderColor,
                [
                    Validators.required
                ]
            ),
            borderWidth: new FormControl(
                this.style.borderWidth,
                [
                    Validators.required,
                    Validators.max(this.maxBorderWidth)
                ]
            ),
            borderStyle: new FormControl(
                this.style.borderStyle,
                [
                    Validators.required
                ]
            ),
            borderRadius: new FormControl(
                this.style.borderRadius,
                [
                    Validators.required,
                    Validators.max(this.maxBorderRadius)
                ]
            ),
            paddingTop: new FormControl(
                this.style.paddingTop,
                [
                    Validators.required,
                    Validators.max(this.maxPaddingTop)
                ]
            ),
            paddingRight: new FormControl(
                this.style.paddingRight,
                [
                    Validators.required,
                    Validators.max(this.maxPaddingRight)
                ]
            ),
            paddingBottom: new FormControl(
                this.style.paddingBottom,
                [
                    Validators.required,
                    Validators.max(this.maxPaddingBottom)
                ]
            ),
            paddingLeft: new FormControl(
                this.style.paddingLeft,
                [
                    Validators.required,
                    Validators.max(this.maxPaddingLeft)
                ]
            ),
        });

        switch(this.selAttr.clusterID){
            case gConst.CLUSTER_ID_MS_TEMPERATURE_MEASUREMENT: {
                this.hasUnits = true;
                this.unitSel.push({name: 'degC', unit: gConst.DEG_C});
                this.unitSel.push({name: 'degF', unit: gConst.DEG_F});
                this.unitsCtrl.setValue(this.unitSel[0]);
                if(this.selAttr.valCorr.units == gConst.DEG_F){
                    this.unitsCtrl.setValue(this.unitSel[1]);
                }
                break;
            }
            case gConst.CLUSTER_ID_MS_PRESSURE_MEASUREMENT: {
                this.hasUnits = true;
                this.unitSel.push({name: 'mBar', unit: gConst.M_BAR});
                this.unitSel.push({name: 'inHg', unit: gConst.IN_HG});
                this.unitsCtrl.setValue(this.unitSel[0]);
                if(this.selAttr.valCorr.units == gConst.IN_HG){
                    this.unitsCtrl.setValue(this.unitSel[1]);
                }
                break;
            }
        }
    }

    async save() {
        this.name = this.formGroup.get('name').value;
        this.valCorr.units = this.unitsCtrl.value.unit;
        this.valCorr.offset = this.formGroup.get('offset').value;
        this.style.color = this.formGroup.get('color').value;
        this.style.bgColor = this.formGroup.get('bgColor').value;
        this.style.fontSize = this.formGroup.get('fontSize').value;
        this.style.borderColor = this.formGroup.get('borderColor').value;
        this.style.borderWidth = this.formGroup.get('borderWidth').value;
        this.style.borderStyle = this.formGroup.get('borderStyle').value;
        this.style.borderRadius = this.formGroup.get('borderRadius').value;
        this.style.paddingTop = this.formGroup.get('paddingTop').value;
        this.style.paddingRight = this.formGroup.get('paddingRight').value;
        this.style.paddingBottom = this.formGroup.get('paddingBottom').value;
        this.style.paddingLeft = this.formGroup.get('paddingLeft').value;

        await this.storage.setAttrNameAndStyle(this.name,
                                               this.style,
                                               this.valCorr,
                                               this.keyVal);
        this.dialogRef.close();
    }

    close() {
        this.dialogRef.close();
    }

    nameErr() {
        if(this.formGroup.get('name').hasError('required')){
            return 'You must enter a value';
        }
    }
    offsetErr() {
        if(this.formGroup.get('offset').hasError('required')){
            return 'You must enter a value';
        }
    }
    colorErr() {
        if(this.formGroup.get('color').hasError('required')){
            return 'You must enter a value';
        }
    }
    bgColorErr() {
        if(this.formGroup.get('bgColor').hasError('required')){
            return 'You must enter a value';
        }
    }
    fontSizeErr() {
        if(this.formGroup.get('fontSize').hasError('required')){
            return 'You must enter a value';
        }
        if(this.formGroup.get('fontSize').hasError('max')){
            return `font size must be less than ${this.maxFontSize}`;
        }
    }
    borderColorErr() {
        if(this.formGroup.get('borderColor').hasError('required')){
            return 'You must enter a value';
        }
    }
    borderWidthErr() {
        if(this.formGroup.get('borderWidth').hasError('required')){
            return 'You must enter a value';
        }
        if(this.formGroup.get('borderWidth').hasError('max')){
            return `border width must be less than ${this.maxBorderWidth}`;
        }
    }
    borderStyleErr() {
        if(this.formGroup.get('borderStyle').hasError('required')){
            return 'You must enter a value';
        }
    }
    borderRadiusErr() {
        if(this.formGroup.get('borderRadius').hasError('required')){
            return 'You must enter a value';
        }
        if(this.formGroup.get('borderRadius').hasError('max')){
            return `border radius must be less than ${this.maxBorderRadius}`;
        }
    }
    paddingTopErr() {
        if(this.formGroup.get('paddingTop').hasError('required')){
            return 'You must enter a value';
        }
        if(this.formGroup.get('paddingTop').hasError('max')){
            return `padding top must be less than ${this.maxPaddingTop}`;
        }
    }
    paddingRightErr() {
        if(this.formGroup.get('paddingRight').hasError('required')){
            return 'You must enter a value';
        }
        if(this.formGroup.get('paddingRight').hasError('max')){
            return `padding right must be less than ${this.maxPaddingRight}`;
        }
    }
    paddingBottomErr() {
        if(this.formGroup.get('paddingBottom').hasError('required')){
            return 'You must enter a value';
        }
        if(this.formGroup.get('paddingBottom').hasError('max')){
            return `padding bottom must be less than ${this.maxPaddingBottom}`;
        }
    }
    paddingLeftErr() {
        if(this.formGroup.get('paddingLeft').hasError('required')){
            return 'You must enter a value';
        }
        if(this.formGroup.get('paddingLeft').hasError('max')){
            return `padding left must be less than ${this.maxPaddingLeft}`;
        }
    }

    colorChange(){
        this.testView.nativeElement.style.color = this.formGroup.get('color').value;
    }
    bgColorChange(){
        this.testView.nativeElement.style.backgroundColor = this.formGroup.get('bgColor').value;
    }
    fontSizeChange(){
        this.testView.nativeElement.style.fontSize = `${this.formGroup.get('fontSize').value}px`;
    }
    borderColorChange(){
        this.testView.nativeElement.style.borderColor = this.formGroup.get('borderColor').value;
    }
    borderWidthChange(){
        this.testView.nativeElement.style.borderWidth = `${this.formGroup.get('borderWidth').value}px`;
    }
    borderStyleChange(){
        this.testView.nativeElement.style.borderStyle = this.formGroup.get('borderStyle').value;
    }
    borderRadiusChange(){
        this.testView.nativeElement.style.borderRadius = `${this.formGroup.get('borderRadius').value}px`;
    }
    paddingTopChange(){
        this.testView.nativeElement.style.paddingTop = `${this.formGroup.get('paddingTop').value}px`;
    }
    paddingRightChange(){
        this.testView.nativeElement.style.paddingRight = `${this.formGroup.get('paddingRight').value}px`;
    }
    paddingBottomChange(){
        this.testView.nativeElement.style.paddingBottom = `${this.formGroup.get('paddingBottom').value}px`;
    }
    paddingLeftChange(){
        this.testView.nativeElement.style.paddingLeft = `${this.formGroup.get('paddingLeft').value}px`;
    }

    /***********************************************************************************************
     * @fn          unitsChanged
     *
     * @brief
     *
     */
    unitsChanged(event){
        //console.log(event);
    }
}
