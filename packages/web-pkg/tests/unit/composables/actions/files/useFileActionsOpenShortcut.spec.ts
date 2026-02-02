import { mock } from 'vitest-mock-extended'
import { computed, unref } from 'vue'
import {
  defaultComponentMocks,
  RouteLocation,
  getComposableWrapper
} from '@opencloud-eu/web-test-helpers'
import { useFileActionsOpenShortcut, useRoute } from '../../../../../src'
import { Resource } from '@opencloud-eu/web-client'
import { GetFileContentsResponse } from '@opencloud-eu/web-client/webdav'

vi.mock('../../../../../src/composables/router', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRoute: vi.fn()
}))

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
      it('adds http(s) protocol if missing and opens the url in a new tab', () => {
        getWrapper({
          getFileContentsValue: '[InternetShortcut]\nURL=opencloud.eu',
          setup: async ({ actions }) => {
            await unref(actions)[0].handler({
              resources: [mock<Resource>()],
              space: null
            })
            expect(window.open).toHaveBeenCalledWith('https://opencloud.eu')
          }
        })
      })
      it('omits xss code and opens the url in a new tab', () => {
        getWrapper({
          getFileContentsValue:
            '[InternetShortcut]\nURL=https://opencloud.eu?default=<script>alert(document.cookie)</script>',
          setup: async ({ actions }) => {
            await unref(actions)[0].handler({
              resources: [mock<Resource>()],
              space: null
            })
            expect(window.open).toHaveBeenCalledWith('https://opencloud.eu?default=')
          }
        })
      })
      it('opens the url in the same window if url links to OpenCloud instance', () => {
        getWrapper({
          getFileContentsValue: '[InternetShortcut]\nURL=https://demo.opencloud.eu',
          setup: async ({ actions }) => {
            await unref(actions)[0].handler({
              resources: [mock<Resource>()],
              space: null
            })
            expect(window.location.href).toBe('https://demo.opencloud.eu')
          }
        })
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
      currentRoute: mock<RouteLocation>({ name: 'files-spaces-generic' })
    })
  }

  mocks.$clientService.webdav.getFileContents.mockResolvedValue(
    mock<GetFileContentsResponse>({
      body: getFileContentsValue
    })
  )

  vi.mocked(useRoute).mockImplementation(() =>
    computed(() => mock<RouteLocation>({ name: 'files-spaces-generic', path: '/files/' }))
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
