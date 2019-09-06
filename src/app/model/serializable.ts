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

  protected constructor(properties: any, type: string, children?: Array<InnerNode>) {
    super(children);

    const compiledType = this.constructor.name;
    if (!Serializable.propertyList.hasOwnProperty(compiledType)) {
      Serializable.propertyList[compiledType] = [];
    }
    for (const property in properties) {
      if (properties.hasOwnProperty(property)) {
        if (property !== Serializable.childrenMap[type].childrenListName) {
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
