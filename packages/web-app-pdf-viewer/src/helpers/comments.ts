import { PDFDateString, renderRichText } from 'pdfjs-dist'

/** What PDF.js passes around for a comment: an annotation editor or an annotation element. */
export type CommentTarget = {
  comment: unknown
  elementBeforePopup: HTMLElement
  commentPopupPosition: [number, number]
  commentButtonWidth: number
  parentBoundingClientRect: DOMRect
  getData(): CommentData
  hasDefaultPopupPosition(): boolean
  setCommentButtonStates(states: { selected: boolean; hasPopup: boolean }): void
  editComment(options: { height: number }): void
  focusCommentButton(): void
  focus?(): void
}

export type CommentData = {
  /** Missing for comments of saved annotations, see getCommentId. */
  id?: string
  pageIndex: number
  rect: number[]
  color?: number[]
  opacity?: number
  creationDate?: string
  modificationDate?: string
  contentsObj?: { str: string; dir?: string }
  richText?: { str: string; html: unknown }
}

/** The annotation's element, also when PDF.js passes its comment button that comes right after it. */
export function getAnnotationElement({
  elementBeforePopup
}: Pick<CommentTarget, 'elementBeforePopup'>) {
  return elementBeforePopup.classList.contains('annotationCommentButton')
    ? (elementBeforePopup.previousElementSibling as HTMLElement | null)
    : elementBeforePopup
}

/** The plain comment text. Acrobat separates lines with carriage returns. */
export function getCommentText({ contentsObj, richText }: CommentData) {
  return (contentsObj?.str || richText?.str || '').replace(/\r\n?/g, '\n')
}

export function getCommentDate({ modificationDate, creationDate }: CommentData) {
  return PDFDateString.toDateObject(modificationDate || creationDate)
}

/** Renders the comment text into `element`, rich text the way PDF.js does. */
export function renderCommentText({ contentsObj, richText }: CommentData, element: HTMLElement) {
  element.replaceChildren()
  const html =
    richText?.str && (!contentsObj?.str || richText.str === contentsObj.str)
      ? richText.html
      : contentsObj?.str
  if (html) {
    renderRichText({ html, dir: contentsObj?.dir || 'auto', className: 'richText' }, element)
  }
}

/** The annotation color as CSS color. */
export function getCommentColor({ color }: CommentData) {
  return color ? `rgb(${Array.from(color).join(', ')})` : undefined
}

/**
 * Where the popup of a comment goes on its page (in percent), like in the PDF.js viewer: next to
 * the comment button, but left of it if there is no room on the right of the page, or the list
 * of comments covers that side. Popups placed by PDF.js or the document keep their place, unless
 * the list covers them, which is ours. Always within the viewer.
 */
export function getCommentPopupPosition(
  target: Pick<
    CommentTarget,
    | 'commentPopupPosition'
    | 'commentButtonWidth'
    | 'parentBoundingClientRect'
    | 'hasDefaultPopupPosition'
  >,
  popupWidth: number,
  listRect?: DOMRect,
  viewerRect?: DOMRect
) {
  const [initialX, y] = target.commentPopupPosition
  const parent = target.parentBoundingClientRect
  const widthRatio = popupWidth / parent.width
  let x = initialX
  function coversList() {
    const left = parent.x + x * parent.width
    return (
      !!listRect &&
      left + popupWidth > listRect.left &&
      left < listRect.right &&
      parent.y + y * parent.height < listRect.bottom
    )
  }
  const isDefault = target.hasDefaultPopupPosition()
  if (isDefault && x + widthRatio > 1) {
    x -= widthRatio - target.commentButtonWidth
  }
  if (coversList()) {
    x = (listRect.left - parent.x) / parent.width - widthRatio - 0.01
  } else if (!isDefault) {
    return { left: `${100 * x}%`, top: `${100 * y}%` }
  }
  x = Math.max(x, ((viewerRect?.left ?? 0) - parent.x) / parent.width + 0.01)
  return { left: `${100 * x}%`, top: `${100 * y}%` }
}
