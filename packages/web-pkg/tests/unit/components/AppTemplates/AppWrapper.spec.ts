import { mock } from 'vitest-mock-extended'
import { defineComponent, nextTick, ref } from 'vue'
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
import type { CollaborativeDocument } from '../../../../src/composables/collaborative'
import type { FileContext } from '../../../../src/composables/appDefaults'

const { useAppDefaultsSpy, useCollaborativeDocumentSpy } = vi.hoisted(() => ({
  useAppDefaultsSpy: vi.fn(),
  useCollaborativeDocumentSpy: vi.fn()
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  onBeforeRouteLeave: vi.fn()
}))

vi.mock('../../../../src/composables/appDefaults/useAppDefaults', () => ({
  useAppDefaults: (...args: unknown[]) => useAppDefaultsSpy(...args)
}))

vi.mock('../../../../src/composables/collaborative/useCollaborativeDocument', () => ({
  useCollaborativeDocument: (...args: unknown[]) => useCollaborativeDocumentSpy(...args)
}))

const FILE_A = mock<Resource>({ id: 'storage$space!file-a', name: 'a.md', permissions: 'RDNVW' })
const FILE_B = mock<Resource>({ id: 'storage$space!file-b', name: 'b.md', permissions: 'RDNVW' })

const wrappedComponent = defineComponent({
  props: {
    resource: { type: Object, default: null },
    currentContent: { type: String, default: '' }
  },
  template: '<div />'
})

function setup() {
  const currentFileContext = ref(mock<FileContext>({ space: mock<any>(), path: '/a.md' }))
  // Deferred so the test controls when each half of the load completes.
  let resolveInfo: (r: Resource) => void
  let resolveContents: (c: GetFileContentsResponse) => void

  const getFileInfo = vi.fn().mockImplementation(() => new Promise((r) => (resolveInfo = r)))
  const getFileContents = vi
    .fn()
    .mockImplementation(() => new Promise((r) => (resolveContents = r)))

  useAppDefaultsSpy.mockReturnValue(
    useAppDefaultsMock({ currentFileContext, getFileInfo, getFileContents })
  )

  let enabled: () => boolean
  useCollaborativeDocumentSpy.mockImplementation((options: any) => {
    enabled = options.enabled
    return mock<CollaborativeDocument>({ isReady: ref(true) as any })
  })

  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({
      query: {},
      params: { driveAliasAndItem: 'personal/alan/a.md' }
    })
  })

  const wrapper = mount(AppWrapper, {
    props: {
      applicationId: 'test-app',
      wrappedComponent,
      collaborative: { appVersion: '1.0.0', makeAdapter: () => mock<any>() }
    },
    global: {
      plugins: [
        ...defaultPlugins({
          piniaOptions: {
            appsState: { apps: { 'test-app': { id: 'test-app', name: 'Test App' } } }
          }
        }),
        createRouter({
          history: createMemoryHistory(),
          routes: [{ path: '/:all(.*)', component: wrappedComponent }]
        })
      ],
      mocks,
      provide: mocks,
      stubs: { 'file-side-bar': true }
    }
  })

  return {
    wrapper,
    currentFileContext,
    isEnabled: () => enabled(),
    async resolveResource(resource: Resource) {
      resolveInfo(resource)
      await flushPromises()
    },
    async resolveContent(body: string) {
      resolveContents(
        mock<GetFileContentsResponse>({ body, headers: { 'OC-ETag': 'etag' } as any })
      )
      await flushPromises()
    }
  }
}

describe('AppWrapper — collaborative session gate', () => {
  it('stays disabled until the body for the current resource has arrived', async () => {
    const s = setup()
    await nextTick()

    expect(s.isEnabled()).toBe(false)

    await s.resolveResource(FILE_A)
    // resource is set, body is not — hydrating here would seed an empty doc.
    expect(s.isEnabled()).toBe(false)

    await s.resolveContent('content of a')
    expect(s.isEnabled()).toBe(true)
  })

  // Regression: `loading` was only ever set to false, so on an in-app file
  // switch the gate stayed open while `resource` already pointed at the new
  // file and `currentContent` still held the old body.
  it('closes again while switching to another file, and does not reopen on a stale body', async () => {
    const s = setup()
    await nextTick()
    await s.resolveResource(FILE_A)
    await s.resolveContent('content of a')
    expect(s.isEnabled()).toBe(true)

    s.currentFileContext.value = mock<FileContext>({ space: mock<any>(), path: '/b.md' })
    await nextTick()
    expect(s.isEnabled()).toBe(false)

    // `resource` is already b.md while `currentContent` still holds a.md's
    // body. The gate must stay shut for this whole window.
    await s.resolveResource(FILE_B)
    expect(s.isEnabled()).toBe(false)

    await s.resolveContent('content of b')
    expect(s.isEnabled()).toBe(true)
  })
})
