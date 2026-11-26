import { unref, type Ref } from 'vue'
import type { Resource } from '@opencloud-eu/web-client'
import { AppWrapperRoute, type Extension, type SidebarPanelExtension } from '@opencloud-eu/web-pkg'
import app, { applicationId } from '../../src/index'
import { useDocumentPropertiesPanelState } from '../../src/composables/useDocumentPropertiesPanelState'

vi.mock('vue3-gettext', () => ({ useGettext: () => ({ $gettext: (msg: string) => msg }) }))
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@opencloud-eu/web-pkg')>()),
  AppWrapperRoute: vi.fn(() => ({}))
}))

function setupApp() {
  return app.setup({ applicationConfig: {} }) as {
    appInfo: { id: string; extensions: { extension: string; routeName: string }[] }
    routes: { name: string }[]
    extensions: Ref<Extension[]>
  }
}

function getPropertiesPanel() {
  const [extension] = unref(setupApp().extensions)
  return (extension as SidebarPanelExtension<Resource, Resource, Resource>).panel
}

describe('PDF viewer application', () => {
  it('opens pdf files', () => {
    const { appInfo, routes } = setupApp()
    expect(appInfo.id).toBe(applicationId)
    expect(appInfo.extensions).toEqual([
      expect.objectContaining({ extension: 'pdf', routeName: applicationId })
    ])
    expect(routes[0].name).toBe(applicationId)
  })

  it('loads the file content as binary', () => {
    setupApp()
    expect(AppWrapperRoute).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fileContentOptions: { responseType: 'arraybuffer' } })
    )
  })

  // Forms are often only filled in to print them.
  it('saves only on request, without autosave', () => {
    setupApp()
    expect(AppWrapperRoute).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ disableAutoSave: true })
    )
  })

  // In the right sidebar of the app, not in the one of the files app.
  describe('document properties panel', () => {
    const file = { id: 'file-1', name: 'form.pdf', size: '2048' } as Resource

    afterEach(() => {
      useDocumentPropertiesPanelState().resourceId.value = undefined
    })

    it('is only offered for the open document', () => {
      const panel = getPropertiesPanel()
      expect(panel.isVisible({ items: [file] })).toBe(false)
      useDocumentPropertiesPanelState().resourceId.value = 'file-1'
      expect(panel.isVisible({ items: [file] })).toBe(true)
      expect(panel.isVisible({ items: [{ ...file, id: 'file-2' }] })).toBe(false)
      expect(panel.isVisible({ items: [file, { ...file, id: 'file-2' }] })).toBe(false)
    })

    it('shows the name and size of the file', () => {
      expect(getPropertiesPanel().componentAttrs({ items: [file] })).toEqual(
        expect.objectContaining({ fileName: 'form.pdf', fileSize: 2048 })
      )
    })
  })
})
