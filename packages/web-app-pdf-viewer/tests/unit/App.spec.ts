import App from '../../src/App.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { Resource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'

const FIREFOX_UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0'
const CHROME_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const FIREFOX_IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15'

const url = 'blob:https://example.com/abc'

// `userAgent` is an inherited accessor on the Navigator prototype, so setting it creates a
// shadowing own property. Capture the original descriptor (if any) to fully restore afterwards.
const originalUserAgentDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent')

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: userAgent,
    configurable: true
  })
}

afterEach(() => {
  if (originalUserAgentDescriptor) {
    Object.defineProperty(window.navigator, 'userAgent', originalUserAgentDescriptor)
  } else {
    Reflect.deleteProperty(window.navigator, 'userAgent')
  }
})

function getWrapper({ resource = mock<Resource>({ name: 'doc.pdf' }) } = {}) {
  return shallowMount(App, {
    props: { url, resource },
    global: {
      plugins: [...defaultPlugins()]
    }
  })
}

describe('PDF viewer App', () => {
  describe('in Firefox', () => {
    it('renders an iframe pointing at the blob url', () => {
      setUserAgent(FIREFOX_UA)
      const wrapper = getWrapper()

      const iframe = wrapper.find('iframe.pdf-viewer')
      expect(iframe.exists()).toBe(true)
      expect(iframe.attributes('src')).toBe(url)
      expect(iframe.attributes('title')).toBe('doc.pdf')
      expect(wrapper.find('object').exists()).toBe(false)
    })
  })

  describe.each([
    ['Chrome', CHROME_UA, 'application/pdf'],
    ['Safari', SAFARI_UA, undefined],
    ['Firefox for iOS', FIREFOX_IOS_UA, undefined]
  ])('in %s', (_name, userAgent, expectedType) => {
    it('renders an object with the expected type', () => {
      setUserAgent(userAgent)
      const wrapper = getWrapper()

      const object = wrapper.find('object.pdf-viewer')
      expect(object.exists()).toBe(true)
      expect(object.attributes('data')).toBe(url)
      expect(object.attributes('type')).toBe(expectedType)
      expect(wrapper.find('iframe').exists()).toBe(false)
    })

    it('provides a download fallback inside the object', () => {
      setUserAgent(userAgent)
      const wrapper = getWrapper()

      expect(wrapper.find('.pdf-viewer-fallback p').text()).toBe(
        'This PDF could not be displayed in your browser.'
      )

      const downloadButton = wrapper.find('oc-button-stub')
      expect(downloadButton.exists()).toBe(true)
      expect(downloadButton.attributes('href')).toBe(url)
      expect(downloadButton.attributes('download')).toBe('doc.pdf')
    })
  })
})
