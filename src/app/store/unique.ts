import { Initiable } from './initiable';

export abstract class Unique extends Initiable {
  protected static nextId = 0;
  static get ObjectCount(): number {
    return Unique.nextId;
  }

  get id(): number {
    return this._id;
  }
  private _id: number;

  protected initiate() {
    this._id = Unique.nextId++;
  }
}
