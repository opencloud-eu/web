import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { GraphSharePermission, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useCanListVersions } from '../../../../src/composables/resources'

describe('useCanListVersions', () => {
  describe('canListVersions', () => {
    it('returns true for a personal space owned by the user', () => {
      getWrapper({
        setup: ({ canListVersions }) => {
          const space = mock<SpaceResource>({
            driveType: 'personal',
            isOwner: () => true,
            graphPermissions: []
          })
          const resource = mock<Resource>({ canListVersions: () => true })
          const canList = canListVersions({ space, resource })
          expect(canList).toBeTruthy()
        }
      })
    })
    it('returns true when the space grants the readVersions permission', () => {
      getWrapper({
        setup: ({ canListVersions }) => {
          const space = mock<SpaceResource>({
            driveType: 'project',
            isOwner: () => false,
            graphPermissions: [GraphSharePermission.readVersions]
          })
          const resource = mock<Resource>({ canListVersions: () => true })
          const canList = canListVersions({ space, resource })
          expect(canList).toBeTruthy()
        }
      })
    })
    it('returns false for a personal space not owned by the user', () => {
      getWrapper({
        setup: ({ canListVersions }) => {
          const space = mock<SpaceResource>({
            driveType: 'personal',
            isOwner: () => false,
            graphPermissions: []
          })
          const resource = mock<Resource>({ canListVersions: () => true })
          const canList = canListVersions({ space, resource })
          expect(canList).toBeFalsy()
        }
      })
    })
    it('returns false when the space does not allow listing versions', () => {
      getWrapper({
        setup: ({ canListVersions }) => {
          const space = mock<SpaceResource>({
            driveType: 'project',
            isOwner: () => false,
            graphPermissions: []
          })
          const resource = mock<Resource>({ canListVersions: () => true })
          const canList = canListVersions({ space, resource })
          expect(canList).toBeFalsy()
        }
      })
    })
    it('returns false when the resource does not allow listing versions', () => {
      getWrapper({
        setup: ({ canListVersions }) => {
          const space = mock<SpaceResource>({
            driveType: 'personal',
            isOwner: () => true,
            graphPermissions: [GraphSharePermission.readVersions]
          })
          const resource = mock<Resource>({ canListVersions: () => false })
          const canList = canListVersions({ space, resource })
          expect(canList).toBeFalsy()
        }
      })
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (instance: ReturnType<typeof useCanListVersions>) => void
}) {
  return {
    wrapper: getComposableWrapper(() => {
      const instance = useCanListVersions()
      setup(instance)
    })
  }
}
