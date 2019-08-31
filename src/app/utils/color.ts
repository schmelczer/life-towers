import { IColor } from '../interfaces/persistance/color';

export const lighten = (by: number, { h, s, l }: IColor): IColor => {
  let newL = l + by;
  if (newL > 100) {
    newL = 100;
  } else if (newL < 0) {
    newL = 0;
  }

  return { h, s, l: newL, type: 'Color' };
};

export const toHslString = ({ h, s, l }: IColor): string => {
  return `hsl(${h}, ${s}%, ${l}%)`;
};
