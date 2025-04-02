import { Resource } from '@opencloud-eu/web-client'
import FileDetailsMultiple from '../../../../../src/components/SideBar/Details/FileDetailsMultiple.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { OcDefinitionList } from '@opencloud-eu/design-system/components'

const selectors = {
  selectedFilesText: '[data-testid="selectedFilesText"]',
  filesCount: '[data-testid="filesCount"]',
  foldersCount: '[data-testid="foldersCount"]',
  size: '[data-testid="size"]'
}

const folderA = {
  id: '1',
  name: '1',
  type: 'folder',
  mdate: 'Wed, 21 Oct 2015 07:28:00 GMT',
  size: '740'
} as Resource
const folderB = {
  id: '2',
  name: '2',
  type: 'folder',
  mdate: 'Wed, 21 Oct 2015 07:28:00 GMT',
  size: '740'
} as Resource
const fileA = {
  id: '3',
  name: '3',
  type: 'file',
  mdate: 'Wed, 21 Oct 2015 07:28:00 GMT',
  size: '740'
} as Resource
const fileB = {
  id: '4',
  name: '4',
  type: 'file',
  mdate: 'Wed, 21 Oct 2015 07:28:00 GMT',
  size: '740'
} as Resource

describe('Details Multiple Selection SideBar Item', () => {
  it('should display information for two selected folders', () => {
    const { wrapper } = createWrapper([folderA, folderB])
    const definitionList = wrapper.findComponent<typeof OcDefinitionList>('oc-definition-list-stub')
    const items = definitionList.props('items')

    expect(wrapper.find(selectors.selectedFilesText).text()).toBe('2 items selected')
    expect(items.find(({ term }) => term === 'Files').definition).toBe('0')
    expect(items.find(({ term }) => term === 'Folders').definition).toBe('2')
    expect(items.find(({ term }) => term === 'Size').definition).toBe('1 kB')
  })
  it('should display information for two selected files', () => {
    const { wrapper } = createWrapper([fileA, fileB])
    const definitionList = wrapper.findComponent<typeof OcDefinitionList>('oc-definition-list-stub')
    const items = definitionList.props('items')

    expect(wrapper.find(selectors.selectedFilesText).text()).toBe('2 items selected')
    expect(items.find(({ term }) => term === 'Files').definition).toBe('2')
    expect(items.find(({ term }) => term === 'Folders').definition).toBe('0')
    expect(items.find(({ term }) => term === 'Size').definition).toBe('1 kB')
  })
  it('should display information for one selected file, one selected folder', () => {
    const { wrapper } = createWrapper([fileA, folderA])
    const definitionList = wrapper.findComponent<typeof OcDefinitionList>('oc-definition-list-stub')
    const items = definitionList.props('items')

    expect(wrapper.find(selectors.selectedFilesText).text()).toBe('2 items selected')
    expect(items.find(({ term }) => term === 'Files').definition).toBe('1')
    expect(items.find(({ term }) => term === 'Folders').definition).toBe('1')
    expect(items.find(({ term }) => term === 'Size').definition).toBe('1 kB')
  })
})

function createWrapper(resources: Resource[]) {
  return {
    wrapper: shallowMount(FileDetailsMultiple, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              resourcesStore: { resources, selectedIds: resources.map(({ id }) => id) }
            }
          })
        ]
      }
    })
  }
}
