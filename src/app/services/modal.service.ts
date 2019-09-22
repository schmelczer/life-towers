import { Injectable } from '@angular/core';
import { Tower } from '../model/tower';
import { top } from '../utils/top';
import { CancelService } from './cancel.service';
import { Page } from '../model/page';
import { Observable } from 'rxjs/internal/Observable';
import { Block } from '../model/block';
import { Data } from '../model/data';

export enum ModalType {
  blocks,
  settings,
  removeTower,
  removePage,
  getStarted
}

interface Modal {
  type: ModalType;
  input: any;
  resolve: (output: any) => void;
  reject: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalStack: Modal[] = [];

  constructor(private cancelService: CancelService) {}

  showBlocks(input: { tower$: Observable<Tower>; onlyDone: boolean; startBlock?: Block }): Promise<void> {
    return this.createPromiseAndPushToStack(input, ModalType.blocks);
  }

  showSettings(options: { page$: Observable<Page>; data$: Observable<Data> }): Promise<void> {
    return this.createPromiseAndPushToStack(options, ModalType.settings);
  }

  showRemoveTower(tower: Tower): Promise<void> {
    return this.createPromiseAndPushToStack(tower, ModalType.removeTower);
  }

  showRemovePage(name: string): Promise<void> {
    return this.createPromiseAndPushToStack(name, ModalType.removePage);
  }

  get active(): Modal {
    return top(this.modalStack);
  }

  submit(output?: any) {
    const modal = this.modalStack.pop();
    if (modal) {
      modal.resolve(output);
    }
  }

  cancel() {
    const modal = this.modalStack.pop();
    if (modal) {
      modal.reject();
    }
  }

  private createPromiseAndPushToStack(input: any, type: ModalType): Promise<any> {
    this.cancelService.cancelAll();

    const modal = {
      input,
      type,
      resolve: () => {},
      reject: () => {}
    };

    const modalPromise = new Promise((resolve, reject) => {
      modal.resolve = resolve;
      modal.reject = reject;
    });

    this.modalStack.push(modal);
    return modalPromise;
  }
}
