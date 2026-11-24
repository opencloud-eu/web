import SupportCard from '../../../../src/components/SidebarNav/SupportCard.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { createGettext } from 'vue3-gettext'
import { nextTick } from 'vue'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'

enableAutoUnmount(afterEach)

describe('SupportCard', () => {
  it('links the donate button to the GitHub sponsors page', () => {
    const { wrapper } = getWrapper()
    const donateButton = wrapper.find('.oc-support-card-donate')
    expect(donateButton.attributes('href')).toBe('https://github.com/sponsors/opencloud-eu')
    expect(donateButton.attributes('target')).toBe('_blank')
    expect(donateButton.attributes('rel')).toBe('noopener noreferrer')
  })

  it.each([
    { language: 'de', expected: 'de/node/2256' },
    { language: 'de_CH', expected: 'de/node/2256' },
    { language: 'en', expected: 'en/node/2256' },
    { language: 'fr', expected: 'en/node/2256' }
  ])(
    'links the buy support button to $expected for language $language',
    ({ language, expected }) => {
      const { wrapper } = getWrapper({ language })
      const buySupportButton = wrapper.find('.oc-support-card-buy-support')
      expect(buySupportButton.attributes('href')).toBe(
        `https://opencloud.eu/${expected}?mtm_campaign=subscription_support&mtm_source=opencloud_web&mtm_medium=in_app&mtm_content=buy_button`
      )
      expect(buySupportButton.attributes('target')).toBe('_blank')
      expect(buySupportButton.attributes('rel')).toBe('noopener noreferrer')
    }
  )

  describe('collapsing', () => {
    afterEach(() => {
      window.localStorage.clear()
    })

    it('is expanded by default with a collapse button controlling the content', () => {
      const { wrapper } = getWrapper()
      const collapseButton = wrapper.get('.oc-support-card-collapse')
      expect(collapseButton.attributes('aria-expanded')).toBe('true')
      const content = wrapper.get(`#${collapseButton.attributes('aria-controls')}`)
      expect(content.find('.oc-support-card-donate').exists()).toBeTruthy()
      expect(wrapper.find('.oc-support-card-expand').exists()).toBeFalsy()
      expect(wrapper.find('[inert]').exists()).toBeFalsy()
    })

    it('collapses to the heart and remembers it', async () => {
      const { wrapper } = getWrapper()
      await wrapper.get('.oc-support-card-collapse').trigger('click')
      const expandButton = wrapper.get('.oc-support-card-expand')
      expect(expandButton.attributes('aria-expanded')).toBe('false')
      expect(wrapper.find('.oc-support-card-collapse').exists()).toBeFalsy()
      const content = wrapper.get(`#${expandButton.attributes('aria-controls')}`)
      expect(content.findAll('[inert]').length).toBe(2)
      expect(window.localStorage.getItem('oc_supportCardCollapsed')).toBe('true')
    })

    it('expands again and remembers it', async () => {
      window.localStorage.setItem('oc_supportCardCollapsed', 'true')
      const { wrapper } = getWrapper()
      await wrapper.get('.oc-support-card-expand').trigger('click')
      expect(wrapper.find('.oc-support-card-collapse').exists()).toBeTruthy()
      expect(wrapper.find('[inert]').exists()).toBeFalsy()
      expect(window.localStorage.getItem('oc_supportCardCollapsed')).toBeNull()
    })

    it('starts collapsed when it was collapsed before', () => {
      window.localStorage.setItem('oc_supportCardCollapsed', 'true')
      const { wrapper } = getWrapper()
      expect(wrapper.find('.oc-support-card-expand').exists()).toBeTruthy()
      expect(wrapper.find('.oc-support-card-collapse').exists()).toBeFalsy()
    })

    it('starts collapsed when it was dismissed before and drops the old key', () => {
      window.localStorage.setItem('oc_supportCardDismissed', 'true')
      const { wrapper } = getWrapper()
      expect(wrapper.find('.oc-support-card-expand').exists()).toBeTruthy()
      expect(window.localStorage.getItem('oc_supportCardCollapsed')).toBe('true')
      expect(window.localStorage.getItem('oc_supportCardDismissed')).toBeNull()
    })

    it('moves keyboard focus to the other toggle', async () => {
      const { wrapper } = getWrapper({ attachTo: document.body })
      const collapseButton = wrapper.get<HTMLButtonElement>('.oc-support-card-collapse')
      collapseButton.element.focus()
      await collapseButton.trigger('click')
      await flushPromises()
      expect(document.activeElement).toBe(wrapper.get('.oc-support-card-expand').element)

      await wrapper.get('.oc-support-card-expand').trigger('click')
      await flushPromises()
      expect(document.activeElement).toBe(wrapper.get('.oc-support-card-collapse').element)
    })

    it('moves keyboard focus only after the size transition ended', async () => {
      const { wrapper } = getWrapper({ attachTo: document.body })
      const { promise: finished, resolve } = Promise.withResolvers<Animation>()
      vi.spyOn(wrapper.get('.oc-support-card-backdrop').element, 'getAnimations').mockReturnValue([
        { finished } as Animation
      ])
      const collapseButton = wrapper.get<HTMLButtonElement>('.oc-support-card-collapse')
      collapseButton.element.focus()
      await collapseButton.trigger('click')
      await flushPromises()
      expect(document.activeElement).toBe(wrapper.element)

      resolve(undefined)
      await flushPromises()
      expect(document.activeElement).toBe(wrapper.get('.oc-support-card-expand').element)
    })

    it('keeps the focus in the card without focusing the other toggle on a mouse click', async () => {
      const { wrapper } = getWrapper({ attachTo: document.body })
      await wrapper.get('.oc-support-card-collapse').trigger('click')
      await flushPromises()
      expect(document.activeElement).toBe(wrapper.element)
    })

    it('plays the heart animation when expanding', async () => {
      window.localStorage.setItem('oc_supportCardCollapsed', 'true')
      const { wrapper } = getWrapper()
      expect(wrapper.find('.oc-support-card-animate-celebrate').exists()).toBeFalsy()
      await wrapper.get('.oc-support-card-expand').trigger('click')
      await nextTick()
      expect(wrapper.find('.oc-support-card-animate-celebrate').exists()).toBeTruthy()
    })
  })

  it('only animates on the first mount', async () => {
    vi.resetModules()
    const { default: FreshSupportCard } =
      await import('../../../../src/components/SidebarNav/SupportCard.vue')
    const { wrapper: firstWrapper } = getWrapper({ component: FreshSupportCard })
    const { wrapper: secondWrapper } = getWrapper({ component: FreshSupportCard })
    expect(firstWrapper.find('.oc-support-card-animate-celebrate').exists()).toBeTruthy()
    expect(secondWrapper.find('.oc-support-card-animate-celebrate').exists()).toBeFalsy()
  })
})

function getWrapper({
  language = 'en',
  component = SupportCard,
  attachTo = undefined as HTMLElement
} = {}) {
  return {
    wrapper: mount(component, {
      attachTo,
      global: {
        plugins: [
          ...defaultPlugins({ gettext: false }),
          createGettext({ translations: {}, silent: true, defaultLanguage: language })
        ]
      }
    })
  }
}
