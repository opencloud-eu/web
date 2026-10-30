import MediaAudio from '../../../src/components/Sources/MediaAudio.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { Resource } from '@opencloud-eu/web-client'
import { MediaFile } from '../../../src/helpers/types'

const mediaFile = (mimeType: string): MediaFile =>
  ({
    id: 'audio1',
    name: 'audio',
    url: 'https://example.org/audio',
    ext: 'flac',
    mimeType,
    isVideo: false,
    isImage: false,
    isAudio: true,
    isMotionOrLivePhoto: false,
    isLoading: false,
    isError: false,
    resource: { id: 'audio1' } as Resource
  }) as MediaFile

function getWrapper(mimeType: string) {
  return shallowMount(MediaAudio, {
    props: { file: mediaFile(mimeType), isAutoPlayEnabled: false },
    global: { plugins: [...defaultPlugins()] }
  })
}

describe('MediaAudio component', () => {
  it.each(['audio/x-flac', 'AUDIO/X-FLAC', 'audio/flac'])(
    'uses the standard flac type for "%s"',
    (mimeType) => {
      const wrapper = getWrapper(mimeType)
      expect(wrapper.find('source').attributes('type')).toBe('audio/flac')
    }
  )

  it('keeps other mime types', () => {
    const wrapper = getWrapper('audio/mpeg')
    expect(wrapper.find('source').attributes('type')).toBe('audio/mpeg')
  })
})
