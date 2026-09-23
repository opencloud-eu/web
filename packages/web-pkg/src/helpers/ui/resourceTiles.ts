import { Resource } from '@opencloud-eu/web-client'
import { SortField } from '../../composables/sort'
import { Language } from 'vue3-gettext'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { $gettext } from '../../utils/dummyGettext'

export const resourceTilesSortFields: SortField[] = [
  {
    label: $gettext('A-Z'),
    name: 'name',
    sortable: true,
    sortDir: SortDir.Asc
  },
  {
    label: $gettext('Z-A'),
    name: 'name',
    sortable: true,
    sortDir: SortDir.Desc
  },
  {
    label: $gettext('Largest'),
    name: 'size',
    sortable: true,
    sortDir: SortDir.Desc
  },
  {
    label: $gettext('Smallest'),
    name: 'size',
    sortable: true,
    sortDir: SortDir.Asc
  },
  {
    label: $gettext('Recently modified'),
    name: 'mdate',
    sortable: (date: string) => new Date(date).valueOf(),
    sortDir: SortDir.Desc
  },
  {
    label: $gettext('Least recently modified'),
    name: 'mdate',
    sortable: (date: string) => new Date(date).valueOf(),
    sortDir: SortDir.Asc
  }
]

export const spaceTilesSortFields: SortField[] = [
  {
    label: $gettext('A-Z'),
    name: 'name',
    sortable: true,
    sortDir: SortDir.Asc
  },
  {
    label: $gettext('Z-A'),
    name: 'name',
    sortable: true,
    sortDir: SortDir.Desc
  },
  {
    label: $gettext('Most members'),
    name: 'members',
    prop: 'root.permissions',
    sortable: (permissions: unknown[]) => permissions?.length || 1,
    sortDir: SortDir.Desc
  },
  {
    label: $gettext('Fewest members'),
    name: 'members',
    prop: 'root.permissions',
    sortable: (permissions: unknown[]) => permissions?.length || 1,
    sortDir: SortDir.Asc
  },
  {
    label: $gettext('Most total quota'),
    name: 'totalQuota',
    prop: 'spaceQuota.total',
    sortable: true,
    sortDir: SortDir.Desc
  },
  {
    label: $gettext('Least total quota'),
    name: 'totalQuota',
    prop: 'spaceQuota.total',
    sortable: true,
    sortDir: SortDir.Asc
  },
  {
    label: $gettext('Most used quota'),
    name: 'usedQuota',
    prop: 'spaceQuota.used',
    sortable: true,
    sortDir: SortDir.Desc
  },
  {
    label: $gettext('Least used quota'),
    name: 'usedQuota',
    prop: 'spaceQuota.used',
    sortable: true,
    sortDir: SortDir.Asc
  },
  {
    label: $gettext('Most remaining quota'),
    name: 'remainingQuota',
    prop: 'spaceQuota.remaining',
    sortable: true,
    sortDir: SortDir.Desc
  },
  {
    label: $gettext('Least remaining quota'),
    name: 'remainingQuota',
    prop: 'spaceQuota.remaining',
    sortable: true,
    sortDir: SortDir.Asc
  },
  {
    label: $gettext('Enabled first'),
    name: 'indicators',
    prop: 'disabled',
    sortable: (disabled: boolean) => Number(!!disabled),
    sortDir: SortDir.Asc
  },
  {
    label: $gettext('Disabled first'),
    name: 'indicators',
    prop: 'disabled',
    sortable: (disabled: boolean) => Number(!!disabled),
    sortDir: SortDir.Desc
  },
  {
    label: $gettext('Recently modified'),
    name: 'mdate',
    sortable: (date: string) => new Date(date).valueOf(),
    sortDir: SortDir.Desc
  },
  {
    label: $gettext('Least recently modified'),
    name: 'mdate',
    sortable: (date: string) => new Date(date).valueOf(),
    sortDir: SortDir.Asc
  }
]

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
