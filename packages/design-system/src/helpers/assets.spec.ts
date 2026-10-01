import { addVersionToAssetUrl } from './assets'

describe('addVersionToAssetUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('adds the package version as query parameter', () => {
    vi.stubEnv('PACKAGE_VERSION', '1.2.3')
    expect(addVersionToAssetUrl('icons/foo.svg')).toBe('icons/foo.svg?v=1.2.3')
  })
  it('appends the package version to existing query parameters', () => {
    vi.stubEnv('PACKAGE_VERSION', '1.2.3')
    expect(addVersionToAssetUrl('icons/foo.svg?bar=1')).toBe('icons/foo.svg?bar=1&v=1.2.3')
  })
  it('returns the url unchanged if no package version is set', () => {
    vi.stubEnv('PACKAGE_VERSION', '')
    expect(addVersionToAssetUrl('icons/foo.svg')).toBe('icons/foo.svg')
  })
  it('returns the url unchanged if "process" is not defined', () => {
    vi.stubGlobal('process', undefined)
    expect(addVersionToAssetUrl('icons/foo.svg')).toBe('icons/foo.svg')
  })
})
