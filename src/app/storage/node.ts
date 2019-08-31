import { InnerNode } from './inner-node';

export abstract class Node {
  public static id = 0;
  protected abstract readonly children: Array<InnerNode>;
  private id = Node.id++;

  changeKey(update: { value: any; propertyName: string }) {
    throw new TypeError('Not implemented!');
  }

  changeValue(update: { oldValue: any; newValue: any }) {
    throw new TypeError('Not implemented!');
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
}
