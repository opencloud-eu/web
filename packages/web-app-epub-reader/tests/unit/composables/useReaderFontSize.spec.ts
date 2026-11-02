import { nextTick, shallowRef, unref } from 'vue'
import { useReaderFontSize } from '../../../src/composables/useReaderFontSize'
import { createRenditionMock, mountComposable } from '../mocks'

function setup(storedPercentage?: number) {
  window.localStorage.clear()
  if (storedPercentage) {
    window.localStorage.setItem(
      'oc_epubReader',
      JSON.stringify({ fontSizePercentage: storedPercentage })
    )
  }
  const rendition = shallowRef(createRenditionMock() as any)
  const { result } = mountComposable(() => useReaderFontSize(rendition))
  return { result, rendition }
}

describe('useReaderFontSize', () => {
  it('starts with the default size and applies it to the rendition', () => {
    const { result, rendition } = setup()

    expect(unref(result.fontSizePercentage)).toBe(100)
    expect(unref(rendition).themes.fontSize).toHaveBeenCalledWith('100%')
  })

  it('restores the stored size', () => {
    const { result, rendition } = setup(120)

    expect(unref(result.fontSizePercentage)).toBe(120)
    expect(unref(rendition).themes.fontSize).toHaveBeenCalledWith('120%')
  })

  it('changes the size in steps within the limits and stores it', async () => {
    const { result, rendition } = setup(140)

    result.increase()
    await nextTick()
    expect(unref(result.fontSizePercentage)).toBe(150)
    expect(unref(result.canIncrease)).toBe(false)
    expect(unref(rendition).themes.fontSize).toHaveBeenLastCalledWith('150%')
    expect(JSON.parse(window.localStorage.getItem('oc_epubReader'))).toEqual({
      fontSizePercentage: 150
    })

    result.increase()
    expect(unref(result.fontSizePercentage)).toBe(150)

    result.reset()
    expect(unref(result.fontSizePercentage)).toBe(100)

    for (let i = 0; i < 10; i++) {
      result.decrease()
    }
    expect(unref(result.fontSizePercentage)).toBe(50)
    expect(unref(result.canDecrease)).toBe(false)
  })

  it('applies the size to a new rendition', async () => {
    const { rendition } = setup(80)
    const next = createRenditionMock()

    rendition.value = next
    await nextTick()

    expect(next.themes.fontSize).toHaveBeenCalledWith('80%')
  })
})
