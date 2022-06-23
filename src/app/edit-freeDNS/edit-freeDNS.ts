import {Component, Inject, OnInit, AfterViewInit} from '@angular/core';
import { StorageService } from '../services/storage.service';
import { EventsService } from '../services/events.service';
import { Validators, FormControl } from '@angular/forms';
import { sprintf } from "sprintf-js";
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {HttpClient, HttpHeaders} from '@angular/common/http';

import * as gConst from '../gConst';
import * as gIF from '../gIF'

interface httpRsp_t {
    key: string;
    value: string;
}

@Component({
    selector: 'app-edit-freeDNS',
    templateUrl: './edit-freeDNS.html',
    styleUrls: ['./edit-freeDNS.css']
})
export class EditFreeDNS implements OnInit, AfterViewInit {

    dns = {
        user: 'user',
        psw: 'psw',
        domain: 'domain',
        token: 'token'
    };
    httpRsp: string = '';

    logs: httpRsp_t[] = [];

    userCtrl = new FormControl('user', Validators.required);
    pswCtrl = new FormControl('psw', Validators.required);
    domainCtrl = new FormControl('domain', Validators.required);
    tokenCtrl = new FormControl('token', Validators.required);

    constructor(public dialogRef: MatDialogRef<EditFreeDNS>,
                @Inject(MAT_DIALOG_DATA) public dlgData: any,
                public events: EventsService,
                public storage: StorageService,
                private http: HttpClient) {
        /*
        let log = {
            key: '- status :',
            value: '...'
        };
        this.logs = [];
        this.logs.push(log);
        */
        // ---
    }

    /***********************************************************************************************
     * @fn          ngOnInit
     *
     * @brief
     *
     */
    ngOnInit(): void {

    }
    /***********************************************************************************************
     * @fn          ngAfterViewInit
     *
     * @brief
     *
     */
    ngAfterViewInit(): void {

        const dns = this.storage.getFreeDNS();
        if(dns){
            this.dns = dns;
            this.userCtrl.setValue(this.dns.user);
            this.pswCtrl.setValue(this.dns.psw);
            this.domainCtrl.setValue(this.dns.domain);
        }
        else {
            console.log('no freeDNS');
        }
    }
    /***********************************************************************************************
     * @fn          save
     *
     * @brief
     *
     */
    save() {
        this.dns.user = this.userCtrl.value;
        this.dns.psw = this.pswCtrl.value;
        this.dns.domain = this.domainCtrl.value;
        this.dns.token = 'not-used';

        this.storage.setFreeDNS(this.dns);
        this.dialogRef.close();
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
     * @fn          userErr
     *
     * @brief
     *
     */
    userErr() {
        if(this.userCtrl.hasError('required')){
            return 'You must enter a value';
        }
    }
    /***********************************************************************************************
     * @fn          pswErr
     *
     * @brief
     *
     */
    pswErr() {
        if(this.pswCtrl.hasError('required')){
            return 'You must enter a value';
        }
    }
    /***********************************************************************************************
     * @fn          domainErr
     *
     * @brief
     *
     */
    domainErr() {
        if(this.domainCtrl.hasError('required')){
            return 'You must enter a value';
        }
    }

    /***********************************************************************************************
     * @fn          userChange
     *
     * @brief
     *
     */
    userChange(){
        // ---
    }
    /***********************************************************************************************
     * @fn          pswChange
     *
     * @brief
     *
     */
    pswChange(){
        // ---
    }
    /***********************************************************************************************
     * @fn          domainChange
     *
     * @brief
     *
     */
    domainChange(){
        // ---
    }

    /***********************************************************************************************
     * @fn          test
     *
     * @brief
     *
     */
    test(){
        let log = {
            key: '- status :',
            value: '...'
        };
        this.logs = [];
        this.logs.push(log);
        const headers = new HttpHeaders()
            .set("Authorization", 'Basic ' + btoa(this.dns.user + ':' + this.dns.psw));
        let httpReq = 'https://freedns.afraid.org/nic/update?hostname=' + this.dns.domain;
        this.http.get(httpReq, {headers: headers, responseType: 'text'}).subscribe((rsp: any) => {
            console.log(rsp);
            this.logs = [];
            log = {
                key: '- status: ',
                value: rsp
            };
            this.logs.push(log);
        }, (err)=>{
            console.log(err);
        });
    }
}
