import { PartialComponentProps, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import type { Resource } from '@opencloud-eu/web-client'
import App from '../../src/App.vue'

vi.mock('@opencloud-eu/web-pkg')
vi.mock('@opencloud-eu/web-pkg/editor')

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
      }
    })
  }
}
