import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import {
  useSpacesStore,
  sortSpaceMembers,
  useSharesStore,
  useUserStore
} from '../../../../src/composables/piniaStores'
import { createPinia, setActivePinia } from 'pinia'
import { mock, mockDeep } from 'vitest-mock-extended'
import {
  CollaboratorShare,
  GraphSharePermission,
  ShareRole,
  SpaceResource
} from '@opencloud-eu/web-client'
import { Graph } from '@opencloud-eu/web-client/graph'
import { User } from '@opencloud-eu/web-client/graph/generated'

describe('spaces', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('method "sortSpaceMembers"', () => {
    it('sorts space members by amount of permissions', () => {
      const members = [
        mock<CollaboratorShare>({
          permissions: [],
          sharedWith: { displayName: 'user1' }
        }),
        mock<CollaboratorShare>({
          permissions: [GraphSharePermission.updatePermissions],
          sharedWith: { displayName: 'user2' }
        })
      ]

      const sortedMembers = sortSpaceMembers(members)
      expect(
        sortedMembers[0].permissions.includes(GraphSharePermission.updatePermissions)
      ).toBeTruthy()
    })
  })

  describe('computed "personalSpace"', () => {
    it('returns the personal space of a user', () => {
      getWrapper({
        setup: (instance) => {
          instance.spaces = [
            mock<SpaceResource>({ id: '1', isOwner: () => false, driveType: 'project' }),
            mock<SpaceResource>({ id: '2', isOwner: () => true, driveType: 'personal' })
          ]

          expect(instance.personalSpace.id).toEqual('2')
        }
      })
    })
  })

  describe('method "setSpacesInitialized"', () => {
    it('correctly sets spacesInitialized', () => {
      getWrapper({
        setup: (instance) => {
          instance.setSpacesInitialized(true)
          expect(instance.spacesInitialized).toEqual(true)

          instance.setSpacesInitialized(false)
          expect(instance.spacesInitialized).toEqual(false)
        }
      })
    })
  })
  describe('method "setMountPointsInitialized"', () => {
    it('correctly sets mountPointsInitialized', () => {
      getWrapper({
        setup: (instance) => {
          instance.setMountPointsInitialized(true)
          expect(instance.mountPointsInitialized).toEqual(true)

          instance.setMountPointsInitialized(false)
          expect(instance.mountPointsInitialized).toEqual(false)
        }
      })
    })
  })
  describe('method "setSpacesLoading"', () => {
    it('correctly sets spacesLoading', () => {
      getWrapper({
        setup: (instance) => {
          instance.setSpacesLoading(true)
          expect(instance.spacesLoading).toEqual(true)

          instance.setSpacesLoading(false)
          expect(instance.spacesLoading).toEqual(false)
        }
      })
    })
  })
  describe('method "setCurrentSpace"', () => {
    it('correctly sets the current space', () => {
      getWrapper({
        setup: (instance) => {
          expect(instance.currentSpace).not.toBeDefined()

          const space = mock<SpaceResource>()
          instance.setCurrentSpace(space)
          expect(instance.currentSpace).toEqual(space)
        }
      })
    })
  })
  describe('method "addSpaces"', () => {
    it('correctly adds given spaces', () => {
      getWrapper({
        setup: (instance) => {
          expect(instance.spaces.length).toBe(0)

          const spaces = [mock<SpaceResource>({ id: '1' }), mock<SpaceResource>({ id: '2' })]
          instance.addSpaces(spaces)
          expect(instance.spaces).toEqual(spaces)
        }
      })
    })
  })
  describe('method "removeSpace"', () => {
    it('correctly removes a given space', () => {
      getWrapper({
        setup: (instance) => {
          const spaces = [mock<SpaceResource>({ id: '1' })]
          instance.addSpaces(spaces)
          expect(instance.spaces).toEqual(spaces)

          instance.removeSpace(spaces[0])
          expect(instance.spaces.length).toBe(0)
        }
      })
    })
  })
  describe('method "upsertSpace"', () => {
    it('updates a given space if it exsits', () => {
      getWrapper({
        setup: (instance) => {
          const space = mock<SpaceResource>({ id: '1', name: 'foo' })
          instance.addSpaces([space])
          expect(instance.spaces.length).toBe(1)
          expect(instance.spaces[0].name).toEqual('foo')

          instance.upsertSpace({ ...space, name: 'bar' })
          expect(instance.spaces.length).toBe(1)
          expect(instance.spaces[0].name).toEqual('bar')
        }
      })
    })
    it('adds a given space if it does not exsit', () => {
      getWrapper({
        setup: (instance) => {
          const space = mock<SpaceResource>({ id: '1', name: 'foo' })
          instance.addSpaces([space])
          expect(instance.spaces.length).toBe(1)
          expect(instance.spaces[0].name).toEqual('foo')

          instance.upsertSpace(mock<SpaceResource>({ id: '2', name: 'bar' }))
          expect(instance.spaces.length).toBe(2)
        }
      })
    })
  })
  describe('method "updateSpaceField"', () => {
    it('correctly updates a field of a space', () => {
      getWrapper({
        setup: (instance) => {
          const space = mock<SpaceResource>({ id: '1', name: 'foo' })
          instance.addSpaces([space])
          expect(instance.spaces.length).toBe(1)
          expect(instance.spaces[0].name).toEqual('foo')

          instance.updateSpaceField({ id: space.id, field: 'name', value: 'bar' })
          expect(instance.spaces[0].name).toEqual('bar')
        }
      })
    })
  })
  describe('"allProjectSpaces" (admin settings)', () => {
    const projectSpace = (data: Partial<SpaceResource>) =>
      ({ driveType: 'project', ...data }) as SpaceResource

    it('is not loaded by default and not touched by upserts then', () => {
      const store = useSpacesStore()
      store.upsertSpace(projectSpace({ id: '1' }))
      expect(store.allProjectSpaces).toBeUndefined()
      expect(store.spaces.map(({ id }) => id)).toEqual(['1'])
    })
    it('keeps the spaces of the current user separate', () => {
      const store = useSpacesStore()
      store.setAllProjectSpaces([projectSpace({ id: '1' }), projectSpace({ id: '2' })])
      expect(store.spaces).toEqual([])
    })
    it('adds upserted project spaces, e.g. when created via the FAB', () => {
      const store = useSpacesStore()
      store.setAllProjectSpaces([projectSpace({ id: '1' })])
      store.upsertSpace(projectSpace({ id: '2' }))
      store.upsertSpace(mock<SpaceResource>({ id: '3', driveType: 'personal' }))
      expect(store.allProjectSpaces.map(({ id }) => id)).toEqual(['1', '2'])
    })
    it('keeps the spaces of both lists separate objects', () => {
      const store = useSpacesStore()
      store.setAllProjectSpaces([])
      store.upsertSpace(projectSpace({ id: '1', name: 'foo' }))
      expect(store.spaces[0]).not.toBe(store.allProjectSpaces[0])

      const permissions = [{ id: 'permission' }] as SpaceResource['root']['permissions']
      store.allProjectSpaces[0].root = { permissions }
      store.upsertSpace(projectSpace({ id: '1', name: 'bar', root: {} }))
      // the admin settings loads the members again if an update comes without them
      expect(store.allProjectSpaces[0].name).toBe('bar')
      expect(store.allProjectSpaces[0].root.permissions).toBeUndefined()
      expect(store.spaces[0].name).toBe('bar')
    })
    it('updates fields in both lists', () => {
      const store = useSpacesStore()
      store.addSpaces([projectSpace({ id: '1', name: 'foo' })])
      store.setAllProjectSpaces([projectSpace({ id: '1', name: 'foo' })])
      store.updateSpaceField({ id: '1', field: 'name', value: 'bar' })
      expect(store.spaces[0].name).toBe('bar')
      expect(store.allProjectSpaces[0].name).toBe('bar')
    })
    it('removes spaces from both lists', () => {
      const store = useSpacesStore()
      store.addSpaces([projectSpace({ id: '1' })])
      store.setAllProjectSpaces([projectSpace({ id: '1' }), projectSpace({ id: '2' })])
      store.removeSpace(projectSpace({ id: '1' }))
      expect(store.spaces).toEqual([])
      expect(store.allProjectSpaces.map(({ id }) => id)).toEqual(['2'])
    })
    it('keeps spaces the current user only lost access to', () => {
      const store = useSpacesStore()
      store.addSpaces([projectSpace({ id: '1' })])
      store.setAllProjectSpaces([projectSpace({ id: '1' })])
      store.removeSpace(projectSpace({ id: '1' }), { deleted: false })
      expect(store.spaces).toEqual([])
      expect(store.allProjectSpaces.map(({ id }) => id)).toEqual(['1'])
    })
    it('loads the permissions of spaces whose copy of the current user has them already', async () => {
      const store = useSpacesStore()
      // e.g. the space was opened in the files app before
      store.addSpaces([projectSpace({ id: '1', graphPermissions: [] })])
      store.setAllProjectSpaces([projectSpace({ id: '1' })])
      const graphClient = mockDeep<Graph>()
      graphClient.permissions.listPermissions.mockResolvedValue({ allowedActions: [] } as any)

      await store.loadGraphPermissions({ ids: ['1'], graphClient })

      expect(store.allProjectSpaces[0].graphPermissions).toEqual([])
    })
    it('loads the permissions of spaces the user is not a member of as none', async () => {
      const store = useSpacesStore()
      store.setAllProjectSpaces([projectSpace({ id: '1' }), projectSpace({ id: '2' })])
      const graphClient = mockDeep<Graph>()
      graphClient.permissions.listPermissions.mockImplementation((id) =>
        id === '1'
          ? Promise.resolve({ allowedActions: ['libre.graph/driveItem/permissions/delete'] } as any)
          : Promise.reject({ response: { status: 404 } })
      )

      await store.loadGraphPermissions({ ids: ['1', '2'], graphClient })

      expect(store.allProjectSpaces[0].graphPermissions).toEqual([
        'libre.graph/driveItem/permissions/delete'
      ])
      expect(store.allProjectSpaces[1].graphPermissions).toEqual([])
    })
    it('derives the permissions of disabled spaces from the role of the current user', async () => {
      const store = useSpacesStore()
      useUserStore().setUser({ id: 'user', memberOf: [{ id: 'group' }] } as User)
      useSharesStore().graphRoles = {
        manager: {
          id: 'manager',
          rolePermissions: [
            { condition: 'exists @Resource.Root', allowedResourceActions: ['manage'] }
          ]
        } as ShareRole
      }
      store.addSpaces([projectSpace({ id: '1', disabled: true })])
      const graphClient = mockDeep<Graph>()
      graphClient.drives.listMyDrives.mockResolvedValue([
        {
          root: { permissions: [{ grantedToV2: { group: { id: 'group' } }, roles: ['manager'] }] }
        }
      ] as SpaceResource[])

      await store.loadGraphPermissions({ ids: ['1'], graphClient })

      expect(graphClient.drives.listMyDrives).toHaveBeenCalledWith({
        filter: "id eq '1'",
        expand: 'root($expand=permissions)'
      })
      expect(graphClient.permissions.listPermissions).not.toHaveBeenCalled()
      expect(store.spaces[0].graphPermissions).toEqual(['manage'])
    })
    it('loads no permissions for disabled spaces the user has no role in', async () => {
      const store = useSpacesStore()
      useUserStore().setUser({ id: 'user' } as User)
      store.addSpaces([projectSpace({ id: '1', disabled: true })])
      const graphClient = mockDeep<Graph>()
      graphClient.drives.listMyDrives.mockResolvedValue([{ root: {} }] as SpaceResource[])

      await store.loadGraphPermissions({ ids: ['1'], graphClient })

      expect(store.spaces[0].graphPermissions).toEqual([])
    })
    it('can load permissions again after a failed request', async () => {
      const store = useSpacesStore()
      store.setAllProjectSpaces([projectSpace({ id: '1' })])
      const graphClient = mockDeep<Graph>()
      graphClient.permissions.listPermissions.mockRejectedValueOnce(new Error('network'))

      await expect(store.loadGraphPermissions({ ids: ['1'], graphClient })).rejects.toThrow()

      graphClient.permissions.listPermissions.mockResolvedValueOnce({ allowedActions: [] } as any)
      await store.loadGraphPermissions({ ids: ['1'], graphClient })
      expect(graphClient.permissions.listPermissions).toHaveBeenCalledTimes(2)
      expect(store.allProjectSpaces[0].graphPermissions).toEqual([])
    })
  })
  describe('method "loadSpaces"', () => {
    it('correctly loads personal and project spaces', () => {
      getWrapper({
        setup: async (instance) => {
          const spaces = [mock<SpaceResource>({ id: '1' })]
          const graphClient = mockDeep<Graph>()
          graphClient.drives.listMyDrives.mockResolvedValue(spaces)
          await instance.loadSpaces({ graphClient })

          expect(graphClient.drives.listMyDrives).toHaveBeenCalledTimes(2)
          expect(graphClient.drives.listMyDrives).toHaveBeenNthCalledWith(
            1,
            {
              orderBy: 'name asc',
              filter: 'driveType eq personal'
            },
            expect.anything()
          )
          expect(graphClient.drives.listMyDrives).toHaveBeenNthCalledWith(
            2,
            {
              orderBy: 'name asc',
              filter: 'driveType eq project'
            },
            expect.anything()
          )
          expect(instance.spaces.length).toBe(2)
          expect(instance.spacesLoading).toBeFalsy()
        }
      })
    })
  })
  describe('method "loadMountPoints"', () => {
    it('correctly loads mount points', () => {
      getWrapper({
        setup: async (instance) => {
          const spaces = [mock<SpaceResource>({ id: '1' })]
          const graphClient = mockDeep<Graph>()
          graphClient.drives.listMyDrives.mockResolvedValue(spaces)
          await instance.loadMountPoints({ graphClient })

          expect(graphClient.drives.listMyDrives).toHaveBeenCalledTimes(1)
          expect(graphClient.drives.listMyDrives).toHaveBeenCalledWith(
            {
              orderBy: 'name asc',
              filter: 'driveType eq mountpoint'
            },
            expect.anything()
          )
          expect(instance.spaces.length).toBe(1)
          expect(instance.mountPointsInitialized).toBeTruthy()
        }
      })
    })
  })
  describe('method "reloadProjectSpaces"', () => {
    it('correctly reloads project spaces', () => {
      getWrapper({
        setup: async (instance) => {
          const spaces = [mock<SpaceResource>({ id: '1' })]
          const graphClient = mockDeep<Graph>()
          graphClient.drives.listMyDrives.mockResolvedValue(spaces)
          await instance.reloadProjectSpaces({ graphClient })

          expect(graphClient.drives.listMyDrives).toHaveBeenCalledTimes(1)
          expect(graphClient.drives.listMyDrives).toHaveBeenCalledWith(
            {
              orderBy: 'name asc',
              filter: 'driveType eq project'
            },
            expect.anything()
          )
          expect(instance.spaces.length).toBe(1)
        }
      })
    })
  })
  describe('method "getSpaceMembers"', () => {
    it('correctly returns members for project spaces', () => {
      getWrapper({
        setup: (instance) => {
          const space = mock<SpaceResource>({ id: '1', driveType: 'project' })
          const sharesStore = useSharesStore()
          sharesStore.collaboratorShares = [mock<CollaboratorShare>({ resourceId: space.id })]
          const members = instance.getSpaceMembers(space)

          expect(members.length).toBe(1)
        }
      })
    })
    it('does not return members for personal space', () => {
      getWrapper({
        setup: (instance) => {
          const space = mock<SpaceResource>({ id: '1', driveType: 'personal' })
          const sharesStore = useSharesStore()
          sharesStore.collaboratorShares = [mock<CollaboratorShare>({ resourceId: space.id })]
          const members = instance.getSpaceMembers(space)

          expect(members.length).toBe(0)
        }
      })
    })
  })
  describe('method "getMountPointForSpace"', () => {
    it('returns a matching mount point', () => {
      getWrapper({
        setup: async (instance) => {
          const graphClient = mockDeep<Graph>()
          const space = mock<SpaceResource>({ id: '1', driveType: 'project' })
          const mountpoints = [
            mock<SpaceResource>({
              id: '2',
              driveType: 'mountpoint',
              root: { remoteItem: { id: space.id } }
            })
          ]
          instance.spaces = mountpoints
          instance.mountPointsInitialized = true
          const mountPoint = await instance.getMountPointForSpace({ graphClient, space })

          expect(mountPoint).toEqual(mountpoints[0])
        }
      })
    })
  })
})

function getWrapper({ setup }: { setup: (instance: ReturnType<typeof useSpacesStore>) => void }) {
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useSpacesStore()
        setup(instance)
      },
      { pluginOptions: { pinia: false } }
    )
  }
}
