import { Unique } from './unique';
import { InnerNode } from './inner-node';

export interface NodeState {
  children: Array<InnerNode>;
}

export abstract class Node extends Unique implements NodeState {
  protected copyCount = 1;
  abstract readonly children: Array<InnerNode>;

  protected abstract changeKeys<T extends NodeState>(props: Partial<T>): this;

  protected initiate() {
    super.initiate();
    ++this.copyCount;
  }

  addChildren(children: Array<InnerNode>) {
    this.changeKeys<NodeState>({
      children: [...this.children, ...children]
    });
  }

  replaceChild({ oldValue, newValue }: { oldValue: InnerNode; newValue: InnerNode }) {
    if (oldValue === newValue) {
      return;
    }

    this.changeKeys<NodeState>({
      children: this.children.map(c => (c === oldValue ? newValue : c))
    });
  }

  protected _log(indent = ''): string {
    const basicInfo = `${indent} - ${this.constructor.name}, #${this.id}`;
    let response = `${basicInfo}${' '.repeat(25 - basicInfo.length)}siblings: ${this.copyCount}\n`;
    for (const c of this.children) {
      response += `${c._log(indent + '  ')}`;
    }
    return response;
  }

  public log() {
    console.log(this._log());
    console.log(`All in all, there are ${Unique.ObjectCount} objects.`);
  }
}
