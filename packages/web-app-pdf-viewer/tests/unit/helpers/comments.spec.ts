import {
  getAnnotationElement,
  getCommentColor,
  getCommentPopupPosition,
  getCommentText,
  type CommentData
} from '../../../src/helpers/comments'

const POPUP_WIDTH = 288

function comment(data: Partial<CommentData> = {}): CommentData {
  return { id: 'a', pageIndex: 0, rect: [0, 0, 10, 10], ...data }
}

function target(x: number, { hasDefaultPosition = true } = {}) {
  return {
    commentPopupPosition: [x, 0.2] as [number, number],
    commentButtonWidth: 0.02,
    parentBoundingClientRect: new DOMRect(0, 0, 1000, 1000),
    hasDefaultPopupPosition: () => hasDefaultPosition
  }
}

function left(position: { left: string }) {
  return parseFloat(position.left)
}

describe('comments', () => {
  describe('getAnnotationElement', () => {
    it('finds the annotation also when PDF.js passes its comment button', () => {
      const annotation = document.createElement('section')
      const button = document.createElement('button')
      button.className = 'annotationCommentButton'
      document.createElement('div').append(annotation, button)
      expect(getAnnotationElement({ elementBeforePopup: button })).toBe(annotation)
      expect(getAnnotationElement({ elementBeforePopup: annotation })).toBe(annotation)
    })
  })

  describe('getCommentText', () => {
    it('prefers the plain text and turns carriage returns of Acrobat into line breaks', () => {
      expect(getCommentText(comment({ contentsObj: { str: 'One\r\nTwo\rThree' } }))).toBe(
        'One\nTwo\nThree'
      )
      expect(getCommentText(comment({ richText: { str: 'Rich', html: {} } }))).toBe('Rich')
      expect(getCommentText(comment())).toBe('')
    })
  })

  describe('getCommentColor', () => {
    it('returns the annotation color as CSS color', () => {
      expect(getCommentColor(comment({ color: [255, 0, 0] }))).toBe('rgb(255, 0, 0)')
      expect(getCommentColor(comment())).toBeUndefined()
    })
  })

  describe('getCommentPopupPosition', () => {
    it('places the popup next to the comment button', () => {
      expect(getCommentPopupPosition(target(0.1), POPUP_WIDTH)).toEqual({
        left: '10%',
        top: '20%'
      })
    })

    it('moves it left of the button without room on the right of the page', () => {
      expect(left(getCommentPopupPosition(target(0.9), POPUP_WIDTH))).toBeCloseTo(63.2)
    })

    it('moves it left of the list of comments if it covers it, within the page', () => {
      const listRect = new DOMRect(300, 0, 300, 500)
      expect(left(getCommentPopupPosition(target(0.1), POPUP_WIDTH, listRect))).toBeCloseTo(1)
      // Also where moving it left of the button leaves it under the list.
      const listRight = new DOMRect(700, 0, 300, 500)
      expect(left(getCommentPopupPosition(target(0.9), POPUP_WIDTH, listRight))).toBeCloseTo(40.2)
    })

    // E.g. on phones, where the page is hardly wider than the popup.
    it('keeps the popup within the viewer', () => {
      const listRect = new DOMRect(300, 0, 300, 500)
      const viewerRect = new DOMRect(50, 0, 1000, 1000)
      expect(
        left(getCommentPopupPosition(target(0.1), POPUP_WIDTH, listRect, viewerRect))
      ).toBeCloseTo(6)
    })

    it('keeps positions that PDF.js does not set by default, e.g. moved popups', () => {
      expect(
        getCommentPopupPosition(target(0.9, { hasDefaultPosition: false }), POPUP_WIDTH)
      ).toEqual({ left: '90%', top: '20%' })
    })

    it('moves such popups left of the list of comments if it covers them', () => {
      const listRect = new DOMRect(700, 0, 300, 500)
      expect(
        left(
          getCommentPopupPosition(target(0.6, { hasDefaultPosition: false }), POPUP_WIDTH, listRect)
        )
      ).toBeCloseTo(40.2)
      // Not when it lies below the list.
      const listAbove = new DOMRect(700, 0, 300, 100)
      expect(
        getCommentPopupPosition(target(0.6, { hasDefaultPosition: false }), POPUP_WIDTH, listAbove)
      ).toEqual({ left: '60%', top: '20%' })
    })
  })
})
