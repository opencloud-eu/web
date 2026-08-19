import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { useFileActionsDisableSync } from '../../../../../src/composables/actions/files'
import { IncomingShareResource, Resource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'

function incomingShare(syncEnabled: boolean) {
  return { sharedWith: [], outgoing: false, syncEnabled } as unknown as IncomingShareResource
}

describe('disableSync', () => {
  describe('computed property "actions"', () => {
    describe('isVisible property of returned element', () => {
      it.each([
        { resources: [incomingShare(true)], expectedStatus: true },
        { resources: [incomingShare(false)], expectedStatus: false },
        { resources: [incomingShare(true), incomingShare(false)], expectedStatus: true }
      ])('should be set according to the resource syncEnabled state', (inputData) => {
        getWrapper({
          setup: () => {
            const { actions } = useFileActionsDisableSync()

            expect(
              unref(actions)[0].isVisible({ space: null, resources: inputData.resources })
            ).toBe(inputData.expectedStatus)
          }
        })
      })
      it('should be set as false if the resource is no incoming share', () => {
        getWrapper({
          setup: () => {
            const { actions } = useFileActionsDisableSync()

            const resources = [mock<Resource>({ id: '1' })] as unknown as IncomingShareResource[]
            expect(unref(actions)[0].isVisible({ space: null, resources })).toBeFalsy()
          }
        })
      })
      it('should be set as false without resources', () => {
        getWrapper({
          setup: () => {
            const { actions } = useFileActionsDisableSync()

            expect(unref(actions)[0].isVisible({ space: null, resources: [] })).toBeFalsy()
          }
        })
      })
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (instance: ReturnType<typeof useFileActionsDisableSync>) => void
}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-shares-with-me' })
  })
  return {
    wrapper: getComposableWrapper(setup, {
      mocks,
      provide: mocks
    })
  }
}
