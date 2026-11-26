import { toValue, unref, type MaybeRefOrGetter } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useIsMobile } from '@opencloud-eu/design-system/composables'

export type PdfShortcutActions = {
  print: () => void | Promise<void>
  /** Presentation mode, Ctrl+Alt+P. */
  present: () => void
  /** The hand tool (true) or text selection (false), `h` and `s`. */
  setHandTool: (isChosen: boolean) => void
  /** F4 */
  toggleSidebar: () => void
  openFindBar: () => void
  closeFindBar: () => void
  /** Ctrl+Alt+G */
  selectPageNumber: () => void
  /** The next or previous match, like Ctrl+G and F3 in browsers. */
  findAgain: (findPrevious: boolean) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  nextPage: () => void
  previousPage: () => void
  firstPage: () => void
  lastPage: () => void
  rotate: (delta: 90 | -90) => void
  undo: () => void
  redo: () => void
  /** Escape in the pages: deselecting, leaving the tool. */
  handleEscape: (event: KeyboardEvent) => void
}

/** PDF.js handles the keys in the toolbar of an editor itself, e.g. Home in its color picker. */
function isForPdfjs(event: KeyboardEvent) {
  return !!(event.target as Element).closest?.('.editToolbar')
}

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

// The keys that turn pages with "Page fit", whether they go back.
const PAGE_FIT_KEYS: Record<string, boolean> = {
  PageUp: true,
  ArrowUp: true,
  Backspace: true,
  PageDown: false,
  ArrowDown: false,
  ' ': false
}

// Keys that scroll the pages, the PDF.js viewer moves the focus to them for these.
const SCROLL_KEYS = [
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'ArrowLeft',
  'ArrowUp',
  'ArrowRight',
  'ArrowDown',
  ' '
]

/** Keyboard shortcuts, following the PDF.js viewer. Zooming by gestures: usePdfZoomGestures. */
export function usePdfShortcuts({
  root,
  container,
  isReadOnly,
  isPresenting,
  isToolActive,
  editingStates,
  isPageFit,
  isFindBarOpen,
  actions
}: {
  root: MaybeRefOrGetter<HTMLElement | null>
  container: MaybeRefOrGetter<HTMLElement | null>
  isReadOnly: MaybeRefOrGetter<boolean>
  /** The presentation mode turns the pages itself, no zooming, no editing. */
  isPresenting: MaybeRefOrGetter<boolean>
  /** PDF.js handles undo and redo of its edits itself while a tool is active. */
  isToolActive: MaybeRefOrGetter<boolean>
  /** Whether PDF.js has edits to undo or redo, without the page operations. */
  editingStates: MaybeRefOrGetter<{ hasSomethingToUndo: boolean; hasSomethingToRedo: boolean }>
  isPageFit: MaybeRefOrGetter<boolean>
  isFindBarOpen: MaybeRefOrGetter<boolean>
  actions: PdfShortcutActions
}) {
  const { isMobile } = useIsMobile()

  function isInModal(event: KeyboardEvent) {
    return !!(event.target as Element).closest?.('.oc-modal')
  }

  // Only react to keys meant for the app, not e.g. for an open modal.
  function isForApp(event: KeyboardEvent) {
    const target = event.target as Node | null
    return target === document.body || !!toValue(root)?.contains(target)
  }

  function handleModifierShortcut(event: KeyboardEvent) {
    const key = event.key.toLowerCase()
    // The browser would print the OpenCloud page around the document, e.g. with the focus in
    // its search, but not from a dialog.
    if (key === 'p' && !isInModal(event)) {
      event.preventDefault()
      actions.print()
      return
    }
    if (!isForApp(event)) {
      return
    }
    if ((key === 'z' || key === 'y') && !isEditable(event.target) && !toValue(isPresenting)) {
      handleUndoKey(event, key === 'y' || event.shiftKey)
      return
    }
    if (key === 'f') {
      event.preventDefault()
      actions.openFindBar()
      return
    }
    if (key === 'g') {
      event.preventDefault()
      actions.findAgain(event.shiftKey)
      return
    }
    // First and last page like in the PDF.js viewer, not while typing.
    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !isEditable(event.target)) {
      event.preventDefault()
      if (event.key === 'ArrowUp') {
        actions.firstPage()
      } else {
        actions.lastPage()
      }
      focusPages(event)
      return
    }
    const zoomAction = {
      '+': actions.zoomIn,
      '=': actions.zoomIn,
      '-': actions.zoomOut,
      '0': actions.resetZoom
    }[key]
    if (zoomAction) {
      // Zooms the document instead of the whole browser page.
      event.preventDefault()
      zoom(zoomAction)
    }
  }

  // While a tool is active PDF.js undoes its own edits, the page operations only once it has
  // none left, like the undo and redo buttons.
  function handleUndoKey(event: KeyboardEvent, isRedo: boolean) {
    const { hasSomethingToUndo, hasSomethingToRedo } = toValue(editingStates)
    if (toValue(isToolActive) && (isRedo ? hasSomethingToRedo : hasSomethingToUndo)) {
      return
    }
    event.preventDefault()
    if (isRedo) {
      actions.redo()
      return
    }
    actions.undo()
  }

  // The presentation mode fits the pages itself, like in the PDF.js viewer.
  function zoom(zoomAction: () => void) {
    if (!toValue(isPresenting)) {
      zoomAction()
    }
  }

  // The browser scrolls whatever has the focus, e.g. the thumbnails after clicking one or a
  // toolbar button. The pages get the focus first, so they scroll instead. Not from menus,
  // which move through their items with the arrow keys.
  function focusPages(event: KeyboardEvent) {
    const target = event.target as Element
    const viewerContainer = toValue(container)
    if (
      !viewerContainer ||
      toValue(isPresenting) ||
      viewerContainer.contains(target) ||
      target.closest?.('.oc-drop')
    ) {
      return
    }
    viewerContainer.focus({ preventScroll: true })
  }

  // Without a horizontal scrollbar left and right turn pages. Not for annotations, which move
  // with them.
  function handleArrowKey(event: KeyboardEvent) {
    const viewerContainer = toValue(container)
    const isOnAnnotation = !!(event.target as Element).closest?.(
      '.annotationEditorLayer, .annotationLayer'
    )
    if (
      !viewerContainer ||
      isOnAnnotation ||
      viewerContainer.scrollWidth > viewerContainer.clientWidth
    ) {
      return
    }
    event.preventDefault()
    if (event.key === 'ArrowRight') {
      actions.nextPage()
      return
    }
    actions.previousPage()
  }

  function handleKeyShortcut(event: KeyboardEvent) {
    // Space presses a focused button, like in the PDF.js viewer.
    const isButtonPress = event.key === ' ' && event.target instanceof HTMLButtonElement
    if (!isForApp(event) || isEditable(event.target) || isButtonPress || isForPdfjs(event)) {
      return
    }
    if (SCROLL_KEYS.includes(event.key)) {
      focusPages(event)
    }
    // With "Page fit" a page is a screen, so these keys turn pages.
    if (toValue(isPageFit) && event.key in PAGE_FIT_KEYS) {
      event.preventDefault()
      const isBack = PAGE_FIT_KEYS[event.key] || (event.key === ' ' && event.shiftKey)
      if (isBack) {
        actions.previousPage()
        return
      }
      actions.nextPage()
      return
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      handleArrowKey(event)
      return
    }
    const handler = {
      n: actions.nextPage,
      j: actions.nextPage,
      p: actions.previousPage,
      k: actions.previousPage,
      Home: actions.firstPage,
      End: actions.lastPage,
      '+': () => zoom(actions.zoomIn),
      '=': () => zoom(actions.zoomIn),
      '-': () => zoom(actions.zoomOut),
      F4: actions.toggleSidebar,
      r: () => actions.rotate(90),
      R: () => actions.rotate(-90),
      h: () => actions.setHandTool(true),
      s: () => actions.setHandTool(false)
    }[event.key]
    if (handler) {
      event.preventDefault()
      // The host has shortcuts of its own on these keys, e.g. `s` focuses its search.
      event.stopImmediatePropagation()
      handler()
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.altKey) {
      // Ctrl+Alt+P (Cmd+Alt+P) and Ctrl+Alt+G. By code, with Alt it types another key.
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || isInModal(event)) {
        return
      }
      if (event.code === 'KeyP') {
        event.preventDefault()
        actions.present()
      } else if (event.code === 'KeyG' && !toValue(isPresenting)) {
        event.preventDefault()
        actions.selectPageNumber()
      }
      return
    }
    if (event.ctrlKey || event.metaKey) {
      // "+" needs Shift on many keyboard layouts, redo is Ctrl+Shift+Z, Ctrl+Shift+G finds back.
      if (!event.shiftKey || ['+', 'z', 'g'].includes(event.key.toLowerCase())) {
        handleModifierShortcut(event)
      }
      return
    }
    // Like Ctrl+G, also while typing in the find bar. The browser would open its own search.
    if (event.key === 'F3') {
      if (isForApp(event)) {
        event.preventDefault()
        actions.findAgain(event.shiftKey)
      }
      return
    }
    handleKeyShortcut(event)
  }

  function onEscape(event: KeyboardEvent) {
    // Drops are bottom drawers on small screens. Their own Escape handling comes after
    // AppWrapper's, which would close the app.
    const drawer = unref(isMobile) && document.querySelector('.oc-bottom-drawer')
    if (drawer) {
      event.stopPropagation()
      drawer.querySelector<HTMLElement>('.oc-bottom-drawer-close-button')?.click()
      return
    }
    // It ends the full screen, not the app.
    if (toValue(isPresenting)) {
      event.stopPropagation()
      return
    }
    // From anywhere in the app, like in the PDF.js viewer.
    if (toValue(isFindBarOpen)) {
      event.stopPropagation()
      actions.closeFindBar()
      return
    }
    // Read-only, there is nothing to leave or deselect, so AppWrapper closes the app as usual.
    if (toValue(isReadOnly)) {
      return
    }
    actions.handleEscape(event)
  }

  useEventListener(window, 'keydown', onKeydown, { capture: true })
  useEventListener(root, 'keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onEscape(event)
    }
  })
}
