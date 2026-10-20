import { mock } from 'vitest-mock-extended'
import { LinkShare } from '@opencloud-eu/web-client'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useCopyLink } from '../../../../src/composables/links'
import { useMessages } from '../../../../src/composables/piniaStores'

const copiedMessage = 'The link has been copied to your clipboard.'
const notCopiedMessage = "The link has been created, but it couldn't be copied to your clipboard."
const previousClipboardContent = 'previous clipboard content'
const linkUrl = 'https://example.com/s/link'

describe('useCopyLink', () => {
  const originalClipboard = navigator.clipboard
  let clipboardWrite: ReturnType<typeof vi.fn>
  let clipboardContent: string

  beforeEach(() => {
    clipboardContent = previousClipboardContent
    vi.stubGlobal(
      'ClipboardItem',
      class {
        constructor(public items: Record<string, Promise<Blob>>) {}
      }
    )
    clipboardWrite = vi.fn(async ([item]: { items: Record<string, Promise<Blob>> }[]) => {
      const blob = await item.items['text/plain']
      clipboardContent = await blob.text()
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write: clipboardWrite }
    })
    // legacy fallback of useClipboard, copies the selected textarea
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn(() => {
        clipboardContent = document.querySelector('textarea').value
        return true
      })
    })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard })
    Reflect.deleteProperty(document, 'execCommand')
  })

  it('shows the copied message when the clipboard write succeeds', () => {
    return getWrapper({
      setup: async ({ copyLink }) => {
        await copyLink({ createLinkHandler })

        expect(clipboardWrite).toHaveBeenCalled()
        expect(clipboardContent).toBe(linkUrl)
        expect(useMessages().showMessage).toHaveBeenCalledWith({ title: copiedMessage })
      }
    })
  })

  it('copies the link with the fallback when ClipboardItem is not supported', () => {
    vi.stubGlobal('ClipboardItem', undefined)

    return getWrapper({
      setup: async ({ copyLink }) => {
        await copyLink({ createLinkHandler })

        expect(clipboardContent).toBe(linkUrl)
        expect(useMessages().showMessage).toHaveBeenCalledWith({ title: copiedMessage })
      }
    })
  })

  describe('without clipboard access in an insecure context', () => {
    const navigatorPrototype = Object.getPrototypeOf(navigator)
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigatorPrototype, 'clipboard')

    beforeEach(() => {
      Reflect.deleteProperty(navigator, 'clipboard')
      Reflect.deleteProperty(navigatorPrototype, 'clipboard')
    })

    afterEach(() => {
      Object.defineProperty(navigatorPrototype, 'clipboard', clipboardDescriptor)
    })

    it('creates the link and copies it with the legacy fallback', () => {
      const linkHandler = vi.fn(createLinkHandler)

      return getWrapper({
        setup: async ({ copyLink }) => {
          await copyLink({ createLinkHandler: linkHandler })

          expect(linkHandler).toHaveBeenCalled()
          expect(clipboardContent).toBe(linkUrl)
          expect(useMessages().showMessage).toHaveBeenCalledWith({ title: copiedMessage })
        }
      })
    })
  })

  it.each([
    {
      case: 'several links are created',
      linkHandler: () =>
        Promise.allSettled([
          Promise.resolve(mock<LinkShare>({ webUrl: linkUrl })),
          Promise.resolve(mock<LinkShare>({ webUrl: 'https://example.com/s/other' }))
        ])
    },
    {
      case: 'the link creation fails',
      linkHandler: () => Promise.allSettled([Promise.reject(new Error('server error'))])
    }
  ])('keeps the previous clipboard content when $case', ({ linkHandler }) => {
    return getWrapper({
      setup: async ({ copyLink }) => {
        await copyLink({ createLinkHandler: linkHandler })

        expect(clipboardContent).toBe(previousClipboardContent)
        expect(console.warn).not.toHaveBeenCalled()
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
  return Promise.allSettled([Promise.resolve(mock<LinkShare>({ webUrl: linkUrl }))])
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
