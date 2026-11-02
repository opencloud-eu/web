import AccountExtensions from '../../../../src/pages/account/accountExtensions.vue'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Extension, ExtensionPoint, useExtensionRegistry } from '@opencloud-eu/web-pkg'

const $route = {
  meta: {
    title: 'Some Title'
  }
}

const selectors = {
  extensionsSection: '.account-page-extensions',
  noContentMessage: '#account-extensions-empty'
}

describe('account extension page', () => {
  it('should be hidden if no extension points offer preferences', () => {
    const { wrapper } = getWrapper({})

    expect(wrapper.find(selectors.extensionsSection).exists()).toBeFalsy()
    expect(wrapper.find(selectors.noContentMessage).exists()).toBeTruthy()
  })

  it.each([0, 1])(
    'should be hidden if an extension point has %s registered extensions',
    (count) => {
      const extensionPointMock = mock<ExtensionPoint<Extension>>({
        userPreference: {
          label: 'example-extension-point',
          description: 'example-extension-point'
        }
      })
      const extensions = Array.from({ length: count }, (_, i) =>
        mock<Extension>({ id: `foo-${i}`, userPreference: { optionLabel: `Foo ${i}` } })
      )
      const { wrapper } = getWrapper({
        extensionPoints: [extensionPointMock],
        extensions
      })

      expect(wrapper.find(selectors.extensionsSection).exists()).toBeFalsy()
      expect(wrapper.find(selectors.noContentMessage).exists()).toBeTruthy()
    }
  )

  it('should be visible if an extension point has at least 2 extensions', () => {
    const extensionPoint = mock<ExtensionPoint<Extension>>({
      id: 'test-extension-point',
      multiple: false,
      defaultExtensionId: 'foo-2',
      userPreference: {
        label: 'Foo container',
        description: 'Foo container'
      }
    })
    const extensions = [
      mock<Extension>({
        id: 'foo-1',
        userPreference: {
          optionLabel: 'Foo 1'
        }
      }),
      mock<Extension>({
        id: 'foo-2',
        userPreference: {
          optionLabel: 'Foo 2'
        }
      })
    ]
    const { wrapper } = getWrapper({
      extensionPoints: [extensionPoint],
      extensions
    })

    expect(wrapper.find(selectors.extensionsSection).exists()).toBeTruthy()
    expect(wrapper.find(selectors.noContentMessage).exists()).toBeFalsy()
  })
})

function getWrapper({
  extensionPoints = [],
  extensions = []
}: {
  extensionPoints?: ExtensionPoint<Extension>[]
  extensions?: Extension[]
} = {}) {
  const plugins = defaultPlugins()

  const { getExtensionPoints, requestExtensions } = useExtensionRegistry()
  vi.mocked(getExtensionPoints).mockReturnValue(extensionPoints)
  vi.mocked(requestExtensions).mockReturnValue(extensions)

  const mocks = {
    ...defaultComponentMocks(),
    $route
  }

  return {
    mocks,
    wrapper: mount(AccountExtensions, {
      global: {
        plugins,
        mocks,
        provide: mocks,
        stubs: {
          'extension-preference': true
        }
      }
    })
  }
}
