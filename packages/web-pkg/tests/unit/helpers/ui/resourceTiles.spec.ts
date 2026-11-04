import { SortDir } from '@opencloud-eu/design-system/helpers'
import { Resource } from '@opencloud-eu/web-client'
import { sortHelper } from '../../../../src/composables/sort'
import {
  determineResourceTilesSortFields,
  resourceTilesSortFields,
  spaceTilesSortFields
} from '../../../../src/helpers/ui/resourceTiles'

describe('determineResourceTilesSortFields', () => {
  it('returns the space sort fields for spaces', () => {
    const space = { id: '1', name: 'space', type: 'space', size: 10, mdate: '' } as Resource
    expect(determineResourceTilesSortFields(space)).toEqual(spaceTilesSortFields)
  })
  it('returns the sort fields matching the props of other resources', () => {
    const file = { id: '1', name: 'file', type: 'file', mdate: '' } as Resource
    expect(determineResourceTilesSortFields(file)).toEqual(
      resourceTilesSortFields.filter(({ name }) => name !== 'size')
    )
  })
})

describe('spaceTilesSortFields', () => {
  describe('totalQuota', () => {
    const spaces = [
      { id: 'small', spaceQuota: { total: 10 } },
      { id: 'unrestricted', spaceQuota: { total: 0 } },
      { id: 'large', spaceQuota: { total: 1000 } }
    ]

    it('sorts unrestricted spaces first in descending order', () => {
      const sorted = sortHelper(spaces, spaceTilesSortFields, 'totalQuota', SortDir.Desc)
      expect(sorted.map(({ id }) => id)).toEqual(['unrestricted', 'large', 'small'])
    })

    it('sorts unrestricted spaces last in ascending order', () => {
      const sorted = sortHelper(spaces, spaceTilesSortFields, 'totalQuota', SortDir.Asc)
      expect(sorted.map(({ id }) => id)).toEqual(['small', 'large', 'unrestricted'])
    })
  })
})
