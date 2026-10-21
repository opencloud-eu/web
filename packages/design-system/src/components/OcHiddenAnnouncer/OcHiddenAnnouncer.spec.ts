import OcHiddenAnnouncer from './OcHiddenAnnouncer.vue'
import { mount } from '@opencloud-eu/web-test-helpers'

describe('OcHiddenAnnouncer', () => {
  function getWrapper(props = {}) {
    return mount(OcHiddenAnnouncer, {
      props: {
        announcement: 'Hidden announcer (please inspect element)',
        ...props
      }
    })
  }
  describe('level', () => {
    it.each(['polite', 'assertive', 'off'])(
      'should set the provided label as aria live',
      (level) => {
        const wrapper = getWrapper({ level: level })
        expect(wrapper.attributes('aria-live')).toBe(level)
      }
    )
  })
  describe('announcement', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('should render the provided announcement text', () => {
      const wrapper = getWrapper()
      expect(wrapper.text()).toBe('Hidden announcer (please inspect element)')
    })
    it('should set a new announcement after clearing the text for a short delay', async () => {
      const wrapper = getWrapper({ announcement: '' })
      expect(wrapper.text()).toBe('')
      await wrapper.setProps({ announcement: 'Copied' })
      expect(wrapper.text()).toBe('')
      await vi.runAllTimersAsync()
      expect(wrapper.text()).toBe('Copied')
    })
    it('should announce the same text again when the announcement key changes', async () => {
      const wrapper = getWrapper({ announcement: 'Copied', announcementKey: 1 })
      await wrapper.setProps({ announcementKey: 2 })
      expect(wrapper.text()).toBe('')
      await vi.runAllTimersAsync()
      expect(wrapper.text()).toBe('Copied')
    })
    it('should only render the latest announcement on quick successive changes', async () => {
      const wrapper = getWrapper({ announcement: '' })
      await wrapper.setProps({ announcement: 'first' })
      await vi.advanceTimersByTimeAsync(50)
      await wrapper.setProps({ announcement: 'second' })
      await vi.advanceTimersByTimeAsync(50)
      expect(wrapper.text()).toBe('')
      await vi.runAllTimersAsync()
      expect(wrapper.text()).toBe('second')
    })
  })
})
