import ListInfo from '../../../../src/components/FilesList/ListInfo.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  PartialComponentProps,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource } from '@opencloud-eu/web-client'

const storeResources = [
  mock<Resource>({ isFolder: false, size: 10000, type: 'file', name: 'file1' }),
  mock<Resource>({ isFolder: false, size: 5, type: 'file', name: 'file2' }),
  mock<Resource>({ isFolder: true, size: 40000, type: 'folder', name: 'folder1' }),
  mock<Resource>({ isFolder: true, size: 0, type: 'folder', name: 'folder2' })
]

describe('ListInfo', () => {
  it('summarizes all resources of the store by default', () => {
    const wrapper = getWrapper()
    expect(wrapper.find('[data-testid="files-list-footer-info"]').text()).toBe(
      '4 items with 50 kB in total (2 files, 2 folders)'
    )
  })
  it('summarizes the given resources instead of the ones of the store', () => {
    const wrapper = getWrapper({ props: { resources: storeResources.slice(0, 1) } })
    expect(wrapper.find('[data-testid="files-list-footer-info"]').text()).toBe(
      '1 item with 10 kB in total (1 file, 0 folders)'
    )
  })
  it('does not show the matching count without an active search or filter', () => {
    const wrapper = getWrapper()
    expect(wrapper.find('[data-testid="files-list-footer-matching-info"]').exists()).toBe(false)
  })
  it.each([
    { matchingCount: 0, expected: '0 matching items' },
    { matchingCount: 1, expected: '1 matching item' },
    { matchingCount: 3, expected: '3 matching items' }
  ])('shows the matching count $matchingCount', ({ matchingCount, expected }) => {
    const wrapper = getWrapper({ props: { matchingCount } })
    expect(wrapper.find('[data-testid="files-list-footer-matching-info"]').text()).toBe(expected)
  })
})

function getWrapper({ props = {} }: { props?: PartialComponentProps<typeof ListInfo> } = {}) {
  const mocks = {
    ...defaultComponentMocks()
  }

  return shallowMount(ListInfo, {
    props,
    global: {
      mocks,
      plugins: [
        ...defaultPlugins({ piniaOptions: { resourcesStore: { resources: storeResources } } })
      ],
      provide: mocks
    }
  })
}
