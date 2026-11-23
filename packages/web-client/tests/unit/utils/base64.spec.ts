import { decodeBase64, encodeBase64 } from '../../../src/utils/base64'

describe('base64', () => {
  it.each([
    ['', ''],
    ['public:secret', 'cHVibGljOnNlY3JldA=='],
    ['public:pässwörd', 'cHVibGljOnDDpHNzd8O2cmQ='],
    ['🔑 鍵', '8J+UkSDpjbU=']
  ])('encodes %j to %j and back', (value, encoded) => {
    expect(encodeBase64(value)).toBe(encoded)
    expect(decodeBase64(encoded)).toBe(value)
  })

  it('throws on invalid base64', () => {
    expect(() => decodeBase64('not base64!')).toThrow()
  })
})
