import { getBackendVersion, getWebVersion } from '../../../src/helpers'
import { useCapabilityStore } from '../../../src/composables'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { Capabilities } from '@opencloud-eu/web-client/ocs'

describe('collect version information', () => {
  describe('web version', () => {
    beforeEach(() => {
      process.env.PACKAGE_VERSION = '1.0.0'
    })
    it('provides the web version with a static string without exceptions', () => {
      expect(getWebVersion()).toBe('OpenCloud Web UI 1.0.0')
    })
  })
  describe('backend version', () => {
    it('returns undefined when the backend version object is not available', () => {
      const capabilityStore = versionStore(undefined)
      expect(getBackendVersion({ capabilityStore })).toBeUndefined()
    })
    it('returns undefined when the backend version object has no "string" field', () => {
      const capabilityStore = versionStore({
        product: 'OpenCloud',
        versionstring: undefined
      })
      expect(getBackendVersion({ capabilityStore })).toBeUndefined()
    })
    it('falls back to "OpenCloud" as a product when none is defined', () => {
      const capabilityStore = versionStore({
        versionstring: '1.0.0',
        edition: 'Community'
      })
      expect(getBackendVersion({ capabilityStore })).toBe('OpenCloud 1.0.0 Community')
    })
    it('does not provide edition, when not set', () => {
      const capabilityStore = versionStore({
        product: 'OpenCloud',
        versionstring: '1.0.0'
      })
      expect(getBackendVersion({ capabilityStore })).toBe('OpenCloud 1.0.0')
    })
    it('provides the backend version as concatenation of product, version and edition', () => {
      const capabilityStore = versionStore({
        product: 'OpenCloud',
        versionstring: '1.0.0',
        edition: 'Reva'
      })
      expect(getBackendVersion({ capabilityStore })).toBe('OpenCloud 1.0.0 Reva')
    })
    it('prefers the productversion over versionstring field if both are provided', () => {
      const capabilityStore = versionStore({
        product: 'OpenCloud',
        versionstring: '1.0.0',
        productversion: '2.0.0',
        edition: 'Community'
      })
      expect(getBackendVersion({ capabilityStore })).toBe('OpenCloud 2.0.0 Community')
    })
  })
})

const versionStore = (version: Capabilities['capabilities']['core']['status']) => {
  createTestingPinia()
  const capabilityStore = useCapabilityStore()
  capabilityStore.capabilities.core.status = version
  return capabilityStore
}
