import { Injectable } from '@angular/core';
import { Tower } from '../model/tower';
import { top } from '../utils/top';
import { CancelService } from './cancel.service';
import { Page } from '../model/page';
import { Observable } from 'rxjs/internal/Observable';

export enum ModalType {
  createBlock,
  editBlock,
  removeBlock,
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

  showCreateBlock(input: {
    options: string[];
    isTask: boolean;
  }): Promise<{ selected: string; description: string; isDone: boolean }> {
    return this.createPromiseAndPushToStack(input, ModalType.createBlock);
  }

  showEditBlock(data: {
    default: string;
    options: string[];
    description: string;
    isDone: boolean;
  }): Promise<{ selected: string; description: string; isDone: boolean }> {
    return this.createPromiseAndPushToStack(data, ModalType.editBlock);
  }

  showSettings(selectedPage: Observable<Page>): Promise<void> {
    return this.createPromiseAndPushToStack(selectedPage, ModalType.settings);
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
    const { resolve } = this.modalStack.pop();
    resolve(output);
  }

  cancel() {
    const { reject } = this.modalStack.pop();
    reject();
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
