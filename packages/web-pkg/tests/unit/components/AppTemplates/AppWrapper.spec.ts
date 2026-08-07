import { defineComponent, h, ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  RouteLocation,
  useAppDefaultsMock
} from '@opencloud-eu/web-test-helpers'
import { FileResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { DavPermission } from '@opencloud-eu/web-client/webdav'
import AppWrapper from '../../../../src/components/AppTemplates/AppWrapper.vue'
import { useAppDefaults } from '../../../../src/composables/appDefaults'
import { useExtensionRegistry } from '../../../../src/composables/piniaStores'
import type { ApplicationInformation } from '../../../../src/apps/types'

vi.mock('../../../../src/composables/appDefaults/useAppDefaults')

const onSaveCallback = vi.fn()

const EditorStub = defineComponent({
  props: { currentContent: { type: String, default: '' } },
  emits: ['update:currentContent', 'register:onSaveCallback'],
  setup(_props, { emit }) {
    emit('register:onSaveCallback', onSaveCallback)
    return () => h('div', { class: 'editor-stub' })
  }
})

describe('AppWrapper', () => {
  describe('save', () => {
    it('runs the registered save callback after the file was saved', async () => {
      const { wrapper } = await getWrapper()

      await (wrapper.vm as never as { save: () => Promise<void> }).save()

      expect(onSaveCallback).toHaveBeenCalledOnce()
    })

    it('does not run the registered save callback when saving failed', async () => {
      const { wrapper, appDefaults } = await getWrapper()
      vi.mocked(appDefaults.putFileContents).mockRejectedValue({ statusCode: 500, response: {} })

      await (wrapper.vm as never as { save: () => Promise<void> }).save()

      expect(appDefaults.putFileContents).toHaveBeenCalled()
      expect(onSaveCallback).not.toHaveBeenCalled()
    })
  })
})

async function getWrapper() {
  const resource = mock<Resource>({
    id: 'resource-id',
    fileId: 'resource-id',
    name: 'file.md',
    path: '/file.md',
    permissions: DavPermission.Updateable,
    size: 1
  })

  const appDefaults = useAppDefaultsMock({
    currentFileContext: ref({
      space: mock<SpaceResource>({ id: 'space-id', driveType: 'personal' }),
      path: '/file.md',
      fileName: ref('file.md'),
      driveAliasAndItem: 'personal/admin/file.md'
    } as never),
    getFileInfo: vi.fn().mockResolvedValue(resource),
    getFileContents: vi.fn().mockResolvedValue({ body: 'content', headers: { 'OC-ETag': 'etag' } }),
    putFileContents: vi.fn().mockResolvedValue(mock<FileResource>({ etag: 'new-etag' })),
    replaceInvalidFileRoute: vi.fn().mockReturnValue(false)
  })
  vi.mocked(useAppDefaults).mockReturnValue(appDefaults)

  const plugins = defaultPlugins({
    piniaOptions: {
      appsState: { apps: { 'text-editor': mock<ApplicationInformation>({ name: 'Text Editor' }) } }
    }
  })
  const { requestExtensions } = useExtensionRegistry()
  vi.mocked(requestExtensions).mockReturnValue([])

  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({
      name: 'files-spaces-generic',
      params: { driveAliasAndItem: 'personal/admin/file.md' }
    })
  })

  const wrapper = mount(AppWrapper, {
    props: {
      applicationId: 'text-editor',
      wrappedComponent: EditorStub
    },
    slots: {
      default: (slotArgs: Record<string, unknown>) => h(EditorStub, slotArgs)
    },
    global: {
      plugins,
      renderStubDefaultSlot: true,
      stubs: { FileSideBar: true, LoadingScreen: true, ErrorScreen: true },
      mocks,
      provide: mocks
    }
  })

  await flushPromises()

  return { wrapper, mocks, appDefaults, resource }
}
