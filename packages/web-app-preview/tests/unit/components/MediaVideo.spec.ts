import MediaVideo from '../../../src/components/Sources/MediaVideo.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { Resource } from '@opencloud-eu/web-client'
import { MediaFile } from '../../../src/helpers/types'

const mediaFile = ({ id = 'video1', url = 'https://example.org/video' } = {}): MediaFile =>
  ({
    id,
    name: 'video',
    url,
    ext: 'mp4',
    mimeType: 'video/mp4',
    isVideo: true,
    isImage: false,
    isAudio: false,
    isMotionOrLivePhoto: false,
    isLoading: false,
    isError: false,
    resource: { id } as Resource
  }) as MediaFile

function getWrapper(file = mediaFile()) {
  return shallowMount(MediaVideo, {
    props: { file, isAutoPlayEnabled: false },
    global: { plugins: [...defaultPlugins()] },
    attachTo: document.querySelector('.stage_media')
  })
}

describe('MediaVideo component', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="stage_media"></div>'
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  })

  it('reloads a signed url once before it reports an error', async () => {
    const wrapper = getWrapper()

    await wrapper.find('source').trigger('error')
    expect(wrapper.emitted('reload-url')).toHaveLength(1)
    expect(wrapper.emitted('error')).toBeUndefined()

    await wrapper.setProps({ file: mediaFile({ url: 'https://example.org/video?sig=new' }) })
    await wrapper.find('source').trigger('error')
    expect(wrapper.emitted('reload-url')).toHaveLength(1)
    expect(wrapper.emitted('error')).toHaveLength(1)
  })

  it('retries again after a successful retry', async () => {
    const wrapper = getWrapper()

    await wrapper.find('source').trigger('error')
    await wrapper.setProps({ file: mediaFile({ url: 'https://example.org/video?sig=new' }) })
    await wrapper.find('video').trigger('canplay')
    await wrapper.find('video').trigger('error')

    expect(wrapper.emitted('reload-url')).toHaveLength(2)
    expect(wrapper.emitted('error')).toBeUndefined()
  })

  it('reports an error right away for a blob url', async () => {
    const wrapper = getWrapper(mediaFile({ url: 'blob:https://example.org/video' }))

    await wrapper.find('source').trigger('error')

    expect(wrapper.emitted('reload-url')).toBeUndefined()
    expect(wrapper.emitted('error')).toHaveLength(1)
  })

  it('ignores an error of the previous file after switching files', async () => {
    const wrapper = getWrapper(mediaFile({ url: 'blob:https://example.org/video' }))
    const previousSource = wrapper.find('source').element

    await wrapper.setProps({
      file: mediaFile({ id: 'video2', url: 'blob:https://example.org/v2' })
    })
    previousSource.dispatchEvent(new Event('error'))

    expect(wrapper.emitted('reload-url')).toBeUndefined()
    expect(wrapper.emitted('error')).toBeUndefined()
  })
})
