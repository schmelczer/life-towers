import { InnerNode } from './inner-node';

export abstract class Node {
  protected static id = 0;
  protected static sumCopyCount = 0;
  protected abstract readonly children: Array<InnerNode>;
  private id = Node.id++;
  protected copyCount = 1;

  abstract changeKey(update: { propertyName: string; value: any });
  abstract changeValue(update: { oldValue: any; newValue: any });

  constructor() {
    Node.sumCopyCount++;
  }

  addChild(update: { value: InnerNode }) {
    this.changeValue({
      oldValue: this.children,
      newValue: [...this.children, update.value]
    });
  }

  changeChild({ oldValue, newValue }: { oldValue: InnerNode; newValue: InnerNode }) {
    this.changeValue({
      oldValue: this.children,
      newValue: this.children.map(c => (c === oldValue ? newValue : c))
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
    console.log(`All in all, there are ${Node.sumCopyCount} objects.`);
  }
}
