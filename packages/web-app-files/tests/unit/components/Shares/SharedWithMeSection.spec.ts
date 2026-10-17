import SharedWithMeSection from '../../../../src/components/Shares/SharedWithMeSection.vue'
import { defineComponent, h } from 'vue'
import { mock } from 'vitest-mock-extended'
import { IncomingShareResource } from '@opencloud-eu/web-client'
import { FolderView, Pagination } from '@opencloud-eu/web-pkg'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  PartialComponentProps
} from '@opencloud-eu/web-test-helpers'

const FolderViewStub = defineComponent({
  name: 'FolderViewStub',
  setup(_, { slots }) {
    return () => h('div', [slots.footer?.()])
  }
})

describe('SharedWithMeSection', () => {
  it('renders the pagination', () => {
    const { wrapper } = getWrapper({ props: { paginationPages: 3, paginationPage: 2 } })
    const pagination = wrapper.findComponent(Pagination)
    expect(pagination.exists()).toBeTruthy()
    expect(pagination.props()).toEqual({ pages: 3, currentPage: 2 })
  })
})

function getWrapper({
  props = {}
}: {
  props?: PartialComponentProps<typeof SharedWithMeSection>
} = {}) {
  const mocks = defaultComponentMocks()
  return {
    wrapper: mount(SharedWithMeSection, {
      props: {
        title: 'Shares',
        items: [mock<IncomingShareResource>()],
        sortHandler: vi.fn(),
        folderView: {
          name: 'resource-table',
          label: 'Switch to default view',
          icon: { name: 'menu-line', fillType: 'none' },
          component: FolderViewStub
        } satisfies FolderView,
        viewMode: 'resource-table',
        viewSize: 1,
        sortFields: [],
        paginationPages: 1,
        paginationPage: 1,
        ...props
      },
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks,
        stubs: { Pagination: true, ListInfo: true }
      }
    })
  }
}
