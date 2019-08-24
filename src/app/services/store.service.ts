import { Injectable } from '@angular/core';
import { Page } from '../model/page';

const LOCAL_STORAGE_KEY = 'life-towers.data.v.2.1';

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private storedData: Page[];

  private mockData: string = JSON.stringify([
    {
      name: 'Work & life',
      userData: {},
      towers: [
        {
          name: 'work',
          baseColor: { h: 0, s: 100, l: 50 },
          blocks: [
            {
              created: new Date(2015, 2, 13),
              tag: 'a',
              description: 'done it',
              isDone: true
            },
            {
              created: new Date(2016, 2, 15),
              tag: 'go to school',
              description: 'done it'
            },
            {
              created: new Date(2017, 2, 15),
              tag: 'go to work',
              isDone: true
            },
            {
              created: new Date(2018, 2, 13),
              tag: 'go to work',
              description: 'done it',
              isDone: true
            },
            {
              created: new Date(2019, 3, 13),
              tag: 'go to work'
            },
            {
              created: new Date(2020, 2, 15),
              tag: 'go to school',
              description: 'done it',
              isDone: true
            },
            {
              created: new Date(2021, 2, 15),
              tag: 'go to school'
            }
          ]
        },
        {
          baseColor: { h: 180, s: 100, l: 50 },
          name: 'life',
          blocks: [
            {
              created: new Date(2019, 3, 13),
              tag: 'go home',
              description: 'done it'
            },
            {
              created: new Date(2019, 4, 13),
              tag: 'go home'
            },
            {
              created: new Date(2019, 4, 15),
              tag: 'go to work',
              description: 'done it'
            },
            {
              created: new Date(2019, 4, 15, 14),
              tag: 'go to work'
            }
          ]
        }
      ]
    }
  ]);

  constructor() {
    const localStorageData = localStorage.getItem(LOCAL_STORAGE_KEY);
    const data = JSON.parse(localStorageData ? localStorageData : this.mockData);
    this.storedData = data.map(p => new Page(p));
  }

  async load(): Promise<Page[]> {
    return this.storedData;
  }

  async save(data: Page[]) {
    this.storedData = data;
    console.log('save', this.storedData);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.storedData));
  }
}
