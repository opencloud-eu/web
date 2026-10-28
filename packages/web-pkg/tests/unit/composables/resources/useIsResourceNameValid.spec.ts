import { ref } from 'vue'
import {
  RESOURCE_NAME_MAX_BYTES,
  useExtensionRegistry,
  useIsResourceNameValid,
  useResourcesStore,
  VaultExtension
} from '../../../../src'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { mock, mockDeep } from 'vitest-mock-extended'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'

describe('useIsResourceNameValid', () => {
  describe('method "isFileNameValid"', () => {
    it('should not show an error if new name not taken', () => {
      getWrapper({
        setup: ({ isFileNameValid }) => {
          const resourcesStore = useResourcesStore()
          resourcesStore.resources = [{ name: 'file1', path: '/file1' }] as Resource[]
          const { isValid, error } = isFileNameValid(
            { name: 'currentName', path: '/currentName' } as Resource,
            'newName'
          )
          expect(isValid).toBe(true)
          expect(error).toBeUndefined()
        }
      })
    })

    it.each(['x'.repeat(255), 'ä'.repeat(127) + 'x'])(
      'should accept a name with 255 bytes',
      (newName) => {
        getWrapper({
          setup: ({ isFileNameValid }) => {
            const { isValid } = isFileNameValid(
              { name: 'currentName', path: '/currentName' } as Resource,
              newName
            )
            expect(isValid).toBe(true)
          }
        })
      }
    )

    it.each(['x'.repeat(256), 'ä'.repeat(128)])(
      'should reject a name with 256 bytes',
      (newName) => {
        getWrapper({
          setup: ({ isFileNameValid }) => {
            const { isValid, error } = isFileNameValid(
              { name: 'currentName', path: '/currentName' } as Resource,
              newName
            )
            expect(isValid).toBe(false)
            expect(error).toEqual('The name is too long')
          }
        })
      }
    )

    it('should not show an error if new name already exists but in different folder', () => {
      getWrapper({
        setup: ({ isFileNameValid }) => {
          const resourcesStore = useResourcesStore()
          resourcesStore.resources = [{ name: 'file1', path: '/file1' }] as Resource[]

          const { isValid, error } = isFileNameValid(
            mock<Resource>({ name: 'currentName', path: '/favorites/currentName' }),
            'file1'
          )
          expect(isValid).toBe(true)
          expect(error).toBeUndefined()
        }
      })
    })

    it('should show an error if new name is already taken', () => {
      getWrapper({
        setup: ({ isFileNameValid }) => {
          const parentResources = [
            { name: 'currentName', path: '/currentName' } as Resource,
            { name: 'otherName', path: '/otherName' } as Resource
          ]
          const { isValid, error } = isFileNameValid(
            mock<Resource>({ name: 'currentName', path: '/currentName' }),
            'otherName',
            parentResources
          )
          expect(isValid).toBe(false)
          expect(error).toEqual('The name »otherName« is already taken')
        }
      })
    })

    it.each([
      { currentName: 'currentName', newName: '', message: 'The name cannot be empty' },
      {
        currentName: 'currentName',
        newName: 'new/name',
        message: 'The name cannot contain "/"'
      },
      {
        currentName: 'currentName',
        newName: 'new\\name',
        message: 'The name cannot contain "\\"'
      },
      {
        currentName: 'currentName',
        newName: '.',
        message: 'The name cannot be equal to "."'
      },
      {
        currentName: 'currentName',
        newName: '..',
        message: 'The name cannot be equal to ".."'
      },
      {
        currentName: 'currentName',
        newName: 'newname ',
        message: 'The name cannot start or end with whitespace'
      },
      {
        currentName: 'currentName',
        newName: ' newname',
        message: 'The name cannot start or end with whitespace'
      },
      {
        currentName: 'currentName',
        newName: ' newname ',
        message: 'The name cannot start or end with whitespace'
      },
      {
        currentName: 'currentName',
        newName: 'file1',
        message: 'The name »file1« is already taken'
      },
      {
        currentName: 'currentName',
        newName: 'newname',
        parentResources: [{ name: 'newname', path: '/newname' } as Resource],
        message: 'The name »newname« is already taken'
      },
      {
        currentName: 'currentName',
        newName: 'l'.repeat(RESOURCE_NAME_MAX_BYTES + 1),
        message: `The name is too long`
      }
    ])('should detect name errors and display error messages accordingly %$', (inputData) => {
      getWrapper({
        setup: ({ isFileNameValid }) => {
          const resourcesStore = useResourcesStore()
          resourcesStore.resources = [{ name: 'file1', path: '/file1' }] as Resource[]

          const { isValid, error } = isFileNameValid(
            mock<Resource>({ name: inputData.currentName, path: `/${inputData.currentName}` }),
            inputData.newName,
            inputData.parentResources
          )
          expect(isValid).toBe(false)
          expect(error).toEqual(inputData.message)
        }
      })
    })

    describe('in a vault', () => {
      const maxNameBytes = 10
      const vaultName = 'long-vault-name.vault'
      const space = mock<SpaceResource>()

      function registerVault() {
        const extensionRegistry = useExtensionRegistry()
        extensionRegistry.extensions = [
          ref([
            mock<VaultExtension>({
              type: 'vault',
              claimsPath: (_space, path) =>
                path.startsWith(`/${vaultName}`)
                  ? { vaultRoot: `/${vaultName}`, encryptsNames: true, maxNameBytes }
                  : null
            })
          ])
        ]
      }

      it.each(['x'.repeat(maxNameBytes + 1), 'ä'.repeat(6)])(
        'should reject a name exceeding the vault limit: %s',
        (newName) => {
          getWrapper({
            setup: ({ isFileNameValid }) => {
              registerVault()
              const { isValid, error } = isFileNameValid(
                { name: 'currentName', path: `/${vaultName}/currentName` } as Resource,
                newName,
                [],
                space
              )
              expect(isValid).toBe(false)
              expect(error).toEqual('The name is too long for an encrypted folder')
            }
          })
        }
      )

      it('should accept a name within the vault limit', () => {
        getWrapper({
          setup: ({ isFileNameValid }) => {
            registerVault()
            const { isValid } = isFileNameValid(
              { name: 'currentName', path: `/${vaultName}/currentName` } as Resource,
              'x'.repeat(maxNameBytes),
              [],
              space
            )
            expect(isValid).toBe(true)
          }
        })
      })

      it('should not apply the vault limit to the vault root itself', () => {
        getWrapper({
          setup: ({ isFileNameValid }) => {
            registerVault()
            const { isValid } = isFileNameValid(
              { name: 'currentName', path: '/currentName' } as Resource,
              vaultName,
              [],
              space
            )
            expect(isValid).toBe(true)
          }
        })
      })

      it('should not apply the vault limit outside of a vault', () => {
        getWrapper({
          setup: ({ isFileNameValid }) => {
            registerVault()
            const { isValid } = isFileNameValid(
              { name: 'currentName', path: '/folder/currentName' } as Resource,
              'x'.repeat(maxNameBytes + 1),
              [],
              space
            )
            expect(isValid).toBe(true)
          }
        })
      })
    })
  })
  describe('method "isSpaceNameValid"', () => {
    it('should not show an error if new name is valid', () => {
      getWrapper({
        setup: ({ isSpaceNameValid }) => {
          const { isValid, error } = isSpaceNameValid('space')
          expect(isValid).toBe(true)
          expect(error).toBeUndefined()
        }
      })
    })

    it.each([
      { newName: '', message: 'The Space name cannot be empty' },

      {
        newName: 'newname ',
        message: 'The Space name cannot start or end with whitespace'
      },
      {
        newName: ' newname',
        message: 'The Space name cannot start or end with whitespace'
      },
      {
        newName: ' newname ',
        message: 'The Space name cannot start or end with whitespace'
      },
      {
        newName: 'l'.repeat(RESOURCE_NAME_MAX_BYTES + 1),
        message: 'The Space name is too long'
      }
    ])('should detect name errors and display error messages accordingly %$', (inputData) => {
      getWrapper({
        setup: ({ isSpaceNameValid }) => {
          const resourcesStore = useResourcesStore()
          resourcesStore.resources = [{ name: 'file1', path: '/file1' }] as Resource[]

          const { isValid, error } = isSpaceNameValid(inputData.newName)
          expect(isValid).toBe(false)
          expect(error).toEqual(inputData.message)
        }
      })
    })

    it.each(['/', '\\', '.', ':', '?', '*', '"', '>', '<', '|'])(
      'should show an error if name contains special character: %s',
      (specialChar) => {
        getWrapper({
          setup: ({ isSpaceNameValid }) => {
            const { isValid, error } = isSpaceNameValid(specialChar)
            expect(isValid).toBe(false)
            expect(error).toEqual(
              'The Space name cannot contain the following characters: / \\\\ . : ? * " > < |\''
            )
          }
        })
      }
    )
  })
})

function getWrapper({
  setup
}: {
  setup: (
    instance: ReturnType<typeof useIsResourceNameValid>,
    {
      space,
      clientService
    }: {
      space: SpaceResource
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
}) {
  const mocks = {
    ...defaultComponentMocks(),
    space: mockDeep<SpaceResource>({
      webDavPath: 'irrelevant'
    })
  }

  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useIsResourceNameValid()
        setup(instance, { space: mocks.space, clientService: mocks.$clientService })
      },
      {
        mocks,
        provide: mocks
      }
    )
  }
}
