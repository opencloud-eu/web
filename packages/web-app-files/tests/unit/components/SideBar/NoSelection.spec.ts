import { Resource } from '@opencloud-eu/web-client'
import { SideBarNoSelection } from '@opencloud-eu/web-pkg'
import NoSelection from '../../../../src/components/SideBar/NoSelection.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  RouteLocation,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { OcDefinitionList } from '@opencloud-eu/design-system/components'
import { mock } from 'vitest-mock-extended'

const folder = { id: '1', name: '1', type: 'folder', size: '740' } as Resource
const fileA = { id: '2', name: '2', type: 'file', size: '740' } as Resource
const fileB = { id: '3', name: '3', type: 'file', size: '740' } as Resource

describe('NoSelection', () => {
  it.each([
    ['files-spaces-generic', 'empty-folder'],
    ['files-common-favorites', 'empty-favorites'],
    ['files-common-search', 'empty-search-results'],
    ['files-shares-with-me', 'empty-shared-with-me'],
    ['files-shares-with-others', 'empty-shared-with-others'],
    ['files-shares-via-link', 'empty-shared-via-link'],
    ['files-trash-generic', 'empty-trash']
  ])('shows the empty state image of route "%s"', (routeName, image) => {
    const { wrapper } = createWrapper({ routeName })
    expect(wrapper.findComponent(SideBarNoSelection).props('imgSrc')).toBe(
      `images/empty-states/${image}.svg`
    )
  })
  it('shows the item count and total size of the current resources', () => {
    const { wrapper } = createWrapper({ resources: [fileA, fileB, folder] })
    const items = wrapper
      .findComponent<typeof OcDefinitionList>('oc-definition-list-stub')
      .props('items')

    expect(items.find(({ term }) => term === 'Items').definition).toBe('2 files, 1 folder')
    expect(items.find(({ term }) => term === 'Total size').definition).toBe('2 kB')
  })
  it('omits the total size if the resources have no size', () => {
    const { wrapper } = createWrapper({ resources: [{ id: '1', type: 'file' } as Resource] })
    const items = wrapper
      .findComponent<typeof OcDefinitionList>('oc-definition-list-stub')
      .props('items')

    expect(items.find(({ term }) => term === 'Items').definition).toBe('1 file, 0 folders')
    expect(items.find(({ term }) => term === 'Total size')).toBeUndefined()
  })
  it('shows zero items and size if there are no resources', () => {
    const { wrapper } = createWrapper({ routeName: 'files-common-favorites' })
    const items = wrapper
      .findComponent<typeof OcDefinitionList>('oc-definition-list-stub')
      .props('items')

    expect(items).toEqual([
      { term: 'Items', definition: '0 files, 0 folders' },
      { term: 'Total size', definition: '0 B' }
    ])
  })
})

function createWrapper({
  resources = [],
  routeName = 'files-spaces-generic'
}: { resources?: Resource[]; routeName?: string } = {}) {
  const mocks = defaultComponentMocks({ currentRoute: mock<RouteLocation>({ name: routeName }) })
  return {
    wrapper: shallowMount(NoSelection, {
      global: {
        plugins: [...defaultPlugins({ piniaOptions: { resourcesStore: { resources } } })],
        mocks,
        provide: mocks,
        stubs: { SideBarNoSelection: false }
      }
    })
  }
}
