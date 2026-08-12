import { mount, defaultPlugins } from '@opencloud-eu/web-test-helpers'
import MobileChapterSelect from '../../../src/components/MobileChapterSelect.vue'
import { NavItem } from 'epubjs'

const chapters: NavItem[] = [
  { id: '1', label: 'Chapter 1', href: 'c1' } as NavItem,
  { id: '2', label: 'Chapter 2', href: 'c2' } as NavItem
]

function getWrapper() {
  return mount(MobileChapterSelect, {
    props: {
      chapters,
      selectedChapter: chapters[0],
      chapterLabel: 'Chapter'
    },
    global: {
      plugins: [...defaultPlugins()],
      stubs: {
        'oc-drop': true
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

  it('emits selected chapter when option is clicked', async () => {
    const wrapper = getWrapper()
    const options = wrapper.findAll('.epub-reader-chapter-option')

    expect(options).toHaveLength(2)

    await options[1].trigger('click')

    expect(wrapper.emitted('update:selectedChapter')).toEqual([[chapters[1]]])
  })
})
