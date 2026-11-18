import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { AbilityRule } from '@opencloud-eu/web-client'
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

  describe('critical badge', () => {
    it('shows critical badge when current version is in critical list and user is admin', async () => {
      const { wrapper } = getWrapper({
        productversion: '3.4.0',
        critical: ['3.4.0'],
        abilities: [{ action: 'read-all', subject: 'Setting' }]
      })
      await nextTick()
      expect(wrapper.find('.version-check-critical').exists()).toBe(true)
    })

    it('does not show critical badge when current version is not in critical list', async () => {
      const { wrapper } = getWrapper({
        productversion: '3.5.0',
        critical: ['3.4.0'],
        abilities: [{ action: 'read-all', subject: 'Setting' }]
      })
      await nextTick()
      expect(wrapper.find('.version-check-critical').exists()).toBe(false)
    })

    it('does not show critical badge when user is not admin', async () => {
      const { wrapper } = getWrapper({
        productversion: '3.4.0',
        critical: ['3.4.0'],
        abilities: []
      })
      await nextTick()
      expect(wrapper.find('.version-check-critical').exists()).toBe(false)
    })
    it.each([
      { productversion: '6.1.0', critical_range: '1.0.0 - 3.0.0 || 5.0.0 - 7.0.0', expected: true },
      {
        productversion: '4.0.0',
        critical_range: '1.0.0 - 3.0.0 || 5.0.0 - 7.0.0',
        expected: false
      },
      { productversion: '3.4.0+git20250101', critical_range: '<3.5.0', expected: true }
    ])(
      'uses the critical range for $productversion in "$critical_range"',
      async ({ productversion, critical_range, expected }) => {
        const { wrapper } = getWrapper({
          productversion,
          critical_range,
          abilities: [{ action: 'read-all', subject: 'Setting' }]
        })
        await nextTick()
        expect(wrapper.find('.version-check-critical').exists()).toBe(expected)
      }
    )
    it('prefers the critical range over the critical list', async () => {
      const { wrapper } = getWrapper({
        productversion: '3.4.0',
        critical: ['3.4.0'],
        critical_range: '<3.0.0',
        abilities: [{ action: 'read-all', subject: 'Setting' }]
      })
      await nextTick()
      expect(wrapper.find('.version-check-critical').exists()).toBe(false)
    })
    it('falls back to the critical list if the critical range is invalid', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper } = getWrapper({
        productversion: '3.4.0',
        critical: ['3.4.0'],
        critical_range: '^3.0.0',
        abilities: [{ action: 'read-all', subject: 'Setting' }]
      })
      await nextTick()
      expect(wrapper.find('.version-check-critical').exists()).toBe(true)
    })
    it('does not show the critical badge without critical list and range', async () => {
      const { wrapper } = getWrapper({
        productversion: '3.4.0',
        critical: undefined,
        abilities: [{ action: 'read-all', subject: 'Setting' }]
      })
      await nextTick()
      expect(wrapper.find('.version-check-critical').exists()).toBe(false)
    })
    it('shows critical badge when version is in critical list', async () => {
      const { wrapper } = getWrapper({
        productversion: '3.4.0+git20250101',
        critical: ['3.4.0'],
        abilities: [{ action: 'read-all', subject: 'Setting' }]
      })
      await nextTick()
      expect(wrapper.find('.version-check-critical').exists()).toBe(true)
    })
  })
})

function getWrapper({
  productversion = '3.5.0',
  hasError = false,
  isLoading = false,
  critical = [],
  critical_range = undefined,
  abilities = []
}: {
  productversion?: string
  hasError?: boolean
  isLoading?: boolean
  critical?: string[]
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
                    rolling: {
                      current_version: '3.5.0',
                      url: 'https://github.com/opencloud-eu/opencloud/releases/tag/v3.5.0',
                      critical,
                      critical_range
                    },
                    stable: {
                      current_version: '2.0.4',
                      url: 'https://github.com/opencloud-eu/opencloud/releases/tag/v2.0.4',
                      critical,
                      critical_range
                    },
                    lts: {
                      current_version: '2.0.4',
                      url: 'https://github.com/opencloud-eu/opencloud/releases/tag/v2.0.4',
                      critical,
                      critical_range
                    },
                    'lts-2.0': {
                      current_version: '2.0.4',
                      url: 'https://github.com/opencloud-eu/opencloud/releases/tag/v2.0.4',
                      critical,
                      critical_range
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
