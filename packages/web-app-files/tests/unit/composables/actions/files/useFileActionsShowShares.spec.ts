import { unref } from 'vue'
import { ShareResource, SpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useResourcesStore, useSideBar } from '@opencloud-eu/web-pkg'
import { useFileActionsShowShares } from '../../../../../src/composables/actions/files'

describe('showShares', () => {
  describe('handler', () => {
    it('selects the resource and opens the sharing panel', () => {
      const mocks = defaultComponentMocks()
      getComposableWrapper(
        () => {
          const { actions } = useFileActionsShowShares()

          const { setSelection } = useResourcesStore()
          const { openSideBarPanel } = useSideBar()
          const resources = [{ id: 'folder', path: '/folder' }] as ShareResource[]
          unref(actions)[0].handler({ space: null, resources })
          expect(setSelection).toHaveBeenCalledWith(['folder'])
          expect(openSideBarPanel).toHaveBeenCalledWith('sharing')
        },
        { mocks, provide: mocks }
      )
    })
    it.each(['ctrlKey', 'metaKey', 'shiftKey'])(
      'neither changes the selection nor opens the sidebar on a click with %s',
      (modifier) => {
        const mocks = defaultComponentMocks()
        getComposableWrapper(
          () => {
            const { actions } = useFileActionsShowShares()

            const { setSelection } = useResourcesStore()
            const { openSideBarPanel } = useSideBar()
            const resources = [{ id: 'folder', path: '/folder' }] as ShareResource[]
            const event = new MouseEvent('click', { [modifier]: true })
            const options = { space: undefined as SpaceResource, resources, event }
            unref(actions)[0].handler(options)
            expect(setSelection).not.toHaveBeenCalled()
            expect(openSideBarPanel).not.toHaveBeenCalled()
          },
          { mocks, provide: mocks }
        )
      }
    )
  })
})
