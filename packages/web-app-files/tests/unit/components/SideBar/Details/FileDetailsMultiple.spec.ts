import { Resource } from '@opencloud-eu/web-client'
import FileDetailsMultiple from '../../../../../src/components/SideBar/Details/FileDetailsMultiple.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  RouteLocation,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { SideBarMultipleSelection } from '@opencloud-eu/web-pkg'

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
  it('should display the empty state image of the current view', () => {
    const { wrapper } = createWrapper([fileA, fileB], 'files-common-favorites')
    expect(wrapper.findComponent(SideBarMultipleSelection).props('imgSrc')).toBe(
      'images/illustrations/favorites.svg'
    )
  })
  it('should display information for two selected folders', () => {
    const { wrapper } = createWrapper([folderA, folderB])
    const overview = wrapper.findComponent(SideBarMultipleSelection)
    const items = overview.props('details')

    expect(overview.props('message')).toBe('2 items selected')
    expect(items.find(({ term }) => term === 'Files').definition).toBe('0')
    expect(items.find(({ term }) => term === 'Folders').definition).toBe('2')
    expect(items.find(({ term }) => term === 'Size').definition).toBe('1 kB')
  })
  it('should display information for two selected files', () => {
    const { wrapper } = createWrapper([fileA, fileB])
    const overview = wrapper.findComponent(SideBarMultipleSelection)
    const items = overview.props('details')

    expect(overview.props('message')).toBe('2 items selected')
    expect(items.find(({ term }) => term === 'Files').definition).toBe('2')
    expect(items.find(({ term }) => term === 'Folders').definition).toBe('0')
    expect(items.find(({ term }) => term === 'Size').definition).toBe('1 kB')
  })
  it('should display information for one selected file, one selected folder', () => {
    const { wrapper } = createWrapper([fileA, folderA])
    const overview = wrapper.findComponent(SideBarMultipleSelection)
    const items = overview.props('details')

    expect(overview.props('message')).toBe('2 items selected')
    expect(items.find(({ term }) => term === 'Files').definition).toBe('1')
    expect(items.find(({ term }) => term === 'Folders').definition).toBe('1')
    expect(items.find(({ term }) => term === 'Size').definition).toBe('1 kB')
  })
})

function createWrapper(resources: Resource[], routeName = 'files-spaces-generic') {
  const mocks = defaultComponentMocks({ currentRoute: mock<RouteLocation>({ name: routeName }) })
  return {
    wrapper: shallowMount(FileDetailsMultiple, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              resourcesStore: { resources, selectedIds: resources.map(({ id }) => id) }
            }
          })
        ],
        mocks,
        provide: mocks
      }
    })
  }
}
