import { computed, defineComponent, h, markRaw, PropType } from 'vue'
import { mock } from 'vitest-mock-extended'
import { IncomingShareResource } from '@opencloud-eu/web-client'
import { FileAction, FolderView } from '@opencloud-eu/web-pkg'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
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
    }
  },
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        props.resources.map((resource) => slots.quickActions?.({ resource }))
      )
  }
})

describe('SharedWithMeSection', () => {
  it.each([true, false])('renders the hide share action if visible: %s', (isVisible) => {
    const { wrapper } = getWrapper({ isVisible })
    expect(wrapper.find('.hide-share-action').exists()).toBe(isVisible)
  })
})

function getWrapper({ isVisible }: { isVisible: boolean }) {
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
        sortFields: []
      },
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks
      }
    })
  }
}
