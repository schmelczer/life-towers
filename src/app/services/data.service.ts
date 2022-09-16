import { Injectable } from '@angular/core';
import { Root } from '../store/root';
import { MapStoreService } from './map-store.service';
import { Data } from '../model/data';

@Injectable({
  providedIn: 'root'
})
export class DataService extends Root<Data> {
  private shouldSave = true;
  constructor(private store: MapStoreService) {
    super();

    this.store.data.subscribe(d => {
      if (d) {
        this.shouldSave = false;
        this.changeKeys({ children: [d] });
      }
    });

    this.children$.subscribe(_ => {
      this.log();
    });

    this.children$.subscribe(data => {
      if (data && data.length && data[0]) {
        if (!this.shouldSave) {
          this.shouldSave = true;
          return;
        }
        this.store.save(data[0]);
      }
    });
  }
}
