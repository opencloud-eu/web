import { ref, Ref, computed, unref, isRef, MaybeRef } from 'vue'
import { ReadOnlyRef } from '../../utils'
import { useRouteName, useRouter, useRouteQueryPersisted, QueryValue } from '../router'
import { SortConstants } from './constants'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { sortItemsByField } from './sortInternals'

export interface SortableItem {
  type?: string
  isFolder?: boolean
  extension?: string
}

export interface SortField {
  name: string
  prop?: string
  // eslint-disable-next-line
  sortable?: MaybeRef<boolean | Function | string>
  sortDir?: MaybeRef<SortDir>
  label?: string
}

export interface SortOptions<T extends SortableItem> {
  items: MaybeRef<Array<T>>
  fields: MaybeRef<Array<SortField>>
  sortBy?: MaybeRef<string>
  sortByQueryName?: MaybeRef<string>
  sortDir?: MaybeRef<SortDir>
  sortDirQueryName?: MaybeRef<string>
  routeName?: MaybeRef<string>
}

export interface SortResult<T> {
  items: Ref<Array<T>>
  sortBy: ReadOnlyRef<string>
  sortDir: ReadOnlyRef<SortDir>
  handleSort({ sortBy, sortDir }: { sortBy: string; sortDir: SortDir }): void
}

export function useSort<T extends SortableItem>(options: SortOptions<T>): SortResult<T> {
  const router = useRouter()
  const sortByRef = createSortByQueryRef(options)
  const sortDirRef = createSortDirQueryRef(options)

  const sortBy = computed(
    (): string =>
      firstQueryValue(unref(sortByRef)) || unref(firstSortableField(unref(fields))?.name)
  )
  const sortDir = computed((): SortDir => {
    return (
      sortDirFromQueryValue(unref(sortDirRef)) || defaultSortDirection(unref(sortBy), unref(fields))
    )
  })
  const fields = options.fields

  const items = computed<Array<T>>((): T[] => {
    // cast to T[] to avoid: Type 'T[] | readonly T[]' is not assignable to type 'T[]'.
    const sortItems = unref(options.items) as T[]

    if (!unref(sortBy)) {
      return sortItems
    }

    return sortHelper(sortItems, unref(fields), unref(sortBy), unref(sortDir))
  })

  const handleSort = ({ sortBy, sortDir }: { sortBy: string; sortDir: SortDir }) => {
    // normally we would just set sortBy and sortDir here, but then the router could lose one of the two changes.
    // hence we update the router directly by setting both values as query.
    return router.replace({
      query: {
        ...unref(router.currentRoute).query,
        [unref(options.sortByQueryName) || SortConstants.sortByQueryName]: sortBy,
        [unref(options.sortDirQueryName) || SortConstants.sortDirQueryName]: sortDir
      }
    })
  }

  return {
    items,
    sortBy,
    sortDir,
    handleSort
  }
}

function createSortByQueryRef<T>(options: SortOptions<T>): Ref<QueryValue> {
  if (options.sortBy) {
    return isRef(options.sortBy) ? options.sortBy : ref(options.sortBy)
  }

  return useRouteQueryPersisted({
    name: unref(options.sortByQueryName) || SortConstants.sortByQueryName,
    defaultValue: unref(firstSortableField(unref(options.fields))?.name),
    storagePrefix: unref(options.routeName) || unref(useRouteName())
  })
}

function createSortDirQueryRef<T>(options: SortOptions<T>): Ref<QueryValue> {
  if (options.sortDir) {
    return isRef(options.sortDir) ? options.sortDir : ref(options.sortDir)
  }

  return useRouteQueryPersisted({
    name: unref(options.sortDirQueryName) || SortConstants.sortDirQueryName,
    defaultValue: unref(firstSortableField(unref(options.fields))?.sortDir),
    storagePrefix: unref(options.routeName) || unref(useRouteName())
  })
}

const firstSortableField = (fields: SortField[]): SortField => {
  const sortableFields = fields.filter((f) => f.sortable)
  if (sortableFields) {
    return sortableFields[0]
  }
  return null
}

const defaultSortDirection = (name: string, fields: SortField[]): SortDir => {
  const sortField = fields.find((f) => f.name === name)
  if (sortField && sortField.sortDir) {
    return unref(sortField.sortDir)
  }
  return SortDir.Desc
}

export const sortHelper = <T extends SortableItem>(
  items: T[],
  fields: SortField[],
  sortBy: string,
  sortDir: SortDir
) => {
  const field = fields.find((f) => f.name === sortBy)
  if (!field) {
    return items
  }
  return sortItemsByField(
    items,
    {
      name: field.name,
      prop: field.prop,
      sortable: unref(field.sortable)
    },
    sortBy,
    sortDir
  )
}

const firstQueryValue = (value: QueryValue): string => {
  return Array.isArray(value) ? value[0] : value
}

const sortDirFromQueryValue = (value: QueryValue): SortDir | null => {
  switch (firstQueryValue(value)) {
    case SortDir.Asc:
      return SortDir.Asc
    case SortDir.Desc:
      return SortDir.Desc
  }

  return null
}
