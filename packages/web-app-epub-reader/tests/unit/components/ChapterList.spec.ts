import { mount, defaultPlugins } from '@opencloud-eu/web-test-helpers'
import ChapterList from '../../../src/components/ChapterList.vue'
import { NavItem } from 'epubjs'
import { nextTick } from 'vue'

const chapters: NavItem[] = [
  { id: '1', label: 'Chapter 1', href: 'c1' } as NavItem,
  { id: '2', label: 'Chapter 2', href: 'c2' } as NavItem
]

describe('ChapterList component', () => {
  function getWrapper() {
    return mount(ChapterList, {
      props: {
        chapters,
        currentChapter: chapters[0]
      },
      global: {
        plugins: [...defaultPlugins()],
        stubs: {
          'oc-search-bar': {
            props: ['modelValue'],
            template:
              '<input class="chapters-search" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
          }
        }
      }
    })
  }

  it('renders chapters and highlights current chapter', () => {
    const wrapper = getWrapper()

    const items = wrapper.findAll('.epub-reader-chapters-list-item')
    expect(items).toHaveLength(2)
    expect(items[0].classes()).toContain('bg-role-secondary-container')
    expect(items[1].classes()).not.toContain('bg-role-secondary-container')
  })

  it('emits selected chapter on click', async () => {
    const wrapper = getWrapper()

    await wrapper.findAll('.epub-reader-chapters-list-item .oc-button')[1].trigger('click')

    expect(wrapper.emitted('chapterSelected')).toEqual([[chapters[1]]])
  })

  it('filters chapters by search term', async () => {
    const wrapper = getWrapper()

    await wrapper.find('.chapters-search').setValue('2')
    await nextTick()

    const items = wrapper.findAll('.epub-reader-chapters-list-item')
    expect(items).toHaveLength(1)
    expect(items[0].text()).toContain('Chapter 2')
  })

  it('scrolls to current chapter when selection changes', async () => {
    const scrollIntoViewSpy = vi
      .spyOn(HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(() => undefined)

    const wrapper = getWrapper()
    await wrapper.setProps({ currentChapter: chapters[1] })
    await nextTick()

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ block: 'nearest' })
    scrollIntoViewSpy.mockRestore()
  })
})
