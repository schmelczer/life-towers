import { Injectable } from '@angular/core';

const LOCAL_STORAGE_KEY = 'life-towers.data.v.2';

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
              description: 'done it',
              isDone: false
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
              tag: 'go to work',
              isDone: false
            },
            {
              created: new Date(2019, 3, 15),
              tag: 'go to school',
              description: 'done it',
              isDone: true
            },
            {
              created: new Date(2019, 3, 15, 19),
              tag: 'go to school',
              isDone: false
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
              description: 'done it',
              isDone: false
            },
            {
              created: new Date(2019, 4, 13),
              tag: 'go home',
              isDone: false
            },
            {
              created: new Date(2019, 4, 15),
              tag: 'go to work',
              description: 'done it',
              isDone: false
            },
            {
              created: new Date(2019, 4, 15, 14),
              tag: 'go to work',
              isDone: false
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

  scheduleSave(data: T, timeout: number) {
    this.dataToSave = data;
    if (!this.saveScheduled) {
      this.saveScheduled = true;
      setTimeout(() => {
        this.saveScheduled = false;
        this.save(this.dataToSave).catch();
      }, timeout);
    }
  }

  async load(): Promise<T> {
    console.log('load', this.storedData);
    return this.storedData;
  }

  async save(data: T): Promise<void> {
    this.storedData = data;
    const stringified = JSON.stringify(this.storedData, null, 2);
    console.log('save');
    // console.log('save', stringified);
    window.localStorage.setItem(LOCAL_STORAGE_KEY, stringified);
  }
}
