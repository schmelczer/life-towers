import { Injectable } from '@angular/core';
import { StoreService } from './store.service';
import { Page } from '../model/page';
import { Root } from '../storage/root';
import { Serializable } from '../model/serializable';
import { Tower } from '../model/tower';
import { Block } from '../model/block';
import { IPage } from '../interfaces/persistance/page';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Observable } from 'rxjs/internal/Observable';

@Injectable({
  providedIn: 'root'
})
export class DataService extends Root<Page> {
  get pages(): Array<Page> {
    return this.children;
  }

  private readonly _safeChildren: BehaviorSubject<Array<Page>> = new BehaviorSubject(null);
  readonly safeChildren$: Observable<Array<Page>> = this._safeChildren.asObservable();

  constructor(private storeService: StoreService<Array<IPage>>) {
    super();
    this.init().catch();
  }

  private async init() {
    const pages = await this.storeService.load();
    Serializable.childrenMap = {
      Page: {
        childrenListName: 'towers',
        childrenConstructor: Tower
      },
      Tower: {
        childrenListName: 'blocks',
        childrenConstructor: Block
      },
      Block: {
        childrenListName: null,
        childrenConstructor: null
      }
    };
    for (let page of pages) {
      new Page(this, page);
    }
    this.children$.subscribe(value => {
      this.log();
      this._safeChildren.next(value);
      this.storeService.scheduleSave(this.pages);
    });
  }

  addPage(name: string) {
    new Page(this, {
      name,
      userData: {},
      type: 'Page',
      towers: []
    });
  }

  removePage(page: Page) {
    this.changeValue({
      oldValue: this.children,
      newValue: this.children.filter(c => c !== page)
    });
  }
}
