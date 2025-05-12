import { shallowMount, defaultPlugins, PartialComponentProps } from '@opencloud-eu/web-test-helpers'
import OcFileInput from './OcFileInput.vue'

describe('OcFileInput', () => {
  const selectors = {
    inputField: '.oc-file-input',
    inputMessage: '.oc-file-input-message span',
    descriptionMessage: '.oc-file-input-description',
    errorMessage: '.oc-file-input-danger'
  }

  describe('id', () => {
    const wrapper = getWrapper({ id: 'test-input-id', descriptionMessage: 'hello' })
    it('should set provided id to the input', () => {
      expect(wrapper.find('input').attributes('id')).toBe('test-input-id')
    })
    it('should set label target for provided id', () => {
      expect(wrapper.find('label').attributes('for')).toBe('test-input-id')
    })
    it('should set message id according to provided id', () => {
      expect(wrapper.find(selectors.inputMessage).attributes().id).toBe('test-input-id-message')
    })
  })

  describe('label', () => {
    it('should set provided label to the input', () => {
      const wrapper = getWrapper()
      expect(wrapper.find('label').text()).toBe('file')
    })
  })

  describe('description message', () => {
    it('should be displayed below the input if given', () => {
      const wrapper = getWrapper({ descriptionMessage: 'description' })
      expect(wrapper.find(selectors.descriptionMessage).exists()).toBeTruthy()
    })
  })

  describe('error message', () => {
    it('should be displayed below the input if given', () => {
      const wrapper = getWrapper({ errorMessage: 'error' })
      expect(wrapper.find(selectors.errorMessage).exists()).toBeTruthy()
    })
  })
})

const getWrapper = (props: PartialComponentProps<typeof OcFileInput> = {}) => {
  return shallowMount(OcFileInput, {
    props: {
      label: 'file',
      ...OcFileInput,
      ...props
    },
    global: { plugins: [...defaultPlugins()] }
  })
}
