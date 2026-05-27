import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { useFileActionsMove } from '../../../../../src/composables'
import { useMessages, useModals } from '@opencloud-eu/web-pkg'

describe('useFileActionsMove', () => {
  describe('computed property "actions"', () => {
    describe('handler', () => {
      it('opens the location picker modal', () => {
        getWrapper({
          setup: ({ actions }) => {
            const { dispatchModal } = useModals()
            unref(actions)[0].handler({
              space: mock<SpaceResource>(),
              resources: [getResource({ id: '1', storageId: 'space-1' })]
            })
            expect(dispatchModal).toHaveBeenCalled()
          }
        })
      })

      it('shows warning if selected resources are already in destination', () => {
        getWrapper({
          setup: ({ actions }) => {
            const { dispatchModal } = useModals()
            const { showMessage } = useMessages()
            unref(actions)[0].handler({
              space: mock<SpaceResource>(),
              resources: [getResource({ id: '1', storageId: 'space-1' })]
            })

            const dispatchModalCall = vi.mocked(dispatchModal).mock.calls[0][0]
            const callbackFn = dispatchModalCall.customComponentAttrs().callbackFn as (
              resources: Resource[]
            ) => Promise<void>
            void callbackFn([
              getResource({ id: 'target-folder', path: '/source', storageId: 'space-1' })
            ])

            expect(showMessage).toHaveBeenCalledWith(
              expect.objectContaining({
                title: 'You cannot move resources into the same folder.'
              })
            )
          }
        })
      })
    })

    describe('isVisible', () => {
      it('returns true for movable resources', () => {
        getWrapper({
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>(),
                resources: [getResource({ id: '1', storageId: 'space-1' })]
              })
            ).toBeTruthy()
          }
        })
      })

      it('returns false if the resource is locked', () => {
        getWrapper({
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>(),
                resources: [getResource({ id: '1', locked: true, storageId: 'space-1' })]
              })
            ).toBeFalsy()
          }
        })
      })
    })
  })
})

function getResource(resource: Partial<Resource>): Resource {
  return {
    ...mock<Resource>({
      path: '/source/folder-1',
      canBeDeleted: () => true,
      isReceivedShare: () => false,
      isMounted: () => false
    }),
    ...resource
  }
}

function getWrapper({
  currentFolder = mock<Resource>({ id: 'cf-1', path: '/source' }),
  setup
}: {
  currentFolder?: Resource
  setup: (instance: ReturnType<typeof useFileActionsMove>) => Promise<void> | void
}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    })
  }

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsMove()
        setup(instance)
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: {
          piniaOptions: {
            spacesState: { spaces: [mock<SpaceResource>({ id: 'space-1' })] },
            resourcesStore: { currentFolder }
          }
        }
      }
    )
  }
}
