import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useCapabilityStore } from '../../../../src/composables/piniaStores'
import { createPinia, setActivePinia } from 'pinia'
import { Capabilities } from '@opencloud-eu/web-client/ocs'

describe('useCapabilityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has initial capabilities as defaults', () => {
    getWrapper({
      setup: (instance) => {
        expect(Object.keys(instance.capabilities).length).toBeGreaterThan(0)
      }
    })
  })

  describe('method "setCapabilities"', () => {
    it('sets "isInitialized" to true', () => {
      getWrapper({
        setup: (instance) => {
          expect(instance.isInitialized).toBeFalsy()

          const data = { capabilities: {} } as Capabilities
          instance.setCapabilities(data)

          expect(instance.isInitialized).toBeTruthy()
        }
      })
    })
    it('sets given values and overwrites defaults', () => {
      getWrapper({
        setup: (instance) => {
          expect(instance.capabilities.files_sharing.allow_custom).toBeTruthy()

          const data = { capabilities: { files_sharing: { allow_custom: false } } } as Capabilities
          instance.setCapabilities(data)

          expect(instance.capabilities.files_sharing.allow_custom).toBeFalsy()
        }
      })
    })
  })

  describe('open-xchange getters', () => {
    it('default to disabled with an empty api url', () => {
      getWrapper({
        setup: (instance) => {
          expect(instance.openXchangeEnabled).toBe(false)
          expect(instance.openXchangeApiUrl).toBe('')
        }
      })
    })
    it('reflect the values set via "setCapabilities"', () => {
      getWrapper({
        setup: (instance) => {
          const data = {
            capabilities: {
              open_xchange: { enabled: true, api_url: 'https://ox.example.com/api' }
            }
          } as Capabilities
          instance.setCapabilities(data)

          expect(instance.openXchangeEnabled).toBe(true)
          expect(instance.openXchangeApiUrl).toBe('https://ox.example.com/api')
        }
      })
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (instance: ReturnType<typeof useCapabilityStore>) => void
}) {
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useCapabilityStore()
        setup(instance)
      },
      { pluginOptions: { pinia: false } }
    )
  }
}
