export interface ISerializable {
  serialize(referenceSerializer: (ref: object) => any): object;
}
