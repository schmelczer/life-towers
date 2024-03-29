import { Node, NodeState } from './node';

export interface InnerNodeState extends NodeState {
  dummy: any;
}

export class InnerNode extends Node implements InnerNodeState {
  readonly dummy = 3;
  parent: Node;
  private nextVersion: this = null;
  readonly children: Array<InnerNode>;

  protected constructor(children: Array<InnerNode> = [], id?: string) {
    super(children, id);
    this.children = children;
  }

  get latestVersion(): this {
    let version;
    for (version = this; version.nextVersion !== null; version = version.nextVersion) {
      // pass
    }
    return version;
  }

  addChildren(children: Array<InnerNode>): this {
    return super.addChildren.call(this.latestVersion, children);
  }

  replaceChild(update: { oldValue: InnerNode; newValue: InnerNode }): this {
    return super.replaceChild.call(this.latestVersion, update);
  }

  changeKeys<T extends NodeState>(props: Partial<T>): this {
    if (this.nextVersion !== null) {
      this.latestVersion.changeKeys(props);
    }

    let shouldClone = false;

    for (const prop in props) {
      // @ts-ignore
      if (props.hasOwnProperty(prop) && props[prop] !== this[prop]) {
        shouldClone = true;
        break;
      }
    }
    if (!shouldClone) {
      return;
    }

    const clone = this.cloneWithChangedKeys(props);

    clone.children.forEach(c => (c.parent = clone));

    this.nextVersion = clone;

    this.parent.replaceChild({
      oldValue: this,
      newValue: clone
    });

    return clone;
  }

  protected onAfterClone() {}

  protected cloneWithChangedKeys<T extends NodeState>(props: Partial<T>): this {
    const insides = Object.getOwnPropertyDescriptors(this);

    for (const key in props) {
      if (props.hasOwnProperty(key)) {
        if (insides.hasOwnProperty(key)) {
          insides[key].value = props[key];
        } else {
          // @ts-ignore
          insides[key] = {
            value: props[key]
          };
        }
      }
    }

    const clone = Object.create(Object.getPrototypeOf(this), insides);
    clone.setUniqueness();
    clone.onAfterClone();
    return clone;
  }
}
