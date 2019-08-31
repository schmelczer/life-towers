import { Injectable } from '@angular/core';
import { Page } from '../model/page';
import { IPage } from '../interfaces/persistance/page';

const LOCAL_STORAGE_KEY = 'life-towers.data.v.3';

@Injectable({
  providedIn: 'root'
})
export class StoreService<T> {
  private saveScheduled = false;
  private dataToSave: T;
  private storedData: T;
  private mockData: string = JSON.stringify([
    {
      name: 'Work & life',
      userData: {},
      type: 'Page',
      towers: [
        {
          name: 'work',
          baseColor: { h: 0, s: 100, l: 50, type: 'Color' },
          type: 'Tower',
          blocks: [
            {
              created: new Date(2015, 2, 13),
              tag: 'a',
              description: 'done it',
              isDone: true,
              type: 'Block'
            },
            {
              created: new Date(2016, 2, 15),
              tag: 'go to school',
              description: 'done it',
              type: 'Block'
            },
            {
              created: new Date(2017, 2, 15),
              tag: 'go to work',
              isDone: true,
              type: 'Block'
            },
            {
              created: new Date(2018, 2, 13),
              tag: 'go to work',
              description: 'done it',
              isDone: true,
              type: 'Block'
            },
            {
              created: new Date(2019, 3, 13),
              tag: 'go to work',
              type: 'Block'
            },
            {
              created: new Date(2020, 2, 15),
              tag: 'go to school',
              description: 'done it',
              isDone: true,
              type: 'Block'
            },
            {
              created: new Date(2021, 2, 15),
              tag: 'go to school',
              type: 'Block'
            }
          ]
        },
        {
          baseColor: { h: 180, s: 100, l: 50, type: 'Color' },
          name: 'life',
          type: 'Tower',
          blocks: [
            {
              created: new Date(2019, 3, 13),
              tag: 'go home',
              description: 'done it',
              type: 'Block'
            },
            {
              created: new Date(2019, 4, 13),
              tag: 'go home',
              type: 'Block'
            },
            {
              created: new Date(2019, 4, 15),
              tag: 'go to work',
              description: 'done it',
              type: 'Block'
            },
            {
              created: new Date(2019, 4, 15, 14),
              tag: 'go to work',
              type: 'Block'
            }
          ]
        }
      ]
    }
  ]);

  constructor() {
    const localStorageData = localStorage.getItem(LOCAL_STORAGE_KEY);
    this.storedData = JSON.parse(localStorageData ? localStorageData : this.mockData) as T;
  }

  scheduleSave(data: T) {
    this.dataToSave = data;
    if (!this.saveScheduled) {
      this.saveScheduled = true;
      setTimeout(() => {
        this.saveScheduled = false;
        this.save(this.dataToSave).catch();
      }, 0);
    }
  }

  async load(): Promise<T> {
    console.log('load', this.storedData);
    return this.storedData;
  }

  async save(data: T) {
    this.storedData = data;
    const stringified = JSON.stringify(this.storedData, null, 2);
    console.log('save');
    // console.log('save', stringified);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, stringified);
  }
}
