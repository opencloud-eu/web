import { buildSpace, SpaceResource } from '../../../../src/helpers/space'
import { mock } from 'vitest-mock-extended'
import { Ability, GraphSharePermission } from '@opencloud-eu/web-client'
import { Drive, User } from '@opencloud-eu/web-client/graph/generated'

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
        expectedResult: true
      },
      {
        userCan: false,
        permissions: [],
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
      {
        userCan: false,
        permissions: [GraphSharePermission.deletePermissions],
        disabled: true,
        expectedResult: true
      },
      {
        userCan: false,
        permissions: [],
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
      'behaves accordingly to the given role, permissions, abilities and disabled state',
      ({ permissions, expectedResult, userCan, disabled }) => {
        const ability = mock<Ability>({ can: () => userCan })
        const space = getSpace({ permissions })
        space.disabled = disabled
        expect(space.canRestore({ user: mock<User>({ id, memberOf: [] }), ability })).toBe(
          expectedResult
        )
      }
    )
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
