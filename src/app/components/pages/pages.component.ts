import { Component, ElementRef, ViewChild } from '@angular/core';
import { Page } from '../../model/page';
import { DataService } from '../../services/data.service';
import { ModalService } from '../../services/modal.service';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Observable } from 'rxjs/internal/Observable';

const USER_DATA_KEY = 'life-towers.user-data.v.2';

@Component({
  selector: 'app-pages',
  templateUrl: './pages.component.html',
  styleUrls: ['./pages.component.scss']
})
export class PagesComponent {
  @ViewChild('top') top: ElementRef;
  @ViewChild('page') page: ElementRef;
  @ViewChild('bottom') bottom: ElementRef;

  pages: Array<Page>;
  isDragHappening = false;

  get pageNames() {
    if (this.pages) {
      return this.pages.map(p => p.name);
    }
    return [];
  }

  set selectedPageName(value: string) {
    window.localStorage.setItem(
      USER_DATA_KEY,
      JSON.stringify({
        selectedPage: value
      })
    );
    const index = this.pageNames.indexOf(value);
    this._selectedPage.next(index >= 0 ? this.pages[0] : null);
  }

  private readonly _selectedPage: BehaviorSubject<Page> = new BehaviorSubject(null);
  readonly selectedPage$: Observable<Page> = this._selectedPage.asObservable();

  constructor(public dataService: DataService, private modalService: ModalService) {
    const userData = JSON.parse(window.localStorage.getItem(USER_DATA_KEY));
    if (userData !== null && userData.selectedPage !== undefined) {
      this.selectedPageName = userData.selectedPage;
    }

    this.dataService.children$.subscribe(pages => {
      if (pages) {
        this.pages = pages;
        if (!this._selectedPage.getValue() && this.pages.length > 0) {
          this.selectedPageName = this.pages[0].name;
        } else if (this._selectedPage.getValue()) {
          // To trigger update on new page.
          this.selectedPageName = this._selectedPage.getValue().name;
        }
      }
    });
  }

  async openSettings() {
    try {
      await this.modalService.showSettings(this.selectedPage$);
    } catch {
      // pass
    }
  }
}
