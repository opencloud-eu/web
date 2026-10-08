import { getResourceIconName } from '../../../../src/helpers/resource/icon'

describe('getResourceIconName', () => {
  it.each([
    { icon: 'resource-type-pdf', isDark: true, expected: 'resource-type-pdf-dark' },
    { icon: 'resource-type-pdf', isDark: false, expected: 'resource-type-pdf' },
    { icon: 'resource-type-video', isDark: true, expected: 'resource-type-video' },
    { icon: { name: 'resource-type-pdf' }, isDark: true, expected: 'resource-type-pdf-dark' },
    { icon: { name: 'custom', hasDarkVariant: true }, isDark: true, expected: 'custom-dark' },
    { icon: { name: 'custom', hasDarkVariant: true }, isDark: false, expected: 'custom' },
    {
      icon: { name: 'resource-type-pdf', hasDarkVariant: false },
      isDark: true,
      expected: 'resource-type-pdf'
    }
  ])('returns "$expected" for $icon with isDark $isDark', ({ icon, isDark, expected }) => {
    expect(getResourceIconName(icon, isDark)).toBe(expected)
  })
})
