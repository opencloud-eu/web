import { SortDir } from '@opencloud-eu/design-system/helpers'
import { SortField, sortHelper } from '../../../../src/composables/sort'
import {
  filesSortFields,
  sharesSortFields,
  totalQuotaSort
} from '../../../../src/helpers/ui/sortFields'

function columns(fields: SortField[]) {
  return fields.map(({ name, sortDir }) => `${name} ${sortDir}`)
}

function options(fields: SortField[]) {
  return fields.map(({ name, sortDir, label }) => `${name} ${sortDir} ${label}`)
}

describe('sort fields', () => {
  it.each([
    {
      title: 'files',
      fields: filesSortFields.table,
      table: ['name asc', 'size desc', 'mdate desc']
    },
    {
      title: 'shares',
      fields: sharesSortFields.table,
      table: ['name asc', 'sharedWith asc', 'sdate desc']
    }
  ])('offers the table columns of the $title list', ({ fields, table }) => {
    expect(columns(fields)).toEqual(table)
  })

  it.each([
    {
      title: 'files',
      preset: filesSortFields,
      tiles: [
        'name asc A-Z',
        'name desc Z-A',
        'size desc Largest',
        'size asc Smallest',
        'mdate desc Recently modified',
        'mdate asc Least recently modified'
      ]
    },
    { title: 'shares', preset: sharesSortFields, tiles: ['name asc A-Z', 'name desc Z-A'] }
  ])('offers the tiles options of the $title list', ({ preset, tiles }) => {
    expect(options(preset.tiles)).toEqual(tiles)
  })

  describe('total quota', () => {
    const spaces = [
      { id: 'small', spaceQuota: { total: 10 } },
      { id: 'unrestricted', spaceQuota: { total: 0 } },
      { id: 'large', spaceQuota: { total: 1000 } }
    ]

    it('sorts unrestricted spaces first in descending order', () => {
      const sorted = sortHelper(spaces, [totalQuotaSort], 'totalQuota', SortDir.Desc)
      expect(sorted.map(({ id }) => id)).toEqual(['unrestricted', 'large', 'small'])
    })

    it('sorts unrestricted spaces last in ascending order', () => {
      const sorted = sortHelper(spaces, [totalQuotaSort], 'totalQuota', SortDir.Asc)
      expect(sorted.map(({ id }) => id)).toEqual(['small', 'large', 'unrestricted'])
    })
  })
})
