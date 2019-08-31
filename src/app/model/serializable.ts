import { Cloneable } from '../storage/cloneable';
import { Node } from '../storage/node';

export class Serializable extends Cloneable {
  type: string;
  private static propertyList: any = {};
  static childrenMap: {
    [type: string]: {
      childrenConstructor: typeof Serializable;
      childrenListName: string;
    };
  };

  constructor(parent: Node, properties: any) {
    super(parent);

    const type = this.constructor.name;
    if (!Serializable.propertyList.hasOwnProperty(type)) {
      Serializable.propertyList[type] = [];
    }
    for (const property in properties) {
      if (properties.hasOwnProperty(property)) {
        const propertyValue = properties[property];
        if (property === Serializable.childrenMap[type].childrenListName) {
          // This should be ran after the original constructor has finished.
          new Promise(r => r()).then(() => {
            for (let child of propertyValue) {
              new Serializable.childrenMap[type].childrenConstructor(this, child);
            }
          });
        } else {
          this[property] = properties[property];
        }

        if (!Serializable.propertyList[type].includes(property)) {
          Serializable.propertyList[type].push(property);
        }
      }
    }
  }

  toJSON(): object {
    return Serializable.propertyList[this.constructor.name].reduce(
      (object, property) => ({
        [property]: this[property],
        ...object
      }),
      {}
    );
  }
}
