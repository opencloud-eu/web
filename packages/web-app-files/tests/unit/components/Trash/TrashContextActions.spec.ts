import TrashContextActions from '../../../../src/components/Trash/TrashContextActions.vue'
import { buildSpace, SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Drive } from '@opencloud-eu/web-client/graph/generated'

const spaceMock = mock<Drive>({
  id: '1',
  root: {
    permissions: [{ '@libre.graph.permissions.actions': [], grantedToV2: { user: { id: '1' } } }]
  },
  driveType: 'project',
  special: null
})

describe('TrashContextActions', () => {
  describe('action handlers', () => {
    it('renders actions that are always available: "Open trash bin"', () => {
      const { wrapper } = getWrapper(buildSpace(spaceMock))

      const labels = wrapper.findAll('[data-testid="action-label"]').map((el) => el.text())
      expect(labels).toContain('Open trash bin')
      expect(labels).not.toContain('Empty trash bin')
    })
    it('renders action "Empty trash bin" if available', () => {
      const space = {
        ...buildSpace(spaceMock),
        hasTrashedItems: true,
        canDeleteFromTrashBin: vi.fn(() => true)
      }
      const { wrapper } = getWrapper(space)

      const labels = wrapper.findAll('[data-testid="action-label"]').map((el) => el.text())
      expect(labels).toContain('Open trash bin')
      expect(labels).toContain('Empty trash bin')
    })
  })
})

function getWrapper(space: SpaceResource) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ path: '/trash/overview', name: '' })
  })
  return {
    wrapper: mount(TrashContextActions, {
      props: {
        actionOptions: {
          resources: [space]
        }
      },
      global: {
        mocks,
        provide: mocks,
        plugins: [
          ...defaultPlugins({
            abilities: [{ action: 'set-quota-all', subject: 'Drive' }]
          })
        ]
      }
    })
  }
}
