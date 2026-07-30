import Mark from 'mark.js'
import { MaybeRef, unref, watch } from 'vue'

const highlightClass = 'mark-highlight'

export interface FilterHighlightOptions {
  /**
   * The element containing the filtered items.
   */
  element: MaybeRef<HTMLElement>
  /**
   * The term to highlight.
   */
  term: MaybeRef<string>
  /**
   * The items that are currently rendered inside the given element. Highlighting is re-applied
   * whenever they change, e.g. because the list has been paginated.
   */
  items?: MaybeRef<unknown[]>
}

/**
 * Highlights the occurrences of a filter term within the given element.
 */
export function useFilterHighlight({ element, term, items }: FilterHighlightOptions): void {
  watch(
    [() => unref(term), () => unref(items)],
    () => {
      const context = unref(element)
      if (!context) {
        return
      }

      removeHighlights(context)
      new Mark(context).mark(unref(term), { element: 'span', className: highlightClass })
    },
    { flush: 'post' }
  )
}

/**
 * Unwraps previously highlighted text. mark.js' own `unmark` is not used because it calls
 * `Node.normalize()`, which detaches the text nodes Vue keeps a reference to.
 */
function removeHighlights(context: HTMLElement) {
  const highlights = Array.from(context.querySelectorAll(`span.${highlightClass}`))
  const parents = new Set(highlights.map(({ parentNode }) => parentNode).filter(Boolean))

  highlights.forEach((highlight) => highlight.replaceWith(...Array.from(highlight.childNodes)))
  parents.forEach(mergeTextNodes)
}

/**
 * Joins adjacent text nodes into the first one of each run, undoing the splits that marking a term
 * causes. In contrast to `Node.normalize()`, empty text nodes are kept: Vue uses them as anchors for
 * fragments (`v-for`, `v-if`) and removing them breaks all subsequent DOM patches of that fragment.
 */
function mergeTextNodes(parent: Node) {
  let child = parent.firstChild

  while (child) {
    if (!isTextNode(child)) {
      child = child.nextSibling
      continue
    }

    let sibling = child.nextSibling
    while (isTextNode(sibling)) {
      child.data += sibling.data
      const next = sibling.nextSibling
      sibling.remove()
      sibling = next
    }

    child = sibling
  }
}

function isTextNode(node: Node): node is Text {
  return node?.nodeType === Node.TEXT_NODE
}
