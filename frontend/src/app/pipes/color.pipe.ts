import { Pipe, PipeTransform } from '@angular/core';
import { IColor } from '../interfaces/color';
import { toHslString } from '../utils/color';

@Pipe({
  name: 'color'
})
export class ColorPipe implements PipeTransform {
  transform(color: IColor, args?: any): string {
    return toHslString(color);
  }
}
