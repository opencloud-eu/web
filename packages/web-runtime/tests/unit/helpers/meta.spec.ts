import { findOpenGraphImage, injectOpenGraphMeta } from '../../../src/helpers/meta'

const getMetaContent = (property: string) =>
  document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)?.content

describe('injectOpenGraphMeta', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('injects the Open Graph tags', () => {
    injectOpenGraphMeta({
      title: 'foo.mp4',
      siteName: 'OpenCloud',
      url: 'https://opencloud.test/s/abcxyz',
      description: 'Excellent file sharing',
      image: 'themes/opencloud/assets/logo.png',
      imageAlt: 'OpenCloud'
    })

    expect(getMetaContent('og:type')).toBe('website')
    expect(getMetaContent('og:title')).toBe('foo.mp4')
    expect(getMetaContent('og:site_name')).toBe('OpenCloud')
    expect(getMetaContent('og:url')).toBe('https://opencloud.test/s/abcxyz')
    expect(getMetaContent('og:description')).toBe('Excellent file sharing')
    expect(getMetaContent('og:image:alt')).toBe('OpenCloud')
  })

  it('resolves a relative image to an absolute URL', () => {
    injectOpenGraphMeta({
      title: 'foo.mp4',
      siteName: 'OpenCloud',
      url: 'https://opencloud.test/s/abcxyz',
      image: 'themes/opencloud/assets/logo.png'
    })

    expect(getMetaContent('og:image')).toBe(
      new URL('themes/opencloud/assets/logo.png', document.baseURI).href
    )
  })

  it('updates existing tags instead of adding new ones', () => {
    injectOpenGraphMeta({ title: 'foo.mp4', siteName: 'OpenCloud', url: 'https://opencloud.test' })
    injectOpenGraphMeta({ title: 'bar.mp4', siteName: 'OpenCloud', url: 'https://opencloud.test' })

    expect(document.querySelectorAll('meta[property="og:title"]').length).toBe(1)
    expect(getMetaContent('og:title')).toBe('bar.mp4')
  })

  it('omits an image that is not a valid URL', () => {
    injectOpenGraphMeta({
      title: 'foo.mp4',
      siteName: 'OpenCloud',
      url: 'https://opencloud.test',
      image: 'http://[',
      imageAlt: 'foo.mp4'
    })

    expect(document.querySelector('meta[property="og:image"]')).toBeNull()
    expect(document.querySelector('meta[property="og:image:alt"]')).toBeNull()
    expect(getMetaContent('og:title')).toBe('foo.mp4')
  })

  it('removes tags for which no value is given', () => {
    injectOpenGraphMeta({
      title: 'foo.mp4',
      siteName: 'OpenCloud',
      url: 'https://opencloud.test',
      description: 'Excellent file sharing'
    })
    injectOpenGraphMeta({ title: 'foo.mp4', siteName: 'OpenCloud', url: 'https://opencloud.test' })

    expect(document.querySelector('meta[property="og:description"]')).toBeNull()
  })

  it('injects and removes media tags together with their MIME types', () => {
    injectOpenGraphMeta({
      title: 'foo.mp4',
      siteName: 'OpenCloud',
      url: 'https://opencloud.test/s/abcxyz',
      video: 'https://opencloud.test/video.mp4',
      videoType: 'video/mp4',
      audio: 'https://opencloud.test/audio.mp3',
      audioType: 'audio/mpeg'
    })

    expect(getMetaContent('og:video')).toBe('https://opencloud.test/video.mp4')
    expect(getMetaContent('og:video:type')).toBe('video/mp4')
    expect(getMetaContent('og:audio')).toBe('https://opencloud.test/audio.mp3')
    expect(getMetaContent('og:audio:type')).toBe('audio/mpeg')

    injectOpenGraphMeta({
      title: 'foo.png',
      siteName: 'OpenCloud',
      url: 'https://opencloud.test/s/abcxyz'
    })

    expect(document.querySelector('meta[property="og:video"]')).toBeNull()
    expect(document.querySelector('meta[property="og:video:type"]')).toBeNull()
    expect(document.querySelector('meta[property="og:audio"]')).toBeNull()
    expect(document.querySelector('meta[property="og:audio:type"]')).toBeNull()
  })
})

describe('findOpenGraphImage', () => {
  it('uses the first PNG or JPEG image and ignores unsupported formats', () => {
    expect(
      findOpenGraphImage([
        'themes/opencloud/assets/logo.svg',
        'themes/opencloud/assets/favicon.jpg',
        'themes/opencloud/assets/fallback.png'
      ])
    ).toBe('themes/opencloud/assets/favicon.jpg')
  })

  it('returns undefined if no supported image is available', () => {
    expect(
      findOpenGraphImage([
        'themes/opencloud/assets/logo.svg',
        'themes/opencloud/assets/favicon.ico'
      ])
    ).toBeUndefined()
  })
})
