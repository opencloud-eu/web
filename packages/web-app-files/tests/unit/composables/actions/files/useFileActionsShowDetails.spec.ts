import { unref } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useSideBar } from '@opencloud-eu/web-pkg'
import { useFileActionsShowDetails } from '../../../../../src/composables/actions/files'

describe('showDetails', () => {
  describe('handler', () => {
    it('should trigger the open sidebar event', () => {
      const mocks = defaultComponentMocks()
      getComposableWrapper(
        () => {
          const { actions } = useFileActionsShowDetails()

          const { openSideBar } = useSideBar()
          const resources = [{ id: '1', path: '/folder' }] as Resource[]
          unref(actions)[0].handler({ space: null, resources })
          expect(openSideBar).toHaveBeenCalled()
        },
        { mocks, provide: mocks }
      )
    })
  })
})
