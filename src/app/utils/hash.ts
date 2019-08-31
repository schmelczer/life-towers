export const hash = (text: string): number => {
  // Return number from [0, 1)
  if (!text) {
    return 0;
  }
  const hashValue = Array.prototype.reduce.call(
    // tslint:disable-next-line:no-bitwise
    text,
    (value, char) => ((value << 5) - value + (char.charCodeAt(0) as number)) | 0,
    7
  );
  return hashValue / (Math.pow(2, 32) - 2) + 0.5;
};
