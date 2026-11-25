import { SortDir } from '@opencloud-eu/design-system/helpers'
import {
  $gettext,
  disabledSort,
  mdateSort,
  mdateTiles,
  nameSort,
  nameTiles,
  remainingQuotaSort,
  SortField,
  SortFieldsPreset,
  totalQuotaSort,
  usedQuotaSort
} from '@opencloud-eu/web-pkg'

function sortableDate(date: string) {
  return new Date(date).valueOf()
}

// empty trash bins get sorted after the ones that contain deleted items
function sortableHasTrashedItems(hasTrashedItems: boolean) {
  return Number(!hasTrashedItems)
}

const ddateSort: SortField = { name: 'ddate', sortable: sortableDate, sortDir: SortDir.Desc }
const hasTrashedItemsSort: SortField = {
  name: 'indicators',
  prop: 'hasTrashedItems',
  sortable: sortableHasTrashedItems,
  sortDir: SortDir.Asc
}

const hasTrashedItemsTiles: SortField[] = [
  { ...hasTrashedItemsSort, label: $gettext('Contains deleted items first'), sortDir: SortDir.Asc },
  { ...hasTrashedItemsSort, label: $gettext('Empty first'), sortDir: SortDir.Desc }
]
const totalQuotaTiles: SortField[] = [
  { ...totalQuotaSort, label: $gettext('Most total quota'), sortDir: SortDir.Desc },
  { ...totalQuotaSort, label: $gettext('Least total quota'), sortDir: SortDir.Asc }
]
const usedQuotaTiles: SortField[] = [
  { ...usedQuotaSort, label: $gettext('Most used quota'), sortDir: SortDir.Desc },
  { ...usedQuotaSort, label: $gettext('Least used quota'), sortDir: SortDir.Asc }
]
const remainingQuotaTiles: SortField[] = [
  { ...remainingQuotaSort, label: $gettext('Most remaining quota'), sortDir: SortDir.Desc },
  { ...remainingQuotaSort, label: $gettext('Least remaining quota'), sortDir: SortDir.Asc }
]
const disabledTiles: SortField[] = [
  { ...disabledSort, label: $gettext('Enabled first'), sortDir: SortDir.Asc },
  { ...disabledSort, label: $gettext('Disabled first'), sortDir: SortDir.Desc }
]

/** The deleted resources of a trash bin. */
export const trashSortFields: SortFieldsPreset = {
  table: [nameSort, ddateSort],
  tiles: nameTiles
}

/** The trash bins of all spaces. */
export const trashOverviewSortFields: SortFieldsPreset = {
  table: [nameSort, hasTrashedItemsSort],
  tiles: [...nameTiles, ...hasTrashedItemsTiles]
}

/** The spaces overview. It doesn't show the members, so they can't be sorted by. */
export const spacesOverviewSortFields: SortFieldsPreset = {
  table: [nameSort, totalQuotaSort, usedQuotaSort, remainingQuotaSort, disabledSort, mdateSort],
  tiles: [
    ...nameTiles,
    ...totalQuotaTiles,
    ...usedQuotaTiles,
    ...remainingQuotaTiles,
    ...disabledTiles,
    ...mdateTiles
  ]
}
