import { Node } from './node';

export abstract class InnerNode extends Node {
  parent: Node;
  nextVersion: this = null;

  protected readonly children: Array<InnerNode> = [];

  get latestVersion(): this {
    let version;
    for (version = this; version.nextVersion !== null; version = version.nextVersion) {
      // pass
    }
    return version;
  }

  protected constructor(parent: Node) {
    super();

    parent.addChild({
      value: this
    });
  }

  map(map: (a: this) => void) {
    return this.update((self: this) => this.cloneWithMap.call(self, map));
  }

  changeKey(update: { propertyName: string; value: any }): this {
    return this.update((self: this) => this.cloneWithAdd.call(self, update));
  }

  changeValue(update: { oldValue: any; newValue: any }): this {
    return this.update((self: this) => this.cloneWithModify.call(self, update));
  }

  addChild(update: { value: InnerNode }) {
    super.addChild.call(this.latestVersion, update);
  }

  changeChild(update: { oldValue: InnerNode; newValue: InnerNode }) {
    super.changeChild.call(this.latestVersion, update);
  }

  protected abstract cloneWithMap(map: (a: this) => void): this;
  protected abstract cloneWithAdd(update: { value: any; propertyName: string }): this;
  protected abstract cloneWithModify(update: { oldValue: any; newValue: any }): this;

  private update(cloneMethod: (self: this) => this): this {
    if (this.nextVersion !== null) {
      this.latestVersion.update(cloneMethod);
    }

    const clone = cloneMethod(this);
    for (let child of clone.children) {
      child.parent = clone;
    }

    this.parent.changeChild({
      oldValue: this,
      newValue: clone
    });

    this.nextVersion = clone;
    return clone;
  }
}
