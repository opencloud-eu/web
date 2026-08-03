import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import ResourceDetails from '../../../../src/components/FilesList/ResourceDetails.vue'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'

describe('ResourceDetails component', () => {
  it('renders the info, details and actions of the given resource', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find('file-info-stub').exists()).toBeTruthy()
    expect(wrapper.find('file-details-stub').exists()).toBeTruthy()
    expect(wrapper.find('file-actions-stub').exists()).toBeTruthy()
  })

  function getWrapper() {
    const file = mock<Resource>({ id: '0', name: 'image.jpg', path: '/image.jpg', isFolder: false })
    const space = mock<SpaceResource>()

    return {
      wrapper: shallowMount(ResourceDetails, {
        props: {
          space,
          singleResource: file
        },
        global: {
          plugins: [
            ...defaultPlugins({
              piniaOptions: { resourcesStore: { currentFolder: mock<Resource>() } }
            })
          ],
          provide: {
            space,
            resource: file,
            versions: []
          }
        }
      })
    }
  }
})
