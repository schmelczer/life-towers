export class Base {
  private static propertyList: any = {};
  protected subscribers: (() => void)[] = [];

  constructor(properties: any) {
    const type = this.constructor.name;
    if (!Base.propertyList.hasOwnProperty(type)) {
      Base.propertyList[type] = [];
    }

    for (const property in properties) {
      if (properties.hasOwnProperty(property)) {
        const propertyName = `__${property}`;
        this[propertyName] = properties[property];

        Object.defineProperty(this, property, {
          get: () => this[propertyName],
          set: value => {
            if (value == this[propertyName]) {
              return;
            }
            this[propertyName] = value;
            this.update();
          }
        });

        if (!Base.propertyList[type].includes(property)) {
          Base.propertyList[type].push(property);
        }
      }
    }
  }

  toJSON(): object {
    return Base.propertyList[this.constructor.name].reduce(
      (object, property) => ({
        [property]: this[property],
        ...object
      }),
      {}
    );
  }

  subscribe(func: () => void) {
    this.subscribers.push(func);
  }

  protected update() {
    this.subscribers.map(f => f());
  }
}
