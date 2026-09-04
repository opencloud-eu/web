import { parsePositiveInt } from '../../../src/lib/env.ts'

const VAR = 'TEST_YJS_ENV_VALUE'

describe('parsePositiveInt', () => {
  afterEach(() => {
    delete process.env[VAR]
  })

  it('returns the fallback when unset', () => {
    expect(parsePositiveInt(VAR, 1234)).toBe(1234)
  })

  it('returns the fallback when empty', () => {
    process.env[VAR] = ''
    expect(parsePositiveInt(VAR, 1234)).toBe(1234)
  })

  it('parses a positive integer', () => {
    process.env[VAR] = '8080'
    expect(parsePositiveInt(VAR, 1234)).toBe(8080)
  })

  it.each(['abc', ' ', '0', '-1', '1.5', '12abc', 'NaN', 'Infinity'])('throws on %j', (raw) => {
    process.env[VAR] = raw
    expect(() => parsePositiveInt(VAR, 1234)).toThrow(VAR)
  })
})
