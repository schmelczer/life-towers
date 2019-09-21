export class Unique {
  private static nextId = 0;
  private static store;

  constructor() {
    this.setUniqueness();
  }

  static get ObjectCount(): number {
    return Unique.nextId;
  }

  private _id: number;

  get id(): number {
    return this._id;
  }

  private _copies = 0;

  get copies(): number {
    return this._copies;
  }

  protected setUniqueness() {
    this._id = Unique.nextId++;
    this._copies++;
  }
}
