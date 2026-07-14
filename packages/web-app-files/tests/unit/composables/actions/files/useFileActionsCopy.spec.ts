import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { useFileActionsCopy } from '../../../../../src/composables/actions/files'
import { useModals, useResourcesStore } from '@opencloud-eu/web-pkg'
import { describe } from 'vitest'

describe('copy', () => {
  describe('search context', () => {
    describe('computed property "actions"', () => {
      describe('handler', () => {
        it.each([
          {
            resources: [
              { id: '1', path: '/1' },
              { id: '2', path: '/2' }
            ] as Resource[],
            copyAbleResources: ['1', '2'],
            shouldShowModal: true
          },
          {
            resources: [
              { id: '1', path: '/1' },
              { id: '2', path: '/2' },
              { id: '3', path: '/3' },
              { id: '4', path: '/4', fileId: '5', canDownload: () => true, driveType: 'project' }
            ] as unknown as Resource[],
            copyAbleResources: ['1', '2', '3'],
            shouldShowModal: true
          },
          {
            resources: [
              { id: '4', path: '/4', fileId: '5', canDownload: () => true, driveType: 'project' }
            ] as unknown as Resource[],
            copyAbleResources: [],
            shouldShowModal: false
          }
        ])(
          'should filter non copyable resources',
          ({ resources, copyAbleResources, shouldShowModal }) => {
            getWrapper({
              searchLocation: true,
              setup: ({ actions }) => {
                unref(actions)[0].handler({ space: null, resources })

                const resourcesStore = useResourcesStore()
                const { dispatchModal } = useModals()
                if (shouldShowModal) {
                  expect(resourcesStore.setSelection).toHaveBeenCalledWith(copyAbleResources)
                  expect(dispatchModal).toHaveBeenCalled()
                } else {
                  expect(resourcesStore.setSelection).not.toHaveBeenCalled()
                  expect(dispatchModal).not.toHaveBeenCalled()
                }
              }
            })
          }
        )
      })
    })
  })
  describe('computed property "actions"', () => {
    describe('isVisible', () => {
      it('returns true if "canDownload" is true', () => {
        getWrapper({
          searchLocation: false,
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: null,
                resources: [mock<Resource>({ id: '1', canDownload: () => true, isInVault: false })]
              })
            ).toBeTruthy()
          }
        })
      })
      it('returns false if "canDownload" is false', () => {
        getWrapper({
          searchLocation: false,
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: null,
                resources: [mock<Resource>({ id: '1', canDownload: () => false, isInVault: false })]
              })
            ).toBeFalsy()
          }
        })
      })
      it('returns false in search context when resources contain a project space', () => {
        getWrapper({
          searchLocation: true,
          setup: ({ actions }) => {
            const projectSpace = {
              ...mock<Resource>({ id: '1', canDownload: () => true }),
              driveType: 'project'
            } as Resource
            expect(
              unref(actions)[0].isVisible({
                space: null,
                resources: [projectSpace]
              })
            ).toBeFalsy()
          }
        })
      })
    })
  })
})

function getWrapper({
  searchLocation = false,
  setup
}: {
  searchLocation: boolean
  setup: (instance: ReturnType<typeof useFileActionsCopy>) => void
}) {
  const routeName = searchLocation ? 'files-common-search' : 'files-spaces-generic'

  const mocks = {
    ...defaultComponentMocks({ currentRoute: mock<RouteLocation>({ name: routeName }) }),
    space: {
      driveType: 'personal'
    } as unknown as SpaceResource
  }
  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsCopy()
        setup(instance)
      },
      {
        mocks,
        provide: mocks
      }
    )
  }
}
