import { useSpaceActionsDuplicate } from '../../../../../src/composables/actions/spaces'
import { AbilityRule, SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { unref } from 'vue'
import { ListFilesResult } from '@opencloud-eu/web-client/webdav'
import { useMessages, useResourcesStore, useSpacesStore } from '@opencloud-eu/web-pkg'

const spaces = [
  mock<SpaceResource>({
    id: '1',
    name: 'Moon',
    description: 'To the moon',
    type: 'project',
    spaceImageData: null,
    spaceReadmeData: null,
    spaceQuota: { total: Math.pow(10, 9) }
  }),
  mock<SpaceResource>({ id: '2', name: 'Sun', type: 'project' })
]
describe('restore', () => {
  describe('isVisible property', () => {
    it('should be false when no resource given', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources: [] })).toBe(false)
        }
      })
    })
    it('should be false when the space is disabled', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [
                mock<SpaceResource>({
                  disabled: true,
                  driveType: 'project'
                })
              ]
            })
          ).toBe(false)
        }
      })
    })
    it('should be false when the space is no project space', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [
                mock<SpaceResource>({
                  disabled: false,
                  driveType: 'personal'
                })
              ]
            })
          ).toBe(false)
        }
      })
    })
    it('should be false when the current user can not create spaces', () => {
      getWrapper({
        abilities: [],
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [mock<SpaceResource>({ disabled: false, driveType: 'project' })]
            })
          ).toBe(false)
        }
      })
    })
    it('should be true when the current user can create spaces', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [
                mock<SpaceResource>({
                  id: '1',
                  name: 'Moon',
                  disabled: false,
                  driveType: 'project',
                  isInVault: false
                }),
                mock<SpaceResource>({
                  id: '2',
                  name: 'Sun',
                  disabled: false,
                  driveType: 'project',
                  isInVault: false
                })
              ]
            })
          ).toBe(true)
        }
      })
    })
    it('should be false when the current user is no member of the space', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [
                mock<SpaceResource>({
                  id: 'other',
                  disabled: false,
                  driveType: 'project',
                  isInVault: false
                })
              ]
            })
          ).toBe(false)
        }
      })
    })
    it('should be false when one of the spaces is a vault', () => {
      getWrapper({
        setup: ({ actions }) => {
          expect(
            unref(actions)[0].isVisible({
              resources: [
                mock<SpaceResource>({
                  name: 'Moon',
                  disabled: false,
                  driveType: 'project',
                  isInVault: false
                }),
                mock<SpaceResource>({
                  name: 'Vault',
                  disabled: false,
                  driveType: 'project',
                  isInVault: true
                })
              ]
            })
          ).toBe(false)
        }
      })
    })
  })
  describe('handler', () => {
    it('should skip spaces the current user is no member of', () => {
      getWrapper({
        setup: async ({ actions }, { clientService }) => {
          clientService.graphAuthenticated.drives.createDrive.mockResolvedValue(
            mock<SpaceResource>({ id: '3', name: 'Moon (1)' })
          )
          clientService.webdav.listFiles.mockResolvedValue({ children: [] } as ListFilesResult)
          const otherSpace = mock<SpaceResource>({
            id: 'other',
            disabled: false,
            driveType: 'project'
          })
          const memberSpace = mock<SpaceResource>({
            id: '1',
            name: 'Moon',
            disabled: false,
            driveType: 'project',
            spaceQuota: { total: 1 }
          })
          await unref(actions)[0].handler({ resources: [otherSpace, memberSpace] })
          expect(clientService.webdav.listFiles).toHaveBeenCalledTimes(1)
          expect(clientService.webdav.listFiles).toHaveBeenCalledWith(memberSpace)
        }
      })
    })
  })
  describe('method "duplicateSpace"', () => {
    it('should not create a space if the files of the space can not be read', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      getWrapper({
        setup: async ({ duplicateSpace }, { clientService }) => {
          clientService.webdav.listFiles.mockRejectedValue(new Error())
          await duplicateSpace(spaces[0])
          expect(clientService.graphAuthenticated.drives.createDrive).not.toHaveBeenCalled()
          const { showErrorMessage } = useMessages()
          expect(showErrorMessage).toHaveBeenCalledTimes(1)
        }
      })
    })
    it('should show error message on error', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      getWrapper({
        setup: async ({ duplicateSpace }, { clientService }) => {
          clientService.graphAuthenticated.drives.createDrive.mockRejectedValue(new Error())
          await duplicateSpace(spaces[0])
          const { showErrorMessage } = useMessages()
          expect(showErrorMessage).toHaveBeenCalledTimes(1)
        }
      })
    })
    it('should show message on success', () => {
      getWrapper({
        setup: async ({ duplicateSpace }, { clientService }) => {
          clientService.graphAuthenticated.drives.createDrive.mockResolvedValue(
            mock<SpaceResource>({
              id: '1',
              name: 'Moon (1)'
            })
          )
          clientService.webdav.listFiles.mockResolvedValue({ children: [] } as ListFilesResult)
          await duplicateSpace(spaces[0])
          expect(clientService.graphAuthenticated.drives.createDrive).toHaveBeenCalledWith({
            description: 'To the moon',
            name: 'Moon (1)',
            quota: {
              total: Math.pow(10, 9)
            }
          })
          const spacesStore = useSpacesStore()
          expect(spacesStore.upsertSpace).toHaveBeenCalled()
          const { showMessage } = useMessages()
          expect(showMessage).toHaveBeenCalled()
        }
      })
    })
    it('should upsert a space as resource on the projects page', () => {
      getWrapper({
        currentRouteName: 'files-spaces-projects',
        setup: async ({ duplicateSpace }, { clientService }) => {
          clientService.graphAuthenticated.drives.createDrive.mockResolvedValue(
            mock<SpaceResource>({
              id: '1',
              name: 'Moon (1)'
            })
          )
          clientService.webdav.listFiles.mockResolvedValue({ children: [] } as ListFilesResult)
          await duplicateSpace(spaces[0])

          const { upsertResource } = useResourcesStore()
          expect(upsertResource).toHaveBeenCalled()
        }
      })
    })
  })
})

function getWrapper({
  setup,
  abilities = [{ action: 'create-all', subject: 'Drive' }],
  currentRouteName = 'files-spaces-generic'
}: {
  setup: (
    instance: ReturnType<typeof useSpaceActionsDuplicate>,
    {
      clientService
    }: {
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
  abilities?: AbilityRule[]
  currentRouteName?: string
}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: currentRouteName })
  })
  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useSpaceActionsDuplicate()
        setup(instance, { clientService: mocks.$clientService })
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: { abilities, piniaOptions: { spacesState: { spaces } } }
      }
    )
  }
}
