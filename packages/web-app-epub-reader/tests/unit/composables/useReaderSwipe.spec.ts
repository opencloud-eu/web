import { shallowRef } from 'vue'
import { useReaderSwipe } from '../../../src/composables/useReaderSwipe'
import { createRenditionMock, mountComposable } from '../mocks'

function touchEvent(x: number, y: number, timeStamp: number) {
  return { changedTouches: [{ clientX: x, clientY: y }], timeStamp } as unknown as TouchEvent
}

function setup() {
  const rendition = shallowRef(createRenditionMock() as any)
  const handlers = { onSwipeLeft: vi.fn(), onSwipeRight: vi.fn() }
  mountComposable(() => useReaderSwipe({ rendition, ...handlers }))
  function swipe(fromX: number, toX: number, fromY = 100, toY = 100, duration = 200) {
    rendition.value.emit('touchstart', touchEvent(fromX, fromY, 1000))
    rendition.value.emit('touchend', touchEvent(toX, toY, 1000 + duration))
  }
  return { handlers, swipe }
}

describe('useReaderSwipe', () => {
  it('turns pages on horizontal swipes inside the book', () => {
    const { handlers, swipe } = setup()

    swipe(300, 100)
    expect(handlers.onSwipeLeft).toHaveBeenCalledTimes(1)

    swipe(100, 300)
    expect(handlers.onSwipeRight).toHaveBeenCalledTimes(1)
  })

  it('ignores short, slow and vertical gestures', () => {
    const { handlers, swipe } = setup()

    swipe(300, 270)
    swipe(300, 100, 100, 100, 2000)
    swipe(300, 100, 100, 400)

    expect(handlers.onSwipeLeft).not.toHaveBeenCalled()
    expect(handlers.onSwipeRight).not.toHaveBeenCalled()
  })
})
