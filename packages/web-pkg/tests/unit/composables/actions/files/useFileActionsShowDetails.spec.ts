import { useFileActionsShowDetails, useSideBar } from '../../../../../src'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { unref } from 'vue'
import { Resource } from '@opencloud-eu/web-client'

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
