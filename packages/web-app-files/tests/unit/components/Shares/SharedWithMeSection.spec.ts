import { computed, defineComponent, h, markRaw, PropType } from 'vue'
import { mock } from 'vitest-mock-extended'
import { IncomingShareResource } from '@opencloud-eu/web-client'
import { FileAction, FolderView, Pagination } from '@opencloud-eu/web-pkg'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  PartialComponentProps,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import SharedWithMeSection from '../../../../src/components/Shares/SharedWithMeSection.vue'
import { useFileActionsToggleHideShare } from '../../../../src/composables/actions/files'

vi.mock('../../../../src/composables/actions/files', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useFileActionsToggleHideShare: vi.fn()
}))

const FolderViewStub = defineComponent({
  props: {
    resources: {
      type: Array as PropType<IncomingShareResource[]>,
      default: (): IncomingShareResource[] => []
    },
    fieldsDisplayed: {
      type: Array as PropType<string[]>,
      default: (): string[] => []
    }
  },
  setup(props, { slots }) {
    return () =>
      h('div', { class: 'folder-view-stub', 'data-fields': props.fieldsDisplayed.join(',') }, [
        ...props.resources.map((resource) => slots.quickActions?.({ resource })),
        slots.footer?.()
      ])
  }
})

describe('SharedWithMeSection', () => {
  it.each([true, false])('renders the hide share action if visible: %s', (isVisible) => {
    const { wrapper } = getWrapper({ isVisible })
    expect(wrapper.find('.hide-share-action').exists()).toBe(isVisible)
  })

  it.each([
    { isGuest: false, shown: true },
    { isGuest: true, shown: false }
  ])('shows the "shared with" column: $shown (guest: $isGuest)', ({ isGuest, shown }) => {
    const { wrapper } = getWrapper({ isGuest })
    const fields = wrapper.find('.folder-view-stub').attributes('data-fields').split(',')
    expect(fields.includes('sharedWith')).toBe(shown)
  })

  it('renders the pagination', () => {
    const { wrapper } = getWrapper({ props: { paginationPages: 3, paginationPage: 2 } })
    const pagination = wrapper.findComponent(Pagination)
    expect(pagination.exists()).toBeTruthy()
    expect(pagination.props()).toEqual({ pages: 3, currentPage: 2 })
  })
  it('shows "Nothing shared, yet" when there are no shares', () => {
    const { wrapper } = getWrapper({ props: { items: [] } })
    expect(wrapper.find('.files-empty').text()).toContain('Nothing shared, yet')
    expect(wrapper.find('.files-no-results').exists()).toBeFalsy()
  })
  it('asks to refine the search or filters when shares exist but none matches', () => {
    const { wrapper } = getWrapper({ props: { items: [], hasShares: true } })
    const message = wrapper.find('.files-no-results')
    expect(message.text()).toContain('No shares found')
    expect(message.text()).toContain('Try refining the search term or filters to get results')
    expect(wrapper.find('.files-empty').exists()).toBeFalsy()
  })
})

function getWrapper({
  isVisible = true,
  isGuest = false,
  props = {}
}: {
  isVisible?: boolean
  isGuest?: boolean
  props?: PartialComponentProps<typeof SharedWithMeSection>
} = {}) {
  vi.mocked(useFileActionsToggleHideShare).mockReturnValue({
    actions: computed(() => [
      mock<FileAction<IncomingShareResource>>({
        class: 'hide-share-action',
        label: () => 'Hide',
        isVisible: () => isVisible
      })
    ])
  })

  const folderView: FolderView = {
    name: 'resource-table',
    label: 'Table',
    icon: { name: 'menu-line' },
    component: markRaw(FolderViewStub)
  }

  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'files-guest-shares' })
  })

  return {
    wrapper: mount(SharedWithMeSection, {
      props: {
        title: 'Shares',
        items: [mock<IncomingShareResource>({ id: '1', hidden: false })],
        sortHandler: vi.fn(),
        folderView,
        viewMode: 'resource-table',
        viewSize: 1,
        sortFields: [],
        paginationPages: 1,
        paginationPage: 1,
        ...props
      },
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              authState: isGuest ? { guestContextReady: true } : { userContextReady: true }
            }
          })
        ],
        mocks,
        provide: mocks,
        stubs: { Pagination: true, ListInfo: true }
      }
    })
  }
}
