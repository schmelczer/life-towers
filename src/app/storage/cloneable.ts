import { InnerNode } from './inner-node';
import { Node } from './node';

export class Cloneable extends InnerNode {
  name;
  constructor(parent: Node, name: any) {
    super(parent);
    this.name = name;
  }

  changeNameMap = (newValue: string) => {
    this.name = newValue;
  };

  changeName = (newValue: any) => {
    this.changeValue({
      oldValue: this.name,
      newValue
    });
  };

  protected cloneWithMap(map: (node: this) => void): this {
    const insides = Object.getOwnPropertyDescriptors(this);

    const insidesProxy = new Proxy(insides, {
      get: (target, prop, proxy) => {
        if (prop == '__target__') {
          return target;
        }
        const value = target[prop as string].value;
        if (typeof value === 'function') {
          return value.bind(proxy);
        }
        return value;
      },
      set: (target, prop, value) => {
        return (target[prop as string].value = value);
      }
    });
    map(<any>insidesProxy);

    return Object.create(Object.getPrototypeOf(this), <any>insidesProxy.__target__);
  }

  protected cloneWithAdd({ value, propertyName }: { value: any; propertyName: string }): this {
    const insides = Object.getOwnPropertyDescriptors(this);
    insides[propertyName].value = value;
    insides.id.value = Node.id++;

    return Object.create(Object.getPrototypeOf(this), insides);
  }

  protected cloneWithModify({ oldValue, newValue }: { oldValue: any; newValue: any }): this {
    const insides = Object.getOwnPropertyDescriptors(this);
    insides.id.value = Node.id++;

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
