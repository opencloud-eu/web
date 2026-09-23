import { mount } from '@opencloud-eu/web-test-helpers'

import OcSection from './OcSection.vue'

function getWrapper(props = {}) {
  return mount(OcSection, {
    props: { title: 'Section title', ...props },
    slots: { default: '<p class="content">Content</p>' }
  })
}

describe('OcSection', () => {
  it('renders title, subtitle and content', () => {
    const wrapper = getWrapper({ subtitle: 'Section subtitle' })

    expect(wrapper.find('h2 .oc-section-title').text()).toBe('Section title')
    expect(wrapper.find('.oc-section-subtitle').text()).toBe('Section subtitle')
    expect(wrapper.find('.content').exists()).toBeTruthy()
  })

  it('omits the subtitle when none is given', () => {
    const wrapper = getWrapper()
    expect(wrapper.find('.oc-section-subtitle').exists()).toBeFalsy()
  })

  it('renders the heading with the given tag', () => {
    const wrapper = getWrapper({ titleTag: 'h3' })
    expect(wrapper.find('h3.oc-section-heading').exists()).toBeTruthy()
  })

  it('indents the content only when an icon is given', () => {
    expect(getWrapper().find('.oc-section-content').classes()).not.toContain('pl-9')
    expect(getWrapper({ icon: 'image' }).find('.oc-section-content').classes()).toContain('pl-9')
  })

  it('has no toggle when not expandable', () => {
    const wrapper = getWrapper({ expanded: false })

    expect(wrapper.find('.oc-section-toggle').exists()).toBeFalsy()
    expect(wrapper.find('.content').exists()).toBeTruthy()
  })

  it('collapses and expands via its header when expandable', async () => {
    const wrapper = getWrapper({ expandable: true })
    const toggle = wrapper.find('.oc-section-toggle')

    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(toggle.attributes('aria-controls')).toBe(
      wrapper.find('.oc-section-content').attributes('id')
    )

    await toggle.trigger('click')
    expect(wrapper.emitted('update:expanded')[0][0]).toBe(false)
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.content').exists()).toBeFalsy()

    await toggle.trigger('click')
    expect(wrapper.find('.content').exists()).toBeTruthy()
  })

  it('respects the expanded model', () => {
    const wrapper = getWrapper({ expandable: true, expanded: false })
    expect(wrapper.find('.content').exists()).toBeFalsy()
  })
})
