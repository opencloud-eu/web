import {
  ComponentProps,
  PartialComponentProps,
  defaultPlugins,
  mount,
  nextTicks
} from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'
import { Resource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import App from '../../src/App.vue'
import { BookMock, createBookMock, createLocation, createSpineItemMock } from './mocks'

const books: BookMock[] = []
vi.mock('epubjs', () => ({
  default: vi.fn(() => {
    const book = createBookMock({
      toc: [
        { id: 'ch-1', label: 'Chapter 1', href: 'c1', subitems: [] },
        { id: 'ch-2', label: 'Chapter 2', href: 'c2', subitems: [] }
      ] as any,
      spineItems: [
        createSpineItemMock('c1', 0, [{ cfi: 'cfi-search-1' }, { cfi: 'cfi-search-2' }]),
        createSpineItemMock('c2', 1)
      ]
    })
    books.push(book)
    return book
  })
}))

const selectors = {
  increaseFontSize: '.epub-reader-controls-font-size-increase',
  decreaseFontSize: '.epub-reader-controls-font-size-decrease',
  resetFontSize: '.epub-reader-controls-font-size-reset',
  chaptersListItem: '.epub-reader-chapters-list-item',
  chaptersSelect: '.epub-reader-controls-chapters-select',
  navigateLeft: '.epub-reader-navigate-left',
  navigateRight: '.epub-reader-navigate-right',
  progressSlider: '.epub-reader-progress-slider input[type="range"]'
}

describe('Epub reader app', () => {
  beforeEach(() => {
    books.length = 0
    window.localStorage.clear()
  })

  it('renders the reader parts', async () => {
    const { wrapper } = await getWrapper()

    expect(wrapper.find('.epub-reader').exists()).toBeTruthy()
    expect(wrapper.findComponent({ name: 'ReaderToolbar' }).exists()).toBeTruthy()
    expect(wrapper.findComponent({ name: 'ChapterList' }).exists()).toBeTruthy()
    expect(wrapper.findComponent({ name: 'ReaderView' }).exists()).toBeTruthy()
    expect(wrapper.findComponent({ name: 'ReaderProgressBar' }).exists()).toBeTruthy()
  })

  it('renders the book into the reader view and shows it once a page is displayed', async () => {
    const { wrapper, book } = await getWrapper()

    expect(book.renderTo).toHaveBeenCalledWith(
      wrapper.find('.epub-reader-book').element,
      expect.objectContaining({ flow: 'paginated' })
    )
    expect(book.rendition.display).toHaveBeenCalledWith('c1')
    expect(wrapper.find('.epub-reader').classes()).toContain('invisible')

    book.rendition.emit('relocated', createLocation())
    await nextTicks(2)

    expect(wrapper.find('.epub-reader').classes()).not.toContain('invisible')
  })

  it('applies the light theme and the default font size', async () => {
    const { book } = await getWrapper()

    expect(book.rendition.themes.register).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ html: expect.objectContaining({ filter: 'none' }) })
    )
    expect(book.rendition.themes.fontSize).toHaveBeenCalledWith('100%')
  })

  it('opens the book at the stored position and stores new positions', async () => {
    window.localStorage.setItem(
      'oc_epubReader_resource_1',
      JSON.stringify({ cfi: 'epubcfi(/6/4!/4/4/14/2/150/2/1:23)' })
    )
    const { book } = await getWrapper()
    expect(book.rendition.display).toHaveBeenCalledWith('epubcfi(/6/4!/4/4/14/2/150/2/1:23)')

    book.rendition.emit('relocated', createLocation({ cfi: 'epubcfi(/6/6!/4/2/1:0)' }))
    await nextTicks(1)

    expect(JSON.parse(window.localStorage.getItem('oc_epubReader_resource_1'))).toEqual({
      cfi: 'epubcfi(/6/6!/4/2/1:0)'
    })
  })

  it('opens another book when the content changes', async () => {
    const { wrapper } = await getWrapper()

    await wrapper.setProps({ currentContent: 'other-content' })
    await flushPromises()

    expect(books).toHaveLength(2)
    expect(books[0].rendition.destroy).toHaveBeenCalled()
    expect(books[1].rendition.display).toHaveBeenCalled()
  })

  describe('font size', () => {
    it('changes the font size with the toolbar buttons', async () => {
      const { wrapper, book } = await getWrapper()

      await wrapper.find(selectors.increaseFontSize).trigger('click')
      expect(book.rendition.themes.fontSize).toHaveBeenLastCalledWith('110%')
      expect(wrapper.find(selectors.resetFontSize).text()).toBe('110%')

      await wrapper.find(selectors.decreaseFontSize).trigger('click')
      await wrapper.find(selectors.decreaseFontSize).trigger('click')
      expect(book.rendition.themes.fontSize).toHaveBeenLastCalledWith('90%')

      await wrapper.find(selectors.resetFontSize).trigger('click')
      expect(book.rendition.themes.fontSize).toHaveBeenLastCalledWith('100%')
    })

    it('disables the buttons at the limits', async () => {
      window.localStorage.setItem('oc_epubReader', JSON.stringify({ fontSizePercentage: 150 }))
      const { wrapper } = await getWrapper()

      expect(
        wrapper.find<HTMLButtonElement>(selectors.increaseFontSize).element.disabled
      ).toBeTruthy()
      expect(
        wrapper.find<HTMLButtonElement>(selectors.decreaseFontSize).element.disabled
      ).toBeFalsy()
    })
  })

  describe('chapters', () => {
    it('lists the chapters and displays the clicked one', async () => {
      const { wrapper, book } = await getWrapper()

      const chapterElements = wrapper.findAll(selectors.chaptersListItem)
      expect(chapterElements.map((element) => element.text())).toEqual(['Chapter 1', 'Chapter 2'])

      await chapterElements[1].find('.oc-button').trigger('click')

      expect(book.rendition.display).toHaveBeenCalledWith('c2')
      expect(chapterElements[1].classes()).toContain('bg-role-secondary-container')
    })

    it('displays the chapter picked in the mobile select', async () => {
      const { wrapper, book } = await getWrapper()
      expect(wrapper.find(selectors.chaptersSelect).exists()).toBeTruthy()

      wrapper.findComponent({ name: 'ReaderToolbar' }).vm.$emit('update:selectedChapter', {
        id: 'toc-1',
        label: 'Chapter 2',
        href: 'c2',
        depth: 0
      })

      expect(book.rendition.display).toHaveBeenCalledWith('c2')
    })

    it('toggles the chapter list from the toolbar', async () => {
      const { wrapper } = await getWrapper()
      expect(wrapper.findComponent({ name: 'ChapterList' }).exists()).toBe(true)

      await wrapper.find('.epub-reader-controls-chapter-list').trigger('click')
      expect(wrapper.findComponent({ name: 'ChapterList' }).exists()).toBe(false)

      await wrapper.find('.epub-reader-controls-chapter-list').trigger('click')
      expect(wrapper.findComponent({ name: 'ChapterList' }).exists()).toBe(true)
    })

    it('marks the chapter of the displayed location', async () => {
      const { wrapper, book } = await getWrapper()

      book.rendition.emit('relocated', createLocation({ index: 1, href: 'c2' }))
      await nextTicks(2)

      expect(wrapper.findAll(selectors.chaptersListItem)[1].classes()).toContain(
        'bg-role-secondary-container'
      )
    })
  })

  describe('reading progress', () => {
    it('enables the slider once the locations are generated and seeks with it', async () => {
      const { wrapper, book } = await getWrapper()
      expect(wrapper.find(selectors.progressSlider).exists()).toBe(false)

      book.rendition.emit('relocated', createLocation())
      await flushPromises()
      book.rendition.emit('relocated', createLocation({ percentage: 0.12 }))
      await nextTicks(2)

      expect(wrapper.find('.epub-reader-progress-label').text()).toBe('12%')
      const slider = wrapper.find<HTMLInputElement>(selectors.progressSlider)
      await slider.setValue('35')
      await slider.trigger('change')

      expect(book.rendition.display).toHaveBeenCalledWith('cfi-0.35')
    })
  })

  describe('search', () => {
    it('finds matches and navigates through them', async () => {
      const { wrapper, book } = await getWrapper()
      const toolbar = wrapper.findComponent({ name: 'ReaderToolbar' })

      toolbar.vm.$emit('searchTermChanged', 'whale')
      await flushPromises()

      expect(book.rendition.display).toHaveBeenLastCalledWith('cfi-search-1')
      expect(book.rendition.annotations.highlight).toHaveBeenCalledWith(
        'cfi-search-1',
        {},
        undefined,
        'epub-reader-search-highlight',
        expect.any(Object)
      )

      toolbar.vm.$emit('goToNextSearchResult')
      await flushPromises()
      expect(book.rendition.display).toHaveBeenLastCalledWith('cfi-search-2')

      toolbar.vm.$emit('closeSearch')
      expect(book.rendition.annotations.remove).toHaveBeenCalledWith('cfi-search-2', 'highlight')
    })
  })

  describe('navigation', () => {
    it('turns pages with the side buttons', async () => {
      const { wrapper, book } = await getWrapper()

      await wrapper.find(selectors.navigateLeft).trigger('click')
      await wrapper.find(selectors.navigateRight).trigger('click')

      expect(book.rendition.prev).toHaveBeenCalled()
      expect(book.rendition.next).toHaveBeenCalled()
    })

    it('turns pages with the arrow keys', async () => {
      const { book } = await getWrapper()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))

      expect(book.rendition.prev).toHaveBeenCalled()
      expect(book.rendition.next).toHaveBeenCalled()
    })

    it('disables the buttons at the start and end of the book', async () => {
      const { wrapper, book } = await getWrapper()

      book.rendition.emit('relocated', createLocation({}, { atStart: true, atEnd: true }))
      await nextTicks(2)

      expect(wrapper.find<HTMLButtonElement>(selectors.navigateLeft).element.disabled).toBe(true)
      expect(wrapper.find<HTMLButtonElement>(selectors.navigateRight).element.disabled).toBe(true)
    })

    it('takes the focus back when a section change dropped it to the body', async () => {
      const { wrapper, book } = await getWrapper({ attachTo: document.body })
      ;(document.activeElement as HTMLElement)?.blur?.()
      expect(document.activeElement).toBe(document.body)

      book.rendition.emit('relocated', createLocation({ index: 1 }))
      await nextTicks(1)

      expect(document.activeElement).toBe(wrapper.find('.epub-reader').element)
      wrapper.unmount()
    })

    it('closes the app with Esc inside the book', async () => {
      const onClose = vi.fn()
      const { book } = await getWrapper({ propsData: { onClose } })

      book.rendition.emit('keydown', new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(onClose).toHaveBeenCalled()
    })
  })
})

async function getWrapper({
  propsData = {},
  attachTo
}: {
  propsData?: PartialComponentProps<typeof App>
  attachTo?: Element
} = {}) {
  const props: ComponentProps<typeof App> = {
    applicationConfig: {},
    currentContent: 'content',
    isReadOnly: false,
    resource: mock<Resource>({ id: '1' }),
    onClose: vi.fn(),
    ...propsData
  }
  const wrapper = mount(App, {
    props,
    attachTo,
    global: {
      plugins: [...defaultPlugins()]
    }
  })
  await flushPromises()
  return { wrapper, book: books[0] }
}
