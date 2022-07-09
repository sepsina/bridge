import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, NgZone, OnDestroy, Inject } from '@angular/core';
import { EventsService } from './services/events.service';
import { SerialLinkService } from './services/serial-link.service';
import { UdpService } from './services/udp.service';
import { HttpService } from './services/http.service';
import { StorageService } from './services/storage.service';
import { UtilsService } from './services/utils.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';

import { SetStyles } from './set-styles/set-styles.page';
import { EditScrolls } from './edit-scrolls/edit-scrolls';
import { EditFreeDNS } from './edit-freeDNS/edit-freeDNS';
import { EditBinds } from './binds/binds.page';

import { PerfectScrollbarComponent } from 'ngx-perfect-scrollbar';

import * as gConst from './gConst';
import * as gIF from './gIF';

import { fromEvent, Observable, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { CdkDragEnd, CdkDragStart } from '@angular/cdk/drag-drop';
import { CDK_DRAG_CONFIG } from '@angular/cdk/drag-drop';

const DragConfig = {
    dragStartThreshold: 0,
    pointerDirectionChangeThreshold: 5,
    zIndex: 10000
};

@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html',
    styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {

    @ViewChild('containerRef') containerRef: ElementRef;
    @ViewChild('scrollRef') scrollRef?: PerfectScrollbarComponent;

    resizeObservable$: Observable<Event>;
    resizeSubscription$: Subscription;

    bkgImgWidth: number;
    bkgImgHeight: number;
    imgUrl: string;
    imgDim = {} as gIF.imgDim_t;

    scrolls: gIF.scroll_t[] = [
        {
            name: 'floor-1',
            yPos: 10,
            speed: 200,
        },
        {
            name: 'floor-2',
            yPos: 50,
            speed: 800,
        },
    ];

    partDesc: gIF.partDesc_t[] = [];
    partMap = new Map();

    dragFlag = false;

    constructor(private events: EventsService,
                private serialLink: SerialLinkService,
                private udp: UdpService,
                private http: HttpService,
                public storage: StorageService,
                private matDialog: MatDialog,
                private ngZone: NgZone,
                private utils: UtilsService) {
        // ---
    }

    /***********************************************************************************************
     * fn          ngAfterViewInit
     *
     * brief
     *
     */
    ngAfterViewInit() {
        // ---
    }

    /***********************************************************************************************
     * fn          ngOnInit
     *
     * brief
     *
     */
    ngOnInit() {
        window.onbeforeunload = async ()=>{
            this.udp.closeSocket();
            this.serialLink.closeComPort();
        };

        this.resizeObservable$ = fromEvent(window, 'resize');
        this.resizeSubscription$ = this.resizeObservable$.pipe(debounceTime(500)).subscribe((evt)=>{
            this.scaleImgConteiner();
        });

        this.init();
    }

    /***********************************************************************************************
     * fn          ngOnDestroy
     *
     * brief
     *
     */
    ngOnDestroy() {
        this.resizeSubscription$.unsubscribe();
    }

    /***********************************************************************************************
     * fn          init
     *
     * brief
     *
     */
    async init() {
        try {
            let base64 = window.nw.require('fs').readFileSync('./src/assets/floor_plan.jpg', 'base64');
            this.imgUrl = `data:image/jpeg;base64,${base64}`;
            this.setBkgImg(this.imgUrl);
        }
        catch (err) {
            console.log('read dir err: ' + err.code);
        }
        try {
            let parts = window.nw.require('fs').readFileSync('./src/assets/parts.json', 'utf8');
            this.partDesc = JSON.parse(parts);
            for(let desc of this.partDesc) {
                let part = {} as gIF.part_t;
                part.devName = desc.devName;
                part.part = desc.part;
                part.url = desc.url;
                this.partMap.set(desc.partNum, part);
            }
            //console.log(JSON.stringify(this.partDesc));
        }
        catch (err) {
            console.log('read parts err: ' + JSON.stringify(err));
        }
        //this.scrolls = [];
        //const scrolls = await this.ns.getScrolls();
        //this.scrolls = JSON.parse(this.storage.getScrolls());
    }

    /***********************************************************************************************
     * fn          onScroll
     *
     * brief
     *
     */
    onScroll(idx) {

        const x = 0;
        const y = (this.scrolls[idx].yPos * this.imgDim.height) / 100;
        const speed = this.scrolls[idx].speed;

        this.scrollRef.directiveRef.scrollTo(x, y, speed);
    }

    /***********************************************************************************************
     * fn          getAttrStyle
     *
     * brief
     *
     */
    getAttrStyle(attr: any) {
        let attrStyle = attr.value.style;
        let retStyle = {
            color: attrStyle.color,
            'background-color': attrStyle.bgColor,
            'font-size.px': attrStyle.fontSize,
            'border-color': attrStyle.borderColor,
            'border-width.px': attrStyle.borderWidth,
            'border-style': attrStyle.borderStyle,
            'border-radius.px': attrStyle.borderRadius,
            'padding-top.px': attrStyle.paddingTop,
            'padding-right.px': attrStyle.paddingRight,
            'padding-bottom.px': attrStyle.paddingBottom,
            'padding-left.px': attrStyle.paddingLeft,
        };
        if(attr.value.isValid == false) {
            retStyle.color = 'gray';
            retStyle['background-color'] = 'transparent';
            retStyle['border-color'] = 'gray';
            retStyle['border-width.px'] = 2;
            retStyle['border-style'] = 'dotted';
        }
        return retStyle;
    }

    /***********************************************************************************************
     * fn          getAttrPosition
     *
     * brief
     *
     */
    getAttrPosition(attr: any) {

        if(attr.value.drag){
            return undefined;
        }
        let attrPos = attr.value.pos;

        return {
            x: attrPos.x * this.imgDim.width,
            y: attrPos.y * this.imgDim.height,
        };
    }

    /***********************************************************************************************
     * fn          setBkgImg
     *
     * brief
     *
     */
    setBkgImg(imgSrc: string) {
        let bkgImg = new Image();
        bkgImg.src = imgSrc;
        bkgImg.onload = ()=>{
            this.bkgImgWidth = bkgImg.width;
            this.bkgImgHeight = bkgImg.height;
            const el = this.containerRef.nativeElement;
            let divDim = el.getBoundingClientRect();
            this.imgDim.width = divDim.width;
            this.imgDim.height = Math.round((divDim.width / bkgImg.width) * bkgImg.height);
            el.style.height = `${this.imgDim.height}px`;
            el.style.backgroundImage = `url(${imgSrc})`;
            el.style.backgroundAttachment = 'scroll';
            el.style.backgroundRepeat = 'no-repeat';
            el.style.backgroundSize = 'contain';
        };
    }

    /***********************************************************************************************
     * fn          scaleImgCont
     *
     * brief
     *
     */
    scaleImgConteiner() {

        const el = this.containerRef.nativeElement;
        let divDim = el.getBoundingClientRect();

        console.log(divDim);

        this.imgDim.width = divDim.width;
        this.imgDim.height = Math.round((divDim.width / this.bkgImgWidth) * this.bkgImgHeight);
        el.style.height = `${this.imgDim.height}px`;
    }

    /***********************************************************************************************
     * @fn          onDragEnded
     *
     * @brief
     *
     */
    async onDragEnded(event: CdkDragEnd, keyVal: any) {

        this.dragFlag = false;
        event.source.element.nativeElement.style.zIndex = '1';

        const evtPos = event.source.getFreeDragPosition();

        let pos: gIF.nsPos_t = {
            x: evtPos.x / this.imgDim.width,
            y: evtPos.y / this.imgDim.height,
        };
        keyVal.value.pos = pos;

        await this.storage.setAttrPos(pos, keyVal);
    }

    /***********************************************************************************************
     * @fn          onDragEnded
     *
     * @brief
     *
     */
    async onDragStarted(event: CdkDragStart) {
        this.dragFlag = true;
        event.source.element.nativeElement.style.zIndex = '10000';
    }

    /***********************************************************************************************
     * @fn          setStyles
     *
     * @brief
     *
     */
    async setStyles(keyVal: any) {

        setTimeout(()=>{
            const dialogConfig = new MatDialogConfig();
            dialogConfig.data = keyVal;
            dialogConfig.width = '350px';
            dialogConfig.autoFocus = false;
            dialogConfig.disableClose = true;
            dialogConfig.panelClass = 'set-styles-container';

            const dlgRef = this.matDialog.open(SetStyles, dialogConfig);
            dlgRef.afterOpened().subscribe(()=>{
                // ---
            });
        }, 10);
    }

    /***********************************************************************************************
     * @fn          onEditScrollsClick
     *
     * @brief
     *
     */
    async onEditScrollsClick(scrollRef) {

        setTimeout(()=>{
            const dlgData = {
                scrolls: JSON.parse(JSON.stringify(this.scrolls)),
                //scrollRef: this.componentRef.directiveRef,
                scrollRef: scrollRef.directiveRef,
                imgDim: this.imgDim,
            };
            const dialogConfig = new MatDialogConfig();
            dialogConfig.data = dlgData;
            dialogConfig.width = '250px';
            dialogConfig.autoFocus = false;
            dialogConfig.disableClose = true;
            dialogConfig.panelClass = 'edit-scrolls-container';

            const dlgRef = this.matDialog.open(EditScrolls, dialogConfig);

            dlgRef.afterOpened().subscribe(()=>{
                // ---
            });
            dlgRef.afterClosed().subscribe((data) => {
                if (data) {
                    this.scrolls = data;
                    this.storage.setScrolls(this.scrolls);
                }
            });
        }, 10);
    }

    /***********************************************************************************************
     * @fn          setDNS
     *
     * @brief
     *
     */
    async setDNS() {

        setTimeout(()=>{
            const dialogConfig = new MatDialogConfig();
            dialogConfig.data = '';
            dialogConfig.width = '350px';
            dialogConfig.autoFocus = false;
            dialogConfig.disableClose = true;
            dialogConfig.panelClass = 'set-dns-container';

            const dlgRef = this.matDialog.open(EditFreeDNS, dialogConfig);
            dlgRef.afterOpened().subscribe(()=>{
                // ---
            });
        }, 10);
    }
    /***********************************************************************************************
     * @fn          editBinds
     *
     * @brief
     *
     */
    async editBinds() {

        setTimeout(()=>{
            const dlgData = {
                partMap: this.partMap,
            };
            const dialogConfig = new MatDialogConfig();
            dialogConfig.data = dlgData;
            dialogConfig.width = '700px';
            dialogConfig.autoFocus = false;
            dialogConfig.disableClose = true;
            dialogConfig.panelClass = 'edit-binds-container';

            const dlgRef = this.matDialog.open(EditBinds, dialogConfig);

            dlgRef.afterOpened().subscribe(()=>{
                // ---
            });
        }, 10);
    }

    /***********************************************************************************************
     * fn          showTooltip
     *
     * brief
     *
     */
    showTooltip(tt: MatTooltip, attr: gIF.hostedAttr_t) {

        let ttMsg = '';
        ttMsg += `attr-name: ${attr.name} \n`;
        ttMsg += `S/N: ${this.utils.extToHex(attr.extAddr)} \n`;
        let partDesc: gIF.part_t = this.partMap.get(attr.partNum);
        if(partDesc) {
            ttMsg += `node-name: ${partDesc.devName} \n`;
            ttMsg += `part: ${partDesc.part} \n`;
            ttMsg += `url: ${partDesc.url} \n`;
        }
        tt.message = ttMsg;
        tt.showDelay = 500;
        tt.tooltipClass = 'attr-tooltip';
        tt.show();
    }
    /***********************************************************************************************
     * fn          hideTooltip
     *
     * brief
     *
     *
    hideTooltip(tt: MatTooltip){
        tt.hide();
    }
    */
}
