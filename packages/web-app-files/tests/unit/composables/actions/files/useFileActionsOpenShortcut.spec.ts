import { mock } from 'vitest-mock-extended'
import { unref } from 'vue'
import {
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { useFileActionsOpenShortcut } from '../../../../../src/composables/actions/files'
import { Resource } from '@opencloud-eu/web-client'
import { FileAction, useMessages } from '@opencloud-eu/web-pkg'
import { GetFileContentsResponse } from '@opencloud-eu/web-client/webdav'

window = Object.create(window)
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://demo.opencloud.eu'
  },
  writable: true
})
Object.defineProperty(window, 'open', { writable: true })
window.open = vi.fn()

describe('openShortcut', () => {
  beforeEach(() => {
    window.location.href = 'https://demo.opencloud.eu'
  })

  describe('computed property "actions"', () => {
    describe('method "isVisible"', () => {
      it.each([
        {
          resources: [],
          expectedStatus: false
        },
        {
          resources: [mock<Resource>({ extension: 'txt' })],
          expectedStatus: false
        },
        {
          resources: [mock<Resource>({ extension: 'url', canDownload: () => false })],
          expectedStatus: false
        },
        {
          resources: [mock<Resource>({ extension: 'url', canDownload: () => true })],
          expectedStatus: true
        }
      ])('should be set correctly', ({ resources, expectedStatus }) => {
        getWrapper({
          setup: ({ actions }) => {
            expect(unref(actions)[0].isVisible({ resources, space: null })).toBe(expectedStatus)
          }
        })
      })
    })

    describe('method "handler"', () => {
      it.each([
        { stored: 'opencloud.eu', expected: 'https://opencloud.eu/' },
        {
          stored: 'https://a.com/?q=1<2 and 3>1',
          expected: 'https://a.com/?q=1%3C2%20and%203%3E1'
        },
        { stored: 'HTTPS://opencloud.eu', expected: 'https://opencloud.eu/' },
        {
          stored: 'https://example.com/search?q=x<2&lang=de#<b>',
          expected: 'https://example.com/search?q=x%3C2&lang=de#%3Cb%3E'
        },
        {
          stored: 'https://example.org/\u2028URL=javascript:alert(1)',
          expected: 'https://example.org/%E2%80%A8URL=javascript:alert(1)'
        },
        {
          stored: 'https://demo.opencloud.eu.evil.example/path',
          expected: 'https://demo.opencloud.eu.evil.example/path'
        },
        {
          stored: 'https://demo.opencloud.eu@evil.example/path',
          expected: 'https://demo.opencloud.eu@evil.example/path'
        }
      ])('opens "$stored" as "$expected"', async ({ stored, expected }) => {
        let handler: FileAction['handler']
        getWrapper({
          getFileContentsValue: `[InternetShortcut]\nURL=${stored}`,
          setup: ({ actions }) => {
            handler = unref(actions)[0].handler
          }
        })
        await handler({ resources: [mock<Resource>()], space: null })
        expect(window.open).toHaveBeenLastCalledWith(expected)
        expect(window.location.href).toBe('https://demo.opencloud.eu')
      })

      it.each(['https://demo.opencloud.eu/files/spaces', 'HTTPS://DEMO.OPENCLOUD.EU/files/spaces'])(
        'opens the same-origin URL "%s" in the same window',
        async (url) => {
          let handler: FileAction['handler']
          getWrapper({
            getFileContentsValue: `[InternetShortcut]\nURL=${url}`,
            setup: ({ actions }) => {
              handler = unref(actions)[0].handler
            }
          })
          await handler({ resources: [mock<Resource>()], space: null })
          expect(window.location.href).toBe('https://demo.opencloud.eu/files/spaces')
          expect(window.open).not.toHaveBeenCalled()
        }
      )

      it.each([
        'javascript:alert(1)',
        'JaVaScRiPt:alert(1)',
        'java\tscript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'ftp://example.org',
        'https://'
      ])('reports an error without navigating for "%s"', async (url) => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        let handler: FileAction['handler']
        getWrapper({
          getFileContentsValue: `[InternetShortcut]\nURL=${url}`,
          setup: ({ actions }) => {
            handler = unref(actions)[0].handler
          }
        })
        await handler({ resources: [mock<Resource>()], space: null })
        expect(window.open).not.toHaveBeenCalled()
        expect(window.location.href).toBe('https://demo.opencloud.eu')
        const { showErrorMessage } = useMessages()
        expect(showErrorMessage).toHaveBeenCalledWith({
          title: 'Failed to open shortcut',
          errors: [expect.any(Error)]
        })
        consoleError.mockRestore()
      })
    })
  })

  describe('method "extractUrl"', () => {
    it('extracts url correctly', () => {
      getWrapper({
        setup: ({ extractUrl }) => {
          expect(extractUrl('[InternetShortcut]\n' + 'URL=https://opencloud.eu')).toEqual(
            'https://opencloud.eu'
          )
        }
      })
    })

    it('reads Windows line endings without including the carriage return', () => {
      getWrapper({
        setup: ({ extractUrl }) => {
          expect(extractUrl('[InternetShortcut]\r\nURL=https://opencloud.eu\r\n')).toBe(
            'https://opencloud.eu'
          )
        }
      })
    })

    it('does not mistake another entry containing URL= for the target', () => {
      getWrapper({
        setup: ({ extractUrl }) => {
          expect(() => extractUrl('[InternetShortcut]\nNOTURL=https://opencloud.eu')).toThrow(
            'unable to extract url'
          )
        }
      })
    })

    it('throws error if url cannot be extracted', () => {
      getWrapper({
        setup: ({ extractUrl }) => {
          expect(() => extractUrl('�������')).toThrow('unable to extract url')
        }
      })
    })
  })
})

function getWrapper({
  setup,
  getFileContentsValue = null
}: {
  getFileContentsValue?: string
  setup: (instance: ReturnType<typeof useFileActionsOpenShortcut>) => void
}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic', path: '/files/' })
    })
  }

  mocks.$clientService.webdav.getFileContents.mockResolvedValue(
    mock<GetFileContentsResponse>({
      body: getFileContentsValue
    })
  )

  return {
    wrapper: getComposableWrapper(
      () => {
        const instance = useFileActionsOpenShortcut()
        setup(instance)
      },
      {
        mocks,
        provide: mocks
      }
    )
  }
}
