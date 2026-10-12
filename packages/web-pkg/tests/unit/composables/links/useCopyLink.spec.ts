import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useCopyLink } from '../../../../src/composables/links'

describe('useCopyLink', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ClipboardItem',
      class {
        constructor(public items: Record<string, Promise<Blob>>) {}
      }
    )
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        async write([item]: { items: Record<string, Promise<Blob>> }[]) {
          await item.items['text/plain']
        }
      }
    })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects with the error of a failing link creation without an unhandled rejection', async () => {
    const error = new Error('password is banned')
    let copyLink: ReturnType<typeof useCopyLink>['copyLink']
    getComposableWrapper(() => {
      copyLink = useCopyLink().copyLink
    })

    await expect(copyLink({ createLinkHandler: () => Promise.reject(error) })).rejects.toBe(error)
    await new Promise((resolve) => setTimeout(resolve))
  })
})
