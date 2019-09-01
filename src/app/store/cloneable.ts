import { InnerNode } from './inner-node';
import { Node } from './node';

export abstract class Cloneable extends InnerNode {
  protected constructor(parent: Node) {
    super(parent);
  }

  protected abstract onAfterClone(): void;

  protected cloneWithMap(map: (node: this) => void): this {
    const insides = Object.getOwnPropertyDescriptors(this);

    const insidesProxy = new Proxy(insides, {
      get: (target, prop, proxy) => {
        if (prop == '__target__') {
          return target;
        }
        if (target.hasOwnProperty(prop)) {
          const value = target[prop as string].value;
          if (typeof value === 'function') {
            return value.bind(proxy);
          }
          return value;
        } else if (target.prototype.hasOwnProperty(prop)) {
          const value = target.prototype[prop];
          if (typeof value === 'function') {
            return value.bind(proxy);
          }
          return value;
        }
      },
      set: (target, prop, value) => {
        return (target[prop as string].value = value);
      }
    });
    map(<any>insidesProxy);

    return this.cloneFromInsides(<any>insidesProxy.__target__);
  }

  protected cloneWithAdd({ propertyName, value }: { value: any; propertyName: string }): this {
    if (this[propertyName] === value) {
      return this;
    }

    const insides = Object.getOwnPropertyDescriptors(this);
    insides[propertyName].value = value;
    return this.cloneFromInsides(insides);
  }

  protected cloneWithChangedKeys(props: { [propertyName: string]: any }): this {
    const insides = Object.getOwnPropertyDescriptors(this);

    for (let key in props) {
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

    return this.cloneFromInsides(insides);
  }

  protected cloneWithModify({ oldValue, newValue }: { oldValue: any; newValue: any }): this {
    if (oldValue === newValue) {
      return this;
    }

    const insides = Object.getOwnPropertyDescriptors(this);

    let wasMatch = false;
    for (let name in insides) {
      if (insides.hasOwnProperty(name) && insides[name].value === oldValue) {
        insides[name].value = newValue;
        wasMatch = true;
      }
    }

    if (!wasMatch) {
      throw new TypeError(`Object has no property with value: ${oldValue.toString()}`);
    }

    return this.cloneFromInsides(insides);
  }

  private cloneFromInsides(insides): this {
    insides.id.value = Node.id++;
    insides.copyCount.value++;
    Node.sumCopyCount++;

    const clone = Object.create(Object.getPrototypeOf(this), insides);
    clone.onAfterClone();
    return clone;
  }
}
