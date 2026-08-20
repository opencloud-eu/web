import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { useFileActionsEnableSync } from '../../../../../src/composables/actions/files'
import { IncomingShareResource, Resource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'

function incomingShare(syncEnabled: boolean) {
  return { sharedWith: [], outgoing: false, syncEnabled } as unknown as IncomingShareResource
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
      it('should be set as false without resources', () => {
        getWrapper({
          setup: () => {
            const { actions } = useFileActionsEnableSync()

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
  setup: (instance: ReturnType<typeof useFileActionsEnableSync>) => void
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
