import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import AppCoverImage from '../../../src/components/AppCoverImage.vue'
import { App, AppBadge, AppImage, BADGE_COLORS } from '../../../src/types'

const coverImageWithUrl: AppImage = { url: 'https://example.com/cover.jpg', caption: 'Cover image' }
const coverImageWithoutUrl: AppImage = { url: '', caption: 'Trololo' }

const selectors = {
  badge: '.app-image-ribbon',
  official: '.app-official-badge',
  image: '.app-image img',
  imageFallback: '.app-image .fallback-icon'
}

describe('AppCoverImage.vue', () => {
  describe('badges', () => {
    it('renders no ribbon if the app has no badge', () => {
      const { wrapper } = getWrapper({})
      expect(wrapper.find(selectors.badge).exists()).toBeFalsy()
    })
    it('renders a ribbon if the app has a badge', () => {
      const badge = { label: 'New', color: BADGE_COLORS[1] }
      const { wrapper } = getWrapper({ badge })
      expect(wrapper.find(selectors.badge).text()).toBe(badge.label)
      expect(wrapper.find(selectors.badge).classes()).toContain(`app-image-ribbon-${badge.color}`)
    })
    it.each([true, false])('renders the official badge only for official apps (%s)', (official) => {
      const { wrapper } = getWrapper({ official })
      expect(wrapper.find(selectors.official).exists()).toBe(official)
    })
  })
  describe('cover image', () => {
    it('renders the image if it has a url', () => {
      const { wrapper } = getWrapper({ coverImage: coverImageWithUrl })
      expect(wrapper.find(selectors.image).attributes().src).toBe(coverImageWithUrl.url)
      expect(wrapper.find(selectors.imageFallback).exists()).toBeFalsy()
    })
    it.each([coverImageWithoutUrl, undefined])(
      'renders a fallback icon if there is no image url (%o)',
      (coverImage) => {
        const { wrapper } = getWrapper({ coverImage })
        expect(wrapper.find(selectors.image).exists()).toBeFalsy()
        expect(wrapper.find(selectors.imageFallback).exists()).toBeTruthy()
      }
    )
  })
})

function getWrapper({
  badge,
  coverImage,
  official = false
}: {
  badge?: AppBadge
  coverImage?: AppImage
  official?: boolean
}) {
  const app = { ...mock<App>({}), badge, coverImage, official }
  return {
    wrapper: mount(AppCoverImage, {
      props: { app },
      global: { plugins: defaultPlugins() }
    })
  }
}
