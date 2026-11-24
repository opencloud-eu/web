/**
 * Encodes a string as UTF-8 base64, unlike `btoa` which only accepts Latin1.
 */
export function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
}

/**
 * Decodes UTF-8 base64 produced by `encodeBase64`. Throws on invalid base64.
 */
export function decodeBase64(value: string): string {
  const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
