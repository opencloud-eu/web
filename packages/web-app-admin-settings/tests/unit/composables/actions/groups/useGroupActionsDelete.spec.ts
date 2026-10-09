import { useGroupActionsDelete } from '../../../../../src/composables/actions/groups/useGroupActionsDelete'
import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import { Group } from '@opencloud-eu/web-client/graph/generated'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useGroupSettingsStore } from '../../../../../src/composables'

describe('useGroupActionsDelete', () => {
  describe('method "isVisible"', () => {
    it.each([
      { resources: [], isVisible: false },
      { resources: [mock<Group>({ groupTypes: [] })], isVisible: true },
      {
        resources: [mock<Group>({ groupTypes: [] }), mock<Group>({ groupTypes: [] })],
        isVisible: true
      }
    ])('should only return true if 1 or more groups are selected', ({ resources, isVisible }) => {
      getWrapper({
        setup: ({ actions }) => {
          expect(unref(actions)[0].isVisible({ resources })).toEqual(isVisible)
        }
      })
    })
    it('should return false for read-only groups', () => {
      getWrapper({
        setup: ({ actions }) => {
          const resources = [mock<Group>({ groupTypes: ['ReadOnly'] })]
          expect(unref(actions)[0].isVisible({ resources })).toBeFalsy()
        }
      })
    })
  })
  describe('method "deleteGroups"', () => {
    it('should successfully delete all given gropups and reload the groups list', () => {
      getWrapper({
        setup: async ({ deleteGroups }, { clientService }) => {
          const group = mock<Group>({ id: '1' })
          await deleteGroups([group])
          expect(clientService.graphAuthenticated.groups.deleteGroup).toHaveBeenCalledWith(group.id)
          const { removeGroups } = useGroupSettingsStore()
          expect(removeGroups).toHaveBeenCalled()
        }
      })
    })
    it('should only remove the successfully deleted groups from the list', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const deleted = mock<Group>({ id: '1' })
      const failed = mock<Group>({ id: '2' })
      let deletion: Promise<void>
      getWrapper({
        setup: ({ deleteGroups }, { clientService }) => {
          clientService.graphAuthenticated.groups.deleteGroup.mockImplementation((id) =>
            id === failed.id ? Promise.reject(new Error()) : Promise.resolve(undefined)
          )
          deletion = deleteGroups([deleted, failed])
        }
      })
      await deletion
      const { removeGroups } = useGroupSettingsStore()
      expect(removeGroups).toHaveBeenCalledWith([deleted])
    })
  })
})

function getWrapper({
  setup
}: {
  setup: (
    instance: ReturnType<typeof useGroupActionsDelete>,
    {
      clientService
    }: {
      clientService: ReturnType<typeof defaultComponentMocks>['$clientService']
    }
  ) => void
}) {
  const mocks = defaultComponentMocks()
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useGroupActionsDelete()
        setup(instance, { clientService: mocks.$clientService })
      },
      { mocks, provide: mocks }
    )
  }
}
