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
import { EditBlockComponent } from './components/modal/modals/edit-block/edit-block.component';
import { SettingsComponent } from './components/modal/modals/settings/settings.component';
import { RemoveTowerComponent } from './components/modal/modals/remove-tower/remove-tower.component';
import { RemovePageComponent } from './components/modal/modals/remove-page/remove-page.component';
import { GetStartedComponent } from './components/modal/modals/get-started/get-started.component';
import { CreateBlockComponent } from './components/modal/modals/create-block/create-block.component';
import { RemoveBlockComponent } from './components/modal/modals/remove-block/remove-block.component';
import { ToggleComponent } from './components/shared/toggle/toggle.component';
import { TasksComponent } from './components/pages/page/tower/tasks/tasks.component';
import { ColorPipe } from './pipes/color.pipe';

@NgModule({
  declarations: [
    AppComponent,
    PageComponent,
    TowerComponent,
    DoubleSliderComponent,
    PagesComponent,
    SelectAddComponent,
    ModalComponent,
    BlockComponent,
    EditBlockComponent,
    SettingsComponent,
    RemoveTowerComponent,
    RemovePageComponent,
    GetStartedComponent,
    CreateBlockComponent,
    RemoveBlockComponent,
    ToggleComponent,
    TasksComponent,
    ColorPipe
  ],
  imports: [BrowserModule, AppRoutingModule, FormsModule, BrowserAnimationsModule, DragDropModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
