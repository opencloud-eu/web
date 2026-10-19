import { nextTick, reactive, shallowRef } from 'vue'
import { useThemeStore } from '@opencloud-eu/web-pkg'
import { useReaderTheme } from '../../../src/composables/useReaderTheme'
import { createRenditionMock, mountComposable } from '../mocks'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useThemeStore: vi.fn()
}))

const inverted = expect.objectContaining({ filter: 'invert(1) hue-rotate(180deg)' })
const plain = expect.objectContaining({ filter: 'none' })

function setup(isDark: boolean) {
  const themeStore = reactive({ currentTheme: { isDark } })
  vi.mocked(useThemeStore).mockReturnValue(themeStore as any)
  const rendition = shallowRef(createRenditionMock() as any)
  mountComposable(() => useReaderTheme(rendition))
  return { rendition, themeStore }
}

describe('useReaderTheme', () => {
  it('inverts the page and the images in the dark theme', () => {
    const { rendition } = setup(true)

    expect(rendition.value.themes.register).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ html: inverted, img: inverted })
    )
  })

  it('renders the page plain in the light theme', () => {
    const { rendition } = setup(false)

    expect(rendition.value.themes.register).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ html: plain, img: plain })
    )
  })

  it('follows theme changes in both directions while reading', async () => {
    const { rendition, themeStore } = setup(true)

    themeStore.currentTheme = { isDark: false }
    await nextTick()
    expect(rendition.value.themes.register).toHaveBeenLastCalledWith(
      'default',
      expect.objectContaining({ html: plain })
    )

    themeStore.currentTheme = { isDark: true }
    await nextTick()
    expect(rendition.value.themes.register).toHaveBeenLastCalledWith(
      'default',
      expect.objectContaining({ html: inverted })
    )
  })

  it('applies the theme to a new rendition', async () => {
    const { rendition } = setup(true)
    const next = createRenditionMock()

    rendition.value = next
    await nextTick()

    expect(next.themes.register).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ html: inverted })
    )
  })
})
