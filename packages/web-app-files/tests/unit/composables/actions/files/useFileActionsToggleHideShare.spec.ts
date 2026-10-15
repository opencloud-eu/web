import { unref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { IncomingShareResource, Resource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useFileActionsToggleHideShare } from '../../../../../src/composables/actions/files'

const incomingShare = { sharedWith: [], outgoing: false } as unknown as IncomingShareResource

describe('toggleHideShare', () => {
  describe('isVisible property', () => {
    it('should be true for incoming shares', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({ space: null, resources: [incomingShare] })
          ).toBeTruthy()
        }
      })
    })
    it('should be false if a resource is no incoming share', () => {
      getWrapper({
        setup: ({ actions }) => {
          const resources = [incomingShare, mock<Resource>()] as IncomingShareResource[]
          expect(unref(actions)[0].isVisible({ space: null, resources })).toBeFalsy()
        }
      })
    })
    it('should be false in a guest context', () => {
      getWrapper({
        isGuest: true,
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({ space: null, resources: [incomingShare] })
          ).toBeFalsy()
        }
      })
    })
  })
})

function getWrapper({
  setup,
  isGuest = false
}: {
  setup: (instance: ReturnType<typeof useFileActionsToggleHideShare>) => void
  isGuest?: boolean
}) {
  const mocks = defaultComponentMocks()
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsToggleHideShare()
        setup(instance)
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: { piniaOptions: { authState: { guestContextReady: isGuest } } }
      }
    )
  }
}
