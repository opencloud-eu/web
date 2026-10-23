import { Resource } from '@opencloud-eu/web-client'
import { useBrowserImageSupport } from '../../../src/composables'

/** decodes the formats in `supported`, rejects the rest */
class MockImage {
  static supported: string[] = []
  static instances: MockImage[] = []

  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor() {
    MockImage.instances.push(this)
  }

  set src(value: string) {
    const format = value.slice('data:'.length, value.indexOf(';'))
    queueMicrotask(() => {
      if (MockImage.supported.includes(format)) {
        this.onload?.()
      } else {
        this.onerror?.()
      }
    })
  }
}

const vaultImage = (mimeType: string, isInVault = true) =>
  ({ mimeType, isInVault }) as unknown as Resource

describe('useBrowserImageSupport', () => {
  beforeEach(() => {
    MockImage.supported = []
    MockImage.instances = []
    vi.stubGlobal('Image', MockImage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('probes avif, heic and tiff once on creation', async () => {
    const { probed } = useBrowserImageSupport()
    await probed

    expect(MockImage.instances).toHaveLength(3)
  })

  it('renders everything that is not a vault image', async () => {
    const { probed, canRender } = useBrowserImageSupport()
    await probed

    expect(canRender(vaultImage('image/heic', false))).toBe(true)
    expect(canRender(vaultImage('audio/mpeg'))).toBe(true)
  })

  it('renders a vault image in a format every browser reads', async () => {
    const { probed, canRender } = useBrowserImageSupport()
    await probed

    expect(canRender(vaultImage('image/jpeg'))).toBe(true)
    expect(canRender(vaultImage('image/png'))).toBe(true)
    expect(canRender(vaultImage('image/webp'))).toBe(true)
  })

  it('renders a vault image in a probed format only if the browser decoded the probe', async () => {
    MockImage.supported = ['image/avif']
    const { probed, canRender } = useBrowserImageSupport()
    await probed

    expect(canRender(vaultImage('image/avif'))).toBe(true)
    expect(canRender(vaultImage('image/heic'))).toBe(false)
    expect(canRender(vaultImage('image/tiff'))).toBe(false)
  })

  it('lets heif and the image sequence types follow the heic probe', async () => {
    MockImage.supported = ['image/heic']
    const { probed, canRender } = useBrowserImageSupport()
    await probed

    expect(canRender(vaultImage('image/heif'))).toBe(true)
    expect(canRender(vaultImage('image/heic-sequence'))).toBe(true)
    expect(canRender(vaultImage('image/heif-sequence'))).toBe(true)
    expect(canRender(vaultImage('IMAGE/HEIC'))).toBe(true)
  })

  it('counts a probed format as unsupported until the probe settled', () => {
    MockImage.supported = ['image/heic']
    const { canRender } = useBrowserImageSupport()

    expect(canRender(vaultImage('image/heic'))).toBe(false)
  })
})
