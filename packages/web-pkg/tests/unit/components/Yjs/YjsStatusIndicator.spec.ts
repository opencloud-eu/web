import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import YjsStatusIndicator from '../../../../src/components/Yjs/YjsStatusIndicator.vue'
import { YjsStatus } from '../../../../src/composables/yjs'

describe('YjsStatusIndicator', () => {
  it.each([null, YjsStatus.Local])('renders nothing for %s sessions', (status) => {
    expect(getWrapper(status).find('.yjs-status-indicator').exists()).toBeFalsy()
  })

  it.each([
    [YjsStatus.Connected, 'Collaboration ready', 'circle-fill'],
    [YjsStatus.Connecting, 'Collaboration connecting...', 'circle-line'],
    [YjsStatus.Disconnected, 'Collaboration disconnected', 'circle-fill']
  ])('labels %s with "%s"', (status, label, icon) => {
    const indicator = getWrapper(status).get('.yjs-status-indicator')

    expect(indicator.attributes('aria-label')).toBe(label)
    expect(indicator.attributes('data-test-yjs-status')).toBe(status)
    expect(indicator.findComponent({ name: 'oc-icon' }).props('name')).toBe(icon)
  })

  it('distinguishes the states by color', () => {
    const classesFor = (status: YjsStatus) =>
      getWrapper(status).get('.yjs-status-indicator').classes().join(' ')

    expect(classesFor(YjsStatus.Connected)).toContain('green')
    expect(classesFor(YjsStatus.Disconnected)).toContain('red')
    expect(classesFor(YjsStatus.Connecting)).toContain('gray')
  })

  it.each([YjsStatus.Connected, YjsStatus.Connecting])(
    'shows no visible label but a tooltip for %s sessions',
    async (status) => {
      const wrapper = getWrapper(status)
      const indicator = wrapper.get('.yjs-status-indicator')

      expect(indicator.find('.yjs-status-indicator-label').exists()).toBe(false)
      await indicator.trigger('mouseenter')
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
        indicator.attributes('aria-label')
      )
      wrapper.unmount()
    }
  )

  it('shows a visible offline label instead of a tooltip when disconnected', async () => {
    const wrapper = getWrapper(YjsStatus.Disconnected)
    const indicator = wrapper.get('.yjs-status-indicator')

    expect(indicator.get('.yjs-status-indicator-label').text()).toBe('Offline')
    await indicator.trigger('mouseenter')
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
    wrapper.unmount()
  })
})

const getWrapper = (status: YjsStatus | null) => {
  return mount(YjsStatusIndicator, {
    props: { status },
    global: { plugins: defaultPlugins() }
  })
}
