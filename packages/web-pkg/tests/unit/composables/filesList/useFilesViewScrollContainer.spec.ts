import { defineComponent, unref } from 'vue'
import { mount } from '@opencloud-eu/web-test-helpers'
import { useFilesViewScrollContainer } from '../../../../src/composables/filesList'

const consumer = defineComponent({
  setup: () => ({ scrollContainer: useFilesViewScrollContainer() }),
  template: '<div />'
})

describe('useFilesViewScrollContainer', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('resolves the scroll container', () => {
    const element = document.createElement('div')
    element.id = 'files-view-wrapper'
    document.body.appendChild(element)

    const wrapper = mount(consumer, { attachTo: document.body })

    expect(unref(wrapper.vm.scrollContainer)).toBe(element)
  })

  it('resolves the scroll container that gets mounted alongside the consumer', () => {
    const wrapper = mount(
      {
        components: { consumer },
        template: '<div id="files-view-wrapper"><consumer ref="consumer" /></div>'
      },
      { attachTo: document.body }
    )

    expect(unref((wrapper.vm.$refs.consumer as any).scrollContainer)).toBe(
      document.getElementById('files-view-wrapper')
    )
  })

  it('stays empty if there is no scroll container', () => {
    const wrapper = mount(consumer, { attachTo: document.body })

    expect(unref(wrapper.vm.scrollContainer)).toBeNull()
  })
})
