import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
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
})

function getWrapper({
  setup,
  isGuest
}: {
  setup: (instance: ReturnType<typeof useSideBarPanels>) => void
  isGuest: boolean
}) {
  const mocks = defaultComponentMocks()
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
