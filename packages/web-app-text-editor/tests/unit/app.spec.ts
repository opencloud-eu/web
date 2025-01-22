import { PartialComponentProps, mount } from '@opencloud-eu/web-test-helpers'
import App from '../../src/App.vue'

vi.mock('@opencloud-eu/web-pkg')

describe('Text editor app', () => {
  it('shows the editor', () => {
    const { wrapper } = getWrapper({
      applicationConfig: {}
    })
    expect(wrapper.html()).toMatchSnapshot()
  })
})

function getWrapper(props: PartialComponentProps<typeof App>) {
  return {
    wrapper: mount(App, {
      props: {
        applicationConfig: {},
        currentContent: '',
        isReadOnly: false,
        resource: undefined,
        ...props
      }
    })
  }
}
