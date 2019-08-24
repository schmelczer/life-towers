import { Injectable } from '@angular/core';
import { Tower } from '../model/tower';
import { top } from '../utils/top';

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

  showCreateBlock(options: string[]): Promise<{ selected: string; description: string; isDone: boolean }> {
    return this.createPromiseAndPushToStack(options, ModalType.createBlock);
  }

  showEditBlock(data: {
    default: string;
    options: string[];
    description: string;
    isDone: boolean;
  }): Promise<{ selected: string; description: string; isDone: boolean }> {
    return this.createPromiseAndPushToStack(data, ModalType.editBlock);
  }

  showSettings(): Promise<void> {
    return this.createPromiseAndPushToStack(null, ModalType.settings);
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