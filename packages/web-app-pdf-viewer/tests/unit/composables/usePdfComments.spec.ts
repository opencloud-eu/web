import { ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useModals, type Modal } from '@opencloud-eu/web-pkg'
import type { AnnotationEditorUIManager } from 'pdfjs-dist'
import { usePdfComments } from '../../../src/composables/usePdfComments'
import type { CommentData, CommentTarget } from '../../../src/helpers/comments'
import { getMissingMembers } from '../pdfjsSource'

function comment(id: string, date: string, data: Partial<CommentData> = {}): CommentData {
  return {
    id,
    pageIndex: 0,
    rect: [0, 0, 10, 10],
    modificationDate: date,
    contentsObj: { str: `Comment ${id}` },
    ...data
  }
}

function createTarget(data: Partial<CommentData> = {}) {
  // On a page, PDF.js removes the button with the page's layers.
  const button = document.createElement('button')
  document.body.append(button)
  return {
    comment: null as unknown,
    elementBeforePopup: button,
    commentPopupPosition: [0.1, 0.1],
    commentButtonWidth: 0.02,
    parentBoundingClientRect: new DOMRect(0, 0, 1000, 1000),
    getData: () => comment('a', 'D:20260101', data),
    hasDefaultPopupPosition: () => true,
    setCommentButtonStates: vi.fn(),
    editComment: vi.fn(),
    focusCommentButton: vi.fn(),
    focus: vi.fn()
  } satisfies CommentTarget
}

function setup({ isReadOnly = false } = {}) {
  const onChange = vi.fn()
  const uiManager = mock<AnnotationEditorUIManager>()
  uiManager.waitForEditorsRendered.mockResolvedValue(undefined)
  const goToXY = vi.fn()
  const getAnnotationComment = vi.fn().mockResolvedValue(null)
  let comments: ReturnType<typeof usePdfComments>
  let modals: ReturnType<typeof useModals>
  getComposableWrapper(() => {
    modals = useModals()
    comments = usePdfComments({
      isReadOnly: ref(isReadOnly),
      onChange,
      getUiManager: () => uiManager,
      getAnnotationComment,
      goToXY
    })
  })
  function lastModal() {
    return vi.mocked(modals.dispatchModal).mock.calls.at(-1)[0] as Modal
  }
  return {
    comments,
    onChange,
    uiManager,
    goToXY,
    getAnnotationComment,
    lastModal
  }
}

describe('usePdfComments', () => {
  // PDF.js does without what is missing, e.g. after an update.
  it('provides everything PDF.js uses of the comment manager', () => {
    const { comments } = setup()
    expect(getMissingMembers('commentManager', comments.commentManager)).toEqual([])
  })

  describe('list', () => {
    it('lists comments with text, newest first, while the comments tool is active', () => {
      const { comments } = setup()
      const { commentManager } = comments
      commentManager.showSidebar([
        comment('old', 'D:20250101'),
        comment('new', 'D:20260101'),
        comment('empty', 'D:20260201', { contentsObj: { str: '' } })
      ])
      expect(comments.comments.value.map(({ id }) => id)).toEqual(['new', 'old'])
      commentManager.hideSidebar()
      expect(comments.comments.value).toBeUndefined()
    })

    it('orders like PDF.js: last changed first, then by page and position', () => {
      const { comments } = setup()
      comments.commentManager.showSidebar([
        comment('page2', 'D:20260101', { pageIndex: 1 }),
        comment('lower', 'D:20260101', { rect: [0, 0, 10, 5] }),
        comment('upper', 'D:20260101', { rect: [0, 0, 10, 50] }),
        comment('newest', 'D:20260301')
      ])
      expect(comments.comments.value.map(({ id }) => id)).toEqual([
        'newest',
        'upper',
        'lower',
        'page2'
      ])
    })

    it('keeps the list up to date', () => {
      const { comments } = setup()
      const { commentManager } = comments
      commentManager.showSidebar([comment('a', 'D:20250101')])
      commentManager.updateComment(comment('b', 'D:20260101'))
      commentManager.updateComment(comment('a', 'D:20270101', { contentsObj: { str: 'Edited' } }))
      expect(comments.comments.value.map(({ id }) => id)).toEqual(['a', 'b'])
      expect(comments.comments.value[0].contentsObj.str).toBe('Edited')
      commentManager.removeComments(['a'])
      expect(comments.comments.value.map(({ id }) => id)).toEqual(['b'])
    })

    it('ignores updates while the list is not shown', () => {
      const { comments } = setup()
      comments.commentManager.updateComment(comment('a', 'D:20250101'))
      expect(comments.comments.value).toBeUndefined()
    })

    it('opens a comment of the list on its page', async () => {
      const { comments, uiManager, goToXY } = setup()
      await comments.openComment(comment('a', 'D:20250101', { pageIndex: 2, rect: [5, 0, 0, 7] }))
      expect(goToXY).toHaveBeenCalledWith(3, 5, 7)
      expect(uiManager.selectComment).toHaveBeenCalledWith(2, 'a')
      expect(comments.selectedCommentId.value).toBe('a')
    })

    // Without a tool, PDF.js has no editors for saved annotations.
    it('opens comments of saved annotations from the list', async () => {
      const { comments, getAnnotationComment } = setup()
      // A saved annotation's comment knows no id, its button follows the annotation.
      const target = {
        ...createTarget(),
        getData: () => comment('x', '', { id: undefined })
      }
      const annotation = document.createElement('section')
      annotation.dataset.annotationId = 'a'
      target.elementBeforePopup.before(annotation)
      getAnnotationComment.mockResolvedValue(target)
      await comments.openComment(comment('a', 'D:20250101', { pageIndex: 1 }))
      expect(getAnnotationComment).toHaveBeenCalledWith(1, 'a')
      expect(comments.popup.value).toEqual(expect.objectContaining({ target, isSelected: true }))
    })
  })

  describe('popup', () => {
    it('shows a preview on hover and opens it on click', () => {
      const { comments } = setup()
      const target = createTarget()
      comments.commentManager.toggleCommentPopup(target, false)
      expect(comments.popup.value).toEqual(expect.objectContaining({ isSelected: false }))
      comments.commentManager.toggleCommentPopup(target, true)
      expect(comments.popup.value).toEqual(expect.objectContaining({ isSelected: true }))
      expect(target.setCommentButtonStates).toHaveBeenLastCalledWith({
        selected: true,
        hasPopup: true
      })
      // Hovering away keeps the opened popup.
      comments.commentManager.toggleCommentPopup(target, false, false)
      expect(comments.popup.value).toBeDefined()
      // Clicking again closes it.
      comments.commentManager.toggleCommentPopup(target, true)
      expect(comments.popup.value).toBeUndefined()
    })

    // Like in the PDF.js viewer, also for annotations without an editor, e.g. underlines.
    it.each([
      [false, true],
      [true, false]
    ])('offers changes unless the file is read-only (read-only: %s)', (isReadOnly, isEditable) => {
      const { comments } = setup({ isReadOnly })
      comments.commentManager.toggleCommentPopup(createTarget(), true, undefined, true)
      expect(comments.popup.value.isEditable).toBe(isEditable)
    })

    it('closes popups of pages PDF.js removed, previews work again', () => {
      const { comments } = setup()
      const removed = createTarget()
      comments.commentManager.toggleCommentPopup(removed, true)
      removed.elementBeforePopup.remove()
      const other = createTarget()
      comments.commentManager.toggleCommentPopup(other, false)
      expect(comments.popup.value.target).toBe(other)
    })

    it('gives the focus back to the comment button when closed', () => {
      const { comments } = setup()
      const target = createTarget()
      comments.commentManager.toggleCommentPopup(target, true)
      comments.closePopup()
      expect(comments.popup.value).toBeUndefined()
      expect(target.focusCommentButton).toHaveBeenCalled()
    })

    it('edits the comment in the dialog', () => {
      const { comments } = setup()
      const target = createTarget()
      comments.commentManager.toggleCommentPopup(target, true)
      comments.editPopupComment()
      expect(comments.popup.value).toBeUndefined()
      expect(target.editComment).toHaveBeenCalled()
    })

    it('deletes comments of editors with undo, others directly', () => {
      const { comments, onChange } = setup()
      const deleteComment = vi.fn()
      const editor = { ...createTarget(), comment: { text: 'Hi' }, _uiManager: { deleteComment } }
      comments.commentManager.toggleCommentPopup(editor, true)
      comments.deletePopupComment()
      expect(deleteComment).toHaveBeenCalledWith(editor, { text: 'Hi' })

      const element = { ...createTarget(), comment: 'Hi' as unknown }
      comments.commentManager.toggleCommentPopup(element, true)
      comments.deletePopupComment()
      expect(element.comment).toBeNull()
      expect(onChange).toHaveBeenCalledTimes(2)
    })
  })

  describe('dialog', () => {
    it.each([
      ['', 'Add comment'],
      ['Old', 'Edit comment']
    ])('writes the comment (existing: "%s")', (existing, title) => {
      const { comments, onChange, uiManager, lastModal } = setup()
      const target = createTarget({ contentsObj: { str: existing } })
      comments.commentManager.showDialog(uiManager, target)
      const modal = lastModal()
      expect(modal.title).toBe(title)
      // PDF.js' shortcuts (e.g. Backspace deletes) stay out of the dialog.
      expect(uiManager.removeEditListeners).toHaveBeenCalled()
      const { onSave } = modal.customComponentAttrs() as { onSave: (text: string) => void }
      onSave('New')
      expect(target.comment).toBe('New')
      expect(uiManager.addEditListeners).toHaveBeenCalled()
      expect(onChange).toHaveBeenCalled()
    })

    it('resumes PDF.js when cancelled', () => {
      const { comments, uiManager, lastModal } = setup()
      comments.commentManager.showDialog(uiManager, createTarget())
      lastModal().onCancel()
      expect(uiManager.addEditListeners).toHaveBeenCalled()
    })
  })
})
