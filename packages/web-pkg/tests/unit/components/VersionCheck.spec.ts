import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { nextTick } from 'vue'
import { VersionCheck } from '../../../src'

describe('VersionCheck component', () => {
  it('shows loading spinner while loading', async () => {
    const { wrapper } = getWrapper({ isLoading: true })
    await nextTick()
    expect(wrapper.find('.version-check-loading').exists()).toBe(true)
    expect(wrapper.find('.version-check-no-updates').exists()).toBe(false)
    expect(wrapper.find('.version-check-update').exists()).toBe(false)
  })
  it('shows no update available, when up to date', async () => {
    const { wrapper } = getWrapper()
    await nextTick()
    expect(wrapper.find('.version-check-no-updates').exists()).toBe(true)
    expect(wrapper.find('.version-check-update').exists()).toBe(false)
    expect(wrapper.find('.version-check-loading').exists()).toBe(false)
  })
  it('shows update available, when not up to date', async () => {
    const { wrapper } = getWrapper({ productversion: '3.4.0' })
    await nextTick()
    expect(wrapper.find('.version-check-update').exists()).toBe(true)
    expect(wrapper.find('.version-check-no-updates').exists()).toBe(false)
    expect(wrapper.find('.version-check-loading').exists()).toBe(false)
  })
})

function getWrapper({
  productversion = '3.5.0',
  hasError = false,
  isLoading = false
}: {
  productversion?: string
  hasError?: boolean
  isLoading?: boolean
} = {}) {
  const mocks = { ...defaultComponentMocks() }

  return {
    wrapper: mount(VersionCheck, {
      global: {
        mocks,
        provide: mocks,
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              capabilityState: {
                capabilities: { core: { status: { productversion }, 'check-for-updates': true } }
              },
              updatesState: {
                isLoading,
                hasError,
                updates: {
                  channels: {
                    rolling: {
                      current_version: '3.5.0',
                      url: 'https://github.com/opencloud-eu/opencloud/releases/tag/v3.5.0'
                    },
                    stable: {
                      current_version: '2.0.4',
                      url: 'https://github.com/opencloud-eu/opencloud/releases/tag/v2.0.4'
                    },
                    lts: {
                      current_version: '2.0.4',
                      url: 'https://github.com/opencloud-eu/opencloud/releases/tag/v2.0.4'
                    },
                    'lts-2.0': {
                      current_version: '2.0.4',
                      url: 'https://github.com/opencloud-eu/opencloud/releases/tag/v2.0.4'
                    }
                  }
                }
              }
            }
          })
        ]
      }
    })
  }
}
