import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { useFileActionsEnableSync } from '../../../../../src/composables/actions/files'
import { IncomingShareResource, Resource } from '@opencloud-eu/web-client'
import { useMessages } from '@opencloud-eu/web-pkg'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'

function incomingShare(syncEnabled: boolean) {
  const name = syncEnabled ? 'synced' : 'unsynced'
  return {
    id: name,
    name,
    fileId: name,
    sharedWith: [],
    outgoing: false,
    syncEnabled
  } as unknown as IncomingShareResource
}

describe('enableSync', () => {
  describe('computed property "actions"', () => {
    describe('isVisible property of returned element', () => {
      it.each([
        { resources: [incomingShare(false)], expectedStatus: true },
        { resources: [incomingShare(true)], expectedStatus: false },
        { resources: [incomingShare(true), incomingShare(false)], expectedStatus: true }
      ])('should be set according to the resource syncEnabled state', (inputData) => {
        getWrapper({
          setup: () => {
            const { actions } = useFileActionsEnableSync()

            expect(
              unref(actions)[0].isVisible({ space: null, resources: inputData.resources })
            ).toBe(inputData.expectedStatus)
          }
        })
      })
      it('should be set as false if the resource is no incoming share', () => {
        getWrapper({
          setup: () => {
            const { actions } = useFileActionsEnableSync()

            const resources = [mock<Resource>({ id: '1' })] as unknown as IncomingShareResource[]
            expect(unref(actions)[0].isVisible({ space: null, resources })).toBeFalsy()
          }
        })
      })
      it('should be set as false in a guest context', () => {
        getWrapper({
          isGuest: true,
          setup: () => {
            const { actions } = useFileActionsEnableSync()

            const resources = [incomingShare(false)]
            expect(unref(actions)[0].isVisible({ space: null, resources })).toBeFalsy()
          }
        })
      })
      it('should be set as false without resources', () => {
        getWrapper({
          setup: () => {
            const { actions } = useFileActionsEnableSync()

            expect(unref(actions)[0].isVisible({ space: null, resources: [] })).toBeFalsy()
          }
        })
      })
    })

    describe('handler', () => {
      it('only triggers the request for shares that are not yet synced on a mixed selection', async () => {
        let instance: ReturnType<typeof useFileActionsEnableSync>
        const { mocks } = getWrapper({
          setup: (i) => {
            instance = i
          }
        })

        const resources = [incomingShare(true), incomingShare(false)]
        await unref(instance.actions)[0].handler({ space: null, resources })
        await flushPromises()

        expect(
          mocks.$clientService.graphAuthenticated.driveItems.createDriveItem
        ).toHaveBeenCalledTimes(1)
        expect(
          mocks.$clientService.graphAuthenticated.driveItems.createDriveItem
        ).toHaveBeenCalledWith(undefined, expect.objectContaining({ name: 'unsynced' }))

        const { showErrorMessage } = useMessages()
        expect(showErrorMessage).not.toHaveBeenCalled()
      })
    })
  })
})

function getWrapper({
  setup,
  isGuest = false
}: {
  setup: (instance: ReturnType<typeof useFileActionsEnableSync>) => void
  isGuest?: boolean
}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-shares-with-me' })
  })
  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        setup(useFileActionsEnableSync())
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: { piniaOptions: { authState: { guestContextReady: isGuest } } }
      }
    )
  }
}
