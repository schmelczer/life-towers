import { Component, ElementRef, ViewChild } from '@angular/core';
import { Page } from '../../model/page';
import { DataService } from '../../services/data.service';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-pages',
  templateUrl: './pages.component.html',
  styleUrls: ['./pages.component.scss']
})
export class PagesComponent {
  @ViewChild('top') top: ElementRef;
  @ViewChild('page') page: ElementRef;
  @ViewChild('bottom') bottom: ElementRef;

  constructor(public dataService: DataService, private modalService: ModalService) {}

  async selectPage(selected: string) {
    if (!this.dataService.pageNames.includes(selected)) {
      const page = new Page({
        name: selected,
        towers: [],
        userData: {}
      });

      this.dataService.push(page);
      page.addTower();
    }

    await this.dataService.changeActiveByName(selected);
  }

  async openSettings() {
    try {
      await this.modalService.showSettings();
    } catch {
      // pass
    }
  }
}
