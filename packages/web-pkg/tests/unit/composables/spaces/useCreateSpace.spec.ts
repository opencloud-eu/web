import { mock } from 'vitest-mock-extended'
import { Resource, ShareTypes, SpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useCreateSpace } from '../../../../src/composables/spaces'
import { getVaultCreator } from '../../../../src/helpers'
import { useMessages, useSpacesStore } from '../../../../src/composables/piniaStores'
import { eventBus } from '../../../../src/services'

vi.mock('../../../../src/helpers', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  getVaultCreator: vi.fn()
}))

const setupComponent = { name: 'VaultSetupStub' }
const vaultCreation = {
  vaultExtension: 'vault',
  vaultContentType: 'application/vnd.opencloud.vault',
  setupComponent
}

describe('useCreateSpace', () => {
  describe('createSpace', () => {
    it('uses the default template for a regular space', () => {
      return getWrapper({
        setup: async ({ createSpace }, { $clientService }) => {
          await createSpace('Team')

          expect($clientService.graphAuthenticated.drives.createDrive).toHaveBeenCalledWith(
            { name: 'Team' },
            { params: { template: 'default' } }
          )
        }
      })
    })

    it('marks an encrypted space and keeps the server from creating a .space folder', () => {
      return getWrapper({
        setup: async ({ createSpace }, { $clientService }) => {
          await createSpace('Secrets', { vaultContentType: 'application/vnd.opencloud.vault' })

          expect($clientService.graphAuthenticated.drives.createDrive).toHaveBeenCalledWith(
            { name: 'Secrets', '@libre.graph.contentType': 'application/vnd.opencloud.vault' },
            { params: { template: 'none' } }
          )
        }
      })
    })
  })

  describe('addNewSpace', () => {
    it('creates a regular space and reports success', () => {
      return getWrapper({
        setup: async ({ addNewSpace }, { $clientService }) => {
          const space = await addNewSpace('Team')

          expect(space?.id).toBe('1')
          expect($clientService.graphAuthenticated.drives.createDrive).toHaveBeenCalledWith(
            { name: 'Team' },
            { params: { template: 'default' } }
          )
          expect(useSpacesStore().upsertSpace).toHaveBeenCalled()
          expect(useMessages().showMessage).toHaveBeenCalledWith({
            title: 'Space was created successfully'
          })
        }
      })
    })

    it('commits the vault secret at the space root', () => {
      const finalizeVault = vi.fn()
      return getWrapper({
        setup: async ({ addNewSpace }, { $clientService }) => {
          const space = await addNewSpace('Secrets', { encrypt: true, finalizeVault })

          expect($clientService.graphAuthenticated.drives.createDrive).toHaveBeenCalledWith(
            { name: 'Secrets', '@libre.graph.contentType': 'application/vnd.opencloud.vault' },
            { params: { template: 'none' } }
          )
          expect(finalizeVault).toHaveBeenCalledWith(space, '/')
          expect(useMessages().showMessage).toHaveBeenCalledWith({
            title: 'Space was created successfully'
          })
        }
      })
    })

    it('summarizes a password that was not committed, and still applies the rest', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const finalizeVault = vi.fn().mockRejectedValue(new Error('proppatch failed'))
      return getWrapper({
        setup: async ({ addNewSpace }, { $clientService }) => {
          await addNewSpace('Secrets', {
            encrypt: true,
            finalizeVault,
            quota: 1000,
            members: [
              {
                id: 'user-1',
                displayName: 'Alice',
                shareType: ShareTypes.user.value,
                roleId: 'role-1'
              }
            ]
          })

          // the space exists, so the steps that don't depend on the vault run
          const { drives, permissions } = $clientService.graphAuthenticated
          expect(drives.updateDrive).toHaveBeenCalledWith('1', {
            name: 'space',
            quota: { total: 1000 }
          })
          expect(permissions.createInvite).toHaveBeenCalled()

          expect(useMessages().showMessage).toHaveBeenCalledWith(
            expect.objectContaining({
              title: 'Space was created',
              desc: 'The password was not saved.',
              status: 'warning'
            })
          )
        }
      })
    })

    it('refuses to create an unencrypted space when encryption was asked for', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      return getWrapper({
        vaultCreator: null,
        setup: async ({ addNewSpace }, { $clientService }) => {
          await addNewSpace('Secrets', { encrypt: true })

          expect($clientService.graphAuthenticated.drives.createDrive).not.toHaveBeenCalled()
          expect(useMessages().showErrorMessage).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'Creating space failed…' })
          )
        }
      })
    })

    it('puts the subtitle on the drive right away', () => {
      return getWrapper({
        setup: async ({ addNewSpace }, { $clientService }) => {
          await addNewSpace('Team', { subtitle: 'The team space' })

          expect($clientService.graphAuthenticated.drives.createDrive).toHaveBeenCalledWith(
            { name: 'Team', description: 'The team space' },
            { params: { template: 'default' } }
          )
        }
      })
    })

    it('applies quota, description, image and members', () => {
      const busStub = vi.spyOn(eventBus, 'publish')
      return getWrapper({
        setup: async ({ addNewSpace }, { $clientService }) => {
          await addNewSpace('Team', {
            quota: 1000,
            description: 'What we do here',
            image: new ArrayBuffer(8),
            members: [
              {
                id: 'user-1',
                displayName: 'Alice',
                shareType: ShareTypes.user.value,
                roleId: 'role-1'
              }
            ]
          })

          const { drives, permissions } = $clientService.graphAuthenticated
          expect(drives.updateDrive).toHaveBeenCalledWith('1', {
            name: 'space',
            quota: { total: 1000 }
          })
          expect($clientService.webdav.putFileContents).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ fileName: 'readme.md', content: 'What we do here' })
          )
          expect($clientService.webdav.putFileContents).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ fileName: 'image.png' })
          )
          expect(permissions.createInvite).toHaveBeenCalledWith(
            '1',
            '1',
            expect.objectContaining({
              roles: ['role-1'],
              recipients: [{ objectId: 'user-1', '@libre.graph.recipient.type': 'user' }]
            }),
            expect.anything()
          )
          // nothing fetches the space image preview without this
          expect(busStub).toHaveBeenCalledWith('app.files.spaces.uploaded-image', expect.anything())
          expect(useMessages().showMessage).toHaveBeenCalledWith({
            title: 'Space was created successfully'
          })
        }
      })
    })

    it('writes no readme or image into an encrypted space', () => {
      return getWrapper({
        setup: async ({ addNewSpace }, { $clientService }) => {
          await addNewSpace('Secrets', {
            encrypt: true,
            finalizeVault: vi.fn(),
            description: 'What we do here',
            image: new ArrayBuffer(8)
          })

          // both would sit as plain text next to the encrypted files
          expect($clientService.webdav.putFileContents).not.toHaveBeenCalled()
        }
      })
    })

    it('keeps the space and summarizes what could not be applied', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      return getWrapper({
        setup: async ({ addNewSpace }, { $clientService }) => {
          $clientService.graphAuthenticated.drives.updateDrive.mockRejectedValue(
            new Error('forbidden')
          )

          const space = await addNewSpace('Team', { quota: 1000 })

          expect(space?.id).toBe('1')
          expect(useMessages().showMessage).toHaveBeenCalledWith(
            expect.objectContaining({
              title: 'Space was created',
              desc: 'The quota could not be set.',
              status: 'warning'
            })
          )
        }
      })
    })

    it('names the members that could not be added', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      return getWrapper({
        setup: async ({ addNewSpace }, { $clientService }) => {
          $clientService.graphAuthenticated.permissions.createInvite.mockRejectedValue(
            new Error('not found')
          )

          await addNewSpace('Team', {
            members: [
              {
                id: 'user-1',
                displayName: 'Alice',
                shareType: ShareTypes.group.value,
                roleId: 'role-1'
              }
            ]
          })

          expect(useMessages().showMessage).toHaveBeenCalledWith(
            expect.objectContaining({
              desc: 'These members could not be added: Alice.'
            })
          )
        }
      })
    })

    it('reports a failed creation', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      return getWrapper({
        resolveCreateDrive: false,
        setup: async ({ addNewSpace }) => {
          await addNewSpace('Team')

          const { showMessage, showErrorMessage } = useMessages()
          expect(showMessage).not.toHaveBeenCalled()
          expect(showErrorMessage).toHaveBeenCalledWith(
            expect.objectContaining({ title: 'Creating space failed…' })
          )
        }
      })
    })
  })
})

function getWrapper({
  resolveCreateDrive = true,
  vaultCreator = { creation: vaultCreation },
  setup
}: {
  resolveCreateDrive?: boolean
  vaultCreator?: {
    creation?: { vaultExtension: string; vaultContentType: string; setupComponent: unknown }
  } | null
  setup: (
    instance: ReturnType<typeof useCreateSpace>,
    mocks: ReturnType<typeof defaultComponentMocks>
  ) => Promise<void>
}) {
  vi.mocked(getVaultCreator).mockReturnValue(vaultCreator as any)

  const mocks = defaultComponentMocks()
  const createdSpace = mock<SpaceResource>({ id: '1', name: 'space' })
  mocks.$clientService.graphAuthenticated.drives.createDrive.mockImplementation(() =>
    resolveCreateDrive ? Promise.resolve(createdSpace) : Promise.reject(new Error('error'))
  )
  mocks.$clientService.graphAuthenticated.drives.updateDrive.mockResolvedValue(createdSpace)
  mocks.$clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(createdSpace)
  mocks.$clientService.webdav.listFiles.mockResolvedValue({ children: [] } as any)
  mocks.$clientService.webdav.createFolder.mockResolvedValue(
    mock<Resource>({ id: 'meta-folder', parentFolderId: 'parent' })
  )
  mocks.$clientService.webdav.putFileContents.mockResolvedValue(
    mock<Resource>({ id: 'file', fileId: 'file' })
  )

  // The setup runs inside a sync `setup()`, so its promise has to be handed
  // back for the test to await - otherwise `clearMocks` wipes the call history
  // before the assertions get to run.
  let done: Promise<void>
  getComposableWrapper(
    () => {
      done = setup(useCreateSpace(), mocks)
    },
    { mocks, provide: mocks }
  )

  return done
}
