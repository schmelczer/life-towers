import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PageComponent } from './components/pages/page/page.component';
import { TowerComponent } from './components/pages/page/tower/tower.component';
import { DoubleSliderComponent } from './components/shared/double-slider/double-slider.component';
import { PagesComponent } from './components/pages/pages.component';
import { SelectAddComponent } from './components/shared/select-add/select-add.component';
import { ModalComponent } from './components/modal/modal.component';
import { FormsModule } from '@angular/forms';
import { BlockComponent } from './components/pages/page/tower/block/block.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { SettingsComponent } from './components/modal/modals/settings/settings.component';
import { RemoveTowerComponent } from './components/modal/modals/remove-tower/remove-tower.component';
import { RemovePageComponent } from './components/modal/modals/remove-page/remove-page.component';
import { GetStartedComponent } from './components/modal/modals/get-started/get-started.component';
import { ToggleComponent } from './components/shared/toggle/toggle.component';
import { TasksComponent } from './components/pages/page/tower/tasks/tasks.component';
import { ColorPipe } from './pipes/color.pipe';
import { BlocksComponent } from './components/modal/modals/blocks/blocks.component';
import { FormatDatePipe } from './pipes/format-date.pipe';

@NgModule({
  declarations: [
    AppComponent,
    PageComponent,
    BlockComponent,
    TowerComponent,
    DoubleSliderComponent,
    PagesComponent,
    SelectAddComponent,
    ModalComponent,
    BlockComponent,
    SettingsComponent,
    RemoveTowerComponent,
    RemovePageComponent,
    GetStartedComponent,
    ToggleComponent,
    TasksComponent,
    ColorPipe,
    BlocksComponent,
    FormatDatePipe
  ],
  imports: [BrowserModule, AppRoutingModule, FormsModule, BrowserAnimationsModule, DragDropModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
