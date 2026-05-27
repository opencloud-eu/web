import { mock, mockDeep } from 'vitest-mock-extended'
import { unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  RouteLocation,
  defaultComponentMocks,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { useFileActionsCut } from '../../../../../src/composables/actions/files'

describe('move', () => {
  describe('computed property "actions"', () => {
    describe('move isVisible property of returned element', () => {
      it.each([
        {
          resources: [{ isReceivedShare: () => true, canBeDeleted: () => true }] as Resource[],
          expectedStatus: true
        },
        {
          resources: [
            { isReceivedShare: () => true, canBeDeleted: () => true, locked: true }
          ] as Resource[],
          expectedStatus: false
        }
      ])('should be set correctly', (inputData) => {
        getWrapper({
          setup: () => {
            const { actions } = useFileActionsCut()

            const resources = inputData.resources
            expect(unref(actions)[0].isVisible({ space: null, resources })).toBe(
              inputData.expectedStatus
            )
          }
        })
      })
    })
  })
})
function getWrapper({
  setup
}: {
  setup: (instance: ReturnType<typeof useFileActionsCut>) => void
}) {
  const routeName = 'files-spaces-generic'
  const mocks = {
    ...defaultComponentMocks({ currentRoute: mock<RouteLocation>({ name: routeName }) }),
    space: mockDeep<SpaceResource>({
      webDavPath: 'irrelevant'
    })
  }

  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsCut()
        setup(instance)
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: { piniaOptions: { resourcesStore: { currentFolder: mocks.space } } }
      }
    )
  }
}
