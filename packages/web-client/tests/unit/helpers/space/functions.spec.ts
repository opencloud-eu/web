import { buildSpace, getSpaceManagers, SpaceResource } from '../../../../src/helpers/space'
import { mock } from 'vitest-mock-extended'
import { Ability, GraphSharePermission } from '@opencloud-eu/web-client'
import { Drive, Permission, User } from '@opencloud-eu/web-client/graph/generated'

describe('buildSpace', () => {
  const id = '1'

  const getSpace = ({ permissions }: { permissions: string[] }) => {
    const space = buildSpace({} as Drive)
    return { ...space, graphPermissions: permissions } as SpaceResource
  }

  describe('canUpload', () => {
    it.each([
      { permissions: [GraphSharePermission.createUpload], expectedResult: true },
      { permissions: [], expectedResult: false }
    ])(
      'behaves accordingly to the given role and permissions',
      ({ permissions, expectedResult }) => {
        const space = getSpace({ permissions })
        expect(space.canUpload({ user: mock<User>({ id, memberOf: [] }) })).toBe(expectedResult)
      }
    )
  })

  describe('isOwner', () => {
    it('is true for the owner', () => {
      const space = buildSpace({ owner: { user: { id } } } as Drive)
      expect(space.isOwner(mock<User>({ id }))).toBeTruthy()
    })

    it('is false for another user', () => {
      const space = buildSpace({ owner: { user: { id } } } as Drive)
      expect(space.isOwner(mock<User>({ id: '2' }))).toBeFalsy()
    })

    it('is false without a user and owner, e.g. for a guest in a share space', () => {
      const space = buildSpace({} as Drive)
      expect(space.isOwner(undefined)).toBeFalsy()
    })
  })

  describe('canDownload', () => {
    it('is always true', () => {
      const space = getSpace({ permissions: [] })
      expect(space.canDownload()).toBeTruthy()
    })
  })

  describe('canBeDeleted', () => {
    it.each([
      {
        userCan: false,
        permissions: [GraphSharePermission.deletePermissions],
        disabled: true,
        expectedResult: false
      },
      {
        userCan: true,
        permissions: [],
        disabled: true,
        expectedResult: true
      },
      {
        userCan: true,
        permissions: [],
        disabled: false,
        expectedResult: false
      }
    ])(
      'behaves accordingly to the given permissions, abilities and disabled state',
      ({ permissions, expectedResult, userCan, disabled }) => {
        const ability = mock<Ability>({ can: () => userCan })
        const space = getSpace({ permissions })
        space.disabled = disabled
        expect(space.canBeDeleted({ user: mock<User>({ id, memberOf: [] }), ability })).toBe(
          expectedResult
        )
      }
    )
  })

  describe('canRename', () => {
    it.each([
      {
        userCan: false,
        permissions: [GraphSharePermission.deletePermissions],
        expectedResult: true
      },
      {
        userCan: false,
        permissions: [],
        expectedResult: false
      },
      {
        userCan: true,
        permissions: [],
        expectedResult: true
      }
    ])(
      'behaves accordingly to the given role, permissions and abilities',
      ({ permissions, expectedResult, userCan }) => {
        const ability = mock<Ability>({ can: () => userCan })
        const space = getSpace({ permissions })
        expect(space.canRename({ user: mock<User>({ id, memberOf: [] }), ability })).toBe(
          expectedResult
        )
      }
    )
  })

  describe('canEditDescription', () => {
    it.each([
      {
        userCan: false,
        permissions: [GraphSharePermission.deletePermissions],
        expectedResult: true
      },
      {
        userCan: false,
        permissions: [],
        expectedResult: false
      },
      {
        userCan: true,
        permissions: [],
        expectedResult: true
      }
    ])(
      'behaves accordingly to the given role, permissions and abilities',
      ({ permissions, expectedResult, userCan }) => {
        const ability = mock<Ability>({ can: () => userCan })
        const space = getSpace({ permissions })
        expect(space.canEditDescription({ user: mock<User>({ id, memberOf: [] }), ability })).toBe(
          expectedResult
        )
      }
    )
  })

  describe('canShare', () => {
    it.each([
      {
        permissions: [GraphSharePermission.createPermissions],
        expectedResult: true
      },
      { permissions: [], expectedResult: false }
    ])(
      'behaves accordingly to the given role and permissions',
      ({ permissions, expectedResult }) => {
        const space = getSpace({ permissions })
        expect(space.canShare({ user: mock<User>({ id, memberOf: [] }) })).toBe(expectedResult)
      }
    )
  })

  describe('canRestore', () => {
    it.each([
      { disabled: true, expectedResult: true },
      { disabled: false, expectedResult: false }
    ])('is $expectedResult if the space is disabled: $disabled', ({ disabled, expectedResult }) => {
      const space = getSpace({ permissions: [] })
      space.disabled = disabled
      expect(space.canRestore()).toBe(expectedResult)
    })
  })

  describe('canDisable', () => {
    it.each([
      {
        userCan: false,
        permissions: [GraphSharePermission.deletePermissions],
        role: undefined,
        disabled: false,
        expectedResult: true
      },
      {
        userCan: false,
        permissions: [],
        disabled: false,
        expectedResult: false
      },
      {
        userCan: true,
        permissions: [],
        disabled: false,
        expectedResult: true
      },
      {
        userCan: true,
        permissions: [],
        disabled: true,
        expectedResult: false
      }
    ])(
      'behaves accordingly to the given role, permissions, abilities and disabled state',
      ({ permissions, expectedResult, userCan, disabled }) => {
        const ability = mock<Ability>({ can: () => userCan })
        const space = getSpace({ permissions })
        space.disabled = disabled
        expect(space.canDisable({ user: mock<User>({ id, memberOf: [] }), ability })).toBe(
          expectedResult
        )
      }
    )
  })

  describe('contentType', () => {
    it('carries the drive\'s "@libre.graph.contentType" verbatim', () => {
      expect(
        buildSpace({ '@libre.graph.contentType': 'application/vnd.opencloud.vault' } as Drive)
          .contentType
      ).toBe('application/vnd.opencloud.vault')
    })
    it('is undefined when the drive has none', () => {
      expect(buildSpace({} as Drive).contentType).toBeUndefined()
    })
  })

  describe('inside a vault space', () => {
    it.each(['canEditImage', 'canEditReadme', 'canEditDescription'] as const)(
      '%s is false',
      (method) => {
        const space = getSpace({ permissions: [GraphSharePermission.deletePermissions] })
        space.isInVault = true
        const ability = mock<Ability>({ can: () => true })
        expect(space[method]({ user: mock<User>({ id, memberOf: [] }), ability })).toBe(false)
      }
    )
  })

  describe('canEditImage', () => {
    it.each([
      {
        permissions: [GraphSharePermission.deletePermissions],
        role: undefined,
        disabled: false,
        expectedResult: true
      },
      {
        permissions: [],
        disabled: false,
        expectedResult: false
      },
      {
        permissions: [],
        disabled: true,
        expectedResult: false
      }
    ])(
      'behaves accordingly to the given role, permissions and disabled state',
      ({ permissions, expectedResult, disabled }) => {
        const space = getSpace({ permissions })
        space.disabled = disabled
        expect(space.canEditImage({ user: mock<User>({ id, memberOf: [] }) })).toBe(expectedResult)
      }
    )
  })
  describe('canEditReadme', () => {
    it.each([
      {
        permissions: [GraphSharePermission.deletePermissions],
        disabled: false,
        expectedResult: true
      },

      {
        permissions: [],
        disabled: false,
        expectedResult: false
      },
      {
        permissions: [],
        disabled: true,
        expectedResult: false
      }
    ])(
      'behaves accordingly to the given role, permissions and disabled state',
      ({ permissions, expectedResult, disabled }) => {
        const space = getSpace({ permissions })
        space.disabled = disabled
        expect(space.canEditReadme({ user: mock<User>({ id, memberOf: [] }) })).toBe(expectedResult)
      }
    )
  })
})

describe('getSpaceManagers', () => {
  function permission(id: string, grantedToV2: Permission['grantedToV2'], isManager = true) {
    return mock<Permission>({
      id,
      grantedToV2,
      roles: [],
      '@libre.graph.permissions.actions': isManager
        ? [GraphSharePermission.deletePermissions]
        : [GraphSharePermission.readBasic]
    })
  }

  it('returns the managers sorted by name, independent of the order returned by the server', () => {
    const permissions = [
      permission('p-user-10', { user: { id: 'u10', displayName: 'User 10' } }),
      permission('p-viewer', { user: { id: 'viewer', displayName: 'Anna' } }, false),
      permission('p-admin-2', { user: { id: 'admin2', displayName: 'Admin' } }),
      permission('p-group', { group: { id: 'group', displayName: 'physics' } }),
      permission('p-user-2', { user: { id: 'u2', displayName: 'User 2' } }),
      permission('p-admin-1', { user: { id: 'admin1', displayName: 'admin' } })
    ]
    const expectedOrder = ['p-admin-1', 'p-admin-2', 'p-group', 'p-user-2', 'p-user-10']

    for (const order of [permissions, [...permissions].reverse()]) {
      const space = mock<SpaceResource>({ root: { permissions: order } })
      const serverOrder = order.map(({ id }) => id)

      expect(getSpaceManagers(space, {}).map(({ id }) => id)).toEqual(expectedOrder)
      // the permissions of the space itself are not reordered
      expect(space.root.permissions.map(({ id }) => id)).toEqual(serverOrder)
    }
  })
})
