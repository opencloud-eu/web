import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { APP_STORE_URL, useAppCompatibility } from '../../../src/composables'

const appStoreApps = {
  apps: [
    {
      id: 'com.github.opencloud-eu.web-extensions.draw-io',
      versions: [
        { version: '2.2.0', minOpenCloud: '6.0.0' },
        { version: '2.1.0', minOpenCloud: '6.0.0', maxOpenCloud: '7.5.0' }
      ]
    },
    {
      id: 'com.github.jankaritech.mdpresentation-viewer',
      versions: [{ version: '2.2.1', minOpenCloud: '7.5.0' }]
    }
  ]
}

describe('useAppCompatibility', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(appStoreApps) })
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('loadAppStoreApps', () => {
    it('fetches the app store apps', async () => {
      const { loadAppStoreApps, loadingFailed } = getComposable()
      await loadAppStoreApps()
      expect(fetchMock).toHaveBeenCalledWith(APP_STORE_URL)
      expect(loadingFailed.value).toBeFalsy()
    })

    it('sets loading while the request is pending', async () => {
      const { loadAppStoreApps, loading } = getComposable()
      const promise = loadAppStoreApps()
      expect(loading.value).toBeTruthy()
      await promise
      expect(loading.value).toBeFalsy()
    })

    it('sets loadingFailed when the request fails', async () => {
      fetchMock.mockRejectedValue(new Error('CSP violation'))
      const { loadAppStoreApps, loadingFailed } = getComposable()
      await loadAppStoreApps()
      expect(loadingFailed.value).toBeTruthy()
    })

    it('sets loadingFailed when the response is not ok', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 404 })
      const { loadAppStoreApps, loadingFailed } = getComposable()
      await loadAppStoreApps()
      expect(loadingFailed.value).toBeTruthy()
    })
  })

  describe('getVersionConstraints', () => {
    it('matches the installed app via the suffix of the app store id', async () => {
      const { loadAppStoreApps, getVersionConstraints } = getComposable()
      await loadAppStoreApps()
      expect(getVersionConstraints('draw-io', '2.1.0')).toEqual({
        minOpenCloud: '6.0.0',
        maxOpenCloud: '7.5.0'
      })
    })

    it('matches the installed app via the full app store id', async () => {
      const { loadAppStoreApps, getVersionConstraints } = getComposable()
      await loadAppStoreApps()
      expect(
        getVersionConstraints('com.github.jankaritech.mdpresentation-viewer', '2.2.1')
      ).toEqual({ minOpenCloud: '7.5.0', maxOpenCloud: undefined })
    })

    it('does not match partial segments of the app store id', async () => {
      const { loadAppStoreApps, getVersionConstraints } = getComposable()
      await loadAppStoreApps()
      expect(getVersionConstraints('io', '2.1.0')).toEqual({})
    })

    it('ignores a "v" prefix of the installed version', async () => {
      const { loadAppStoreApps, getVersionConstraints } = getComposable()
      await loadAppStoreApps()
      expect(getVersionConstraints('draw-io', 'v2.1.0')).toEqual({
        minOpenCloud: '6.0.0',
        maxOpenCloud: '7.5.0'
      })
    })

    it('returns no max version if the app store version has none', async () => {
      const { loadAppStoreApps, getVersionConstraints } = getComposable()
      await loadAppStoreApps()
      expect(getVersionConstraints('draw-io', '2.2.0')).toEqual({
        minOpenCloud: '6.0.0',
        maxOpenCloud: undefined
      })
    })

    it.each([
      { appId: 'unknown', version: '2.1.0' },
      { appId: 'draw-io', version: '1.0.0' },
      { appId: 'draw-io', version: undefined }
    ])('returns no constraints for $appId in version $version', async ({ appId, version }) => {
      const { loadAppStoreApps, getVersionConstraints } = getComposable()
      await loadAppStoreApps()
      expect(getVersionConstraints(appId, version)).toEqual({})
    })
  })

  describe('isCompatible', () => {
    it.each([
      { constraints: {}, expected: true },
      { constraints: { minOpenCloud: '7.0.0' }, expected: true },
      { constraints: { minOpenCloud: '7.1.0' }, expected: true },
      { constraints: { minOpenCloud: '7.2.0' }, expected: false },
      { constraints: { maxOpenCloud: '7.1.0' }, expected: true },
      { constraints: { maxOpenCloud: '7.0.0' }, expected: false },
      { constraints: { maxOpenCloud: '7.1.0' }, serverVersion: '7.1.3', expected: true },
      { constraints: { maxOpenCloud: '7.0.5' }, serverVersion: '7.1.0', expected: false },
      { constraints: { maxOpenCloud: '6.9.0' }, serverVersion: '7.0.0', expected: false },
      { constraints: { maxOpenCloud: '8.0.0' }, serverVersion: '7.9.0', expected: true },
      { constraints: { minOpenCloud: '6.0.0', maxOpenCloud: '8.0.0' }, expected: true }
    ])(
      'returns $expected for $constraints on server $serverVersion',
      ({ constraints, serverVersion = '7.1.0', expected }) => {
        const { isCompatible } = getComposable(`${serverVersion}+abc123`)
        expect(isCompatible(constraints)).toBe(expected)
      }
    )

    it('treats every app as compatible when the server version is unknown', () => {
      const { isCompatible } = getComposable('')
      expect(isCompatible({ minOpenCloud: '99.0.0' })).toBe(true)
    })
  })
})

function getComposable(productversion = '7.1.0') {
  let result: ReturnType<typeof useAppCompatibility>
  getComposableWrapper(
    () => {
      result = useAppCompatibility()
    },
    {
      pluginOptions: {
        piniaOptions: {
          capabilityState: { capabilities: { core: { status: { productversion } } } }
        }
      }
    }
  )
  return result
}
