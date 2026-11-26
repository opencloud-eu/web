import { tryOnScopeDispose } from '@vueuse/core'
import { useGettext } from 'vue3-gettext'
import { useMessages, type Action, type Message } from '@opencloud-eu/web-pkg'

// Like the undo message after deleting files.
const MESSAGE_TIMEOUT_SECONDS = 7

/**
 * PDF.js offers to undo deleting annotations with the undo bar of the full PDF.js viewer
 * ("Highlight removed · Undo"). This provides the same contract as its EditorUndoBar with an
 * OpenCloud message.
 */
export function usePdfEditorUndoBar({ onChange }: { onChange: () => void }) {
  const { $gettext, $ngettext } = useGettext()
  const messageStore = useMessages()
  let message: Message | undefined

  /** `messageData` is the type of the deleted annotation, or how many were deleted. */
  function getTitle(messageData: string | number) {
    const titles: Record<string, string> = {
      highlight: $gettext('Highlight removed'),
      freetext: $gettext('Text removed'),
      ink: $gettext('Drawing removed'),
      stamp: $gettext('Image removed'),
      signature: $gettext('Signature removed'),
      comment: $gettext('Comment removed')
    }
    if (typeof messageData === 'string' && titles[messageData]) {
      return titles[messageData]
    }
    const count = typeof messageData === 'number' ? messageData : 1
    return $ngettext('%{count} annotation removed', '%{count} annotations removed', count, {
      count: String(count)
    })
  }

  function hide() {
    if (!message) {
      return
    }
    messageStore.removeMessage(message)
    message = undefined
  }

  function show(undo: () => void, messageData: string | number) {
    hide()
    const undoAction: Action = {
      name: 'pdf-viewer-undo-remove',
      icon: 'arrow-go-back',
      label: () => $gettext('Undo'),
      isVisible: () => true,
      handler: () => {
        undo()
        hide()
        // Clicked outside of the viewer, which doesn't see it.
        onChange()
      }
    }
    message = messageStore.showMessage({
      title: getTitle(messageData),
      timeout: MESSAGE_TIMEOUT_SECONDS,
      actions: [undoAction]
    })
  }

  // What PDF.js uses of the undo bar.
  const editorUndoBar = { show, hide, destroy: hide }

  // The undo belongs to the document, it can't be undone once the viewer is gone.
  tryOnScopeDispose(hide)

  return { editorUndoBar }
}
