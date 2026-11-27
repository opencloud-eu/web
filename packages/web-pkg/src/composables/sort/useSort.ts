import { Ref, computed, unref, toRef, MaybeRef } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { ReadOnlyRef } from '../../utils'
import { useRouteName } from '../router'
import get from 'lodash-es/get'
import { SortDir } from '@opencloud-eu/design-system/helpers'

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

export interface SortOptions<T extends object> {
  items: MaybeRef<Array<T>>
  fields: MaybeRef<Array<SortField>>
  sortBy?: MaybeRef<string>
  sortDir?: MaybeRef<SortDir>
  /**
   * The route whose stored sorting gets used, defaults to the current route.
   */
  routeName?: MaybeRef<string>
  foldersFirst?: MaybeRef<boolean>
  /**
   * Items matching this predicate get sorted before the rest, regardless of the sort direction.
   * When folders are sorted first, this applies within the folder and the file group.
   */
  pinFirst?: (item: T) => boolean
}

export interface SortResult<T> {
  items: Ref<Array<T>>
  sortBy: ReadOnlyRef<string>
  sortDir: ReadOnlyRef<SortDir>
  handleSort({ sortBy, sortDir }: { sortBy: string; sortDir: SortDir }): void
}

export function useSort<T extends object>(options: SortOptions<T>): SortResult<T> {
  const sortByRef: Ref<string> = options.sortBy
    ? toRef(options.sortBy)
    : useStoredSortValue(options.routeName, 'sort-by')
  const sortDirRef: Ref<string> = options.sortDir
    ? toRef(options.sortDir)
    : useStoredSortValue(options.routeName, 'sort-dir')

  const sortBy = computed(
    (): string => unref(sortByRef) || unref(firstSortableField(unref(fields))?.name)
  )
  const sortDir = computed((): SortDir => {
    return toSortDir(unref(sortDirRef)) || defaultSortDirection(unref(sortBy), unref(fields))
  })
  const fields = options.fields

  const items = computed<Array<T>>((): T[] => {
    // cast to T[] to avoid: Type 'T[] | readonly T[]' is not assignable to type 'T[]'.
    const sortItems = unref(options.items) as T[]

    if (!unref(sortBy)) {
      return sortItems
    }

    return sortHelper(
      sortItems,
      unref(fields),
      unref(sortBy),
      unref(sortDir),
      unref(options.foldersFirst) ?? true,
      options.pinFirst
    )
  })

  const handleSort = ({ sortBy, sortDir }: { sortBy: string; sortDir: SortDir }) => {
    sortByRef.value = sortBy
    sortDirRef.value = sortDir
  }

  return {
    items,
    sortBy,
    sortDir,
    handleSort
  }
}

function useStoredSortValue(routeName: MaybeRef<string>, name: string): Ref<string> {
  const prefix = unref(routeName) || unref(useRouteName())
  return useLocalStorage<string>(`oc-options_${prefix}_${name}`, '', { writeDefaults: false })
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
  if (sortField?.sortDir) {
    return unref(sortField.sortDir)
  }
  return SortDir.Desc
}

export const sortHelper = <T extends object>(
  items: T[],
  fields: SortField[],
  sortBy: string,
  sortDir: SortDir,
  foldersFirst = true,
  pinFirst?: (item: T) => boolean
) => {
  const field = fields.find((f) => {
    return f.name === sortBy
  })
  if (!field) {
    return items
  }
  const { sortable } = field
  const collator = new Intl.Collator(navigator.language, { sensitivity: 'accent', numeric: true })

  const compareItems = (a: T, b: T) => {
    if (pinFirst && pinFirst(a) !== pinFirst(b)) {
      return pinFirst(a) ? -1 : 1
    }
    return compare(a, b, collator, field.prop || field.name, sortDir, sortable)
  }

  if (foldersFirst) {
    const isFolder = (item: T) => {
      const { isFolder, type } = item as SortableItem
      return isFolder || type === 'folder' || type === 'directory'
    }
    const folders = items.filter((i) => isFolder(i)).sort(compareItems)
    const files = items.filter((i) => !isFolder(i)).sort(compareItems)
    return folders.concat(files)
  }
  return [...items].sort(compareItems)
}

const pureLeadingZeroPrefixRegex = /^(0+)(?!\d)(.*)$/

function compareNamesWithLeadingZeroPrefix(
  aName: string,
  bName: string,
  collator: Intl.Collator
): number | null {
  const aMatch = pureLeadingZeroPrefixRegex.exec(aName)
  const bMatch = pureLeadingZeroPrefixRegex.exec(bName)

  if (!aMatch || !bMatch) {
    return null
  }

  const aPrefixLength = aMatch[1].length
  const bPrefixLength = bMatch[1].length
  const aSuffix = aMatch[2]
  const bSuffix = bMatch[2]
  const aIsPureZero = aSuffix.length === 0
  const bIsPureZero = bSuffix.length === 0

  if (aPrefixLength !== bPrefixLength) {
    return bPrefixLength - aPrefixLength
  }

  if (aIsPureZero && bIsPureZero) {
    return collator.compare(aName, bName)
  }

  if (aIsPureZero !== bIsPureZero) {
    return aIsPureZero ? -1 : 1
  }

  const restComparison = collator.compare(aSuffix, bSuffix)
  if (restComparison !== 0) {
    return restComparison
  }

  return collator.compare(aName, bName)
}

const compare = (
  a: object,
  b: object,
  collator: Intl.Collator,
  sortBy: string,
  sortDir: SortDir,
  sortable: SortField['sortable']
) => {
  let aValue = get(a, sortBy)
  let bValue = get(b, sortBy)
  const modifier = sortDir === SortDir.Asc ? 1 : -1

  if (sortable) {
    if (typeof sortable === 'string') {
      const genArrComp = (vals: Record<string, unknown>[]) => {
        return vals.map((val) => val[sortable]).join('')
      }

      aValue = genArrComp(aValue)
      bValue = genArrComp(bValue)
    } else if (typeof sortable === 'function') {
      aValue = sortable(aValue)
      bValue = sortable(bValue)
    }
  }

  if (sortBy !== 'name' && !Number.isNaN(Number(aValue)) && !Number.isNaN(Number(bValue))) {
    return (aValue - bValue) * modifier
  }

  // For name sorting, extract basename (without extension) for comparison
  const aCompare = (aValue || '').toString()
  const bCompare = (bValue || '').toString()

  if (sortBy === 'name') {
    const getBasename = (name: string) => {
      const lastDot = name.lastIndexOf('.')
      return lastDot > 0 ? name.substring(0, lastDot) : name
    }
    const getExtension = (name: string) => {
      const lastDot = name.lastIndexOf('.')
      return lastDot > 0 ? name.substring(lastDot) : ''
    }

    const aBase = getBasename(aCompare)
    const bBase = getBasename(bCompare)
    const aExt = getExtension(aCompare)
    const bExt = getExtension(bCompare)

    const baseComparison =
      compareNamesWithLeadingZeroPrefix(aBase, bBase, collator) ?? collator.compare(aBase, bBase)
    if (baseComparison !== 0) {
      return baseComparison * modifier
    }

    // If basenames are equal, compare extensions
    return collator.compare(aExt, bExt) * modifier
  }

  const c = collator.compare(aCompare, bCompare)
  return c * modifier
}

const toSortDir = (value: string): SortDir | null => {
  switch (value) {
    case SortDir.Asc:
      return SortDir.Asc
    case SortDir.Desc:
      return SortDir.Desc
  }

  return null
}
