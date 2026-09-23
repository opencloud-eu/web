import { SortField } from '../../composables/sort'
import { SortDir } from '@opencloud-eu/design-system/helpers'

// sort field definitions shared by the table and tiles sort fields

export function sortByDate(date: string) {
  return new Date(date).valueOf()
}

export const nameSortField: SortField = {
  name: 'name',
  sortable: true,
  sortDir: SortDir.Asc
}

export const sizeSortField: SortField = {
  name: 'size',
  sortable: true,
  sortDir: SortDir.Desc
}

export const mdateSortField: SortField = {
  name: 'mdate',
  sortable: sortByDate,
  sortDir: SortDir.Desc
}

export const membersSortField: SortField = {
  name: 'members',
  prop: 'root.permissions',
  sortable: (permissions: unknown[]) => permissions?.length || 1,
  sortDir: SortDir.Desc
}

export const totalQuotaSortField: SortField = {
  name: 'totalQuota',
  prop: 'spaceQuota.total',
  sortable: true,
  sortDir: SortDir.Desc
}

export const usedQuotaSortField: SortField = {
  name: 'usedQuota',
  prop: 'spaceQuota.used',
  sortable: true,
  sortDir: SortDir.Desc
}

export const remainingQuotaSortField: SortField = {
  name: 'remainingQuota',
  prop: 'spaceQuota.remaining',
  sortable: true,
  sortDir: SortDir.Desc
}

export const spaceStatusSortField: SortField = {
  name: 'indicators',
  prop: 'disabled',
  sortable: (disabled: boolean) => Number(!!disabled),
  sortDir: SortDir.Asc
}
