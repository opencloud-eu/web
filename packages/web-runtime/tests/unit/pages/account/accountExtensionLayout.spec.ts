import { ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import AccountExtensionLayout from '../../../../src/pages/account/accountExtensionLayout.vue'
import { AccountExtension, eventBus, useExtensionRegistry } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteQuery: vi.fn(() => ref('app-tokens'))
}))

describe('AccountExtensionLayout', () => {
  it.each([
    ['the extension label', [{ id: 'app-tokens', label: () => 'App Tokens' }], 'App Tokens'],
    ['a generic title for an unknown extension', [], 'App preferences']
  ])('titles the page with %s', (_, extensions, title) => {
    const publishSpy = vi.spyOn(eventBus, 'publish')
    getWrapper(extensions.map((extension) => mock<AccountExtension>(extension)))
    expect(publishSpy).toHaveBeenCalledWith(
      'runtime.documentTitle.changed',
      expect.objectContaining({ shortDocumentTitle: title })
    )
  })
})

function getWrapper(extensions: AccountExtension[]) {
  const plugins = defaultPlugins()
  const { requestExtensions } = useExtensionRegistry()
  vi.mocked(requestExtensions).mockReturnValue(extensions)
  const mocks = defaultComponentMocks()

  return mount(AccountExtensionLayout, {
    global: { plugins, mocks, provide: mocks, stubs: { 'no-content-message': true } }
  })
}
