import { Initiable } from './initiable';

export abstract class Unique extends Initiable {
  protected static nextId = 0;
  static get ObjectCount(): number {
    return Unique.nextId;
  }

  private _id: number;
  get id(): number {
    return this._id;
  }

  protected initiate() {
    this._id = Unique.nextId++;
  }
}
