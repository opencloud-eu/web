import { useSpaceActionsCustomizeMenu } from '../../../../../src/composables'
import { SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { unref } from 'vue'
import { User } from '@opencloud-eu/web-client/graph/generated'

describe('customizeMenu', () => {
  describe('isVisible property', () => {
    it('should be false when no resource given', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [] })).toBe(false)
        }
      })
    })

    it('should be false when no child action is permitted', () => {
      const space = mock<SpaceResource>({
        canEditImage: () => false,
        canEditDescription: () => false,
        canEditReadme: () => false,
        driveType: 'project'
      })
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [space] })).toBe(false)
        }
      })
    })

    it.each(['personal', 'share'])('should be false when space is of type %s', (driveType) => {
      const space = mock<SpaceResource>({
        canEditImage: () => true,
        canEditDescription: () => true,
        canEditReadme: () => true,
        driveType
      })

      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [space] })).toBe(false)
        }
      })
    })

    it.each(['canEditImage', 'canEditDescription', 'canEditReadme'])(
      'should be true when space is project and %s is true',
      (permission) => {
        const space = mock<SpaceResource>({
          canEditImage: () => false,
          canEditDescription: () => false,
          canEditReadme: () => false,
          [permission]: () => true,
          driveType: 'project'
        })

        getWrapper({
          setup: ({ actions }) => {
            expect(unref(actions)[0].isVisible({ resources: [space] })).toBe(true)
          }
        })
      }
    )
  })
})

function getWrapper({
  setup
}: {
  setup: (instance: ReturnType<typeof useSpaceActionsCustomizeMenu>) => void
}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    })
  }

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useSpaceActionsCustomizeMenu()
        setup(instance)
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: {
          piniaOptions: {
            userState: { user: { id: '1', onPremisesSamAccountName: 'alice' } as User }
          }
        }
      }
    )
  }
}
