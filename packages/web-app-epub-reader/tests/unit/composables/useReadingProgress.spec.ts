import { Location } from 'epubjs'
import { flushPromises } from '@vue/test-utils'
import { nextTick, shallowRef, unref } from 'vue'
import { useReadingProgress } from '../../../src/composables/useReadingProgress'
import { createBookMock, createLocation, mountComposable } from '../mocks'

function setup() {
  const bookMock = createBookMock()
  const book = shallowRef(bookMock as any)
  const rendition = shallowRef(bookMock.rendition as any)
  const location = shallowRef<Location | undefined>()
  const { result } = mountComposable(() => useReadingProgress({ book, rendition, location }))
  return { result, book, rendition, location, bookMock }
}

describe('useReadingProgress', () => {
  it('generates the locations once the first page is displayed', async () => {
    const { result, location, bookMock } = await setup()
    expect(bookMock.locations.generate).not.toHaveBeenCalled()

    location.value = createLocation()
    await nextTick()
    expect(bookMock.locations.generate).toHaveBeenCalledWith(3000)
    await flushPromises()

    expect(unref(result.hasGlobalLocations)).toBe(true)
    expect(bookMock.rendition.reportLocation).toHaveBeenCalled()

    location.value = createLocation({ cfi: 'next' })
    await nextTick()
    expect(bookMock.locations.generate).toHaveBeenCalledTimes(1)
  })

  it('reports the progress from the location once the locations exist', async () => {
    const { result, location } = await setup()

    location.value = createLocation({ percentage: 0.25 })
    await nextTick()
    expect(unref(result.readingProgressPercent)).toBeNull()
    await flushPromises()

    location.value = createLocation({ percentage: 0.25 })
    await nextTick()
    expect(unref(result.readingProgressPercent)).toBe(25)

    location.value = createLocation({ percentage: undefined })
    await nextTick()
    expect(unref(result.readingProgressPercent)).toBeNull()
  })

  it('stays unavailable when the locations cannot be generated', async () => {
    const { result, location, bookMock } = await setup()
    bookMock.locations.generate.mockRejectedValue(new Error('broken'))

    location.value = createLocation({ percentage: 0.5 })
    await flushPromises()

    expect(unref(result.hasGlobalLocations)).toBe(false)
    expect(unref(result.readingProgressPercent)).toBeNull()
  })

  it('resets when the book changes', async () => {
    const { result, book, location } = await setup()
    location.value = createLocation({ percentage: 0.5 })
    await flushPromises()
    location.value = createLocation({ percentage: 0.5 })
    await nextTick()
    expect(unref(result.readingProgressPercent)).toBe(50)

    book.value = createBookMock() as any
    await nextTick()

    expect(unref(result.hasGlobalLocations)).toBe(false)
    expect(unref(result.readingProgressPercent)).toBeNull()
  })

  it('drops a pending seek when the book changes', async () => {
    const { result, book, location, bookMock } = setup()
    location.value = createLocation()
    await flushPromises()
    let resolveDisplay: () => void = () => {}
    bookMock.rendition.display.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDisplay = resolve
        })
    )
    result.seek(10)
    result.seek(20)

    const nextBook = createBookMock()
    book.value = nextBook as any
    await nextTick()
    resolveDisplay()
    await flushPromises()

    expect(bookMock.rendition.display).toHaveBeenCalledTimes(1)
    expect(nextBook.rendition.display).not.toHaveBeenCalled()
  })

  it('ignores seeks before the locations exist', async () => {
    const { result, bookMock } = await setup()

    await result.seek(50)

    expect(bookMock.rendition.display).not.toHaveBeenCalled()
  })

  it('seeks to the location of a percentage', async () => {
    const { result, location, bookMock } = await setup()
    location.value = createLocation()
    await flushPromises()

    await result.seek(35)
    await result.seek(120)

    expect(bookMock.rendition.display).toHaveBeenCalledWith('cfi-0.35')
    expect(bookMock.rendition.display).toHaveBeenLastCalledWith('cfi-1')
  })

  it('renders only the latest seek target while a render is in flight', async () => {
    const { result, location, bookMock } = await setup()
    location.value = createLocation()
    await flushPromises()
    let resolveDisplay: () => void = () => {}
    bookMock.rendition.display.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDisplay = resolve
        })
    )

    result.seek(10)
    result.seek(20)
    result.seek(30)
    expect(bookMock.rendition.display).toHaveBeenCalledTimes(1)
    expect(bookMock.rendition.display).toHaveBeenCalledWith('cfi-0.1')

    resolveDisplay()
    await flushPromises()

    expect(bookMock.rendition.display).toHaveBeenCalledTimes(2)
    expect(bookMock.rendition.display).toHaveBeenLastCalledWith('cfi-0.3')
    resolveDisplay()
  })
})
