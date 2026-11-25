import { filesSortFields, sharesSortFields } from '@opencloud-eu/web-pkg'
import { getSortFieldsPreset } from '../../../src/helpers/sortFields'

describe('getSortFieldsPreset', () => {
  it.each([
    'files-shares-with-me',
    'files-shares-with-others',
    'files-shares-via-link',
    'files-guest-shares'
  ])('returns the shares preset for "%s"', (routeName) => {
    expect(getSortFieldsPreset(routeName)).toBe(sharesSortFields)
  })
  it.each(['files-spaces-generic', 'files-common-favorites', 'files-common-search', undefined])(
    'returns the files preset for "%s"',
    (routeName) => {
      expect(getSortFieldsPreset(routeName)).toBe(filesSortFields)
    }
  )
})
