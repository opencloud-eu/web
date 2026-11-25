import { ShareResource } from '@opencloud-eu/web-client'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { SortField } from '../../composables/sort'
import { $gettext } from '../../utils/dummyGettext'

/**
 * The sort fields of a list, per view mode. The labels of the tiles fields are untranslated,
 * the tiles view translates them when showing them.
 *
 * A list defines its preset where it's used. Only the sort fields, tiles options and presets
 * that several packages need live here.
 */
export interface SortFieldsPreset {
  table: SortField[]
  tiles: SortField[]
}

function sortableDate(date: string) {
  return new Date(date).valueOf()
}

// sorts the sharees with users before groups and compares all of them, so that resources
// shared with several sharees don't get mixed up with the ones shared with a single sharee
function sortableSharedWith(sharedWith: ShareResource['sharedWith']) {
  if (!sharedWith.length) {
    return false
  }
  return sharedWith
    .sort((a, b) => {
      if (a.shareType !== b.shareType) {
        return a.shareType < b.shareType ? -1 : 1
      }
      return a.displayName < b.displayName ? -1 : 1
    })
    .map((e) => e.displayName)
    .join()
}

// a total quota of 0 means unrestricted, which needs to be sorted as the largest value
function sortableTotalQuota(total: number) {
  return total === 0 ? Infinity : total
}

// disabled spaces get sorted after the enabled ones
function sortableDisabled(disabled: boolean) {
  return Number(!!disabled)
}

export const nameSort: SortField = { name: 'name', sortable: true, sortDir: SortDir.Asc }
const sizeSort: SortField = { name: 'size', sortable: true, sortDir: SortDir.Desc }
export const mdateSort: SortField = { name: 'mdate', sortable: sortableDate, sortDir: SortDir.Desc }
const sdateSort: SortField = { name: 'sdate', sortable: sortableDate, sortDir: SortDir.Desc }
const sharedWithSort: SortField = {
  name: 'sharedWith',
  sortable: sortableSharedWith,
  sortDir: SortDir.Asc
}
export const totalQuotaSort: SortField = {
  name: 'totalQuota',
  prop: 'spaceQuota.total',
  sortable: sortableTotalQuota,
  sortDir: SortDir.Desc
}
export const usedQuotaSort: SortField = {
  name: 'usedQuota',
  prop: 'spaceQuota.used',
  sortable: true,
  sortDir: SortDir.Desc
}
export const remainingQuotaSort: SortField = {
  name: 'remainingQuota',
  prop: 'spaceQuota.remaining',
  sortable: true,
  sortDir: SortDir.Desc
}
export const disabledSort: SortField = {
  name: 'indicators',
  prop: 'disabled',
  sortable: sortableDisabled,
  sortDir: SortDir.Asc
}

export const nameTiles: SortField[] = [
  { ...nameSort, label: $gettext('A-Z'), sortDir: SortDir.Asc },
  { ...nameSort, label: $gettext('Z-A'), sortDir: SortDir.Desc }
]
const sizeTiles: SortField[] = [
  { ...sizeSort, label: $gettext('Largest'), sortDir: SortDir.Desc },
  { ...sizeSort, label: $gettext('Smallest'), sortDir: SortDir.Asc }
]
export const mdateTiles: SortField[] = [
  { ...mdateSort, label: $gettext('Recently modified'), sortDir: SortDir.Desc },
  { ...mdateSort, label: $gettext('Least recently modified'), sortDir: SortDir.Asc }
]

/** Folders and other plain file lists like favorites and search results. */
export const filesSortFields: SortFieldsPreset = {
  table: [nameSort, sizeSort, mdateSort],
  tiles: [...nameTiles, ...sizeTiles, ...mdateTiles]
}

/** Incoming and outgoing shares. */
export const sharesSortFields: SortFieldsPreset = {
  table: [nameSort, sharedWithSort, sdateSort],
  tiles: nameTiles
}
