import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Observable } from 'rxjs/internal/Observable';
import { Node, NodeState } from './node';
import { InnerNode } from './inner-node';

export class Root<T extends InnerNode> extends Node {
  readonly children$: Observable<Array<T>>;
  private readonly _children: BehaviorSubject<Array<T>>;

  constructor(children: Array<T> = []) {
    super(children);
    this._children = new BehaviorSubject(children);
    this.children$ = this._children.asObservable();
  }

  get children(): Array<T> {
    return this._children.getValue();
  }

  set children(value: Array<T>) {
    this._children.next(value);
  }

  changeKeys<U extends NodeState>(props: Partial<U>): this {
    if (props.hasOwnProperty('children')) {
      // @ts-ignore
      this.children = props.children;
      for (const child of this.children) {
        child.parent = this;
      }
    }
    return this;
  }
}
