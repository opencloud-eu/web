import { resolveFileNameDuplicate } from '../../../../../src/helpers/resource/conflictHandling'
import { getTextByteSize } from '../../../../../src/helpers/textByteSize'
import { RESOURCE_NAME_MAX_BYTES } from '../../../../../src/constants'

describe('resolveFileNameDuplicate', () => {
  describe('names that fit into the max name bytes', () => {
    it.each([
      { case: 'a short name', name: 'a', extension: '', expected: 'a (1)' },
      { case: 'a name with trailing whitespace', name: 'a ', extension: '', expected: 'a  (1)' },
      {
        case: 'a short name with extension',
        name: 'b.png',
        extension: 'png',
        expected: 'b (1).png'
      },
      {
        case: 'a name that fits exactly',
        name: 'a'.repeat(251),
        extension: '',
        expected: `${'a'.repeat(251)} (1)`
      },
      {
        case: 'a name with extension that fits exactly',
        name: `${'a'.repeat(247)}.txt`,
        extension: 'txt',
        expected: `${'a'.repeat(247)} (1).txt`
      }
    ])('keeps the full name of $case', ({ name, extension, expected }) => {
      expect(resolveFileNameDuplicate(name, extension, [])).toBe(expected)
    })
  })

  describe('names that would exceed the max name bytes', () => {
    it.each([
      {
        case: 'an ASCII name with extension',
        name: `${'a'.repeat(251)}.txt`,
        extension: 'txt',
        expected: `${'a'.repeat(247)} (1).txt`
      },
      {
        case: 'a name without extension',
        name: 'a'.repeat(255),
        extension: '',
        expected: `${'a'.repeat(251)} (1)`
      },
      {
        case: 'a name with two-byte characters at the cut point',
        name: `${'ä'.repeat(125)}.txt`,
        extension: 'txt',
        expected: `${'ä'.repeat(123)} (1).txt`
      },
      {
        case: 'a name with three-byte characters at the cut point',
        name: `${'€'.repeat(83)}.txt`,
        extension: 'txt',
        expected: `${'€'.repeat(82)} (1).txt`
      },
      {
        case: 'a name with an emoji at the cut point',
        name: `${'a'.repeat(245)}😀.txt`,
        extension: 'txt',
        expected: `${'a'.repeat(245)} (1).txt`
      },
      {
        case: 'a name with whitespace at the cut point',
        name: `${'a'.repeat(245)}  bbbb.txt`,
        extension: 'txt',
        expected: `${'a'.repeat(245)} (1).txt`
      }
    ])('shortens $case', ({ name, extension, expected }) => {
      const result = resolveFileNameDuplicate(name, extension, [])
      expect(result).toBe(expected)
      expect(getTextByteSize(result)).toBeLessThanOrEqual(RESOURCE_NAME_MAX_BYTES)
    })

    it('shortens the next candidate if the first one is taken', () => {
      const result = resolveFileNameDuplicate(`${'a'.repeat(251)}.txt`, 'txt', [
        { name: `${'a'.repeat(247)} (1).txt` }
      ])
      expect(result).toBe(`${'a'.repeat(247)} (2).txt`)
    })

    it('shortens the base further for a two-digit iteration', () => {
      const existing = Array.from({ length: 9 }, (_, i) => ({
        name: `${'a'.repeat(247)} (${i + 1}).txt`
      }))
      const result = resolveFileNameDuplicate(`${'a'.repeat(251)}.txt`, 'txt', existing)
      expect(result).toBe(`${'a'.repeat(246)} (10).txt`)
      expect(getTextByteSize(result)).toBe(RESOURCE_NAME_MAX_BYTES)
    })
  })
})
