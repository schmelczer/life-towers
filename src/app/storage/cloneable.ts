import { InnerNode } from './inner-node';
import { Node } from './node';

export class Cloneable extends InnerNode {
  constructor(parent: Node) {
    super(parent);
  }

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
        } else if (this.hasOwnProperty(prop)) {
          const value = this[prop];
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

    (<any>insidesProxy.__target__).id.value = Node.id++;
    (<any>insidesProxy.__target__).copyCount.value++;
    Node.sumCopyCount++;

    return Object.create(Object.getPrototypeOf(this), <any>insidesProxy.__target__);
  }

  protected cloneWithAdd({ value, propertyName }: { value: any; propertyName: string }): this {
    const insides = Object.getOwnPropertyDescriptors(this);
    insides[propertyName].value = value;
    insides.id.value = Node.id++;
    insides.copyCount.value++;
    Node.sumCopyCount++;

    return Object.create(Object.getPrototypeOf(this), insides);
  }

  protected cloneWithModify({ oldValue, newValue }: { oldValue: any; newValue: any }): this {
    const insides = Object.getOwnPropertyDescriptors(this);
    insides.id.value = Node.id++;
    insides.copyCount.value++;
    Node.sumCopyCount++;

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

    return Object.create(Object.getPrototypeOf(this), insides);
  }
}
