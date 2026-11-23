import { useSpaceActionsUploadImage } from '../../../../../src/composables/actions/spaces/useSpaceActionsUploadImage'
import { mock } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { unref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'

describe('uploadImage', () => {
  describe('isVisible property', () => {
    it('should be true if canEditImage is true', () => {
      const spaceMock = mock<SpaceResource>({ driveType: 'project', canEditImage: () => true })

      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [spaceMock]
            })
          ).toBe(true)
        }
      })
    })
    it('should be false when no resource given', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [] })).toBe(false)
        }
      })
    })
    it('should be false if canEditImage is false', () => {
      const spaceMock = mock<SpaceResource>({ driveType: 'project', canEditImage: () => false })

      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [spaceMock]
            })
          ).toBe(false)
        }
      })
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (
    instance: ReturnType<typeof useSpaceActionsUploadImage>,
    { clientService }: { clientService: ReturnType<typeof defaultComponentMocks>['$clientService'] }
  ) => void
}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    })
  }

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useSpaceActionsUploadImage()
        setup(instance, { clientService: mocks.$clientService })
      },
      {
        mocks,
        provide: mocks
      }
    )
  }
}
