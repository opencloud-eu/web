import { shallowMount } from '@opencloud-eu/web-test-helpers'
import OcTextarea from './OcTextarea.vue'

const defaultProps = {
  label: 'label'
}

describe('OcTextarea', () => {
  function getShallowWrapper(props = {}) {
    return shallowMount(OcTextarea, {
      props: {
        ...defaultProps,
        ...props
      }
    })
  }

  const selectors = {
    textareaMessage: '.oc-textarea-message span',
    textArea: '.oc-textarea'
  }
  describe('id prop', () => {
    const wrapper = getShallowWrapper({
      id: 'test-textarea-id',
      descriptionMessage: 'hello'
    })
    it('should set provided id to the textarea', () => {
      expect(wrapper.find('textarea').attributes().id).toBe('test-textarea-id')
    })
    it('should set label target for provided id', () => {
      expect(wrapper.find('label').attributes().for).toBe('test-textarea-id')
    })
    it('should set message id according to provided id', () => {
      expect(wrapper.find(selectors.textareaMessage).attributes().id).toBe(
        'test-textarea-id-message'
      )
    })
  })
  describe('label prop', () => {
    it('should set provided label to the textarea', () => {
      const wrapper = getShallowWrapper()
      expect(wrapper.find('label').text()).toBe('label')
    })
  })
  describe('when a description message is provided', () => {
    const wrapper = getShallowWrapper({ descriptionMessage: 'You should pass.' })
    it('should add the description class to the textarea message', () => {
      expect(wrapper.find(selectors.textareaMessage).attributes().class).toContain(
        'oc-textarea-description'
      )
    })
    it('should show the description message as the input message text', () => {
      expect(wrapper.find(selectors.textareaMessage).text()).toBe('You should pass.')
    })
  })
  describe('when an error message is provided', () => {
    const wrapper = getShallowWrapper({ errorMessage: 'You shall not pass.' })
    it('should add the error class to the textarea', () => {
      expect(wrapper.find('textarea').attributes().class).toContain('oc-textarea-danger')
    })
    it('should add the error class to the textarea message', () => {
      expect(wrapper.find(selectors.textareaMessage).attributes().class).toContain(
        'oc-textarea-danger'
      )
    })
    it('should show the error message as the textarea message text', () => {
      expect(wrapper.find(selectors.textareaMessage).text()).toBe('You shall not pass.')
    })
    it('should set the input aria-invalid attribute to true', () => {
      expect(wrapper.find('textarea').attributes('aria-invalid')).toBe('true')
    })
  })
  describe('events', () => {
    it('should emit an update:modelValue event on typing', async () => {
      const wrapper = getShallowWrapper()
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
      await wrapper.find('textarea').setValue('asdf')
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')[0][0]).toBe('asdf')
    })
  })
})
