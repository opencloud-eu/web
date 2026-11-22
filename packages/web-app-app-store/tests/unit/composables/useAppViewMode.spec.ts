import { nextTick, unref } from 'vue'
import { useAppViewMode } from '../../../src/composables'

const storageKey = 'oc-options_app-store_view-mode'

describe('useAppViewMode', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('defaults to tiles', () => {
    const { viewMode } = useAppViewMode()
    expect(unref(viewMode)).toBe('tiles')
  })
  it('uses the stored view mode', () => {
    window.localStorage.setItem(storageKey, 'list')
    const { viewMode } = useAppViewMode()
    expect(unref(viewMode)).toBe('list')
  })
  it('falls back to tiles for an invalid stored view mode', () => {
    window.localStorage.setItem(storageKey, 'invalid')
    const { viewMode } = useAppViewMode()
    expect(unref(viewMode)).toBe('tiles')
  })
  it('stores the view mode', async () => {
    const { viewMode } = useAppViewMode()
    viewMode.value = 'list'
    await nextTick()

    expect(unref(viewMode)).toBe('list')
    expect(window.localStorage.getItem(storageKey)).toBe('list')
  })
})
