import { mock } from 'vitest-mock-extended'
import { SpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useCreateSpace } from '../../../../src/composables/spaces'
import { getVaultCreator } from '../../../../src/helpers'
import { useMessages, useSpacesStore } from '../../../../src/composables/piniaStores'

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
      getWrapper({
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
      getWrapper({
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
      getWrapper({
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
      getWrapper({
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

    it('reports a space that exists but has no password committed', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const finalizeVault = vi.fn().mockRejectedValue(new Error('proppatch failed'))
      getWrapper({
        setup: async ({ addNewSpace }) => {
          await addNewSpace('Secrets', { encrypt: true, finalizeVault })

          const { showMessage, showErrorMessage } = useMessages()
          expect(showMessage).not.toHaveBeenCalled()
          expect(showErrorMessage).toHaveBeenCalledWith(
            expect.objectContaining({
              title: '»Secrets« was created, but its password was not saved'
            })
          )
        }
      })
    })

    it('refuses to create an unencrypted space when encryption was asked for', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      getWrapper({
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

    it('reports a failed creation', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      getWrapper({
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
  ) => void
}) {
  vi.mocked(getVaultCreator).mockReturnValue(vaultCreator as any)

  const mocks = defaultComponentMocks()
  mocks.$clientService.graphAuthenticated.drives.createDrive.mockImplementation(() =>
    resolveCreateDrive
      ? Promise.resolve(mock<SpaceResource>({ id: '1', name: 'space' }))
      : Promise.reject(new Error('error'))
  )

  return {
    wrapper: getComposableWrapper(
      () => {
        setup(useCreateSpace(), mocks)
      },
      { mocks, provide: mocks }
    )
  }
}
