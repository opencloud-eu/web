import { decodeTextContent } from '../../../src/helpers/textDecoding'

function bytes(...values: number[]) {
  return new Uint8Array(values).buffer
}

describe('decodeTextContent', () => {
  it('decodes UTF-8 losslessly', () => {
    const { buffer } = new TextEncoder().encode('Grüße €')

    expect(decodeTextContent(buffer)).toEqual({ text: 'Grüße €', isLossless: true })
  })

  it('strips a UTF-8 BOM', () => {
    expect(decodeTextContent(bytes(0xef, 0xbb, 0xbf, 0x61))).toEqual({
      text: 'a',
      isLossless: true
    })
  })

  it.each([
    { name: 'UTF-16LE', buffer: bytes(0xff, 0xfe, 0xfc, 0x00) },
    { name: 'UTF-16BE', buffer: bytes(0xfe, 0xff, 0x00, 0xfc) }
  ])('decodes $name by its BOM', ({ buffer }) => {
    expect(decodeTextContent(buffer)).toEqual({ text: 'ü', isLossless: true })
  })

  it('falls back to windows-1252 for invalid UTF-8', () => {
    // "Grüße €" in windows-1252
    const buffer = bytes(0x47, 0x72, 0xfc, 0xdf, 0x65, 0x20, 0x80)

    expect(decodeTextContent(buffer)).toEqual({ text: 'Grüße €', isLossless: false })
  })

  it('decodes empty content losslessly', () => {
    expect(decodeTextContent(new ArrayBuffer(0))).toEqual({ text: '', isLossless: true })
  })
})
