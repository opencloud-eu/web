import { useSpaceActionsUploadImage } from '../../../../../src/composables/actions/spaces/useSpaceActionsUploadImage'
import { mock } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { unref, VNodeRef } from 'vue'
import { useSpaceHelpers } from '@opencloud-eu/web-pkg'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useSpaceHelpers: vi.fn()
}))

describe('uploadImage', () => {
  describe('isVisible property', () => {
    it('should be true if canEditImage is true', () => {
      const spaceMock = mock<SpaceResource>({ canEditImage: () => true })

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
      const spaceMock = mock<SpaceResource>({ canEditImage: () => false })

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
    {
      spaceImageInput
    }: {
      spaceImageInput: VNodeRef
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
}) {
  vi.mocked(useSpaceHelpers).mockReturnValue({
    checkSpaceNameModalInput: vi.fn(),
    getDefaultMetaFolder: () => new Promise(() => mock<Resource>())
  })

  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    })
  }

  return {
    wrapper: getComposableWrapper(
      () => {
        const spaceImageInput = mock<VNodeRef>()
        const instance = useSpaceActionsUploadImage({ spaceImageInput })
        unref(instance.actions)[0].handler({
          resources: [
            mock<SpaceResource>({
              id: '1fe58d8b-aa69-4c22-baf7-97dd57479f22'
            })
          ]
        })
        setup(instance, { spaceImageInput, clientService: mocks.$clientService })
      },
      {
        mocks,
        provide: mocks
      }
    )
  }
}
