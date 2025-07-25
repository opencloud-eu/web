import SpaceContextActions from '../../../../src/components/Spaces/SpaceContextActions.vue'
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

describe('SpaceContextActions', () => {
  describe('action handlers', () => {
    it('renders actions that are always available: "Members", "Edit Quota", "Details"', () => {
      const { wrapper } = getWrapper(buildSpace(spaceMock))

      expect(
        wrapper.findAll('[data-testid="action-label"]').some((el) => el.text() === 'Members')
      ).toBeDefined()
      expect(
        wrapper.findAll('[data-testid="action-label"]').some((el) => el.text() === 'Edit quota')
      ).toBeDefined()
      expect(
        wrapper.findAll('[data-testid="action-label"]').some((el) => el.text() === 'Details')
      ).toBeDefined()
    })
  })
})

function getWrapper(space: SpaceResource) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ path: '/files', name: '' })
  })

  return {
    wrapper: mount(SpaceContextActions, {
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
