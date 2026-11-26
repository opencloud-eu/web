import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import PdfLoadStatus from '../../../src/components/PdfLoadStatus.vue'

function createWrapper(props: Record<string, boolean>) {
  return mount(PdfLoadStatus, {
    props,
    global: {
      plugins: [...defaultPlugins()],
      stubs: {
        'oc-icon': true,
        NoContentMessage: { template: '<div><slot name="message" /></div>' }
      }
    }
  })
}

describe('PdfLoadStatus', () => {
  it('explains files that can not be opened', () => {
    expect(createWrapper({ hasError: true }).text()).toContain('could not be opened')
  })

  it('shows loading', () => {
    expect(createWrapper({ isLoading: true }).findComponent(AppLoadingSpinner).exists()).toBe(true)
  })
})
