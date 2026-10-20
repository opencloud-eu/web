import GuestSharedWithMe from '../../../../src/views/shares/GuestSharedWithMe.vue'
import { useResourcesViewDefaults } from '../../../../src/composables'
import { useSort, AppBar } from '@opencloud-eu/web-pkg'
import { useResourcesViewDefaultsMock } from '../../../../tests/mocks/useResourcesViewDefaultsMock'
import { defineComponent, h, nextTick, ref } from 'vue'
import { defaultStubs, RouteLocation } from '@opencloud-eu/web-test-helpers'
import { useSortMock } from '../../../../tests/mocks/useSortMock'
import { mock } from 'vitest-mock-extended'
import { defaultPlugins, mount, defaultComponentMocks } from '@opencloud-eu/web-test-helpers'
import { IncomingShareResource } from '@opencloud-eu/web-client'
import SharedWithMeSection from '../../../../src/components/Shares/SharedWithMeSection.vue'

vi.mock('../../../../src/composables/resourcesViewDefaults')
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useSort: vi.fn().mockImplementation(() => useSortMock())
}))

const AppBarStub = defineComponent({
  props: AppBar.props,
  setup(_, { slots }) {
    return () => h('app-bar-stub', {}, [slots.navigation?.(), slots.actions?.()])
  }
})

describe('GuestSharedWithMe view', () => {
  it('shows a "Shares" breadcrumb', () => {
    const { wrapper } = getMountedWrapper()
    const { breadcrumbs } = wrapper.findComponent<typeof AppBar>('app-bar-stub').props()
    expect(breadcrumbs.length).toBe(1)
    expect(breadcrumbs[0].text).toBe('Shares')
  })
  it('shows the sidebar', () => {
    const { wrapper } = getMountedWrapper()
    expect(wrapper.find('file-side-bar-stub').exists()).toBeTruthy()
  })
  it('shows the loading spinner during loading', () => {
    const { wrapper } = getMountedWrapper({ loading: true })
    expect(wrapper.find('#app-loading-spinner').exists()).toBeTruthy()
    expect(wrapper.find('shared-with-me-section-stub').exists()).toBeFalsy()
  })
  it('lists all received shares including hidden ones, as guests cannot hide shares', () => {
    const files = [
      mock<IncomingShareResource>({ name: 'share1', hidden: false }),
      mock<IncomingShareResource>({ name: 'share2', hidden: true })
    ]
    const { wrapper } = getMountedWrapper({ files })
    const section = wrapper.findComponent<typeof SharedWithMeSection>('shared-with-me-section-stub')
    expect(section.props('items')).toEqual(files)
  })
  it('filters shares by name', async () => {
    const { wrapper } = getMountedWrapper({
      files: [
        mock<IncomingShareResource>({ name: 'share1' }),
        mock<IncomingShareResource>({ name: 'share2' })
      ]
    })
    ;(wrapper.vm as any).filterTerm = 'share1'
    await nextTick()
    const items = wrapper
      .findComponent<typeof SharedWithMeSection>('shared-with-me-section-stub')
      .props('items') as IncomingShareResource[]
    expect(items.map(({ name }) => name)).toEqual(['share1'])
  })
})

function getMountedWrapper({
  loading = false,
  files = []
}: {
  files?: IncomingShareResource[]
  loading?: boolean
} = {}) {
  vi.mocked(useResourcesViewDefaults).mockImplementation(() =>
    useResourcesViewDefaultsMock({
      paginatedResources: ref(files),
      areResourcesLoading: ref(loading)
    })
  )
  vi.mocked(useSort).mockImplementation((options) => useSortMock({ items: ref(options.items) }))

  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-guest-shares' })
  })

  return {
    mocks,
    wrapper: mount(GuestSharedWithMe, {
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        stubs: {
          ...defaultStubs,
          'app-bar': AppBarStub,
          AppLoadingSpinner: true
        }
      }
    })
  }
}
