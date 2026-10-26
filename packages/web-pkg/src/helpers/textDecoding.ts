export interface DecodedText {
  text: string
  /**
   * True when every character was decoded, false when the bytes are not valid Unicode text, e.g. a
   * Latin-1 file, and `text` is only fit for display. Even when true, saving may change the
   * encoding: UTF-16 and BOM-prefixed files are written back as plain UTF-8.
   */
  isLossless: boolean
}

/**
 * Decodes file contents like a browser does for `responseType: 'text'` (UTF-16 by BOM, UTF-8
 * otherwise), but reports bytes it can't decode instead of silently replacing them with U+FFFD.
 */
export function decodeTextContent(buffer: ArrayBuffer): DecodedText {
  const bytes = new Uint8Array(buffer)
  let encoding = 'utf-8'
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = 'utf-16le'
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = 'utf-16be'
  }

  try {
    return { text: new TextDecoder(encoding, { fatal: true }).decode(bytes), isLossless: true }
  } catch {
    // windows-1252 maps every byte, and is the most likely encoding of a non-UTF-8 text file
    return { text: new TextDecoder('windows-1252').decode(bytes), isLossless: false }
  }
}
