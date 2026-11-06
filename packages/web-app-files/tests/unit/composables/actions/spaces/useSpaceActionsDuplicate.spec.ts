import { useSpaceActionsDuplicate } from '../../../../../src/composables/actions/spaces'
import { AbilityRule, Resource, SpaceResource } from '@opencloud-eu/web-client'
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
            spaceImageData: null,
            spaceReadmeData: null,
            spaceQuota: { total: 1 }
          })
          await unref(actions)[0].handler({ resources: [otherSpace, memberSpace] })
          expect(clientService.webdav.listFiles).toHaveBeenCalledTimes(1)
          expect(clientService.webdav.listFiles).toHaveBeenCalledWith(memberSpace)
        }
      })
    })
    it('should show an error message for spaces the current user is no member of', async () => {
      let instance: ReturnType<typeof useSpaceActionsDuplicate>
      const { mocks } = getWrapper({
        setup: (i) => {
          instance = i
        }
      })
      mocks.$clientService.graphAuthenticated.drives.createDrive.mockResolvedValue(
        mock<SpaceResource>({ id: '3', name: 'Moon (1)' })
      )
      mocks.$clientService.webdav.listFiles.mockResolvedValue({ children: [] } as ListFilesResult)
      const otherSpace = mock<SpaceResource>({
        id: 'other',
        name: 'Mars',
        disabled: false,
        driveType: 'project'
      })
      const memberSpace = mock<SpaceResource>({
        id: '1',
        name: 'Moon',
        disabled: false,
        driveType: 'project',
        spaceImageData: null,
        spaceReadmeData: null,
        spaceQuota: { total: 1 }
      })
      await unref(instance.actions)[0].handler({ resources: [otherSpace, memberSpace] })
      const { showMessage, showErrorMessage } = useMessages()
      expect(showMessage).toHaveBeenCalledTimes(1)
      expect(showErrorMessage).toHaveBeenCalledTimes(1)
      expect(showErrorMessage).toHaveBeenCalledWith({
        title: 'Space »Mars« could not be duplicated because you are not a member'
      })
    })
    it('should show one error message with the count for several spaces the current user is no member of', async () => {
      let instance: ReturnType<typeof useSpaceActionsDuplicate>
      const { mocks } = getWrapper({
        setup: (i) => {
          instance = i
        }
      })
      const otherSpaces = ['Mars', 'Venus'].map((name) =>
        mock<SpaceResource>({ id: name, name, disabled: false, driveType: 'project' })
      )
      await unref(instance.actions)[0].handler({ resources: otherSpaces })
      expect(mocks.$clientService.webdav.listFiles).not.toHaveBeenCalled()
      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalledTimes(1)
      expect(showErrorMessage).toHaveBeenCalledWith({
        title: '2 spaces could not be duplicated because you are not a member'
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
    describe('when copying some files fails', () => {
      let instance: ReturnType<typeof useSpaceActionsDuplicate>
      let mocks: ReturnType<typeof defaultComponentMocks>
      const copyError = new Error('copy failed')

      beforeEach(() => {
        ;({ mocks } = getWrapper({
          currentRouteName: 'files-spaces-projects',
          setup: (i) => {
            instance = i
          }
        }))
        const spacesStore = useSpacesStore()
        vi.mocked(spacesStore.upsertSpace).mockImplementation((space) => {
          spacesStore.spaces = [...spacesStore.spaces, space]
        })
        mocks.$clientService.graphAuthenticated.drives.createDrive.mockImplementation(({ name }) =>
          Promise.resolve(mock<SpaceResource>({ id: name, name, driveType: 'project' }))
        )
        mocks.$clientService.webdav.listFiles.mockResolvedValue(
          mock<ListFilesResult>({
            children: [mock<Resource>({ name: 'a.txt' }), mock<Resource>({ name: 'b.txt' })]
          })
        )
        mocks.$clientService.webdav.copyFiles.mockImplementation((_s, _file, _t, { path }) =>
          path === 'b.txt' ? Promise.reject(copyError) : Promise.resolve(undefined)
        )
      })

      it('should list the created space and show that it was not duplicated completely', async () => {
        await instance.duplicateSpace(spaces[0])

        const spacesStore = useSpacesStore()
        expect(spacesStore.upsertSpace).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Moon (1)' })
        )
        const { upsertResource } = useResourcesStore()
        expect(upsertResource).toHaveBeenCalledWith(expect.objectContaining({ name: 'Moon (1)' }))
        const { showMessage, showErrorMessage } = useMessages()
        expect(showMessage).not.toHaveBeenCalled()
        expect(showErrorMessage).toHaveBeenCalledWith({
          title: 'Space »Moon (1)« was created, but could not be duplicated completely',
          errors: [copyError]
        })
      })

      it('should pick a free name when duplicating again', async () => {
        await instance.duplicateSpace(spaces[0])
        await instance.duplicateSpace(spaces[0])

        const { createDrive } = mocks.$clientService.graphAuthenticated.drives
        expect(createDrive).toHaveBeenCalledTimes(2)
        expect(createDrive).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Moon (2)' }))
      })
    })
    describe('with a space image', () => {
      let instance: ReturnType<typeof useSpaceActionsDuplicate>
      let mocks: ReturnType<typeof defaultComponentMocks>
      const spaceImageData = mock<SpaceResource['spaceImageData']>({ name: 'image.png' })
      const spaceWithImage = mock<SpaceResource>({
        id: '1',
        name: 'Moon',
        driveType: 'project',
        spaceImageData,
        spaceReadmeData: null,
        spaceQuota: { total: 1 }
      })

      beforeEach(() => {
        ;({ mocks } = getWrapper({
          setup: (i) => {
            instance = i
          }
        }))
        mocks.$clientService.graphAuthenticated.drives.createDrive.mockResolvedValue(
          mock<SpaceResource>({ id: '3', name: 'Moon (1)', spaceImageData: null })
        )
        mocks.$clientService.webdav.listFiles.mockResolvedValue(
          mock<ListFilesResult>({ children: [mock<Resource>({ name: '.space' })] })
        )
        mocks.$clientService.webdav.getFileInfo.mockResolvedValue(mock<Resource>({ id: 'img' }))
      })

      it('should upsert the space once with its image data', async () => {
        mocks.$clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(
          mock<SpaceResource>({ id: '3', name: 'Moon (1)', spaceImageData })
        )
        await instance.duplicateSpace(spaceWithImage)

        const spacesStore = useSpacesStore()
        expect(spacesStore.upsertSpace).toHaveBeenCalledTimes(1)
        expect(spacesStore.upsertSpace).toHaveBeenCalledWith(
          expect.objectContaining({ id: '3', spaceImageData })
        )
        const { showMessage } = useMessages()
        expect(showMessage).toHaveBeenCalled()
      })

      it('should list the created space when setting the image fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const updateError = new Error('update failed')
        mocks.$clientService.graphAuthenticated.drives.updateDrive.mockRejectedValue(updateError)
        await instance.duplicateSpace(spaceWithImage)

        const spacesStore = useSpacesStore()
        expect(spacesStore.upsertSpace).toHaveBeenCalledWith(expect.objectContaining({ id: '3' }))
        const { showErrorMessage } = useMessages()
        expect(showErrorMessage).toHaveBeenCalledWith({
          title: 'Space »Moon (1)« was created, but could not be duplicated completely',
          errors: [updateError]
        })
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
