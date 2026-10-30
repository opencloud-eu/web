import { mount, defaultPlugins } from '@opencloud-eu/web-test-helpers'
import MobileChapterSelect from '../../../src/components/MobileChapterSelect.vue'
import { Chapter } from '../../../src/types'
import { defineComponent, nextTick } from 'vue'

const chapters: Chapter[] = [
  { id: '1', label: 'Chapter 1', href: 'c1', depth: 0 },
  { id: '2', label: 'Chapter 2', href: 'c2', depth: 1 }
]

function getWrapper() {
  return mount(MobileChapterSelect, {
    props: {
      chapters,
      selectedChapter: chapters[0]
    },
    global: {
      plugins: [...defaultPlugins()],
      stubs: {
        'oc-drop': defineComponent({
          name: 'OcDropStub',
          emits: ['showDrop'],
          template: '<div><slot /></div>'
        })
      },
      renderStubDefaultSlot: true
    }
  })
}

describe('MobileChapterSelect component', () => {
  it('shows selected chapter label in toggle button', () => {
    const wrapper = getWrapper()
    expect(wrapper.find('#epub_reader_chapter_toggle').text()).toContain('Chapter 1')
  })

  it('marks only the selected chapter option as current for screen readers', () => {
    const wrapper = getWrapper()

    const options = wrapper.findAll('.epub-reader-chapter-option')
    expect(options[0].attributes('aria-current')).toBe('true')
    expect(options[1].attributes('aria-current')).toBeUndefined()
  })

  it('emits selected chapter when option is clicked', async () => {
    const wrapper = getWrapper()
    const options = wrapper.findAll('.epub-reader-chapter-option')

    expect(options).toHaveLength(2)

    await options[1].trigger('click')

    expect(wrapper.emitted('update:selectedChapter')).toEqual([[chapters[1]]])
  })

  it('scrolls selected chapter into view when opening the drop', async () => {
    const scrollIntoViewSpy = vi
      .spyOn(HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(() => undefined)

    const wrapper = getWrapper()
    wrapper.findComponent({ name: 'OcDropStub' }).vm.$emit('showDrop')
    await nextTick()

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ block: 'nearest' })

    scrollIntoViewSpy.mockRestore()
  })
})
