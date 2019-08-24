export const hashCode = (text: string) => {
  let hash = 0;
  if (text.length == 0) {
    return hash;
  }
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  hash /= Math.pow(2, 32) - 1;
  return hash;
};
