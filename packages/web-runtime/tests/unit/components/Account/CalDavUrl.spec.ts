import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import CalDavUrl from '../../../../src/components/Account/CalDavUrl.vue'
import { vi } from 'vitest'

import { ref } from 'vue'

beforeEach(() => {
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText: vi.fn()
    }
  })
})

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as Record<string, unknown>),
    useClientService: () => ({
      httpAuthenticated: {
        get: vi.fn().mockResolvedValue({
          status: 301,
          headers: {
            location: '/caldav/'
          },
          request: {
            responseURL: 'https://example.com/caldav/'
          }
        })
      }
    }),
    useUserStore: () => ({
      user: ref({
        onPremisesSamAccountName: 'test-user'
      })
    }),
    useConfigStore: () => ({
      serverUrl: 'https://example.com/'
    })
  }
})

describe('CalDavUrl component', () => {
  it('renders CalDAV information when available', async () => {
    const wrapper = mount(CalDavUrl, {
      global: {
        plugins: defaultPlugins(),
        mocks: {
          ...defaultComponentMocks,
          $gettext: (msg: string) => msg,
          authStore: {
            userContextReady: true
          }
        }
      },
      props: {
        checked: true,
        calDavAvailable: true
      }
    })

    await flushPromises()
    await nextTick()

    expect(wrapper.text()).toContain('Calendar')
    expect(wrapper.text()).toContain('CalDAV URL')
    expect(wrapper.text()).toContain(
      'Here, you can access your personal calendar for integration with third-party apps like Thunderbird, Apple Calendar, and others.'
    )
  })

  it('does not render content if CalDAV is not available', () => {
    const wrapper = mount(CalDavUrl, {
      global: {
        plugins: defaultPlugins(),
        mocks: {
          ...defaultComponentMocks,
          $gettext: (msg: string) => msg,
          authStore: {
            userContextReady: true
          }
        }
      },
      props: {
        checked: false,
        calDavAvailable: false
      }
    })

    expect(wrapper.text()).not.toContain('Calendar')
    expect(wrapper.text()).not.toContain('CalDAV URL')
  })

  it('copies CalDAV URL and username to clipboard on button click', async () => {
    const wrapper = mount(CalDavUrl, {
      global: {
        plugins: defaultPlugins()
      },
      props: {
        checked: true,
        calDavAvailable: true
      }
    })

    await flushPromises()

    const urlBtn = wrapper.get('[data-testid="copy-caldav-url"]')
    const userBtn = wrapper.get('[data-testid="copy-caldav-username"]')

    await urlBtn.trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/')

    await userBtn.trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-user')
  })
})
