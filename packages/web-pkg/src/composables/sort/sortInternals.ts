import { SortDir } from '@opencloud-eu/design-system/helpers'
import { get } from 'lodash-es'

type NameCompareMode = 'default' | 'file'

interface SortFieldLike {
  name: string
  prop?: string
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  sortable?: boolean | Function | string
}

interface SortableItemLike {
  type?: string
  isFolder?: boolean
}

interface SortKey {
  item: SortableItemLike
  value: unknown
  stringValue?: string
  chunks?: string[]
}

export const sortItemsByField = <T extends SortableItemLike>(
  items: T[],
  field: SortFieldLike,
  sortBy: string,
  sortDir: SortDir
): T[] => {
  const collator = new Intl.Collator(navigator.language, { sensitivity: 'base', numeric: true })
  const nonNumericCollator = new Intl.Collator(navigator.language, {
    sensitivity: 'base',
    numeric: false
  })
  const finalTiebreakerCollator = new Intl.Collator(navigator.language, {
    sensitivity: 'variant',
    numeric: true
  })

  if (sortBy === 'name') {
    return sortItemsByName(
      items,
      sortBy,
      sortDir,
      field.sortable,
      collator,
      nonNumericCollator,
      finalTiebreakerCollator
    )
  }

  // Precompute sort keys (Schwartzian transform)
  const sortKeys: SortKey[] = items.map((item) => {
    let value = get(item, field.prop || field.name)

    if (field.sortable) {
      if (typeof field.sortable === 'string') {
        const joinBySortableKey = (values: Record<string, unknown>[]) => {
          return values.map((val) => val[field.sortable as string]).join('')
        }
        value = joinBySortableKey(value as Record<string, unknown>[])
      } else if (typeof field.sortable === 'function') {
        value = field.sortable(value)
      }
    }

    const stringValue = (value || '').toString()
    const chunks = stringValue.match(/\d+|\D+/g) || [stringValue]

    return { item, value, stringValue, chunks }
  })

  // Sort using precomputed keys
  sortKeys.sort((a, b) =>
    comparePrecomputedKeys(a, b, sortDir, collator, nonNumericCollator, finalTiebreakerCollator)
  )

  return sortKeys.map((sk) => sk.item as T)
}

const comparePrecomputedKeys = (
  a: SortKey,
  b: SortKey,
  sortDir: SortDir,
  collator: Intl.Collator,
  nonNumericCollator: Intl.Collator,
  finalTiebreakerCollator: Intl.Collator
): number => {
  const modifier = sortDir === SortDir.Asc ? 1 : -1

  if (!isNaN(a.value as number) && !isNaN(b.value as number)) {
    const numericCompare = ((a.value as number) - (b.value as number)) * modifier
    if (numericCompare !== 0) {
      return numericCompare
    }
    if (typeof a.value === 'string' && typeof b.value === 'string') {
      return nonNumericCollator.compare(a.value, b.value) * modifier
    }
    return 0
  }

  const compareResult = compareStringChunksPrecomputed(
    a.stringValue!,
    b.stringValue!,
    a.chunks!,
    b.chunks!,
    collator,
    nonNumericCollator,
    finalTiebreakerCollator
  )
  return compareResult * modifier
}

const sortItemsByName = <T extends SortableItemLike>(
  items: T[],
  sortBy: string,
  sortDir: SortDir,
  sortable: SortFieldLike['sortable'],
  collator: Intl.Collator,
  nonNumericCollator: Intl.Collator,
  finalTiebreakerCollator: Intl.Collator
) => {
  const foldersAsc = [...items.filter((item) => isFolder(item))].sort((a, b) =>
    compare(
      a,
      b,
      sortBy,
      SortDir.Asc,
      sortable,
      collator,
      nonNumericCollator,
      finalTiebreakerCollator,
      'default'
    )
  )
  const filesAsc = [...items.filter((item) => !isFolder(item))].sort((a, b) =>
    compare(
      a,
      b,
      sortBy,
      SortDir.Asc,
      sortable,
      collator,
      nonNumericCollator,
      finalTiebreakerCollator,
      'file'
    )
  )

  if (sortDir === SortDir.Asc) {
    return foldersAsc.concat(filesAsc)
  }

  return [...filesAsc].reverse().concat([...foldersAsc].reverse())
}

const isFolder = (item: SortableItemLike) =>
  item.isFolder || item.type === 'folder' || item.type === 'directory'

const compare = (
  a: SortableItemLike,
  b: SortableItemLike,
  sortBy: string,
  sortDir: SortDir,
  sortable: SortFieldLike['sortable'],
  collator: Intl.Collator,
  nonNumericCollator: Intl.Collator,
  finalTiebreakerCollator: Intl.Collator,
  nameCompareMode: NameCompareMode
) => {
  const modifier = sortDir === SortDir.Asc ? 1 : -1
  let aValue = get(a, sortBy)
  let bValue = get(b, sortBy)

  if (sortable) {
    if (typeof sortable === 'string') {
      const joinBySortableKey = (values: Record<string, unknown>[]) => {
        return values.map((value) => value[sortable]).join('')
      }
      aValue = joinBySortableKey(aValue as Record<string, unknown>[])
      bValue = joinBySortableKey(bValue as Record<string, unknown>[])
    } else if (typeof sortable === 'function') {
      aValue = sortable(aValue)
      bValue = sortable(bValue)
    }
  }

  if (nameCompareMode === 'file' && typeof aValue === 'string' && typeof bValue === 'string') {
    const fileNameCompare = compareFileNamesByBasePrefix(
      aValue,
      bValue,
      collator,
      nonNumericCollator,
      finalTiebreakerCollator
    )
    if (fileNameCompare !== 0) {
      return fileNameCompare * modifier
    }
  }

  if (!isNaN(aValue as number) && !isNaN(bValue as number)) {
    const numericCompare = ((aValue as number) - (bValue as number)) * modifier
    if (numericCompare !== 0) {
      return numericCompare
    }
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return nonNumericCollator.compare(aValue, bValue) * modifier
    }
    return 0
  }

  const stringA = (aValue || '').toString()
  const stringB = (bValue || '').toString()

  const compareResult = compareStringChunks(
    stringA,
    stringB,
    collator,
    nonNumericCollator,
    finalTiebreakerCollator
  )
  return compareResult * modifier
}

const compareFileNamesByBasePrefix = (
  a: string,
  b: string,
  collator: Intl.Collator,
  nonNumericCollator: Intl.Collator,
  finalTiebreakerCollator: Intl.Collator
): number => {
  const nameA = splitNameAndExtension(a)
  const nameB = splitNameAndExtension(b)
  const suffixA = splitBaseRootAndSuffix(nameA.base)
  const suffixB = splitBaseRootAndSuffix(nameB.base)
  const rootCompare = compareStringChunks(
    suffixA.root,
    suffixB.root,
    collator,
    nonNumericCollator,
    finalTiebreakerCollator
  )
  if (rootCompare !== 0) {
    return rootCompare
  }

  if (suffixA.root.toLocaleLowerCase() === suffixB.root.toLocaleLowerCase()) {
    if (suffixA.hasSuffix && !suffixB.hasSuffix) {
      return 1
    }
    if (!suffixA.hasSuffix && suffixB.hasSuffix) {
      return -1
    }
  }

  const isAPrefix = isBaseNamePrefix(nameA.base, nameB.base)
  if (isAPrefix) {
    return -1
  }
  const isBPrefix = isBaseNamePrefix(nameB.base, nameA.base)
  if (isBPrefix) {
    return 1
  }
  const baseCompare = compareStringChunks(
    nameA.base,
    nameB.base,
    collator,
    nonNumericCollator,
    finalTiebreakerCollator
  )
  if (baseCompare !== 0) {
    return baseCompare
  }

  return compareStringChunks(
    nameA.extension,
    nameB.extension,
    collator,
    nonNumericCollator,
    finalTiebreakerCollator
  )
}

const splitBaseRootAndSuffix = (base: string) => {
  const suffixSeparator = base.search(/[ _\-(]/)
  if (suffixSeparator <= 0) {
    return {
      root: base,
      hasSuffix: false
    }
  }

  return {
    root: base.slice(0, suffixSeparator),
    hasSuffix: true
  }
}

const isBaseNamePrefix = (shorter: string, longer: string): boolean => {
  if (!shorter || shorter.length >= longer.length) {
    return false
  }

  const lowerShorter = shorter.toLocaleLowerCase()
  const lowerLonger = longer.toLocaleLowerCase()
  if (!lowerLonger.startsWith(lowerShorter)) {
    return false
  }

  const remainder = longer.slice(shorter.length)
  return (
    /^ [^\d\s]/.test(remainder) ||
    remainder.startsWith('_') ||
    remainder.startsWith('-') ||
    remainder.startsWith('(')
  )
}

const splitNameAndExtension = (value: string) => {
  if (!value || value.startsWith('.')) {
    return { base: value, extension: '' }
  }

  const separator = value.lastIndexOf('.')
  if (separator <= 0 || separator === value.length - 1) {
    return { base: value, extension: '' }
  }

  return {
    base: value.slice(0, separator),
    extension: value.slice(separator + 1)
  }
}

// Comparison using precomputed chunks (for performance)
const compareStringChunksPrecomputed = (
  a: string,
  b: string,
  chunksA: string[],
  chunksB: string[],
  collator: Intl.Collator,
  nonNumericCollator: Intl.Collator,
  finalTiebreakerCollator: Intl.Collator
): number => {
  const maxLength = Math.max(chunksA.length, chunksB.length)
  let leadingZeroLengthDiff = 0

  for (let i = 0; i < maxLength; i++) {
    const chunkA = chunksA[i] || ''
    const chunkB = chunksB[i] || ''

    const isNumA = /^\d+$/.test(chunkA)
    const isNumB = /^\d+$/.test(chunkB)

    if (isNumA && isNumB) {
      const numA = Number(chunkA)
      const numB = Number(chunkB)
      if (numA !== numB) {
        return numA - numB
      }
      if (leadingZeroLengthDiff === 0 && chunkA.length !== chunkB.length) {
        leadingZeroLengthDiff = chunkA.length - chunkB.length
      }
    } else {
      const coll = collator.compare(chunkA, chunkB)
      if (coll !== 0) {
        return coll
      }
    }
  }

  if (leadingZeroLengthDiff !== 0) {
    return leadingZeroLengthDiff
  }

  const nonNumCmp = nonNumericCollator.compare(a, b)
  if (nonNumCmp !== 0) {
    return nonNumCmp
  }

  return finalTiebreakerCollator.compare(a, b)
}

// Comparison function that computes chunks on-the-fly (for name sorting)
const compareStringChunks = (
  a: string,
  b: string,
  collator: Intl.Collator,
  nonNumericCollator: Intl.Collator,
  finalTiebreakerCollator: Intl.Collator
): number => {
  const chunksA = a.match(/\d+|\D+/g) || [a]
  const chunksB = b.match(/\d+|\D+/g) || [b]
  return compareStringChunksPrecomputed(
    a,
    b,
    chunksA,
    chunksB,
    collator,
    nonNumericCollator,
    finalTiebreakerCollator
  )
}
