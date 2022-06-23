import { NgModule } from '@angular/core';
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { SetStyles } from "./set-styles/set-styles.page";
import { EditScrolls } from "./edit-scrolls/edit-scrolls";
import { EditFreeDNS } from "./edit-freeDNS/edit-freeDNS";
import { EditBinds } from "./binds/binds.page";
import { HighlightSel } from "./directives/highlight-sel.directive";

import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { HttpClientModule } from '@angular/common/http';

import { AngularMaterialModule } from './angular-material/angular-material.module';
import { AngularDraggableModule } from "angular2-draggable";
//import { NgScrollbarModule } from 'ngx-scrollbar';
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';
import { PERFECT_SCROLLBAR_CONFIG } from 'ngx-perfect-scrollbar';
import { PerfectScrollbarConfigInterface } from 'ngx-perfect-scrollbar';

const DEFAULT_PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
    suppressScrollX: true
};

@NgModule({
    declarations: [
        AppComponent,
        SetStyles,
        EditScrolls,
        EditFreeDNS,
        EditBinds,
        HighlightSel
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        HttpClientModule,
        AngularMaterialModule,
        AngularDraggableModule,
        //NgScrollbarModule
        PerfectScrollbarModule
    ],
    providers: [
        {
            provide: PERFECT_SCROLLBAR_CONFIG,
            useValue: DEFAULT_PERFECT_SCROLLBAR_CONFIG
        }
    ],
    bootstrap: [AppComponent],
    entryComponents:[
        
    ]
})
export class AppModule {
}
