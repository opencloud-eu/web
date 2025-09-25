import VersionCheck from '../../../src/components/VersionCheck.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  mockAxiosResolve,
  mount
} from '@opencloud-eu/web-test-helpers'

describe('VersionCheck component', () => {
  it('shows loading spinner while loading', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find('.version-check-loading').exists()).toBe(true)
    expect(wrapper.find('.version-check-no-updates').exists()).toBe(false)
    expect(wrapper.find('.version-check-update').exists()).toBe(false)
  })
  it('shows no update available, when up to date', async () => {
    const { wrapper } = getWrapper()
    await (wrapper.vm as any).loadVersionsTask.last
    console.log(wrapper.html())
    expect(wrapper.find('.version-check-no-updates').exists()).toBe(true)
    expect(wrapper.find('.version-check-update').exists()).toBe(false)
    expect(wrapper.find('.version-check-loading').exists()).toBe(false)
  })
  it('shows no update available, when up to date', async () => {
    const { wrapper } = getWrapper({ productversion: '3.4.0' })
    await (wrapper.vm as any).loadVersionsTask.last
    console.log(wrapper.html())
    expect(wrapper.find('.version-check-update').exists()).toBe(true)
    expect(wrapper.find('.version-check-no-updates').exists()).toBe(false)
    expect(wrapper.find('.version-check-loading').exists()).toBe(false)
  })
})

function getWrapper({ productversion = '3.5.0' }: { productversion?: string } = {}) {
  const mocks = { ...defaultComponentMocks() }

  mocks.$clientService.httpUnAuthenticated.get.mockResolvedValue(
    mockAxiosResolve({
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
    })
  )

  return {
    wrapper: mount(VersionCheck, {
      global: {
        mocks,
        provide: mocks,
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              capabilityState: { capabilities: { core: { status: { productversion } } } }
            }
          })
        ]
      }
    })
  }
}
