import WebDavDetails from '../../../../src/components/SideBar/WebDavDetails.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { OcHiddenAnnouncer } from '@opencloud-eu/design-system/components'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import { ref } from 'vue'

describe('WebDavDetails', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    { index: 0, copied: '/dav/spaces/1/file.txt' },
    { index: 1, copied: 'https://example.com/dav/spaces/1/file.txt' }
  ])('announces each copy of the WebDAV path or URL ($copied)', async ({ index, copied }) => {
    const wrapper = getWrapper()
    const announcer = wrapper.findComponent(OcHiddenAnnouncer)
    expect(announcer.props('announcement')).toBe('')

    await wrapper.findAll('button').at(index).trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(copied)
    expect(announcer.props('announcement')).toBe('Copied to clipboard!')
    const firstKey = announcer.props('announcementKey')

    await wrapper.findAll('button').at(index).trigger('click')
    expect(announcer.props('announcementKey')).not.toBe(firstKey)
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
      provide: { resource: ref(resource) }
    }
  })
}
