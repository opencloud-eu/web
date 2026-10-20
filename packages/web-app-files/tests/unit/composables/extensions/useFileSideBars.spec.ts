import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { useSideBarPanels } from '../../../../src/composables/extensions/useFileSideBars'

describe('useSideBarPanels', () => {
  describe('activities panel', () => {
    it.each([
      { isGuest: false, driveType: 'project', isVisible: true },
      { isGuest: true, driveType: 'project', isVisible: false },
      { isGuest: false, driveType: 'public', isVisible: false }
    ])('is visible for users only (%o)', ({ isGuest, driveType, isVisible }) => {
      getWrapper({
        isGuest,
        setup: (panels) => {
          const { panel } = panels.find(({ id }) => id.endsWith('.sidebar-panel.activities'))
          const visible = panel.isVisible({
            parent: mock<Resource>(),
            items: [mock<Resource>()],
            root: mock<SpaceResource>({ driveType })
          })
          expect(visible).toBe(isVisible)
        }
      })
    })
  })
  describe('details multi selection panel', () => {
    it.each([
      { routeName: 'files-guest-link', showSpaceCount: false },
      { routeName: 'files-guest-shares', showSpaceCount: false },
      { routeName: 'files-common-favorites', showSpaceCount: true }
    ])(
      'shows the space count on route "$routeName": $showSpaceCount',
      ({ routeName, showSpaceCount }) => {
        getWrapper({
          isGuest: routeName.startsWith('files-guest'),
          routeName,
          setup: (panels) => {
            const { panel } = panels.find(({ id }) =>
              id.endsWith('.sidebar-panel.details-multi-selection')
            )
            const attrs = panel.componentAttrs({
              parent: mock<Resource>(),
              items: [mock<Resource>(), mock<Resource>()],
              root: mock<SpaceResource>()
            })
            expect(attrs.showSpaceCount).toBe(showSpaceCount)
          }
        })
      }
    )
  })
})

function getWrapper({
  setup,
  isGuest,
  routeName = ''
}: {
  setup: (instance: ReturnType<typeof useSideBarPanels>) => void
  isGuest: boolean
  routeName?: string
}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: routeName, path: `/${routeName}` })
  })
  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useSideBarPanels()
        setup(instance)
      },
      {
        mocks,
        provide: mocks,
        pluginOptions: { piniaOptions: { authState: { guestContextReady: isGuest } } }
      }
    )
  }
}
