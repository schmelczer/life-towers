export const hash = (text: string): number => {
  // Return number between 0 and 1.
  if (!text) {
    return 0;
  }
  const hash = Array.prototype.reduce.call(text, (hash, char) => (hash << 5) - hash + char.charCodeAt(0), 7);
  return hash / (Math.pow(2, 32) - 1);
};
