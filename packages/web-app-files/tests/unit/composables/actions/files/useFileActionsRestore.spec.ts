import { useFileActionsRestore } from '../../../../../src/composables/actions'
import { mock } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import {
  ConflictDialog,
  getVaultClaim,
  getVaultNameMaxBytes,
  resolveVaultEngine,
  ResolveConflict,
  ResolveStrategy,
  useMessages,
  useModals,
  useResourcesStore,
  useRestoreWorker,
  VaultClaim,
  VaultEngine
} from '@opencloud-eu/web-pkg'
import { flushPromises } from '@vue/test-utils'
import { unref } from 'vue'
import { HttpError, Resource, TrashResource } from '@opencloud-eu/web-client'
import { ProjectSpaceResource, SpaceResource } from '@opencloud-eu/web-client'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRestoreWorker: vi.fn(),
  getVaultNameMaxBytes: vi.fn(),
  getVaultClaim: vi.fn(),
  resolveVaultEngine: vi.fn()
}))

describe('restore', () => {
  beforeEach(() => {
    vi.mocked(getVaultClaim).mockReturnValue(null)
    vi.mocked(resolveVaultEngine).mockResolvedValue(null)
  })

  describe('isVisible property', () => {
    it('should be false when no resource is given', () => {
      getWrapper({
        setup: ({ actions }, { space }) => {
          expect(unref(actions)[0].isVisible({ space, resources: [] })).toBe(false)
        }
      })
    })
    it('should be true when permission is sufficient', () => {
      getWrapper({
        setup: ({ actions }, { space }) => {
          expect(
            unref(actions)[0].isVisible({
              space,
              resources: [{ canBeRestored: () => true, ddate: '2020-01-01' }] as TrashResource[]
            })
          ).toBe(true)
        }
      })
    })
    it('should be false when permission is not sufficient', () => {
      getWrapper({
        setup: ({ actions }, { space }) => {
          expect(
            unref(actions)[0].isVisible({
              space,
              resources: [{ canBeRestored: () => false }] as TrashResource[]
            })
          ).toBe(false)
        }
      })
    })
    it('should be false when location is invalid', () => {
      getWrapper({
        invalidLocation: true,
        setup: ({ actions }, { space }) => {
          expect(unref(actions)[0].isVisible({ space, resources: [{}] as TrashResource[] })).toBe(
            false
          )
        }
      })
    })
    it('should be false in a space trash bin with insufficient permissions', () => {
      getWrapper({
        driveType: 'project',
        setup: ({ actions }, { space }) => {
          expect(
            unref(actions)[0].isVisible({
              space,
              resources: [{ canBeRestored: () => true }] as TrashResource[]
            })
          ).toBe(false)
        }
      })
    })
  })

  describe('method "restoreResources"', () => {
    it('should show message on success', () => {
      const resourcesToRestore = [{ id: '1', path: '/1' }] as TrashResource[]

      getWrapper({
        setup: ({ restoreResources }, { space }) => {
          restoreResources(space, resourcesToRestore, [])

          const { showMessage } = useMessages()
          expect(showMessage).toHaveBeenCalledTimes(1)

          const { removeResources, resetSelection } = useResourcesStore()
          expect(removeResources).toHaveBeenCalledTimes(1)
          expect(resetSelection).toHaveBeenCalledTimes(1)
        },
        restoreResult: { successful: resourcesToRestore, failed: [] }
      })
    })

    it('should show message on error', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const resourcesToRestore = [{ id: '1', path: '/1' }] as TrashResource[]

      getWrapper({
        setup: ({ restoreResources }, { space }) => {
          restoreResources(space, resourcesToRestore, [])

          const { showErrorMessage } = useMessages()
          expect(showErrorMessage).toHaveBeenCalledTimes(1)

          const { removeResources } = useResourcesStore()
          expect(removeResources).toHaveBeenCalledTimes(0)
        },
        restoreResult: {
          successful: [],
          failed: [{ resource: resourcesToRestore[0], error: new HttpError('', undefined) }]
        }
      })
    })
  })

  it('should request parent folder on collecting restore conflicts', () => {
    getWrapper({
      setup: async ({ collectConflicts }, { space, clientService }) => {
        const resource = { id: '1', path: '1', name: '1' } as TrashResource
        await collectConflicts(space, [resource])

        expect(clientService.webdav.listFiles).toHaveBeenCalledWith(expect.anything(), {
          path: '.'
        })
      }
    })
  })

  it('should find conflict within resources', () => {
    getWrapper({
      setup: async ({ collectConflicts }, { space }) => {
        const resourceOne = { id: '1', path: '1', name: '1' } as TrashResource
        const resourceTwo = { id: '2', path: '1', name: '1' } as TrashResource
        const { conflicts } = await collectConflicts(space, [resourceOne, resourceTwo])

        expect(conflicts).toContain(resourceTwo)
      }
    })
  })

  it('should name the type of the existing resource in the conflict dialog', async () => {
    let instance: ReturnType<typeof useFileActionsRestore>
    let space: SpaceResource
    const { mocks } = getWrapper({
      setup: (i, { space: s }) => {
        instance = i
        space = s
      }
    })
    mocks.$clientService.webdav.listFiles.mockResolvedValue({
      resource: mock<Resource>(),
      children: [mock<Resource>({ name: 'dup', isFolder: true })]
    })
    const resource = { id: '1', path: '/dup', name: 'dup', type: 'file' } as TrashResource

    unref(instance.actions)[0].handler({ space, resources: [resource] })
    await flushPromises()

    const { dispatchModal } = useModals()
    expect(dispatchModal).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Folder already exists' })
    )
  })

  it('should not restore a copy whose name is too long for a vault', async () => {
    let instance: ReturnType<typeof useFileActionsRestore>
    let space: SpaceResource
    const { mocks } = getWrapper({
      setup: (i, { space: s }) => {
        instance = i
        space = s
      }
    })
    mocks.$clientService.webdav.listFiles.mockResolvedValue({
      resource: mock<Resource>(),
      children: [mock<Resource>({ name: 'dup' })]
    })
    vi.spyOn(ConflictDialog.prototype, 'resolveFileExists').mockResolvedValueOnce({
      strategy: ResolveStrategy.KEEP_BOTH,
      doForAllConflicts: false
    })
    vi.mocked(getVaultNameMaxBytes).mockReturnValueOnce('dup'.length)
    const resource = { id: '1', path: '/dup', name: 'dup', type: 'file' } as TrashResource

    unref(instance.actions)[0].handler({ space, resources: [resource] })
    await flushPromises()

    const { showErrorMessage } = useMessages()
    expect(showErrorMessage).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Name too long for an encrypted folder' })
    )
    expect(useRestoreWorker().startWorker).not.toHaveBeenCalled()
  })

  it('should find conflict by the encrypted path of a locked vault resource', () => {
    getWrapper({
      setup: async ({ collectConflicts }, { space, clientService }) => {
        clientService.webdav.listFiles.mockResolvedValue({
          resource: mock<Resource>(),
          children: [mock<Resource>({ name: 'enc' })]
        })
        const resource = { id: '1', path: '/my.vault/enc', name: 'file.txt' } as TrashResource
        const { conflicts } = await collectConflicts(space, [resource])

        expect(conflicts).toContain(resource)
      }
    })
  })

  describe('vault conflicts', () => {
    const vaultClaim = { vaultRoot: '/my.vault', encryptsNames: true } as VaultClaim
    const fileA = { id: 'a', path: '/a.txt', name: 'a.txt', type: 'file' } as TrashResource
    const fileB = { id: 'b', path: '/b.txt', name: 'b.txt', type: 'file' } as TrashResource
    const vaultFile = {
      id: 'v',
      path: '/my.vault/enc',
      name: 'file.txt',
      type: 'file'
    } as TrashResource

    async function restore(
      resources: TrashResource[],
      { locked = true, claim = vaultClaim }: { locked?: boolean; claim?: VaultClaim } = {}
    ) {
      vi.mocked(getVaultClaim).mockImplementation((_registry, _space, path) =>
        path.startsWith(claim.vaultRoot) ? claim : null
      )
      vi.mocked(resolveVaultEngine).mockResolvedValue(locked ? null : mock<VaultEngine>())
      let instance: ReturnType<typeof useFileActionsRestore>
      let space: SpaceResource
      const { mocks } = getWrapper({
        setup: (i, { space: s }) => {
          instance = i
          space = s
        }
      })
      const childrenByPath: Record<string, Resource[]> = {
        '/': [
          mock<Resource>({ name: 'a.txt', isFolder: false }),
          mock<Resource>({ name: 'b.txt', isFolder: false }),
          mock<Resource>({ name: 'my.vault', isFolder: true })
        ],
        '/my.vault': [mock<Resource>({ name: 'enc', isFolder: true })]
      }
      mocks.$clientService.webdav.listFiles.mockImplementation((_space, { path }) =>
        Promise.resolve({ resource: mock<Resource>(), children: childrenByPath[path] })
      )

      void unref(instance.actions)[0].handler({ space, resources })
      await flushPromises()
    }

    function dialogAttrs(index: number) {
      const { dispatchModal } = useModals()
      return vi.mocked(dispatchModal).mock.calls[index][0].customComponentAttrs()
    }

    async function resolveDialog(index: number, resolveConflict: ResolveConflict) {
      const { callbackFn } = dialogAttrs(index) as {
        callbackFn: (resolveConflict: ResolveConflict) => void
      }
      callbackFn(resolveConflict)
      await flushPromises()
    }

    function restoredPaths() {
      const { startWorker } = useRestoreWorker()
      return vi.mocked(startWorker).mock.calls[0][0].resources.map(({ path }) => path)
    }

    it.each([
      { locked: true, hideKeepBoth: true },
      { locked: false, hideKeepBoth: false }
    ])(
      'sets "hideKeepBoth" to $hideKeepBoth if the vault is locked: $locked',
      async ({ locked, hideKeepBoth }) => {
        await restore([vaultFile], { locked })

        expect(dialogAttrs(0)).toEqual(expect.objectContaining({ hideKeepBoth }))
      }
    )

    it.each([
      {
        description: 'the vault root',
        resource: { ...vaultFile, path: '/my.vault' },
        claim: vaultClaim
      },
      {
        description: 'a vault without name encryption',
        resource: vaultFile,
        claim: { ...vaultClaim, encryptsNames: false }
      }
    ])('allows "Keep both" for $description', async ({ resource, claim }) => {
      await restore([resource as TrashResource], { claim })

      expect(dialogAttrs(0)).toEqual(expect.objectContaining({ hideKeepBoth: false }))
    })

    it('names the type of the existing resource in a locked vault', async () => {
      await restore([vaultFile])

      const { dispatchModal } = useModals()
      expect(dispatchModal).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Folder already exists' })
      )
    })

    it('asks again without "Keep both" for a locked vault conflict after "Keep both" for all', async () => {
      await restore([fileA, fileB, vaultFile])
      await resolveDialog(0, { strategy: ResolveStrategy.KEEP_BOTH, doForAllConflicts: true })

      const { dispatchModal } = useModals()
      expect(dispatchModal).toHaveBeenCalledTimes(2)
      expect(dialogAttrs(1)).toEqual(
        expect.objectContaining({ hideKeepBoth: true, conflictCount: 1 })
      )

      await resolveDialog(1, { strategy: ResolveStrategy.REPLACE, doForAllConflicts: false })

      const paths = restoredPaths()
      expect(paths).toHaveLength(3)
      expect(paths).toContain('/my.vault/enc')
      expect(paths).not.toContain('/a.txt')
      expect(paths).not.toContain('/b.txt')
    })

    it('applies "Replace" for all to a locked vault conflict without asking again', async () => {
      await restore([fileA, vaultFile])
      await resolveDialog(0, { strategy: ResolveStrategy.REPLACE, doForAllConflicts: true })

      const { dispatchModal } = useModals()
      expect(dispatchModal).toHaveBeenCalledTimes(1)
      expect(restoredPaths()).toEqual(['/a.txt', '/my.vault/enc'])
    })
  })

  it('should add files without conflict to resolved resources', () => {
    getWrapper({
      setup: async ({ collectConflicts }, { space }) => {
        const resource = { id: '1', path: '1', name: '1' } as TrashResource
        const { resolvedResources } = await collectConflicts(space, [resource])

        expect(resolvedResources).toContain(resource)
      }
    })
  })
})

function getWrapper({
  invalidLocation = false,
  driveType = 'personal',
  restoreResult = { successful: [], failed: [] },
  setup
}: {
  invalidLocation?: boolean
  driveType?: string
  restoreResult?: {
    successful: TrashResource[]
    failed: { resource: TrashResource; error: HttpError }[]
  }
  setup: (
    instance: ReturnType<typeof useFileActionsRestore>,
    {
      space
    }: {
      space: SpaceResource
      router: ReturnType<typeof defaultComponentMocks>['$router']
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
}) {
  vi.mocked(useRestoreWorker).mockReturnValue({
    startWorker: vi.fn().mockImplementation((_, callback) => {
      callback(restoreResult)
    })
  })

  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({
        name: invalidLocation ? 'files-spaces-generic' : 'files-trash-generic'
      })
    }),
    space: mock<ProjectSpaceResource>({ driveType })
  }
  mocks.$clientService.webdav.listFiles.mockImplementation(() => {
    return Promise.resolve({ resource: mock<Resource>(), children: [] })
  })
  mocks.$clientService.graphAuthenticated.drives.getDrive.mockResolvedValue(mock<SpaceResource>())

  return {
    mocks,
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsRestore()
        setup(instance, {
          space: mocks.space,
          router: mocks.$router,
          clientService: mocks.$clientService
        })
      },
      {
        mocks,
        provide: mocks
      }
    )
  }
}
