import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { Resource, ShareTypes, SpaceResource } from '@opencloud-eu/web-client'
import { useResourcesStore, useSpacesStore } from '@opencloud-eu/web-pkg'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { useFileActionsFavorite } from '../../../../../src/composables/actions/files'

describe('favorite', () => {
  describe('computed property "actions"', () => {
    describe('isVisible', () => {
      it('returns true for a regular resource', () => {
        getWrapper({
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>({ driveType: 'personal' }),
                resources: [getResource({ id: '1' })]
              })
            ).toBeTruthy()
          }
        })
      })
      it('returns false without resources', () => {
        getWrapper({
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>({ driveType: 'personal' }),
                resources: []
              })
            ).toBeFalsy()
          }
        })
      })
      it('returns true for project spaces', () => {
        getWrapper({
          setup: ({ actions }) => {
            const resource = getSpace({ driveType: 'project' })
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>({ driveType: 'project' }),
                resources: [resource]
              })
            ).toBeTruthy()
          }
        })
      })
      it.each([
        { driveType: 'personal', disabled: false },
        { driveType: 'share', disabled: false },
        { driveType: 'project', disabled: true }
      ])('returns false for a $driveType space (disabled: $disabled)', (data) => {
        getWrapper({
          setup: ({ actions }) => {
            const resource = getSpace(data)
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>({ driveType: data.driveType }),
                resources: [resource]
              })
            ).toBeFalsy()
          }
        })
      })
      it('returns false for trashed resources', () => {
        getWrapper({
          setup: ({ actions }) => {
            const resource = { ...getResource({ id: '1' }), ddate: '2026-01-01' } as Resource
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>({ driveType: 'personal' }),
                resources: [resource]
              })
            ).toBeFalsy()
          }
        })
      })
      it('returns false inside a public link', () => {
        getWrapper({
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>({ driveType: 'public' }),
                resources: [getResource({ id: '1' })]
              })
            ).toBeFalsy()
          }
        })
      })
      it.each([{ outgoing: false }, { outgoing: true }])(
        'returns true for share list entries (outgoing: $outgoing)',
        ({ outgoing }) => {
          getWrapper({
            currentFolder: null,
            setup: ({ actions }) => {
              const resource = {
                ...getResource({ id: '1' }),
                sharedWith: [],
                shareTypes: [ShareTypes.user.value],
                outgoing
              } as Resource
              expect(
                unref(actions)[0].isVisible({
                  space: mock<SpaceResource>({ driveType: 'share' }),
                  resources: [resource]
                })
              ).toBeTruthy()
            }
          })
        }
      )
      it('returns false for federated incoming shares', () => {
        getWrapper({
          currentFolder: null,
          setup: ({ actions }) => {
            const resource = {
              ...getResource({ id: '1' }),
              sharedWith: [],
              shareTypes: [ShareTypes.remote.value],
              outgoing: false
            } as Resource
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>({ driveType: 'share' }),
                resources: [resource]
              })
            ).toBeFalsy()
          }
        })
      })
      it('returns true for the root of a federated share browsed inside it', () => {
        const shareRoot = {
          ...getResource({ id: '1' }),
          sharedWith: [],
          shareTypes: [ShareTypes.remote.value],
          outgoing: false
        } as Resource
        getWrapper({
          currentFolder: shareRoot,
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>({ driveType: 'share' }),
                resources: [shareRoot]
              })
            ).toBeTruthy()
          }
        })
      })
      it('returns true for a share root browsed inside its space', () => {
        getWrapper({
          setup: ({ actions }) => {
            const resource = { ...getResource({ id: '1' }), sharedWith: [] } as Resource
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>({ driveType: 'share' }),
                resources: [resource]
              })
            ).toBeTruthy()
          }
        })
      })
      it('returns false if the starred state differs across the selection', () => {
        getWrapper({
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>({ driveType: 'personal' }),
                resources: [
                  getResource({ id: '1', starred: true }),
                  getResource({ id: '2', starred: false })
                ]
              })
            ).toBeFalsy()
          }
        })
      })
      it('returns false for vault resources', () => {
        getWrapper({
          setup: ({ actions }) => {
            expect(
              unref(actions)[0].isVisible({
                space: mock<SpaceResource>({ driveType: 'personal' }),
                resources: [getResource({ id: '1', isInVault: true })]
              })
            ).toBeFalsy()
          }
        })
      })
    })
    describe('handler', () => {
      it('updates the label when adding the current folder to the favorites', async () => {
        let instance: ReturnType<typeof useFileActionsFavorite>
        getWrapper({
          currentFolder: getResource({ id: 'cf-1', type: 'folder', starred: false }),
          setup: (i) => {
            instance = i
          }
        })

        const space = mock<SpaceResource>({ driveType: 'personal' })
        const { currentFolder } = useResourcesStore()
        const resources = [currentFolder]
        expect(unref(instance.actions)[0].label({ space, resources })).toBe('Add to favorites')

        await unref(instance.actions)[0].handler({ space, resources })

        expect(unref(instance.actions)[0].label({ space, resources })).toBe('Remove from favorites')
      })
      it('follows a project space and updates it in the spaces store', async () => {
        const space = getSpace({ id: 'space-1', fileId: 'space-1', driveType: 'project' })
        let instance: ReturnType<typeof useFileActionsFavorite>
        const { mocks } = getWrapper({
          spaces: [space],
          setup: (i) => {
            instance = i
          }
        })

        await unref(instance.actions)[0].handler({ space, resources: [space] })

        expect(
          mocks.$clientService.graphAuthenticated.driveItems.followDriveItem
        ).toHaveBeenCalledWith('space-1')
        const spacesStore = useSpacesStore()
        expect(spacesStore.spaces.find(({ id }) => id === 'space-1').starred).toBe(true)
      })
    })
  })
})

function getResource(resource: Partial<Resource>): Resource {
  return {
    ...mock<Resource>({ type: 'file', starred: false, isInVault: false }),
    ...resource
  }
}

function getSpace(space: Partial<SpaceResource>): SpaceResource {
  return {
    ...mock<SpaceResource>({ id: 'space', starred: false, isInVault: false, disabled: false }),
    type: 'space',
    ...space
  }
}

function getWrapper({
  currentFolder = mock<Resource>({ id: 'cf-1', path: '/' }),
  spaces = [],
  setup
}: {
  currentFolder?: Resource
  spaces?: SpaceResource[]
  setup: (instance: ReturnType<typeof useFileActionsFavorite>) => void
}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
  })

  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        setup(useFileActionsFavorite())
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: {
          abilities: [{ action: 'create', subject: 'Favorite' }],
          piniaOptions: {
            stubActions: false,
            resourcesStore: { currentFolder },
            spacesState: { spaces }
          }
        }
      }
    )
  }
}
