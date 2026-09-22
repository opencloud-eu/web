import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import YjsStatusIndicator from '../../../../src/components/Yjs/YjsStatusIndicator.vue'
import { YjsStatus } from '../../../../src/composables/yjs'

describe('YjsStatusIndicator', () => {
  it.each([null, YjsStatus.Local])('renders nothing for %s sessions', (status) => {
    expect(getWrapper(status).find('.yjs-status-indicator').exists()).toBeFalsy()
  })

  it.each([
    [YjsStatus.Connected, 'Collaboration ready', 'wifi'],
    [YjsStatus.Connecting, 'Collaboration connecting...', 'wifi'],
    [YjsStatus.Disconnected, 'Collaboration disconnected', 'wifi-off']
  ])('labels %s with "%s"', (status, label, icon) => {
    const indicator = getWrapper(status).get('.yjs-status-indicator')

    expect(indicator.attributes('aria-label')).toBe(label)
    expect(indicator.attributes('data-test-yjs-status')).toBe(status)
    expect(indicator.findComponent({ name: 'oc-icon' }).props('name')).toBe(icon)
  })

  it('distinguishes the states by color', () => {
    const classesFor = (status: YjsStatus) =>
      getWrapper(status).get('.yjs-status-indicator span').classes().join(' ')

    expect(classesFor(YjsStatus.Connected)).toContain('green')
    expect(classesFor(YjsStatus.Disconnected)).toContain('red')
    expect(classesFor(YjsStatus.Connecting)).toContain('gray')
  })
})

const getWrapper = (status: YjsStatus | null) => {
  return mount(YjsStatusIndicator, {
    props: { status },
    global: { plugins: defaultPlugins() }
  })
}
