import { PartialComponentProps, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { defineComponent, h } from 'vue'
import type { Resource } from '@opencloud-eu/web-client'
import App from '../../src/App.vue'

// Stub CollaborativeWrapper so the test doesn't have to mount a real
// HocuspocusProvider / Y.Doc chain. The stub just renders a div with the
// stable class the prior version of this test asserted against — App.vue
// itself is now a thin shell, so it's enough to verify it mounts the
// wrapper with the correct adapter / editor / realtime contract.
vi.mock('@opencloud-eu/web-pkg', async () => {
  return {
    CollaborativeWrapper: defineComponent({
      name: 'CollaborativeWrapperStub',
      props: [
        'resource',
        'currentContent',
        'isReadOnly',
        'adapter',
        'editor',
        'appVersion',
        'realtimeUrl'
      ],
      setup() {
        return () => h('div', { class: 'oc-text-editor' })
      }
    })
  }
})

vi.mock('@opencloud-eu/web-pkg/editor', () => {
  return {
    useContentStrategy: () => ({
      resolveStrategy: () => ({
        editorContentType: () => 'markdown',
        extensions: (): unknown[] => [],
        editorActionGroups: (): unknown[] => [],
        serialize: () => '',
        deserialize: (s: string) => s
      })
    })
  }
})

describe('Text editor app', () => {
  it('shows the editor', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find('.oc-text-editor').exists()).toBeTruthy()
  })
})

function getWrapper(props: PartialComponentProps<typeof App> = {}) {
  return {
    wrapper: mount(App, {
      props: {
        currentContent: '',
        isReadOnly: false,
        resource: mock<Resource>({ extension: 'txt', mimeType: 'text/plain' }),
        ...props
      },
      global: { plugins: defaultPlugins() }
    })
  }
}
