import { mock } from 'vitest-mock-extended'
import { Task } from 'vue-concurrency'
import { ExtensionPoint, FolderViewExtension, useResourcesStore } from '@opencloud-eu/web-pkg'
import {
  defaultComponentMocks,
  getComposableWrapper,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { useResourcesViewDefaults } from '../../../../src/composables/resourcesViewDefaults'

describe('useResourcesViewDefaults', () => {
  describe('scrollTo param on selection reset', () => {
    it('removes the param when a selection gets reset', async () => {
      const { mocks } = getWrapper()
      const resourcesStore = useResourcesStore()
      resourcesStore.setSelection(['1'])
      vi.mocked(mocks.$router.push).mockClear()

      resourcesStore.resetSelection()
      await vi.waitFor(() =>
        expect(mocks.$router.push).toHaveBeenCalledWith(
          expect.objectContaining({ query: expect.objectContaining({ scrollTo: undefined }) })
        )
      )
    })
    it('removes the param when the last selected resource gets removed from the selection', async () => {
      const { mocks } = getWrapper()
      const resourcesStore = useResourcesStore()
      resourcesStore.setSelection(['1'])
      vi.mocked(mocks.$router.push).mockClear()

      resourcesStore.removeSelection('1')
      await vi.waitFor(() =>
        expect(mocks.$router.push).toHaveBeenCalledWith(
          expect.objectContaining({ query: expect.objectContaining({ scrollTo: undefined }) })
        )
      )
    })
    it('keeps the param when there was no selection to reset', async () => {
      const { mocks } = getWrapper()
      const resourcesStore = useResourcesStore()

      resourcesStore.resetSelection()
      await new Promise((resolve) => setTimeout(resolve))
      expect(mocks.$router.push).not.toHaveBeenCalled()
    })
  })
})

function getWrapper() {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ path: '/files', query: { scrollTo: '1' } })
  })
  const wrapper = getComposableWrapper(
    () =>
      useResourcesViewDefaults({
        folderViewExtensionPoint: mock<ExtensionPoint<FolderViewExtension>>(),
        loadResourcesTask: mock<Task<unknown, unknown[]>>()
      }),
    { mocks, provide: mocks, pluginOptions: { piniaOptions: { stubActions: false } } }
  )
  return { wrapper, mocks }
}
