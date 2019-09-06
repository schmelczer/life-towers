import { InnerNode } from '../store/inner-node';

export class Serializable extends InnerNode {
  static childrenMap: {
    [type: string]: {
      childrenConstructor: typeof Serializable;
      childrenListName: string;
      childrenType: string;
    };
  };

  private static propertyList: any = {};
  protected type: string;

  protected constructor(properties: any, type: string) {
    super();

    const compiledType = this.constructor.name;
    if (!Serializable.propertyList.hasOwnProperty(compiledType)) {
      Serializable.propertyList[compiledType] = [];
    }
    for (const property in properties) {
      if (properties.hasOwnProperty(property)) {
        const propertyValue = properties[property];
        // This should be ran after the original constructor has finished.
        if (property === Serializable.childrenMap[type].childrenListName) {
          new Promise(r => r()).then(() => {
            const children = propertyValue.map(
              c =>
                new Serializable.childrenMap[type].childrenConstructor(c, Serializable.childrenMap[type].childrenType)
            );
            console.log(type, 'created');
            this.addChildren(children);
            console.log(type, 'added');
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
