import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Observable } from 'rxjs/internal/Observable';
import { Node } from './node';
import { InnerNode } from './inner-node';

export class Root<T extends InnerNode> extends Node {
  private readonly _children: BehaviorSubject<Array<T>> = new BehaviorSubject([]);
  readonly children$: Observable<Array<T>> = this._children.asObservable();

  get children(): Array<T> {
    return this._children.getValue();
  }

  set children(value: Array<T>) {
    this._children.next(value);
  }

  changeValue({ oldValue, newValue }: { oldValue: any; newValue: any }) {
    if (this.children === oldValue) {
      this.children = newValue;
      for (let child of this.children) {
        child.parent = this;
      }
    } else {
      throw new TypeError('Only children can be changed.');
    }
  }
}
