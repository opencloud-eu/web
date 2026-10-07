import ErrorScreen from '../../../../src/components/AppTemplates/PartialViews/ErrorScreen.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'

describe('The external app error screen component', () => {
  test('displays the no content message with the error', () => {
    const wrapper = mount(ErrorScreen, {
      props: {
        message: 'Error when loading the application'
      },
      global: {
        stubs: {
          InlineSvg: true
        },
        plugins: [...defaultPlugins()]
      }
    })
    expect(wrapper.findComponent({ name: 'NoContentMessage' }).props('imgSrc')).toBe(
      'images/illustrations/404.svg'
    )
    expect(wrapper.text()).toContain('Error when loading the application')
  })
})
