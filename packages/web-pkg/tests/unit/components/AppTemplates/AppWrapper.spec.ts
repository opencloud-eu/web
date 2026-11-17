import { mock } from 'vitest-mock-extended'
import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { Resource } from '@opencloud-eu/web-client'
import type { GetFileContentsResponse } from '@opencloud-eu/web-client/webdav'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  defaultPlugins,
  defaultComponentMocks,
  mount,
  useAppDefaultsMock,
  type RouteLocation
} from '@opencloud-eu/web-test-helpers'

import AppWrapper from '../../../../src/components/AppTemplates/AppWrapper.vue'
import type { FileContext } from '../../../../src/composables/appDefaults'
import type { ApplicationFileExtension } from '../../../../src/apps'

const { useAppDefaultsSpy } = vi.hoisted(() => ({
  useAppDefaultsSpy: vi.fn()
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  onBeforeRouteLeave: vi.fn()
}))

vi.mock('../../../../src/composables/appDefaults/useAppDefaults', () => ({
  useAppDefaults: (...args: unknown[]) => useAppDefaultsSpy(...args)
}))

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
})

const markdownFile = mock<Resource>({
  id: 'storage$space!file-a',
  fileId: 'storage$space!file-a',
  name: 'a.md',
  path: '/a.md',
  extension: 'md',
  isFolder: false,
  permissions: 'RDNVW'
})

const htmlFile = mock<Resource>({
  id: 'storage$space!evil',
  fileId: 'storage$space!evil',
  name: 'evil.html',
  path: '/evil.html',
  extension: 'html',
  mimeType: 'text/html',
  isFolder: false,
  permissions: 'RDNVW'
})

const contentComponent = defineComponent({
  props: {
    resource: { type: Object, default: null },
    currentContent: { type: String, default: '' }
  },
  template: '<div />'
})

// A viewer like the PDF viewer, which embeds the file via a URL.
const urlComponent = defineComponent({
  props: {
    resource: { type: Object, default: null },
    url: { type: String, default: '' }
  },
  template: '<div />'
})

const folderComponent = defineComponent({
  props: { resource: { type: Object, default: null } },
  template: '<div />'
})

function setup({
  component = contentComponent as ReturnType<typeof defineComponent>,
  fileExtensions = [{ app: 'test-app', extension: 'md' }] as ApplicationFileExtension[],
  fileContext = mock<FileContext>({ space: mock<any>(), path: '/a.md' })
} = {}) {
  const currentFileContext = ref(fileContext)
  let resolveInfo: (r: Resource) => void
  const getFileInfo = vi.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveInfo = resolve
      })
  )
  const getFileContents = vi
    .fn()
    .mockResolvedValue(
      mock<GetFileContentsResponse>({ body: 'content', headers: { 'OC-ETag': 'etag' } })
    )
  const getUrlForResource = vi.fn().mockResolvedValue('blob:file-url')

  useAppDefaultsSpy.mockReturnValue(
    useAppDefaultsMock({
      currentFileContext,
      getFileInfo,
      getFileContents,
      getUrlForResource
    })
  )

  const currentRoute = mock<RouteLocation>({
    path: '/test-app/personal/alan/a.md',
    query: {},
    params: { driveAliasAndItem: 'personal/alan/a.md' }
  })
  const mocks = defaultComponentMocks({ currentRoute })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:all(.*)', component: contentComponent }]
  })

  const wrapper = mount(AppWrapper, {
    slots: {
      default: () => h('div', { class: 'slot-content' })
    },
    props: {
      applicationId: 'test-app',
      wrappedComponent: component
    },
    global: {
      plugins: [
        ...defaultPlugins({
          piniaOptions: {
            appsState: {
              apps: { 'test-app': { id: 'test-app', name: 'Test App' } },
              fileExtensions
            }
          }
        }),
        router
      ],
      mocks,
      provide: mocks,
      stubs: { 'file-side-bar': true }
    }
  })

  return {
    wrapper,
    currentFileContext,
    getFileContents,
    getUrlForResource,
    async resolveResource(resource: Resource) {
      resolveInfo(resource)
      await flushPromises()
    }
  }
}

describe('AppWrapper — file types the app did not register', () => {
  it('refuses to load the file', async () => {
    const s = setup()
    await nextTick()
    await s.resolveResource(htmlFile)

    const errorScreen = s.wrapper.findComponent({ name: 'ErrorScreen' })
    expect(errorScreen.exists()).toBe(true)
    expect(errorScreen.props('message')).toContain('evil.html')
    expect(s.wrapper.find('.slot-content').exists()).toBe(false)
    expect(s.getFileContents).not.toHaveBeenCalled()
  })

  it('refuses a file type only another app registered', async () => {
    const s = setup({
      fileExtensions: [
        { app: 'test-app', extension: 'md' },
        { app: 'other-app', extension: 'html' }
      ]
    })
    await nextTick()
    await s.resolveResource(htmlFile)

    expect(s.wrapper.findComponent({ name: 'ErrorScreen' }).exists()).toBe(true)
    expect(s.getFileContents).not.toHaveBeenCalled()
  })

  it('refuses a folder named like a registered file type', async () => {
    const s = setup()
    await nextTick()
    await s.resolveResource(mock<Resource>({ ...markdownFile, isFolder: true }))

    expect(s.wrapper.findComponent({ name: 'ErrorScreen' }).exists()).toBe(true)
    expect(s.getFileContents).not.toHaveBeenCalled()
  })

  it('loads a file type the app registered', async () => {
    const s = setup()
    await nextTick()
    await s.resolveResource(markdownFile)

    expect(s.wrapper.findComponent({ name: 'ErrorScreen' }).exists()).toBe(false)
    expect(s.getFileContents).toHaveBeenCalledTimes(1)
  })

  describe('in a viewer that embeds the file via a URL', () => {
    const fileExtensions = [{ app: 'test-app', extension: 'pdf' }]

    it('creates no URL for the file', async () => {
      const s = setup({ component: urlComponent, fileExtensions })
      await nextTick()
      await s.resolveResource(htmlFile)

      expect(s.wrapper.findComponent({ name: 'ErrorScreen' }).exists()).toBe(true)
      expect(s.getUrlForResource).not.toHaveBeenCalled()
    })

    it('creates the URL for a file type the app registered', async () => {
      const s = setup({ component: urlComponent, fileExtensions })
      await nextTick()
      await s.resolveResource(
        mock<Resource>({
          id: 'storage$space!pdf',
          name: 'a.pdf',
          path: '/a.pdf',
          extension: 'pdf',
          isFolder: false,
          permissions: 'R'
        })
      )

      expect(s.getUrlForResource).toHaveBeenCalledTimes(1)
    })
  })

  describe('in an app that registered a folder type', () => {
    const fileExtensions = [{ app: 'test-app', extension: 'pastebin', type: 'folder' as const }]

    it('opens a folder with the registered extension', async () => {
      const s = setup({ component: folderComponent, fileExtensions })
      await nextTick()
      await s.resolveResource(
        mock<Resource>({
          id: 'storage$space!paste',
          name: 'a.pastebin',
          path: '/a.pastebin',
          extension: 'pastebin',
          isFolder: true,
          permissions: 'R'
        })
      )

      expect(s.wrapper.findComponent({ name: 'ErrorScreen' }).exists()).toBe(false)
    })

    it('refuses a file with the registered extension', async () => {
      const s = setup({ component: folderComponent, fileExtensions })
      await nextTick()
      await s.resolveResource(
        mock<Resource>({
          id: 'storage$space!paste',
          name: 'a.pastebin',
          path: '/a.pastebin',
          extension: 'pastebin',
          isFolder: false,
          permissions: 'R'
        })
      )

      expect(s.wrapper.findComponent({ name: 'ErrorScreen' }).exists()).toBe(true)
    })
  })

  describe('at the root of a public folder link', () => {
    // reva names the link root after the token, so it has no extension
    const linkRoot = mock<Resource>({
      id: 'storage$space!link-root',
      name: 'DFvfUJqnFIEvcHU',
      path: '/',
      extension: '',
      mimeType: 'httpd/unix-directory',
      isFolder: true,
      permissions: 'R'
    })

    async function openLinkRoot(fileExtensions: ApplicationFileExtension[]) {
      const s = setup({
        component: folderComponent,
        fileExtensions,
        fileContext: mock<FileContext>({
          space: mock<any>({ driveType: 'public' }),
          path: '/'
        })
      })
      await nextTick()
      await s.resolveResource(linkRoot)
      return s
    }

    it('opens it in an app that registered a folder type', async () => {
      const s = await openLinkRoot([{ app: 'test-app', extension: 'pastebin', type: 'folder' }])

      expect(s.wrapper.findComponent({ name: 'ErrorScreen' }).exists()).toBe(false)
    })

    it('refuses it in an app that registered only file types', async () => {
      const s = await openLinkRoot([{ app: 'test-app', extension: 'md' }])

      expect(s.wrapper.findComponent({ name: 'ErrorScreen' }).exists()).toBe(true)
    })

    it('refuses it when only another app registered a folder type', async () => {
      const s = await openLinkRoot([
        { app: 'test-app', extension: 'md' },
        { app: 'other-app', extension: 'pastebin', type: 'folder' }
      ])

      expect(s.wrapper.findComponent({ name: 'ErrorScreen' }).exists()).toBe(true)
    })
  })
})
