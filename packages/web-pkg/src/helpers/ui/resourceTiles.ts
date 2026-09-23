import { Resource } from '@opencloud-eu/web-client'
import { SortField } from '../../composables/sort'
import { Language } from 'vue3-gettext'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { $gettext } from '../../utils/dummyGettext'
import {
  mdateSortField,
  membersSortField,
  nameSortField,
  remainingQuotaSortField,
  sizeSortField,
  spaceStatusSortField,
  totalQuotaSortField,
  usedQuotaSortField
} from './sortFields'

export const resourceTilesSortFields: SortField[] = [
  { ...nameSortField, label: $gettext('A-Z'), sortDir: SortDir.Asc },
  { ...nameSortField, label: $gettext('Z-A'), sortDir: SortDir.Desc },
  { ...sizeSortField, label: $gettext('Largest'), sortDir: SortDir.Desc },
  { ...sizeSortField, label: $gettext('Smallest'), sortDir: SortDir.Asc },
  { ...mdateSortField, label: $gettext('Recently modified'), sortDir: SortDir.Desc },
  { ...mdateSortField, label: $gettext('Least recently modified'), sortDir: SortDir.Asc }
]

export const spaceTilesSortFields: SortField[] = [
  { ...nameSortField, label: $gettext('A-Z'), sortDir: SortDir.Asc },
  { ...nameSortField, label: $gettext('Z-A'), sortDir: SortDir.Desc },
  { ...membersSortField, label: $gettext('Most members'), sortDir: SortDir.Desc },
  { ...membersSortField, label: $gettext('Fewest members'), sortDir: SortDir.Asc },
  { ...totalQuotaSortField, label: $gettext('Most total quota'), sortDir: SortDir.Desc },
  { ...totalQuotaSortField, label: $gettext('Least total quota'), sortDir: SortDir.Asc },
  { ...usedQuotaSortField, label: $gettext('Most used quota'), sortDir: SortDir.Desc },
  { ...usedQuotaSortField, label: $gettext('Least used quota'), sortDir: SortDir.Asc },
  { ...remainingQuotaSortField, label: $gettext('Most remaining quota'), sortDir: SortDir.Desc },
  { ...remainingQuotaSortField, label: $gettext('Least remaining quota'), sortDir: SortDir.Asc },
  { ...spaceStatusSortField, label: $gettext('Enabled first'), sortDir: SortDir.Asc },
  { ...spaceStatusSortField, label: $gettext('Disabled first'), sortDir: SortDir.Desc },
  { ...mdateSortField, label: $gettext('Recently modified'), sortDir: SortDir.Desc },
  { ...mdateSortField, label: $gettext('Least recently modified'), sortDir: SortDir.Asc }
]

/** @deprecated use `resourceTilesSortFields` or `spaceTilesSortFields` instead */
export const sortFields = spaceTilesSortFields

export const determineResourceTilesSortFields = (firstResource: Resource): SortField[] => {
  if (!firstResource) {
    return []
  }

  return resourceTilesSortFields.filter((field) =>
    Object.prototype.hasOwnProperty.call(firstResource, field.name)
  )
}

export const translateSortFields = (fields: SortField[], { $gettext }: Language): SortField[] => {
  return fields.map((field) => ({ ...field, label: $gettext(field.label) }))
}
