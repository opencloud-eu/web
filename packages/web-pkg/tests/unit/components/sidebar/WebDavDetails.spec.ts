import WebDavDetails from '../../../../src/components/SideBar/WebDavDetails.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import { defineComponent, h, ref } from 'vue'

const announceMock = vi.fn()
// exposes a spy as the announce method, so the tests can check what gets announced
const OcHiddenAnnouncerStub = defineComponent({
  setup(_, { expose }) {
    expose({ announce: announceMock })
    return () => h('span')
  }
})

describe('WebDavDetails', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    announceMock.mockReset()
  })

  it.each([
    { index: 0, copied: '/dav/spaces/1/file.txt' },
    { index: 1, copied: 'https://example.com/dav/spaces/1/file.txt' }
  ])('announces each copy of the WebDAV path or URL ($copied)', async ({ index, copied }) => {
    const wrapper = getWrapper()

    await wrapper.findAll('button').at(index).trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(copied)
    expect(announceMock).toHaveBeenCalledWith('Copied to clipboard!')

    await wrapper.findAll('button').at(index).trigger('click')
    expect(announceMock).toHaveBeenCalledTimes(2)
  })
})

function getWrapper() {
  const space = mock<SpaceResource>({
    getWebDavUrl: () => 'https://example.com/dav/spaces/1/file.txt'
  })
  const resource = mock<Resource>({ path: '/file.txt', webDavPath: '/dav/spaces/1/file.txt' })

  return mount(WebDavDetails, {
    props: { space },
    global: {
      plugins: [...defaultPlugins()],
      provide: { resource: ref(resource) },
      stubs: { OcHiddenAnnouncer: OcHiddenAnnouncerStub }
    }
  })
}
