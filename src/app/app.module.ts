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
        AngularMaterialModule
    ],
    providers: [],
    bootstrap: [AppComponent],
    entryComponents:[]
})
export class AppModule {
}
