export const top = <T>(iterable: ArrayLike<T>): T => {
  return iterable.length > 0 ? iterable[iterable.length - 1] : null;
};
