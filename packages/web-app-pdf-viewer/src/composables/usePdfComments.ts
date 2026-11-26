import { markRaw, ref, shallowRef, toValue, unref, type MaybeRefOrGetter } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  applyOpacity,
  CSSConstants,
  findContrastColor,
  type AnnotationEditorUIManager
} from 'pdfjs-dist'
import { useModals } from '@opencloud-eu/web-pkg'
import PdfCommentModal from '../components/PdfCommentModal.vue'
import {
  getAnnotationElement,
  getCommentDate,
  type CommentData,
  type CommentTarget
} from '../helpers/comments'
import { pauseEditShortcuts } from '../helpers/editShortcuts'
import { getEditorUiManager } from '../helpers/pdfjsInternals'

export type CommentPopup = {
  target: CommentTarget
  data: CommentData
  /** Opened by clicking, hovering only shows a preview. */
  isSelected: boolean
  isEditable: boolean
}

/**
 * Same order as the comments sidebar of the PDF.js viewer: last changed first (an edited
 * comment moves to the top), otherwise by page and from top to bottom, left to right.
 */
function compareComments(a: CommentData, b: CommentData) {
  const dateA = getCommentDate(a)?.getTime() ?? -Infinity
  const dateB = getCommentDate(b)?.getTime() ?? -Infinity
  return (
    dateB - dateA ||
    a.pageIndex - b.pageIndex ||
    b.rect[3] - a.rect[3] ||
    a.rect[0] - b.rect[0] ||
    b.rect[1] - a.rect[1] ||
    a.rect[2] - b.rect[2] ||
    (a.id ?? '').localeCompare(b.id ?? '')
  )
}

function hasText({ contentsObj, richText }: CommentData) {
  return !!(contentsObj?.str || richText?.str)
}

/** The id the list knows the comment by. Editors report it, saved annotations don't. */
function getCommentId(target: CommentTarget, { id }: CommentData) {
  return id ?? getAnnotationElement(target)?.dataset.annotationId
}

/**
 * PDF.js supports comments on annotations, but their dialog, popup and list are part of the
 * full PDF.js viewer only. This provides the same contract as its CommentManager, the UI is
 * built from OpenCloud components (see PdfCommentPopup and PdfCommentsDrop).
 */
export function usePdfComments({
  isReadOnly,
  onChange,
  getUiManager,
  getAnnotationComment,
  goToXY
}: {
  /** Comments can still be read, but not changed. */
  isReadOnly: MaybeRefOrGetter<boolean>
  onChange: () => void
  getUiManager: () => AnnotationEditorUIManager | undefined
  /** The comment of a saved annotation, PDF.js has no editors for them without a tool. */
  getAnnotationComment: (pageIndex: number, id: string) => Promise<CommentTarget | undefined>
  goToXY: (pageNumber: number, x: number, y: number) => void
}) {
  const { $gettext } = useGettext()
  const { dispatchModal } = useModals()

  // All comments of the document while PDF.js' comments tool is active.
  const comments = shallowRef<CommentData[]>()
  const selectedCommentId = ref<string>()
  const popup = shallowRef<CommentPopup>()

  function setComments(list: CommentData[] | undefined) {
    comments.value = list?.filter(hasText).sort(compareComments)
  }

  function hidePopup() {
    unref(popup)?.target.setCommentButtonStates({ selected: false, hasPopup: false })
    popup.value = undefined
    selectedCommentId.value = undefined
  }

  /**
   * PDF.js removes the layers of pages far away from the visible ones, popups on them go away
   * as well, otherwise they would keep hovering of other comments from showing previews.
   */
  function hidePopupOfRemovedPage() {
    if (unref(popup) && !unref(popup).target.elementBeforePopup.isConnected) {
      hidePopup()
    }
  }

  /** Closes the popup and gives the focus back to the comment's button. */
  function closePopup() {
    const target = unref(popup)?.target
    hidePopup()
    target?.focusCommentButton()
  }

  /** Same semantics as `toggle()` of the PDF.js viewer's popup. */
  function togglePopup(
    target: CommentTarget | null,
    isSelected: boolean,
    visibility?: boolean,
    isEditable = true
  ) {
    hidePopupOfRemovedPage()
    const current = unref(popup)
    if (!target) {
      hidePopup()
      return
    }
    if (isSelected) {
      visibility ??= current?.target === target ? !current.isSelected : true
    } else {
      // Hovering doesn't replace a popup opened by clicking.
      if (current?.isSelected) {
        return
      }
      visibility ??= !current
    }
    if (!visibility) {
      hidePopup()
      return
    }
    if (current && current.target !== target) {
      current.target.setCommentButtonStates({ selected: false, hasPopup: false })
    }
    target.setCommentButtonStates({ selected: isSelected, hasPopup: true })
    const data = target.getData()
    popup.value = {
      target,
      data,
      isSelected,
      // PDF.js offers to edit comments of other annotations also in read-only files.
      isEditable: isEditable && !toValue(isReadOnly)
    }
    if (isSelected) {
      selectedCommentId.value = getCommentId(target, data)
    }
  }

  function editPopupComment() {
    const { target } = unref(popup)
    hidePopup()
    target.editComment({ height: 0 })
  }

  function deletePopupComment() {
    const { target } = unref(popup)
    const savedData = target.comment as { text?: string } | null
    const uiManager = getEditorUiManager(target)
    hidePopup()
    // Editors delete with undo, comments of other annotations are just emptied.
    if (savedData?.text && uiManager) {
      uiManager.deleteComment(target as never, savedData)
    } else {
      target.comment = null
    }
    target.focus?.()
    onChange()
  }

  function showDialog(uiManager: AnnotationEditorUIManager | null, target: CommentTarget) {
    const comment = target.getData().contentsObj?.str ?? ''
    // `uiManager` is missing for comments of annotations that can't be edited.
    const resume = uiManager ? pauseEditShortcuts(uiManager) : () => {}
    dispatchModal({
      elementClass: 'pdf-viewer-comment-modal',
      title: comment ? $gettext('Edit comment') : $gettext('Add comment'),
      confirmText: comment ? $gettext('Save') : $gettext('Add'),
      confirmDisabled: true,
      focusTrapInitial: '.pdf-viewer-comment-input textarea',
      customComponent: markRaw(PdfCommentModal),
      customComponentAttrs: () => ({
        comment,
        onSave: (text: string) => {
          target.comment = text
          resume()
          target.focusCommentButton()
          onChange()
        }
      }),
      onCancel: () => {
        resume()
        target.focusCommentButton()
      }
    })
  }

  /** Shows a comment of the list on its page and opens it. */
  async function openComment({ id, pageIndex, rect }: CommentData) {
    hidePopup()
    const uiManager = getUiManager()
    const isRendered = uiManager?.waitForEditorsRendered(pageIndex + 1)
    goToXY(pageIndex + 1, rect[0], rect[3])
    if (!id) {
      return
    }
    selectedCommentId.value = id
    await isRendered
    // Finds editors only, e.g. while a tool is active.
    uiManager?.selectComment(pageIndex, id)
    if (!unref(popup)) {
      const target = await getAnnotationComment(pageIndex, id)
      if (target) {
        togglePopup(target, true)
      }
    }
  }

  function updateComment(annotation: CommentData) {
    const list = unref(comments)
    if (list) {
      setComments([...list.filter(({ id }) => id !== annotation.id), annotation])
    }
  }

  const commentManager = {
    // PDF.js points the `aria-controls` of comment buttons at the dialog. Ours is a modal that
    // only exists while open, so it gets a stand-in.
    dialogElement: document.createElement('div'),
    setSidebarUiManager() {},
    showSidebar: setComments,
    hideSidebar() {
      setComments(undefined)
    },
    updateComment,
    removeComments(ids: string[]) {
      const list = unref(comments)
      if (list) {
        setComments(list.filter(({ id }) => !ids.includes(id)))
      }
    },
    toggleCommentPopup: togglePopup,
    destroyPopup: hidePopup,
    updatePopupColor(target: CommentTarget) {
      const current = unref(popup)
      if (current?.target === target) {
        popup.value = { ...current, data: target.getData() }
      }
    },
    showDialog,
    // The background of PDF.js' comment buttons, same as in the PDF.js viewer.
    makeCommentColor(color: number[], opacity?: number) {
      return findContrastColor(
        applyOpacity(color, opacity ?? 1),
        CSSConstants.commentForegroundColor
      ) as string
    },
    destroy() {
      hidePopup()
      setComments(undefined)
    }
  }

  return {
    commentManager,
    comments,
    selectedCommentId,
    popup,
    openComment,
    closePopup,
    hidePopup,
    editPopupComment,
    deletePopupComment
  }
}
