import { mock, mockDeep } from 'vitest-mock-extended'
import { createApp, defineComponent, App } from 'vue'
import {
  CapabilityStore,
  ClientService,
  ConfigStore,
  useAppsStore,
  useConfigStore,
  useUpdatesStore
} from '@opencloud-eu/web-pkg'
import {
  initializeApplications,
  announceApplicationsReady,
  announceCustomScripts,
  announceCustomStyles,
  announceConfiguration,
  announceUpdates,
  _resetEmbedConfigCache
} from '../../../src/container/bootstrap'
import { buildApplication, loadApplication } from '../../../src/container/application'
import { createTestingPinia, mockAxiosResolve } from '@opencloud-eu/web-test-helpers'

vi.mock('../../../src/container/application')

describe('initialize applications', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  it('continues even if one or more applications are falsy', async () => {
    const fishyError = new Error('fishy')
    const initialize = vi.fn()
    const ready = vi.fn()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const loadApplicationMock = vi
      .fn()
      .mockImplementation(
        ({
          applicationKey,
          applicationPath
        }: {
          applicationKey: string
          applicationPath: string
        }) => {
          if (applicationPath.includes('Valid')) {
            return Promise.resolve({ applicationKey })
          }

          return Promise.reject(fishyError)
        }
      )
    vi.mocked(loadApplication).mockImplementation(loadApplicationMock)

    const buildApplicationMock = vi.fn().mockReturnValue({ initialize, ready })
    vi.mocked(buildApplication).mockImplementation(buildApplicationMock)

    const configStore = useConfigStore()
    configStore.apps = ['internalFishy', 'internalValid']
    configStore.externalApps = [
      { id: '1', path: 'externalFishy' },
      { id: '2', path: 'externalValid' }
    ]

    const applications = await initializeApplications({
      app: createApp(defineComponent({})),
      configStore,
      router: undefined,
      appProviderService: undefined
    })

    expect(loadApplicationMock).toHaveBeenCalledTimes(4)
    expect(buildApplicationMock).toHaveBeenCalledTimes(2)
    expect(initialize).toHaveBeenCalledTimes(2)
    expect(errorSpy).toHaveBeenCalledTimes(2)
    expect(errorSpy.mock.calls[0][0]).toMatchObject(fishyError)
    expect(errorSpy.mock.calls[1][0]).toMatchObject(fishyError)

    createTestingPinia()
    await announceApplicationsReady({
      app: mock<App>(),
      appsStore: useAppsStore(),
      applications
    })
    expect(ready).toHaveBeenCalledTimes(2)
  })
})

describe('announceCustomScripts', () => {
  let element: HTMLScriptElement

  beforeEach(() => {
    createTestingPinia()
    vi.spyOn(document.head, 'appendChild').mockImplementation(
      (el) => (element = el as HTMLScriptElement)
    )
  })

  it('injects basic scripts', () => {
    const appendChildSpy = vi.spyOn(document.head, 'appendChild')
    const configStore = useConfigStore()
    configStore.scripts = [{ src: 'foo.js' }, { src: 'bar.js' }]
    announceCustomScripts({ configStore })
    expect(appendChildSpy).toHaveBeenCalledTimes(2)
  })

  it('skips the injection if no src option is provided', () => {
    const appendChildSpy = vi.spyOn(document.head, 'appendChild')
    const configStore = useConfigStore()
    configStore.scripts = [{}, {}, {}, {}, {}]
    announceCustomScripts({ configStore })
    expect(appendChildSpy).not.toHaveBeenCalled()
  })

  it('loads scripts synchronous by default', () => {
    const configStore = useConfigStore()
    configStore.scripts = [{ src: 'foo.js' }]
    announceCustomScripts({ configStore })
    expect(element.async).toBeFalsy()
  })

  it('injects scripts async if the corresponding configurations option is set', () => {
    const configStore = useConfigStore()
    configStore.scripts = [{ src: 'foo.js', async: true }]
    announceCustomScripts({ configStore })
    expect(element.async).toBeTruthy()
  })
})

describe('announceCustomStyles', () => {
  beforeEach(() => {
    createTestingPinia()
  })

  it('injects basic styles', () => {
    const appendChildSpy = vi.spyOn(document.head, 'appendChild')
    const styles = [{ href: 'foo.css' }, { href: 'bar.css' }]
    const configStore = useConfigStore()
    configStore.styles = styles
    announceCustomStyles({ configStore })
    expect(appendChildSpy).toHaveBeenCalledTimes(2)
  })

  it('skips the injection if no href option is provided', () => {
    const appendChildSpy = vi.spyOn(document.head, 'appendChild')
    const configStore = useConfigStore()
    configStore.styles = [{}, {}]
    announceCustomStyles({ configStore })
    expect(appendChildSpy).not.toHaveBeenCalled()
  })
})

describe('announceConfiguration', () => {
  beforeEach(() => {
    createTestingPinia({ stubActions: false })
    _resetEmbedConfigCache()
  })

  it('should not enable embed mode when it is not set', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      mock<Response>({
        status: 200,
        json: () => Promise.resolve({ theme: '', server: '', options: {} })
      })
    )
    const configStore = useConfigStore()
    await announceConfiguration({ path: '/config.json', configStore })
    expect(configStore.options.embed.enabled).toStrictEqual(false)
  })

  it('should embed mode when it is set in config.json', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      mock<Response>({
        status: 200,
        json: () =>
          Promise.resolve({ theme: '', server: '', options: { embed: { enabled: true } } })
      })
    )
    const configStore = useConfigStore()
    await announceConfiguration({ path: '/config.json', configStore })
    expect(configStore.options.embed.enabled).toStrictEqual(true)
  })

  it('should enable embed mode when it is set in URL query but config.json does not set it', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        search: '?embed=true'
      },
      writable: true
    })
    vi.spyOn(global, 'fetch').mockResolvedValue(
      mock<Response>({
        status: 200,
        json: () => Promise.resolve({ theme: '', server: '', options: {} })
      })
    )
    const configStore = useConfigStore()
    await announceConfiguration({ path: '/config.json', configStore })
    expect(configStore.options.embed.enabled).toStrictEqual(true)
  })

  it('should not enable the embed mode when it is set in URL query but config.json disables it', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        search: '?embed=true'
      },
      writable: true
    })
    vi.spyOn(global, 'fetch').mockResolvedValue(
      mock<Response>({
        status: 200,
        json: () =>
          Promise.resolve({ theme: '', server: '', options: { embed: { enabled: false } } })
      })
    )
    const configStore = useConfigStore()
    await announceConfiguration({ path: '/config.json', configStore })
    expect(configStore.options.embed.enabled).toStrictEqual(false)
  })
})

describe('announceUpdates', () => {
  it('does not contact the update server, if capability is turned off', async () => {
    const configStore = mockDeep<ConfigStore>({ serverUrl: 'https://demo.opencloud.eu' })
    const capabilityStore = mockDeep<CapabilityStore>({
      capabilities: {
        core: { 'check-for-updates': false }
      },
      status: { productversion: '3.5.0', edition: 'rolling' }
    })
    const updatesStore = useUpdatesStore()
    const clientService = mockDeep<ClientService>()

    clientService.httpAuthenticated.get.mockResolvedValue(mockAxiosResolve({}))
    await announceUpdates({ clientService, updatesStore, configStore, capabilityStore })
    expect(clientService.httpUnAuthenticated.get).not.toHaveBeenCalled()
  })

  it('sends the correct params to the update server', async () => {
    const configStore = mockDeep<ConfigStore>({ serverUrl: 'https://demo.opencloud.eu' })
    const capabilityStore = mockDeep<CapabilityStore>({
      capabilities: {
        core: { 'check-for-updates': true }
      },
      status: { productversion: '3.5.0', edition: 'rolling' }
    })
    const updatesStore = useUpdatesStore()
    const clientService = mockDeep<ClientService>()

    clientService.httpAuthenticated.get.mockResolvedValue(mockAxiosResolve({}))
    await announceUpdates({ clientService, updatesStore, configStore, capabilityStore })
    expect(clientService.httpUnAuthenticated.get).toHaveBeenCalledWith(
      'https://update.opencloud.eu/server.json',
      {
        headers: {
          'Cache-Control': 'no-cache'
        },
        params: {
          edition: 'rolling',
          server: 'feb937bb3019600cd682a7fc66d17a37540d9b3060ffa415373f2ad81f9f3b3a',
          version: '3.5.0'
        }
      }
    )
  })
})
