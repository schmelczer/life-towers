export const range = ({ min = 0, max = Infinity, step = 1 }: { min?: number; max?: number; step?: number }) => {
  return {
    *[Symbol.iterator]() {
      for (let i = min; i < max; yield i, i += step) {}
    }
  };
};
