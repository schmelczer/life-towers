import { ApplicationRef, Injectable } from '@angular/core';
import { StoreService } from './store.service';
import { Page } from '../model/page';

const USER_DATA_KEY = 'life-towers.user-data.v.1';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  get active(): Page {
    return this._active;
  }

  get pageNames(): string[] {
    return this.data.map(p => p.name);
  }

  private subscribers: (() => void)[] = [];
  private _active: Page = null;
  private data: Page[];
  private hasLoaded = new Promise(resolve => (this.afterLoadFinished = resolve));
  private afterLoadFinished: () => void;

  constructor(private storeService: StoreService, private applicationRef: ApplicationRef) {
    this.init();
  }

  push(value: Page) {
    value.subscribe(() => this.save());
    this.data.push(value);
    this._active = value;
    this.save();
  }

  remove() {
    this.data = this.data.filter(p => p !== this.active);
    this._active = this.data.length > 0 ? this.data[0] : null;
    this.save();
  }

  subscribe(func: () => void) {
    this.subscribers.push(func);
  }

  async changeActiveByName(name: string): Promise<void> {
    await this.hasLoaded;
    this._active = this.data.filter(p => p.name === name)[0];
    this.saveActiveIndex(this.data.indexOf(this.active));
    this.update();
  }

  async changeActiveByIndex(index: number): Promise<void> {
    await this.hasLoaded;
    this._active = this.data[index];
    this.saveActiveIndex(index);
    this.update();
  }

  private async init() {
    this.data = await this.storeService.load();
    this.data.map(p => p.subscribe(() => this.save()));
    this._active = this.data.length > 0 ? this.data[0] : null;
    this.loadActiveIndex();
    this.afterLoadFinished();
  }

  private save() {
    this.storeService.save(this.data);
    this.update();
  }

  private update() {
    this.subscribers.map(f => f());
    this.applicationRef.tick();
  }

  private loadActiveIndex() {
    const userData = JSON.parse(window.localStorage.getItem(USER_DATA_KEY));
    if (userData === null) {
      return;
    }
    this._active = this.data[userData.index];
  }

  private saveActiveIndex(index: number) {
    window.localStorage.setItem(
      USER_DATA_KEY,
      JSON.stringify({
        index
      })
    );
  }
}
