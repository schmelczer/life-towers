import { Injectable } from '@angular/core';
import { StoreService } from './store.service';
import { Page } from '../model/page';
import { Root } from '../store/root';
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
  private readonly _safeChildren: BehaviorSubject<Array<Page>> = new BehaviorSubject(null);
  readonly safeChildren$: Observable<Array<Page>> = this._safeChildren.asObservable();

  constructor(private storeService: StoreService<Array<IPage>>) {
    super();
    this.init().catch();
  }

  get pages(): Array<Page> {
    return this.children;
  }

  save(timeout: number) {
    this.storeService.scheduleSave(this.pages, timeout);
  }

  addPage(name: string) {
    const page = new Page({
      name,
      userData: {},
      towers: []
    });
    this.addChildren([page]);
    page.addTower();
  }

  removePage(page: Page) {
    this.changeKeys<any>({
      children: this.children.filter(c => c !== page)
    });
  }

  private async init() {
    const pages = await this.storeService.load();
    Serializable.childrenMap = {
      Page: {
        childrenListName: 'towers',
        childrenConstructor: Tower,
        childrenType: 'Tower'
      },
      Tower: {
        childrenListName: 'blocks',
        childrenConstructor: Block,
        childrenType: 'Block'
      },
      Block: {
        childrenListName: null,
        childrenConstructor: null,
        childrenType: null
      }
    };
    this.children$.subscribe(value => {
      this.log();
    });

    this.addChildren(pages.map(p => new Page(p)));

    this.children$.subscribe(value => {
      this._safeChildren.next(value);
      this.save(0);
    });
  }
}
