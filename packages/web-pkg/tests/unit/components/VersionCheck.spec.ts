import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { AbilityRule } from '@opencloud-eu/web-client'
import { nextTick } from 'vue'
import { UpdateChannel, VersionCheck } from '../../../src'

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

  describe('critical badge', () => {
    const admin: AbilityRule[] = [{ action: 'read-all', subject: 'Setting' }]

    it.each([
      { productversion: '3.4.0', critical_range: '<3.5.0', expected: true },
      { productversion: '3.5.0', critical_range: '<3.5.0', expected: false },
      { productversion: '6.1.0', critical_range: '1.0.0 - 3.0.0 || 5.0.0 - 7.0.0', expected: true },
      {
        productversion: '4.0.0',
        critical_range: '1.0.0 - 3.0.0 || 5.0.0 - 7.0.0',
        expected: false
      },
      { productversion: '3.4.0+git20250101', critical_range: '<3.5.0', expected: true }
    ])(
      'is $expected for $productversion in "$critical_range"',
      async ({ productversion, critical_range, expected }) => {
        const { wrapper } = getWrapper({ productversion, critical_range, abilities: admin })
        await nextTick()
        expect(wrapper.find('.version-check-critical').exists()).toBe(expected)
      }
    )
    it('is not shown to non-admins', async () => {
      const { wrapper } = getWrapper({ productversion: '3.4.0', critical_range: '<3.5.0' })
      await nextTick()
      expect(wrapper.find('.version-check-critical').exists()).toBe(false)
    })
    it('is not shown without a critical range', async () => {
      const { wrapper } = getWrapper({ productversion: '3.4.0', abilities: admin })
      await nextTick()
      expect(wrapper.find('.version-check-critical').exists()).toBe(false)
    })
    it('is not shown and logs an error if the critical range is invalid', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper } = getWrapper({
        productversion: '3.4.0',
        critical_range: '^3.0.0',
        abilities: admin
      })
      await nextTick()
      expect(wrapper.find('.version-check-critical').exists()).toBe(false)
      expect(console.error).toHaveBeenCalled()
    })
  })
})

function getWrapper({
  productversion = '3.5.0',
  hasError = false,
  isLoading = false,
  critical_range = undefined,
  abilities = []
}: {
  productversion?: string
  hasError?: boolean
  isLoading?: boolean
  critical_range?: string
  abilities?: AbilityRule[]
} = {}) {
  const mocks = { ...defaultComponentMocks() }

  return {
    wrapper: mount(VersionCheck, {
      global: {
        mocks,
        provide: mocks,
        plugins: [
          ...defaultPlugins({
            abilities,
            piniaOptions: {
              capabilityState: {
                capabilities: {
                  core: {
                    status: { productversion, edition: 'rolling' },
                    'check-for-updates': true
                  }
                }
              },
              updatesState: {
                isLoading,
                hasError,
                updates: {
                  channels: {
                    rolling: getChannel('3.5.0', critical_range),
                    stable: getChannel('2.0.4', critical_range),
                    lts: getChannel('2.0.4', critical_range),
                    'lts-2.0': getChannel('2.0.4', critical_range)
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

function getChannel(current_version: string, critical_range: string) {
  return {
    current_version,
    url: `https://github.com/opencloud-eu/opencloud/releases/tag/v${current_version}`,
    critical_range,
    // the update server keeps this list for older web versions, it must be ignored
    critical: ['3.4.0']
  } as UpdateChannel
}
