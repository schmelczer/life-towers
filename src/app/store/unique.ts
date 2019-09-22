import * as uuid from 'uuid';
import { ISerializable } from '../interfaces/serializable';
import { IUnique } from '../interfaces/persistance/unique';

export class Unique implements ISerializable, IUnique {
  private static count = 0;

  constructor(id?: string) {
    if (id) {
      this._id = id;
      console.log('got id ' + id);
    } else {
      this.setUniqueness();
      console.log('unique ' + this.id);
    }
  }

  static get ObjectCount(): number {
    return Unique.count;
  }

  private _id: string;

  get id(): string {
    return this._id;
  }

  private _copies = 0;

  get copies(): number {
    return this._copies;
  }

  protected setUniqueness() {
    this._id = uuid.v4();
    Unique.count++;
    this._copies++;
  }

  serialize(referenceSerializer: (ref: object) => any): object {
    return {
      id: this.id
    };
  }
}
