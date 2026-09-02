import { nextTick } from 'vue'
import { createWrapper, createAppBar } from './spec'
import { useFileListHeaderPosition } from '../../../../src/composables/fileListHeaderPosition'

const resizeCallbacks: Array<() => void> = []

vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vueuse/core')>()),
  useResizeObserver: vi.fn((_target, callback: () => void) => {
    resizeCallbacks.push(callback)
    return { stop: vi.fn() }
  })
}))

describe('useFileListHeaderPosition', () => {
  beforeEach(() => {
    resizeCallbacks.length = 0
    document.body.innerHTML = ''
  })

  it('should be valid', () => {
    const wrapper = createWrapper()

    expect(useFileListHeaderPosition).toBeDefined()
    expect(wrapper.vm.y).toBe(0)
    expect(wrapper.vm.refresh).toBeInstanceOf(Function)

    wrapper.unmount()
  })

  it('should keep y at 0 if no app bar exists', async () => {
    const wrapper = createWrapper()

    await nextTick()
    expect(wrapper.vm.y).toBe(0)

    wrapper.unmount()
  })

  it('should calculate y on app bar resize', async () => {
    const appBar = createAppBar()
    appBar.createElement()

    const wrapper = createWrapper()

    for (const height of [50, 100, 150, 200, 201]) {
      appBar.resize(height)
      resizeCallbacks.forEach((callback) => callback())
      await nextTick()
      expect(wrapper.vm.y).toBe(height)
    }

    wrapper.unmount()
  })

  it('should observe the app bar element', () => {
    const appBar = createAppBar()
    appBar.createElement()

    const wrapper = createWrapper()

    expect(resizeCallbacks.length).toBe(1)

    wrapper.unmount()
  })

  it('should calculate y on manual refresh', async () => {
    const appBar = createAppBar()
    appBar.createElement()

    const wrapper = createWrapper()

    for (const height of [50, 100, 150, 200, 201]) {
      appBar.resize(height)
      wrapper.vm.refresh()
      await nextTick()
      expect(wrapper.vm.y).toBe(height)
    }

    wrapper.unmount()
  })
})
