import { isSpaceResource, Resource, ShareResource } from '@opencloud-eu/web-client'
import { SortField } from '../../composables/sort'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import {
  mdateSortField,
  nameSortField,
  remainingQuotaSortField,
  sizeSortField,
  sortByDate,
  spaceStatusSortField,
  totalQuotaSortField,
  usedQuotaSortField
} from './sortFields'

export const resourceTableSortFields: SortField[] = [
  nameSortField,
  sizeSortField,
  {
    name: 'sharedWith',
    sortable: (sharedWith: ShareResource['sharedWith']) => {
      if (sharedWith.length > 0) {
        // Ensure the sharees are always sorted and that users
        // take precedence over groups. Then return a string with
        // all elements to ensure shares with multiple shares do
        // not appear mixed within others with a single one
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
      return false
    },
    sortDir: SortDir.Asc
  },
  {
    name: 'owner',
    sortable: 'displayName',
    sortDir: SortDir.Asc
  },
  mdateSortField,
  {
    name: 'sdate',
    sortable: sortByDate,
    sortDir: SortDir.Desc
  },
  {
    name: 'ddate',
    sortable: sortByDate,
    sortDir: SortDir.Desc
  }
]

export const spaceTableSortFields: SortField[] = [
  nameSortField,
  totalQuotaSortField,
  usedQuotaSortField,
  remainingQuotaSortField,
  spaceStatusSortField,
  mdateSortField
]

export const determineResourceTableSortFields = (firstResource: Resource): SortField[] => {
  if (!firstResource) {
    return []
  }

  if (isSpaceResource(firstResource)) {
    return spaceTableSortFields
  }

  return resourceTableSortFields.filter((field) =>
    Object.prototype.hasOwnProperty.call(firstResource, field.name)
  )
}
