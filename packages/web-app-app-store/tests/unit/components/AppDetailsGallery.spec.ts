import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import AppDetailsGallery from '../../../src/components/AppDetailsGallery.vue'
import { App, AppImage } from '../../../src/types'

const coverImage: AppImage = { url: 'https://example.com/cover.png', caption: 'Cover' }
const screenshots: AppImage[] = [
  { url: 'https://example.com/1.png', caption: 'First screenshot' },
  { url: '' },
  { url: 'https://example.com/2.png' }
]

const selectors = {
  image: '.app-details-gallery-image img',
  fallbackIcon: '.app-details-gallery-image .oc-icon',
  caption: '.app-details-gallery-caption',
  counter: '.app-details-gallery-counter',
  thumbnail: '[data-testid="gallery-thumbnail"]'
}

describe('AppDetailsGallery', () => {
  it('shows the cover image first, followed by all screenshots with a url', () => {
    const { wrapper } = getWrapper({ coverImage, screenshots })
    expect(wrapper.find(selectors.image).attributes('src')).toBe(coverImage.url)
    expect(wrapper.find(selectors.caption).text()).toBe('Cover')
    expect(wrapper.find(selectors.counter).text()).toBe('1 / 3')
    expect(wrapper.findAll(selectors.thumbnail)).toHaveLength(3)
  })
  it('switches the image via the thumbnails', async () => {
    const { wrapper } = getWrapper({ coverImage, screenshots })
    await wrapper.findAll(selectors.thumbnail)[1].trigger('click')
    expect(wrapper.find(selectors.image).attributes('src')).toBe(screenshots[0].url)
    expect(wrapper.find(selectors.caption).text()).toBe('First screenshot')
    expect(wrapper.find(selectors.counter).text()).toBe('2 / 3')
    expect(wrapper.findAll(selectors.thumbnail)[1].attributes('aria-pressed')).toBe('true')
  })
  it('renders neither counter nor thumbnails for a single image', () => {
    const { wrapper } = getWrapper({ coverImage, screenshots: [] })
    expect(wrapper.find(selectors.counter).exists()).toBeFalsy()
    expect(wrapper.find(selectors.thumbnail).exists()).toBeFalsy()
  })
  it('renders a fallback icon if there are no images', () => {
    const { wrapper } = getWrapper({ coverImage: undefined, screenshots: [] })
    expect(wrapper.find(selectors.image).exists()).toBeFalsy()
    expect(wrapper.find(selectors.fallbackIcon).exists()).toBeTruthy()
  })
})

function getWrapper(app: Partial<App>) {
  return {
    wrapper: mount(AppDetailsGallery, {
      props: { app: { ...mock<App>(), authors: [], badge: undefined, ...app } },
      global: { plugins: [...defaultPlugins()] }
    })
  }
}
