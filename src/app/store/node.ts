import { Unique } from './unique';
import { InnerNode } from './inner-node';

export interface NodeState {
  children: Array<InnerNode>;
}

export abstract class Node extends Unique implements NodeState {
  abstract readonly children: Array<InnerNode>;

  protected constructor(children: Array<InnerNode> = [], id?: string) {
    super(id);
    children.forEach(c => (c.parent = this));
  }
  protected abstract changeKeys<T extends NodeState>(props: Partial<T>): this;

  addChildren(children: Array<InnerNode>): this {
    return this.changeKeys<NodeState>({
      children: [...this.children, ...children]
    });
  }

  replaceChild({ oldValue, newValue }: { oldValue: InnerNode; newValue: InnerNode }): this {
    if (oldValue === newValue) {
      return this;
    }

    return this.changeKeys<NodeState>({
      children: this.children.map(c => (c === oldValue ? newValue : c))
    });
  }

  protected _log(indent = ''): string {
    const basicInfo = `${indent} - ${this.constructor.name}, #${this.id}`;
    let response = `${basicInfo}${' '.repeat(70 - basicInfo.length)}copies: ${this.copies}\n`;
    for (const c of this.children) {
      response += `${c._log(indent + '  ')}`;
    }
    return response;
  }

  public log() {
    // console.log(this._log());
    //  console.log(`All in all, there are ${Unique.ObjectCount} objects.`);
  }
}
