import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
export class PagesComponent implements OnInit {
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

  selectedPageName: string;

  private readonly _selectedPage: BehaviorSubject<Page> = new BehaviorSubject(null);
  readonly selectedPage$: Observable<Page> = this._selectedPage.asObservable();

  constructor(public dataService: DataService, private modalService: ModalService) {
    const userData = JSON.parse(window.localStorage.getItem(USER_DATA_KEY));
    if (userData !== null) {
      this.selectedPageName = userData.selectedPage;
    }
  }

  ngOnInit() {
    this.dataService.children$.subscribe(pages => {
      if (pages) {
        if (this.pages && this.pages.length - 1 === pages.length) {
          this.selectedPageName = null;
        }
        this.pages = pages;
        this.selectPage(this.selectedPageName);
      }
    });
  }

  selectPage(name: string) {
    if (!name) {
      if (this.pages && this.pages.length > 0) {
        name = this.pages[0].name;
      }
    }
    this.selectedPageName = name;

    window.localStorage.setItem(
      USER_DATA_KEY,
      JSON.stringify({
        selectedPage: name
      })
    );

    if (this.pages && name) {
      if (!this.pageNames.includes(name)) {
        this.dataService.addPage(name);
      }

      const index = this.pageNames.indexOf(name);
      this._selectedPage.next(this.pages[index]);
      return;
    }

    this._selectedPage.next(null);
  }

  async openSettings() {
    try {
      await this.modalService.showSettings(this.selectedPage$);
    } catch {
      // pass
    }
  }
}
