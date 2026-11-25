import { SortDir } from '@opencloud-eu/design-system/helpers'
import { SortField, sortHelper } from '@opencloud-eu/web-pkg'
import {
  spacesOverviewSortFields,
  trashOverviewSortFields,
  trashSortFields
} from '../../../../src/helpers/ui/sortFields'

function columns(fields: SortField[]) {
  return fields.map(({ name, sortDir }) => `${name} ${sortDir}`)
}

function options(fields: SortField[]) {
  return fields.map(({ name, sortDir, label }) => `${name} ${sortDir} ${label}`)
}

describe('sort fields', () => {
  it.each([
    { title: 'trash', fields: trashSortFields.table, table: ['name asc', 'ddate desc'] },
    {
      title: 'trash overview',
      fields: trashOverviewSortFields.table,
      table: ['name asc', 'indicators asc']
    },
    {
      title: 'spaces overview',
      fields: spacesOverviewSortFields.table,
      table: [
        'name asc',
        'totalQuota desc',
        'usedQuota desc',
        'remainingQuota desc',
        'indicators asc',
        'mdate desc'
      ]
    }
  ])('offers the table columns of the $title list', ({ fields, table }) => {
    expect(columns(fields)).toEqual(table)
  })

  it.each([
    { title: 'trash', preset: trashSortFields, tiles: ['name asc A-Z', 'name desc Z-A'] },
    {
      title: 'trash overview',
      preset: trashOverviewSortFields,
      tiles: [
        'name asc A-Z',
        'name desc Z-A',
        'indicators asc Contains deleted items first',
        'indicators desc Empty first'
      ]
    },
    {
      title: 'spaces overview',
      preset: spacesOverviewSortFields,
      tiles: [
        'name asc A-Z',
        'name desc Z-A',
        'totalQuota desc Most total quota',
        'totalQuota asc Least total quota',
        'usedQuota desc Most used quota',
        'usedQuota asc Least used quota',
        'remainingQuota desc Most remaining quota',
        'remainingQuota asc Least remaining quota',
        'indicators asc Enabled first',
        'indicators desc Disabled first',
        'mdate desc Recently modified',
        'mdate asc Least recently modified'
      ]
    }
  ])('offers the tiles options of the $title list', ({ preset, tiles }) => {
    expect(options(preset.tiles)).toEqual(tiles)
  })

  it('sorts the trash bins with deleted items first', () => {
    const spaces = [
      { id: 'empty', hasTrashedItems: false },
      { id: 'full', hasTrashedItems: true }
    ]
    const sorted = sortHelper(spaces, trashOverviewSortFields.table, 'indicators', SortDir.Asc)
    expect(sorted.map(({ id }) => id)).toEqual(['full', 'empty'])
  })
})
