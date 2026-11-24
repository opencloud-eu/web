import { getDirectionAwarePlacement, isRtl } from './rtl'

describe('rtl helpers', () => {
  afterEach(() => {
    document.documentElement.dir = ''
  })

  describe('isRtl', () => {
    it('returns true in right-to-left documents', () => {
      document.documentElement.dir = 'rtl'
      expect(isRtl()).toBe(true)
    })

    it('returns false in left-to-right documents', () => {
      document.documentElement.dir = 'ltr'
      expect(isRtl()).toBe(false)
    })
  })

  describe('getDirectionAwarePlacement', () => {
    it.each(['left-start', 'right', 'bottom-start', 'top'] as const)(
      'keeps "%s" in left-to-right documents',
      (placement) => {
        expect(getDirectionAwarePlacement(placement)).toBe(placement)
      }
    )

    it.each([
      ['left-start', 'right-start'],
      ['right-end', 'left-end'],
      ['right', 'left'],
      ['bottom-start', 'bottom-start'],
      ['top', 'top']
    ] as const)('turns "%s" into "%s" in right-to-left documents', (placement, expected) => {
      document.documentElement.dir = 'rtl'
      expect(getDirectionAwarePlacement(placement)).toBe(expected)
    })
  })
})
