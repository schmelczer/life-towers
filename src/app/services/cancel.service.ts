import { Injectable } from '@angular/core';

interface Subscriber {
  callback: () => void;
  object: object;
}

@Injectable({
  providedIn: 'root'
})
export class CancelService {
  private subscribers: Subscriber[] = [];

  subscribe(object: object, callback: () => void) {
    this.subscribers.push({
      object,
      callback
    });
  }

  cancelAllExcept(except: object) {
    this.subscribers.filter(s => s.object !== except).map(s => s.callback());
  }

  cancelAll() {
    this.subscribers.map(s => s.callback());
  }
}
