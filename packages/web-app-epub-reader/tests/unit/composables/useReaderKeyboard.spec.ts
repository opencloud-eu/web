import { shallowRef } from 'vue'
import { useReaderKeyboard } from '../../../src/composables/useReaderKeyboard'
import { createRenditionMock, mountComposable } from '../mocks'

function setup() {
  const rendition = shallowRef(createRenditionMock() as any)
  const handlers = { onPrevious: vi.fn(), onNext: vi.fn(), onClose: vi.fn() }
  const { wrapper } = mountComposable(() => useReaderKeyboard({ rendition, ...handlers }))
  return { rendition, handlers, wrapper }
}

describe('useReaderKeyboard', () => {
  it('turns pages with the arrow keys on the document', () => {
    const { handlers, wrapper } = setup()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))

    expect(handlers.onPrevious).toHaveBeenCalledTimes(1)
    expect(handlers.onNext).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('handles the keys forwarded from inside the book', () => {
    const { rendition, handlers, wrapper } = setup()
    rendition.value.emit('keydown', new KeyboardEvent('keydown', { key: 'Escape' }))
    rendition.value.emit('keydown', new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    rendition.value.emit('keydown', new KeyboardEvent('keydown', { key: 'ArrowRight' }))

    expect(handlers.onClose).toHaveBeenCalledTimes(1)
    expect(handlers.onPrevious).toHaveBeenCalledTimes(1)
    expect(handlers.onNext).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
