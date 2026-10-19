import { mock } from 'vitest-mock-extended'
import { LinkShare } from '@opencloud-eu/web-client'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useCopyLink } from '../../../../src/composables/links'
import { useMessages } from '../../../../src/composables/piniaStores'

const copiedMessage = 'The link has been copied to your clipboard.'
const notCopiedMessage = "The link has been created, but it couldn't be copied to your clipboard."

describe('useCopyLink', () => {
  const originalClipboard = navigator.clipboard
  let clipboardWrite: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.stubGlobal(
      'ClipboardItem',
      class {
        constructor(public items: Record<string, Promise<Blob>>) {}
      }
    )
    clipboardWrite = vi.fn(async ([item]: { items: Record<string, Promise<Blob>> }[]) => {
      await item.items['text/plain']
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write: clipboardWrite }
    })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard })
  })

  it('shows the copied message when the clipboard write succeeds', () => {
    return getWrapper({
      setup: async ({ copyLink }) => {
        await copyLink({ createLinkHandler })

        expect(clipboardWrite).toHaveBeenCalled()
        expect(useMessages().showMessage).toHaveBeenCalledWith({ title: copiedMessage })
      }
    })
  })

  it('shows a created message instead of the copied one when the clipboard write is denied', () => {
    clipboardWrite.mockRejectedValue(new DOMException('denied', 'NotAllowedError'))

    return getWrapper({
      setup: async ({ copyLink }) => {
        await copyLink({ createLinkHandler })

        expect(useMessages().showMessage).toHaveBeenCalledWith({ title: notCopiedMessage })
        expect(useMessages().showMessage).not.toHaveBeenCalledWith({ title: copiedMessage })
      }
    })
  })

  it('rejects with the error of a failing link creation without an unhandled rejection', async () => {
    const error = new Error('password is banned')
    let copyLink: ReturnType<typeof useCopyLink>['copyLink']
    getComposableWrapper(() => {
      copyLink = useCopyLink().copyLink
    })

    await expect(copyLink({ createLinkHandler: () => Promise.reject(error) })).rejects.toBe(error)
    await new Promise((resolve) => setTimeout(resolve))
    expect(useMessages().showMessage).not.toHaveBeenCalled()
  })

  it('rejects with the error of a failing link creation without an unhandled rejection when the clipboard is denied', async () => {
    clipboardWrite.mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    const onUnhandledRejection = vi.fn()
    process.on('unhandledRejection', onUnhandledRejection)

    const error = new Error('password is banned')
    let copyLink: ReturnType<typeof useCopyLink>['copyLink']
    getComposableWrapper(() => {
      copyLink = useCopyLink().copyLink
    })

    try {
      await expect(copyLink({ createLinkHandler: () => Promise.reject(error) })).rejects.toBe(error)
      await new Promise((resolve) => setTimeout(resolve))
      expect(onUnhandledRejection).not.toHaveBeenCalled()
      expect(useMessages().showMessage).not.toHaveBeenCalled()
    } finally {
      process.off('unhandledRejection', onUnhandledRejection)
    }
  })
})

function createLinkHandler() {
  return Promise.allSettled([
    Promise.resolve(mock<LinkShare>({ webUrl: 'https://example.com/s/link' }))
  ])
}

function getWrapper({
  setup
}: {
  setup: (instance: ReturnType<typeof useCopyLink>) => Promise<void>
}) {
  let done: Promise<void>
  getComposableWrapper(() => {
    done = setup(useCopyLink())
  })
  return done
}
