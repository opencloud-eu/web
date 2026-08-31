import { config } from '@vue/test-utils'

class IntersectionObserverMock {
  disconnect() {}
  observe() {}
  takeRecords() {}
  unobserve() {}
}

vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock)

vi.stubGlobal('define', vi.fn())

// never stub the highlighting primitive, otherwise text assertions lose the highlighted text
config.global.stubs = { ...config.global.stubs, FilterHighlight: false }
