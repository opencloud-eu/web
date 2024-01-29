import SharedWithMe from '../../../../src/views/shares/SharedWithMe.vue'
import { useResourcesViewDefaults } from 'web-app-files/src/composables'
import {
  queryItemAsString,
  InlineFilterOption,
  useSort,
  useOpenWithDefaultApp
} from '@ownclouders/web-pkg'
import { useResourcesViewDefaultsMock } from 'web-app-files/tests/mocks/useResourcesViewDefaultsMock'
import { ref } from 'vue'
import { defaultStubs, RouteLocation } from 'web-test-helpers'
import { useSortMock } from 'web-app-files/tests/mocks/useSortMock'
import { mock } from 'vitest-mock-extended'
import { defaultPlugins, mount, defaultComponentMocks } from 'web-test-helpers'
import { ShareTypes, ShareResource } from '@ownclouders/web-client/src/helpers'

vi.mock('web-app-files/src/composables/resourcesViewDefaults')
vi.mock('@ownclouders/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useSort: vi.fn().mockImplementation(() => useSortMock()),
  queryItemAsString: vi.fn(),
  useRouteQuery: vi.fn(),
  useOpenWithDefaultApp: vi.fn()
}))

describe('SharedWithMe view', () => {
  it('appBar always present', () => {
    const { wrapper } = getMountedWrapper()
    expect(wrapper.find('app-bar-stub').exists()).toBeTruthy()
  })
  it('sideBar always present', () => {
    const { wrapper } = getMountedWrapper()
    expect(wrapper.find('file-side-bar-stub').exists()).toBeTruthy()
  })
  describe('different files view states', () => {
    it('shows the loading spinner during loading', () => {
      const { wrapper } = getMountedWrapper({ loading: true })
      expect(wrapper.find('oc-spinner-stub').exists()).toBeTruthy()
    })
    it('does not show the loading spinner after loading finished', () => {
      const { wrapper } = getMountedWrapper()
      expect(wrapper.find('oc-spinner-stub').exists()).toBeFalsy()
    })
  })
  describe('open with default app', () => {
    it('gets called if given via route query param', async () => {
      const { wrapper, mocks } = getMountedWrapper({ openWithDefaultAppQuery: 'true' })
      await wrapper.vm.loadResourcesTask.last
      expect(mocks.openWithDefaultApp).toHaveBeenCalled()
    })
    it('gets not called if not given via route query param', async () => {
      const { wrapper, mocks } = getMountedWrapper()
      await wrapper.vm.loadResourcesTask.last
      expect(mocks.openWithDefaultApp).not.toHaveBeenCalled()
    })
  })
  describe('filter', () => {
    describe('share visibility', () => {
      it('shows filter', () => {
        const { wrapper } = getMountedWrapper()
        expect(wrapper.find('.share-visibility-filter').exists()).toBeTruthy()
        expect(wrapper.find('item-filter-inline-stub').exists()).toBeTruthy()
      })
      it('shows all visible shares', () => {
        const { wrapper } = getMountedWrapper()
        expect(wrapper.findAll('shared-with-me-section-stub').length).toBe(1)
        expect(wrapper.findComponent<any>('shared-with-me-section-stub').props('title')).toEqual(
          'Shares'
        )
      })
      it('shows all hidden shares', async () => {
        const { wrapper } = getMountedWrapper()
        wrapper.vm.setAreHiddenFilesShown(mock<InlineFilterOption>({ name: 'hidden' }))
        await wrapper.vm.$nextTick()
        expect(wrapper.findAll('shared-with-me-section-stub').length).toBe(1)
        expect(wrapper.findComponent<any>('shared-with-me-section-stub').props('title')).toEqual(
          'Hidden Shares'
        )
      })
    })
    describe('share type', () => {
      it('shows all available share types as filter option', () => {
        const shareType1 = ShareTypes.user
        const shareType2 = ShareTypes.group
        const { wrapper } = getMountedWrapper({
          files: [
            mock<ShareResource>({ shareType: shareType1.value }),
            mock<ShareResource>({ shareType: shareType2.value })
          ]
        })
        const filterItems = wrapper.findComponent<any>('.share-type-filter').props('items')
        expect(wrapper.find('.share-type-filter').exists()).toBeTruthy()
        expect(filterItems).toEqual([shareType1, shareType2])
      })
    })
    describe('shared by', () => {
      it('shows all available collaborators as filter option', () => {
        const collaborator1 = { id: 'user1', displayName: 'user1' }
        const collaborator2 = { id: 'user2', displayName: 'user2' }
        const { wrapper } = getMountedWrapper({
          files: [
            mock<ShareResource>({
              sharedBy: collaborator1,
              shareType: ShareTypes.user.value
            }),
            mock<ShareResource>({
              sharedBy: collaborator2,
              shareType: ShareTypes.user.value
            })
          ]
        })
        const filterItems = wrapper.findComponent<any>('.shared-by-filter').props('items')
        expect(wrapper.find('.shared-by-filter').exists()).toBeTruthy()
        expect(filterItems).toEqual([collaborator1, collaborator2])
      })
    })
    describe('search', () => {
      it('shows filter', () => {
        const { wrapper } = getMountedWrapper()
        expect(wrapper.find('.search-filter').exists()).toBeTruthy()
      })
      it('filters shares accordingly by name', async () => {
        const { wrapper } = getMountedWrapper({
          files: [
            mock<ShareResource>({
              name: 'share1',
              hidden: false,
              shareType: ShareTypes.user.value
            }),
            mock<ShareResource>({
              name: 'share2',
              hidden: false,
              shareType: ShareTypes.user.value
            })
          ]
        })

        await wrapper.vm.$nextTick()
        wrapper.vm.filterTerm = 'share1'
        expect(wrapper.vm.items.find(({ name }) => name === 'share1')).toBeDefined()
        expect(wrapper.vm.items.find(({ name }) => name === 'share2')).toBeUndefined()
      })
    })
  })
})

function getMountedWrapper({
  mocks = {},
  loading = false,
  files = [],
  openWithDefaultAppQuery = ''
} = {}) {
  vi.mocked(useResourcesViewDefaults).mockImplementation(() =>
    useResourcesViewDefaultsMock({
      paginatedResources: ref(files),
      areResourcesLoading: ref(loading)
    })
  )
  vi.mocked(useSort).mockImplementation((options) => useSortMock({ items: ref(options.items) }))
  // selected share types
  vi.mocked(queryItemAsString).mockImplementationOnce(() => undefined)
  // selected shared by
  vi.mocked(queryItemAsString).mockImplementationOnce(() => undefined)
  // openWithDefaultAppQuery
  vi.mocked(queryItemAsString).mockImplementationOnce(() => openWithDefaultAppQuery)

  const openWithDefaultApp = vi.fn()
  vi.mocked(useOpenWithDefaultApp).mockReturnValue({ openWithDefaultApp })

  const defaultMocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-shares-with-me' })
    }),
    ...(mocks && mocks),
    openWithDefaultApp
  }

  return {
    mocks: defaultMocks,
    wrapper: mount(SharedWithMe, {
      global: {
        plugins: [...defaultPlugins()],
        mocks: defaultMocks,
        stubs: { ...defaultStubs, itemFilterInline: true, ItemFilter: true }
      }
    })
  }
}
