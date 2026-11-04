import { SortDir } from '@opencloud-eu/design-system/helpers'
import { sortHelper } from '../../../../src/composables/sort'
import { spaceTableSortFields } from '../../../../src/helpers/ui/resourceTable'

describe('spaceTableSortFields', () => {
  describe('totalQuota', () => {
    const spaces = [
      { id: 'small', spaceQuota: { total: 10 } },
      { id: 'unrestricted', spaceQuota: { total: 0 } },
      { id: 'large', spaceQuota: { total: 1000 } }
    ]

    it('sorts unrestricted spaces first in descending order', () => {
      const sorted = sortHelper(spaces, spaceTableSortFields, 'totalQuota', SortDir.Desc)
      expect(sorted.map(({ id }) => id)).toEqual(['unrestricted', 'large', 'small'])
    })

    it('sorts unrestricted spaces last in ascending order', () => {
      const sorted = sortHelper(spaces, spaceTableSortFields, 'totalQuota', SortDir.Asc)
      expect(sorted.map(({ id }) => id)).toEqual(['small', 'large', 'unrestricted'])
    })
  })
})
