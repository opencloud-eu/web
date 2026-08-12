import { mount, defaultPlugins } from '@opencloud-eu/web-test-helpers'
import ChapterList from '../../../src/components/ChapterList.vue'
import { NavItem } from 'epubjs'

const chapters: NavItem[] = [
  { id: '1', label: 'Chapter 1', href: 'c1' } as NavItem,
  { id: '2', label: 'Chapter 2', href: 'c2' } as NavItem
]

describe('ChapterList component', () => {
  it('renders chapters and highlights current chapter', () => {
    const wrapper = mount(ChapterList, {
      props: {
        chapters,
        currentChapter: chapters[0]
      },
      global: {
        plugins: [...defaultPlugins()]
      }
    })

    const items = wrapper.findAll('.epub-reader-chapters-list-item')
    expect(items).toHaveLength(2)
    expect(items[0].classes()).toContain('bg-role-secondary-container')
    expect(items[1].classes()).not.toContain('bg-role-secondary-container')
  })

  it('emits selected chapter on click', async () => {
    const wrapper = mount(ChapterList, {
      props: {
        chapters,
        currentChapter: chapters[0]
      },
      global: {
        plugins: [...defaultPlugins()]
      }
    })

    await wrapper.findAll('.epub-reader-chapters-list-item .oc-button')[1].trigger('click')

    expect(wrapper.emitted('chapterSelected')).toEqual([[chapters[1]]])
  })
})
