import { createTestingPinia, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { GraphSharePermission } from '@opencloud-eu/web-client'
import { useAuthStore } from '../../../../src/composables/piniaStores'

const guestSession = {
  shareId: 'share-id',
  shareName: 'Invited folder',
  permissions: [GraphSharePermission.readBasic],
  expiresAt: 1234567890
}

describe('useAuthStore', () => {
  beforeEach(() => {
    createTestingPinia({ stubActions: false })
  })

  describe('method "setGuestContext"', () => {
    it('sets the full guest session and marks the context ready', () => {
      getWrapper({
        setup: (instance) => {
          expect(instance.guestContextReady).toBeFalsy()

          instance.setGuestContext(guestSession)

          expect(instance.guestContextReady).toBeTruthy()
          expect(instance.guestShareId).toEqual('share-id')
          expect(instance.guestShareName).toEqual('Invited folder')
          expect(instance.guestPermissions).toEqual([GraphSharePermission.readBasic])
          expect(instance.guestSessionExpiresAt).toEqual(1234567890)
        }
      })
    })
  })

  describe('method "invalidateGuestSession"', () => {
    it('ends the session but keeps the share id for renewal', () => {
      getWrapper({
        setup: (instance) => {
          instance.setGuestContext(guestSession)
          instance.invalidateGuestSession()

          expect(instance.guestContextReady).toBeFalsy()
          expect(instance.guestSessionExpiresAt).toBeNull()
          expect(instance.guestShareId).toEqual('share-id')
          expect(instance.guestShareName).toEqual('Invited folder')
        }
      })
    })
  })

  describe('method "clearGuestContext"', () => {
    it('wipes the guest session', () => {
      getWrapper({
        setup: (instance) => {
          instance.setGuestContext(guestSession)
          instance.clearGuestContext()

          expect(instance.guestContextReady).toBeFalsy()
          expect(instance.guestShareId).toBeNull()
          expect(instance.guestShareName).toBeNull()
          expect(instance.guestPermissions).toBeNull()
          expect(instance.guestSessionExpiresAt).toBeNull()
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
          instance.setGuestContext(guestSession)

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
