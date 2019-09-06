import { InnerNode } from './inner-node';
import { Unique } from './unique';

export abstract class Node extends Unique {
  readonly children: Array<InnerNode>;
  // TODO: fix types.
  protected abstract changeKeys(props: any): this;
  abstract mutatedUpdate(): void;

  private copyCount = 0;

  protected initiate() {
    super.initiate();
    this.copyCount++;
  }

  addChild({ child }: { child: InnerNode }) {
    this.changeKeys({
      children: [...this.children, child]
    });
  }

  replaceChild({ oldValue, newValue }: { oldValue: InnerNode; newValue: InnerNode }) {
    if (oldValue === newValue) {
      return;
    }

    this.changeKeys({
      children: this.children.map(c => (c === oldValue ? newValue : c))
    });
  }

  protected _log(indent = ''): string {
    const basicInfo = `${indent} - ${this.constructor.name}, #${this.id}`;
    let response = `${basicInfo}${' '.repeat(25 - basicInfo.length)}siblings: ${this.copyCount}\n`;
    for (let c of this.children) {
      response += `${c._log(indent + '  ')}`;
    }
    return response;
  }

  public log() {
    console.log(this._log());
    console.log(`All in all, there are ${Unique.ObjectCount} objects.`);
  }
}
