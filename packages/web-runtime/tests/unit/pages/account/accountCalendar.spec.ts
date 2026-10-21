import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  writable
} from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import AccountCalendar from '../../../../src/pages/account/accountCalendar.vue'
import { useConfigStore } from '@opencloud-eu/web-pkg'
import { AxiosResponse } from 'axios'
import { OcHiddenAnnouncer } from '@opencloud-eu/design-system/components'

beforeEach(() => {
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText: vi.fn()
    }
  })
})

describe('account calendar page', () => {
  it('renders calendar information', async () => {
    const wrapper = getWrapper()

    await flushPromises()
    await nextTick()

    expect(wrapper.text()).toContain('Calendar')
    expect(wrapper.text()).toContain('CalDAV URL')
    expect(wrapper.text()).toContain(
      'Here, you can access your personal calendar for integration with third-party apps like Thunderbird, Apple Calendar, and others.'
    )
    expect(wrapper.find('.calendar-not-configured-message').exists()).toBeFalsy()
  })

  it('does not render content if CalDAV is not available', async () => {
    const wrapper = getWrapper({ available: false })

    await flushPromises()
    await nextTick()

    expect(wrapper.find('.calendar-not-configured-message').exists()).toBeTruthy()
  })

  it('copies CalDAV URL and username to clipboard on button click', async () => {
    const wrapper = getWrapper()

    await flushPromises()

    const urlBtn = wrapper.get('[data-testid="copy-caldav-url"]')
    const userBtn = wrapper.get('[data-testid="copy-caldav-username"]')

    await urlBtn.trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/')

    await userBtn.trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-user')
  })

  it('announces each copy of the CalDAV URL and username', async () => {
    const wrapper = getWrapper()

    await flushPromises()

    const announcer = wrapper.findComponent(OcHiddenAnnouncer)
    expect(announcer.props('announcement')).toBe('')

    await wrapper.get('[data-testid="copy-caldav-url"]').trigger('click')
    expect(announcer.props('announcement')).toBe('Copied to clipboard!')
    const firstKey = announcer.props('announcementKey')

    await wrapper.get('[data-testid="copy-caldav-username"]').trigger('click')
    expect(announcer.props('announcement')).toBe('Copied to clipboard!')
    expect(announcer.props('announcementKey')).not.toBe(firstKey)
  })
})

function getWrapper(opts: { available?: boolean } = {}) {
  const { available = true } = opts

  const mocks = {
    ...defaultComponentMocks()
  }

  const plugins = defaultPlugins({
    piniaOptions: {
      userState: {
        user: {
          onPremisesSamAccountName: 'test-user',
          displayName: 'test-user'
        }
      },
      configState: {
        server: 'https://example.com/'
      }
    }
  })

  const configStore = useConfigStore()
  writable(configStore).serverUrl = 'https://example.com/'

  mocks.$clientService.httpAuthenticated.get.mockResolvedValue({
    status: 301,
    request: {
      responseURL: available ? 'https://example.com/caldav/' : 'https://example.com/somewhere-else'
    }
  } as AxiosResponse)
  return mount(AccountCalendar, {
    global: {
      plugins: plugins,
      mocks,
      provide: mocks
    }
  })
}
