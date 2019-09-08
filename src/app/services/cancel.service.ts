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
    console.log('cancel all except', except);
    this.subscribers.filter(s => s.object !== except).map(s => s.callback());
  }

  cancelAll() {
    console.log('cancel all');
    this.subscribers.map(s => s.callback());
  }
}
