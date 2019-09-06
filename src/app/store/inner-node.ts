import { Node } from './node';

export abstract class InnerNode extends Node {
  readonly children: Array<InnerNode> = [];
  protected parent: Node;
  private nextVersion: this = null;

  get latestVersion(): this {
    let version;
    for (version = this; version.nextVersion !== null; version = version.nextVersion) {
      // pass
    }
    return version;
  }

  mutatedUpdate() {
    this.parent.mutatedUpdate();
  }

  map(map: (a: this) => void) {
    return this.update((self: this) => this.cloneWithMap.call(self, map));
  }

  changeKeys(props: { [propertyName: string]: any }): this {
    return this.update((self: this) => this.cloneWithChangedKeys.call(self, props));
  }

  addChild(update: { child: InnerNode }) {
    super.addChild.call(this.latestVersion, update);
  }

  changeChild(update: { oldValue: InnerNode; newValue: InnerNode }) {
    super.replaceChild.call(this.latestVersion, update);
  }

  protected abstract cloneWithMap(map: (a: this) => void): this;
  protected abstract cloneWithChangedKeys(props: { [propertyName: string]: any }): this;

  private update(cloneMethod: (self: this) => this): this {
    if (this.nextVersion !== null) {
      this.latestVersion.update(cloneMethod);
    }

    const clone = cloneMethod(this);
    if (clone === this) {
      return this;
    }

    for (let child of clone.children) {
      child.parent = clone;
    }

    this.parent.replaceChild({
      oldValue: this,
      newValue: clone
    });

    this.nextVersion = clone;
    return clone;
  }
}
