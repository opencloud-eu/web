import SharedWithMe from '../../../../src/views/shares/SharedWithMe.vue'
import { useResourcesViewDefaults } from '../../../../src/composables'
import {
  queryItemAsString,
  useRouteQuery,
  useResourcesStore,
  InlineFilterOption,
  ItemFilter,
  AppBar
} from '@opencloud-eu/web-pkg'
import { useResourcesViewDefaultsMock } from '../../../../tests/mocks/useResourcesViewDefaultsMock'
import { computed, unref, defineComponent, h, readonly, ref } from 'vue'
import { defaultStubs, RouteLocation } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { createMemoryHistory, createRouter } from 'vue-router'
import { flushPromises } from '@vue/test-utils'
import { defaultPlugins, mount, defaultComponentMocks } from '@opencloud-eu/web-test-helpers'
import { ShareTypes, IncomingShareResource, ShareType } from '@opencloud-eu/web-client'
import SharedWithMeSection from '../../../../src/components/Shares/SharedWithMeSection.vue'

vi.mock('../../../../src/composables/resourcesViewDefaults')
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  queryItemAsString: vi.fn(),
  useRouteQuery: vi.fn()
}))

const AppBarStub = defineComponent({
  props: AppBar.props,
  setup(_, { slots }) {
    return () => h('app-bar-stub', {}, [slots.actions?.()])
  }
})

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
      expect(wrapper.find('#app-loading-spinner').exists()).toBeTruthy()
    })
    it('does not show the loading spinner after loading finished', () => {
      const { wrapper } = getMountedWrapper()
      expect(wrapper.find('#app-loading-spinner').exists()).toBeFalsy()
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
        expect(
          wrapper
            .findComponent<typeof SharedWithMeSection>('shared-with-me-section-stub')
            .props('title')
        ).toEqual('Shares')
      })
      it('shows all hidden shares', async () => {
        const { wrapper } = getMountedWrapper()
        ;(wrapper.vm as any).setAreHiddenFilesShown(mock<InlineFilterOption>({ name: 'hidden' }))
        await wrapper.vm.$nextTick()
        expect(wrapper.findAll('shared-with-me-section-stub').length).toBe(1)
        expect(
          wrapper
            .findComponent<typeof SharedWithMeSection>('shared-with-me-section-stub')
            .props('title')
        ).toEqual('Hidden Shares')
      })
      it('shows hidden shares beyond the first page', async () => {
        const files = Array.from({ length: 30 }, (_, i) =>
          mock<IncomingShareResource>({
            name: `share-${i + 1}`,
            hidden: i === 29,
            shareTypes: [ShareTypes.user.value]
          })
        )
        const { wrapper } = getMountedWrapper({ files })
        ;(wrapper.vm as any).setAreHiddenFilesShown(mock<InlineFilterOption>({ name: 'hidden' }))
        await wrapper.vm.$nextTick()

        const items = wrapper
          .findComponent<typeof SharedWithMeSection>('shared-with-me-section-stub')
          .props('items')
        expect(items.map(({ name }) => name)).toEqual(['share-30'])
      })
      it('tells the section that shares exist when there are no hidden shares', async () => {
        const { wrapper } = getMountedWrapper({
          files: [
            mock<IncomingShareResource>({ hidden: false, shareTypes: [ShareTypes.user.value] })
          ]
        })
        ;(wrapper.vm as any).setAreHiddenFilesShown(mock<InlineFilterOption>({ name: 'hidden' }))
        await wrapper.vm.$nextTick()

        const section = wrapper.findComponent<typeof SharedWithMeSection>(
          'shared-with-me-section-stub'
        )
        expect(section.props('items')).toEqual([])
        expect(section.props('hasShares')).toBe(true)
      })
      it('tells the section that no shares exist when there are none', () => {
        const { wrapper } = getMountedWrapper()
        const section = wrapper.findComponent<typeof SharedWithMeSection>(
          'shared-with-me-section-stub'
        )
        expect(section.props('hasShares')).toBe(false)
      })
    })
    describe('share type', () => {
      it('shows all available share types as filter option', () => {
        const shareType1 = ShareTypes.user
        const shareType2 = ShareTypes.group
        const { wrapper } = getMountedWrapper({
          files: [
            mock<IncomingShareResource>({ shareTypes: [shareType1.value] }),
            mock<IncomingShareResource>({ shareTypes: [shareType2.value] })
          ]
        })
        const filterItems = wrapper
          .findComponent<typeof ItemFilter>('.share-type-filter')
          .props('items') as ShareType[]

        expect(wrapper.find('.share-type-filter').exists()).toBeTruthy()
        expect(filterItems[0].value).toEqual(shareType1.value)
        expect(filterItems[1].value).toEqual(shareType2.value)
      })
    })
    describe('shared by', () => {
      it('shows all available collaborators as filter option', () => {
        const collaborator1 = { id: 'user1', displayName: 'user1' }
        const collaborator2 = { id: 'user2', displayName: 'user2' }
        const { wrapper } = getMountedWrapper({
          files: [
            mock<IncomingShareResource>({
              sharedBy: [collaborator1],
              shareTypes: [ShareTypes.user.value]
            }),
            mock<IncomingShareResource>({
              sharedBy: [collaborator2],
              shareTypes: [ShareTypes.user.value]
            })
          ]
        })
        const filterItems = wrapper
          .findComponent<typeof ItemFilter>('.shared-by-filter')
          .props('items')
        expect(wrapper.find('.shared-by-filter').exists()).toBeTruthy()
        expect(filterItems).toEqual([collaborator1, collaborator2])
      })
      it('lists collaborators with the same display name separately', () => {
        const collaborator1 = { id: 'user1', displayName: 'Twin' }
        const collaborator2 = { id: 'user2', displayName: 'Twin' }
        const { wrapper } = getMountedWrapper({
          files: [
            mock<IncomingShareResource>({
              sharedBy: [collaborator1],
              shareTypes: [ShareTypes.user.value]
            }),
            mock<IncomingShareResource>({
              sharedBy: [collaborator2, collaborator1],
              shareTypes: [ShareTypes.user.value]
            })
          ]
        })
        const filterItems = wrapper
          .findComponent<typeof ItemFilter>('.shared-by-filter')
          .props('items')
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
            mock<IncomingShareResource>({
              name: 'share1',
              hidden: false,
              shareTypes: [ShareTypes.user.value]
            }),
            mock<IncomingShareResource>({
              name: 'share2',
              hidden: false,
              shareTypes: [ShareTypes.user.value]
            })
          ]
        })

        await wrapper.vm.$nextTick()
        ;(wrapper.vm as any).filterTerm = 'share1'
        await wrapper.vm.$nextTick()
        const sharedWithMeSec = wrapper.findComponent<typeof SharedWithMeSection>(
          'shared-with-me-section-stub'
        )
        expect(sharedWithMeSec.props('items').find(({ name }) => name === 'share1')).toBeDefined()
        expect(sharedWithMeSec.props('items').find(({ name }) => name === 'share2')).toBeUndefined()
      })
      it('tells the section that shares exist when the search matches none', async () => {
        const { wrapper } = getMountedWrapper({
          files: [
            mock<IncomingShareResource>({
              name: 'share1',
              hidden: false,
              shareTypes: [ShareTypes.user.value]
            })
          ]
        })
        ;(wrapper.vm as any).filterTerm = 'nomatch'
        await wrapper.vm.$nextTick()

        const section = wrapper.findComponent<typeof SharedWithMeSection>(
          'shared-with-me-section-stub'
        )
        expect(section.props('items')).toEqual([])
        expect(section.props('hasShares')).toBe(true)
      })
      it('finds shares beyond the current page', async () => {
        const files = Array.from({ length: 30 }, (_, i) =>
          mock<IncomingShareResource>({
            name: `share-${i + 1}`,
            hidden: false,
            shareTypes: [ShareTypes.user.value]
          })
        )
        const { wrapper } = getMountedWrapper({ files })
        ;(wrapper.vm as any).filterTerm = 'share-25'
        await wrapper.vm.$nextTick()

        const items = wrapper
          .findComponent<typeof SharedWithMeSection>('shared-with-me-section-stub')
          .props('items')
        expect(items.find(({ name }) => name === 'share-25')).toBeDefined()
      })
      it('resets the pagination to the first page', async () => {
        const { wrapper, mocks } = getMountedWrapper()
        ;(wrapper.vm as any).filterTerm = 'share'
        await flushPromises()

        expect(mocks.$router.push).toHaveBeenCalledWith(
          expect.objectContaining({ query: expect.objectContaining({ page: '1' }) })
        )
      })
    })
  })
  describe('footer counts', () => {
    const files = [
      mock<IncomingShareResource>({ name: 'share1', hidden: false, shareTypes: [] }),
      mock<IncomingShareResource>({ name: 'share2', hidden: false, shareTypes: [] }),
      mock<IncomingShareResource>({ name: 'hidden1', hidden: true, shareTypes: [] })
    ]

    it('passes the shares of the current tab without a matching count', () => {
      const { wrapper } = getMountedWrapper({ files })
      const section = wrapper.findComponent<typeof SharedWithMeSection>(
        'shared-with-me-section-stub'
      )
      expect(section.props('tabItems').map(({ name }) => name)).toEqual(['share1', 'share2'])
      expect(section.props('matchingCount')).toBeUndefined()
    })
    it('passes the hidden shares on the hidden shares tab', async () => {
      const { wrapper } = getMountedWrapper({ files })
      ;(wrapper.vm as any).setAreHiddenFilesShown(mock<InlineFilterOption>({ name: 'hidden' }))
      await wrapper.vm.$nextTick()
      const section = wrapper.findComponent<typeof SharedWithMeSection>(
        'shared-with-me-section-stub'
      )
      expect(section.props('tabItems').map(({ name }) => name)).toEqual(['hidden1'])
    })
    it('passes the matching count while searching', async () => {
      const { wrapper } = getMountedWrapper({ files })
      ;(wrapper.vm as any).filterTerm = 'share1'
      await wrapper.vm.$nextTick()
      const section = wrapper.findComponent<typeof SharedWithMeSection>(
        'shared-with-me-section-stub'
      )
      expect(section.props('tabItems')).toHaveLength(2)
      expect(section.props('matchingCount')).toBe(1)
    })
  })
  describe('pagination', () => {
    it('passes the pagination to the shares section', () => {
      const { wrapper } = getMountedWrapper({
        viewDefaults: { paginationPages: readonly(ref(2)), paginationPage: readonly(ref(1)) }
      })
      const sharedWithMeSec = wrapper.findComponent<typeof SharedWithMeSection>(
        'shared-with-me-section-stub'
      )
      expect(sharedWithMeSec.props('paginationPages')).toBe(2)
      expect(sharedWithMeSec.props('paginationPage')).toBe(1)
    })
  })
  describe('scrollTo', () => {
    it('finds the resource to scroll to beyond the current page', async () => {
      const files = Array.from({ length: 30 }, (_, i) =>
        mock<IncomingShareResource>({
          id: `${i + 1}`,
          name: `share-${i + 1}`,
          hidden: false,
          shareTypes: [ShareTypes.user.value]
        })
      )
      const scrollToResourceFromRoute = vi.fn()
      getMountedWrapper({ files, viewDefaults: { scrollToResourceFromRoute } })
      await flushPromises()

      const [resources] = scrollToResourceFromRoute.mock.calls[0]
      expect(resources).toContain(files[29])
    })
    it.each([
      { hidden: true, query: { scrollTo: 'share-id' }, visibility: 'hidden' },
      {
        hidden: false,
        query: { scrollTo: 'share-id', 'q_share-visibility': 'hidden', page: '2' },
        visibility: 'visible'
      }
    ])(
      'switches to the $visibility shares when the share to scroll to is $visibility',
      async ({ hidden, query, visibility }) => {
        const share = mock<IncomingShareResource>({
          remoteItemId: 'share-id',
          hidden,
          shareTypes: [ShareTypes.user.value]
        })
        const otherShare = mock<IncomingShareResource>({
          remoteItemId: 'other-id',
          hidden: !hidden,
          shareTypes: [ShareTypes.user.value]
        })
        const scrollToResourceFromRoute = vi.fn()
        const { wrapper, router } = await getMountedWrapperWithRouter({
          files: [share, otherShare],
          query,
          scrollToResourceFromRoute
        })
        await flushPromises()

        expect(unref(router.currentRoute).query).toEqual({
          scrollTo: 'share-id',
          'q_share-visibility': visibility
        })
        expect(wrapper.find('.item-inline-filter-option-selected').attributes('id')).toBe(
          visibility
        )
        expect(scrollToResourceFromRoute).toHaveBeenCalledWith([share], 'files-app-bar')

        // the share must not get unselected by the filter change after it was selected
        const { resetSelection } = useResourcesStore()
        expect(resetSelection).toHaveBeenCalled()
        const lastReset = Math.max(...vi.mocked(resetSelection).mock.invocationCallOrder)
        expect(lastReset).toBeLessThan(scrollToResourceFromRoute.mock.invocationCallOrder[0])
      }
    )
    it('keeps the visibility filter when the share to scroll to is listed', async () => {
      const share = mock<IncomingShareResource>({
        remoteItemId: 'share-id',
        hidden: false,
        shareTypes: [ShareTypes.user.value]
      })
      const { mocks } = getMountedWrapper({ files: [share], scrollTo: 'share-id' })
      await flushPromises()

      expect(mocks.$router.replace).not.toHaveBeenCalled()
    })
    it('keeps the visibility filter when the share to scroll to does not exist', async () => {
      const share = mock<IncomingShareResource>({
        remoteItemId: 'other-id',
        hidden: true,
        shareTypes: [ShareTypes.user.value]
      })
      const { mocks } = getMountedWrapper({ files: [share], scrollTo: 'share-id' })
      await flushPromises()

      expect(mocks.$router.replace).not.toHaveBeenCalled()
    })
  })
})

function getMountedWrapper({
  mocks = {},
  loading = false,
  files = [],
  scrollTo = undefined,
  viewDefaults = {}
}: {
  mocks?: Record<string, unknown>
  files?: IncomingShareResource[]
  loading?: boolean
  scrollTo?: string
  viewDefaults?: Partial<ReturnType<typeof useResourcesViewDefaults>>
} = {}) {
  const plugins = [...defaultPlugins({ piniaOptions: { resourcesStore: { resources: files } } })]

  vi.mocked(useResourcesViewDefaults).mockImplementation(({ filterResources }) => {
    // like the real view defaults: filter all resources, then paginate them
    const sortedResources = computed(() => (filterResources ? filterResources(files) : files))
    return useResourcesViewDefaultsMock({
      storeItems: ref(files),
      sortedResources,
      paginatedResources: computed(() => unref(sortedResources).slice(0, 20)),
      areResourcesLoading: ref(loading),
      ...viewDefaults
    })
  })
  vi.mocked(useRouteQuery).mockImplementation((name) =>
    ref(name === 'scrollTo' ? scrollTo : undefined)
  )
  vi.mocked(queryItemAsString).mockImplementation((value) => value as string)

  const defaultMocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({
        name: 'files-shares-with-me',
        query: { ...(scrollTo && { scrollTo }) }
      })
    }),
    ...(mocks && mocks)
  }

  return {
    mocks: defaultMocks,
    wrapper: mount(SharedWithMe, {
      global: {
        plugins,
        mocks: defaultMocks,
        provide: defaultMocks,
        stubs: {
          ...defaultStubs,
          'app-bar': AppBarStub,
          itemFilterInline: true,
          ItemFilter: true,
          AppLoadingSpinner: true
        }
      }
    })
  }
}

// mounts the view with the real visibility filter and router, so route changes reach the filter
async function getMountedWrapperWithRouter({
  files,
  query,
  scrollToResourceFromRoute
}: {
  files: IncomingShareResource[]
  query: Record<string, string>
  scrollToResourceFromRoute: ReturnType<
    typeof useResourcesViewDefaults
  >['scrollToResourceFromRoute']
}) {
  const { useRouteQuery: actualUseRouteQuery, queryItemAsString: actualQueryItemAsString } =
    await vi.importActual<typeof import('@opencloud-eu/web-pkg')>('@opencloud-eu/web-pkg')
  vi.mocked(useRouteQuery).mockImplementation(actualUseRouteQuery)
  vi.mocked(queryItemAsString).mockImplementation(actualQueryItemAsString)

  vi.mocked(useResourcesViewDefaults).mockImplementation(({ filterResources }) => {
    const sortedResources = computed(() => filterResources(files))
    return useResourcesViewDefaultsMock({
      storeItems: ref(files),
      sortedResources,
      paginatedResources: sortedResources,
      scrollToResourceFromRoute
    })
  })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/files/shares/with-me',
        name: 'files-shares-with-me',
        component: defineComponent({ render: (): null => null })
      }
    ]
  })
  await router.push({ name: 'files-shares-with-me', query })

  const mocks = { ...defaultComponentMocks(), $router: router }
  const wrapper = mount(SharedWithMe, {
    global: {
      plugins: defaultPlugins(),
      mocks,
      provide: mocks,
      stubs: { ...defaultStubs, 'app-bar': AppBarStub, ItemFilter: true, AppLoadingSpinner: true }
    }
  })

  return { wrapper, router }
}
