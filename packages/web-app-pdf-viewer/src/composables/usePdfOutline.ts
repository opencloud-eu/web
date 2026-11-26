import {
  computed,
  shallowReactive,
  shallowRef,
  toRaw,
  toValue,
  unref,
  watch,
  type InjectionKey,
  type MaybeRefOrGetter
} from 'vue'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PDFLinkService } from 'pdfjs-dist/web/pdf_viewer.mjs'

// PDF.js reports more than it declares, e.g. named actions like "NextPage".
export type OutlineItem = Omit<
  Awaited<ReturnType<PDFDocumentProxy['getOutline']>>[number],
  'items'
> & {
  items: OutlineItem[]
  action?: string
  attachmentId?: string
  attachment?: { filename: string }
  setOCGState?: object
}

/** All entries, in the order of the outline. */
function flatten(items: OutlineItem[]): OutlineItem[] {
  return items.flatMap((item) => [item, ...flatten(item.items)])
}

function contains(item: OutlineItem, target: OutlineItem): boolean {
  return item.items.some((child) => child === target || contains(child, target))
}

/**
 * Whether the PDF marks an entry as closed, same logic as the PDF.js viewer: a negative
 * `count` that matches the number of entries below it.
 */
function isClosedInPdf({ count, items: children }: OutlineItem) {
  if (count === undefined || count >= 0) {
    return false
  }
  let total = children.length
  const queue = [...children]
  while (queue.length) {
    const { count: nestedCount, items: nestedItems } = queue.shift()
    if (nestedCount > 0 && nestedItems.length) {
      total += nestedItems.length
      queue.push(...nestedItems)
    }
  }
  return Math.abs(count) === total
}

/** A destination starts with the page, as its index or a reference to it. */
function getPageIndex(doc: PDFDocumentProxy, page: unknown) {
  if (Number.isInteger(page)) {
    return page as number
  }
  if (!page || typeof page !== 'object') {
    return undefined
  }
  return doc.getPageIndex(page as Parameters<PDFDocumentProxy['getPageIndex']>[0])
}

async function resolvePageNumber(doc: PDFDocumentProxy, dest: OutlineItem['dest']) {
  try {
    const explicit = typeof dest === 'string' ? await doc.getDestination(dest) : dest
    const pageIndex = await getPageIndex(doc, explicit?.[0])
    // Destinations can point to pages that don't exist.
    if (pageIndex >= 0 && pageIndex < doc.numPages) {
      return pageIndex + 1
    }
  } catch {
    // A destination that doesn't exist, the entry just has no page number.
  }
  return undefined
}

/**
 * The outline of the document: its entries (undefined while loading), the pages they lead to,
 * which ones are expanded and the current section. Lives as long as the document, the sidebar
 * gets it via `pdfOutlineKey`.
 */
export function usePdfOutline({
  pdfDocument,
  pageNumber,
  linkService,
  openAttachment
}: {
  pdfDocument: MaybeRefOrGetter<PDFDocumentProxy | undefined>
  pageNumber: MaybeRefOrGetter<number>
  linkService: Pick<PDFLinkService, 'goToDestination' | 'executeNamedAction' | 'executeSetOCGState'>
  openAttachment: (attachment: { id: string; filename: string }) => void
}) {
  const outline = shallowRef<OutlineItem[]>()
  const pageNumbers = shallowRef(new Map<OutlineItem, number>())
  const expanded = shallowReactive(new Map<OutlineItem, boolean>())
  // Set along with the outline, checking an entry's subtree on every render would be costly.
  let closedInPdf = new WeakSet<OutlineItem>()
  // Several entries can start on the same page, the one clicked stays current there.
  const selectedItem = shallowRef<OutlineItem>()

  watch(
    () => toValue(pdfDocument),
    async (doc) => {
      outline.value = undefined
      pageNumbers.value = new Map()
      expanded.clear()
      selectedItem.value = undefined
      if (!doc) {
        return
      }
      // A broken outline in the file is left out instead of loading forever.
      const items = (await doc.getOutline().catch((): null => null)) ?? []
      if (doc !== toValue(pdfDocument)) {
        return
      }
      const allItems = flatten(items)
      closedInPdf = new WeakSet(allItems.filter(isClosedInPdf))
      outline.value = items
      const entries = await Promise.all(
        allItems
          .filter(({ dest }) => dest)
          .map(async (item) => [item, await resolvePageNumber(doc, item.dest)] as const)
      )
      if (doc === toValue(pdfDocument)) {
        pageNumbers.value = new Map(entries.filter(([, page]) => page))
      }
    },
    { immediate: true }
  )

  // Entries are looked up as PDF.js returned them, not as reactive copies.
  function isExpanded(item: OutlineItem) {
    const raw = toRaw(item)
    return expanded.get(raw) ?? !closedInPdf.has(raw)
  }

  function setExpanded(items: OutlineItem[], isExpanding: boolean) {
    for (const item of items) {
      if (item.items.length) {
        expanded.set(item, isExpanding)
      }
    }
  }

  /** With `withSubtree`, the entries below get the same state, like in the PDF.js viewer. */
  function toggle(item: OutlineItem, withSubtree = false) {
    const raw = toRaw(item)
    const isExpanding = !isExpanded(raw)
    if (withSubtree) {
      setExpanded([raw, ...flatten(raw.items)], isExpanding)
      return
    }
    expanded.set(raw, isExpanding)
  }

  function getPageNumber(item: OutlineItem) {
    return unref(pageNumbers).get(toRaw(item))
  }

  // Otherwise the last entry that starts on or before the current page.
  const currentItem = computed(() => {
    const selected = unref(selectedItem)
    if (selected && unref(pageNumbers).get(selected) === toValue(pageNumber)) {
      return selected
    }
    return flatten(unref(outline) ?? []).findLast((item) => {
      const page = unref(pageNumbers).get(item)
      return page && page <= toValue(pageNumber)
    })
  })

  /** The current entry, or the collapsed entry it is hidden in. */
  function isCurrent(item: OutlineItem) {
    const current = unref(currentItem)
    const raw = toRaw(item)
    return raw === current || (!!current && !isExpanded(raw) && contains(raw, current))
  }

  /** Goes where the entry leads, like the outline of the PDF.js viewer. */
  function open(item: OutlineItem) {
    selectedItem.value = toRaw(item)
    const { dest, action, attachmentId, attachment, setOCGState } = item
    if (dest) {
      linkService.goToDestination(dest)
    } else if (action) {
      linkService.executeNamedAction(action)
    } else if (attachmentId && attachment) {
      openAttachment({ id: attachmentId, filename: attachment.filename })
    } else if (setOCGState) {
      linkService.executeSetOCGState(setOCGState)
    }
  }

  return { outline, getPageNumber, isCurrent, isExpanded, toggle, open }
}

export const pdfOutlineKey: InjectionKey<ReturnType<typeof usePdfOutline>> = Symbol('pdfOutline')
