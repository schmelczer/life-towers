export abstract class Initiable {
  protected constructor() {
    this.initiate();
  }
  protected abstract initiate();
}
