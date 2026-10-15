import { unref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { ShareResource } from '@opencloud-eu/web-client'
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
          const resources = [mock<ShareResource>({ id: 'folder', path: '/folder' })]
          unref(actions)[0].handler({ space: null, resources })
          expect(setSelection).toHaveBeenCalledWith(['folder'])
          expect(openSideBarPanel).toHaveBeenCalledWith('sharing')
        },
        { mocks, provide: mocks }
      )
    })
  })
})
