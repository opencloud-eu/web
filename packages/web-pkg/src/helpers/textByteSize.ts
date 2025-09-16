export const getTextByteSize = (text: string): number => {
  return new TextEncoder().encode(text).length
}
