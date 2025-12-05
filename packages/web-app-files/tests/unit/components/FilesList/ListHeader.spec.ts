import ListHeader from '../../../../src/components/FilesList/ListHeader.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { flushPromises } from '@vue/test-utils'

describe('ListHeader', () => {
  it('renders a spinner when loading', () => {
    const wrapper = getWrapper()
    expect(wrapper.find('oc-spinner-stub').exists()).toBeTruthy()
  })
  it('renders a markdown container when README content is loaded', async () => {
    const wrapper = getWrapper()
    await flushPromises()
    expect(wrapper.find('.markdown-container').exists()).toBeTruthy()
  })
})

function getWrapper() {
  const mocks = {
    ...defaultComponentMocks()
  }

  mocks.$clientService.webdav.getFileContents.mockResolvedValueOnce({
    body: 'Sample README content'
  })

  return shallowMount(ListHeader, {
    props: {
      space: mock<SpaceResource>(),
      readmeFile: mock<Resource>()
    },
    global: {
      mocks,
      plugins: [...defaultPlugins()],
      provide: mocks
    }
  })
}
