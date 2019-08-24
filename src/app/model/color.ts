import { IColor } from '../interfaces/persistance/color';
import { Base } from './base';

export class Color extends Base implements IColor {
  constructor(props: IColor) {
    super(props);
  }

  // Only here to prevent ts warnings.
  h: number;
  s: number;
  l: number;

  public lighten(by: number) {
    const newL = this.l + by;
    if (this.l > 100) {
      this.l = 100;
    } else if (this.l < 0) {
      this.l = 0;
    }

    return new Color({ h: this.h, s: this.s, l: newL });
  }

  public toString(): string {
    return `hsl(${this.h}, ${this.s}%, ${this.l}%)`;
  }
}
