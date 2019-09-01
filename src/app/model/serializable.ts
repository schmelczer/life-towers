import { Cloneable } from '../store/cloneable';
import { Node } from '../store/node';

export class Serializable extends Cloneable {
  protected type: string;

  private static propertyList: any = {};
  static childrenMap: {
    [type: string]: {
      childrenConstructor: typeof Serializable;
      childrenListName: string;
      childrenType: string;
    };
  };

  protected onAfterClone(): void {
    // pass
  }

  protected constructor(parent: Node, properties: any, type: string) {
    super(parent);

    const compiledType = this.constructor.name;
    if (!Serializable.propertyList.hasOwnProperty(compiledType)) {
      Serializable.propertyList[compiledType] = [];
    }
    for (const property in properties) {
      if (properties.hasOwnProperty(property)) {
        const propertyValue = properties[property];
        // This should be ran after the original constructor has finished.
        console.log(type);
        if (property === Serializable.childrenMap[type].childrenListName) {
          new Promise(r => r()).then(() => {
            for (let child of propertyValue) {
              new Serializable.childrenMap[type].childrenConstructor(
                this,
                child,
                Serializable.childrenMap[type].childrenType
              );
            }
          });
        } else {
          this[property] = properties[property];
        }

        if (!Serializable.propertyList[compiledType].includes(property)) {
          Serializable.propertyList[compiledType].push(property);
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
