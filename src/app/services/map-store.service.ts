import { Injectable } from '@angular/core';

const LOCAL_STORAGE_KEY = 'life-towers.data.v.3';

@Injectable({
  providedIn: 'root'
})
export class MapStoreService<T> {
  readonly storage: {
    [id: number]: T;
  } = {};

  constructor() {
    const localStorageData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (localStorageData) {
      this.storage = JSON.parse(localStorageData) as {
        [id: number]: T;
      };
    }
  }

  get(id: number) {
    if (this.storage.hasOwnProperty(id)) {
      return this.storage[id];
    }
  }

  add(id: number, value: T) {
    if (this.storage.hasOwnProperty(id)) {
      throw new Error('Key already set.');
    }

    this.storage[id] = value;
  }
}
