import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  writable
} from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import CalDavUrl from '../../../../src/components/Account/CalDavUrl.vue'
import { useConfigStore } from '@opencloud-eu/web-pkg'
import { AxiosResponse } from 'axios'

beforeEach(() => {
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText: vi.fn()
    }
  })
})

function getWrapper(overrides: { props?: any } = {}) {
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
      responseURL: 'https://example.com/caldav/'
    }
  } as AxiosResponse)
  return mount(CalDavUrl, {
    global: {
      plugins: plugins,
      mocks,
      provide: mocks
    },
    props: {
      isCalDavAvailable: true,
      ...overrides.props
    }
  })
}

describe('CalDavUrl component', () => {
  it('renders CalDAV information when available', async () => {
    const wrapper = getWrapper()

    await flushPromises()
    await nextTick()

    expect(wrapper.text()).toContain('Calendar')
    expect(wrapper.text()).toContain('CalDAV URL')
    expect(wrapper.text()).toContain(
      'Here, you can access your personal calendar for integration with third-party apps like Thunderbird, Apple Calendar, and others.'
    )
  })

  it('does not render content if CalDAV is not available', () => {
    const wrapper = getWrapper({
      props: {
        isCalDavAvailable: false
      }
    })

    expect(wrapper.text()).not.toContain('Calendar')
    expect(wrapper.text()).not.toContain('CalDAV URL')
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
})
