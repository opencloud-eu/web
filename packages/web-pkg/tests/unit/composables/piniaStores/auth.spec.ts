import { createTestingPinia, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useAuthStore } from '../../../../src/composables/piniaStores'

describe('useAuthStore', () => {
  beforeEach(() => {
    createTestingPinia({ stubActions: false })
  })

  describe('method "setGuestContext"', () => {
    it('sets the permission id and marks the context ready', () => {
      getWrapper({
        setup: (instance) => {
          expect(instance.guestContextReady).toBeFalsy()

          instance.setGuestContext('permission-id')

          expect(instance.guestContextReady).toBeTruthy()
          expect(instance.guestPermissionId).toEqual('permission-id')
        }
      })
    })
  })

  describe('method "clearGuestContext"', () => {
    it('wipes the guest context', () => {
      getWrapper({
        setup: (instance) => {
          instance.setGuestContext('permission-id')
          instance.clearGuestContext()

          expect(instance.guestContextReady).toBeFalsy()
          expect(instance.guestPermissionId).toBeNull()
        }
      })
    })
    it('leaves the user and public link contexts untouched', () => {
      getWrapper({
        setup: (instance) => {
          instance.setUserContextReady(true)
          instance.setPublicLinkContext({
            publicLinkToken: 'token',
            publicLinkPassword: 'password',
            publicLinkType: 'public-link',
            publicLinkContextReady: true
          })
          instance.setGuestContext('permission-id')

          instance.clearGuestContext()

          expect(instance.userContextReady).toBeTruthy()
          expect(instance.publicLinkContextReady).toBeTruthy()
          expect(instance.publicLinkToken).toEqual('token')
        }
      })
    })
  })
})

function getWrapper({ setup }: { setup: (instance: ReturnType<typeof useAuthStore>) => void }) {
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useAuthStore()
        setup(instance)
      },
      { pluginOptions: { pinia: false } }
    )
  }
}
