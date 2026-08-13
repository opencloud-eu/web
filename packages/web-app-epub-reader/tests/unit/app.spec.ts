import {
  ComponentProps,
  PartialComponentProps,
  defaultPlugins,
  mount,
  nextTicks
} from '@opencloud-eu/web-test-helpers'
import App from '../../src/App.vue'
import { useLocalStorage } from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'
import { mock } from 'vitest-mock-extended'
import { ref } from 'vue'

let areGlobalLocationsGenerated = false
let deferGlobalLocationsGeneration = false
let resolveGlobalLocationsGenerationPromise: (() => void) | null = null

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useLocalStorage: vi.fn()
}))

vi.mock('epubjs', () => ({
  __esModule: true,
  default: vi.fn(() => {
    const spineItemOne = {
      href: 'c1',
      load: vi.fn(() => Promise.resolve()),
      find: vi.fn(() =>
        Promise.resolve([{ cfi: 'cfi-search-1' }, { cfi: 'cfi-search-2' }, { cfi: 'cfi-search-3' }])
      ),
      unload: vi.fn()
    }
    const spineItemTwo = {
      href: 'c2',
      load: vi.fn(() => Promise.resolve()),
      find: vi.fn(() => Promise.resolve([])),
      unload: vi.fn()
    }

    return {
      ready: Promise.resolve(),
      load: vi.fn(),
      locations: {
        generate: vi.fn(() => {
          if (!deferGlobalLocationsGeneration) {
            areGlobalLocationsGenerated = true
            return Promise.resolve([])
          }

          return new Promise((resolve) => {
            resolveGlobalLocationsGenerationPromise = () => {
              areGlobalLocationsGenerated = true
              resolve([])
            }
          })
        }),
        percentageFromCfi: vi.fn(() => (areGlobalLocationsGenerated ? 0.046 : Number.NaN)),
        cfiFromPercentage: vi.fn((value: number) => `cfi-${value}`),
        length: vi.fn(() => 1000)
      },
      navigation: {
        get: vi.fn((href: string) => ({ label: href }))
      },
      spine: {
        spineItems: [spineItemOne, spineItemTwo],
        get: vi.fn(() => ({ href: 'c1' }))
      },
      loaded: {
        navigation: Promise.resolve({
          toc: [
            { id: '1', label: 'Chapter 1', href: 'c1' },
            { id: '2', label: 'Chapter 2', href: 'c2' }
          ]
        })
      },
      renderTo: vi.fn(() => ({
        on: vi.fn(),
        once: vi.fn(),
        currentLocation: vi.fn(() => ({
          start: { cfi: 'epubcfi(/6/2)', displayed: { page: 1, total: 12 } },
          atStart: false,
          atEnd: false
        })),
        themes: {
          register: vi.fn(),
          select: vi.fn(),
          fontSize: vi.fn()
        },
        annotations: {
          highlight: vi.fn(),
          remove: vi.fn()
        },
        display: vi.fn(),
        prev: vi.fn(),
        next: vi.fn()
      }))
    }
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
  progressSlider: '.epub-reader-progress-slider'
}
describe('Epub reader app', () => {
  it('renders correctly', async () => {
    const { wrapper } = getWrapper()
    await nextTicks(2)
    expect(wrapper.find('.epub-reader').exists()).toBeTruthy()
    expect(wrapper.findComponent({ name: 'ReaderToolbar' }).exists()).toBeTruthy()
    expect(wrapper.findComponent({ name: 'ChapterList' }).exists()).toBeTruthy()
    expect(wrapper.findComponent({ name: 'ReaderView' }).exists()).toBeTruthy()
    expect(wrapper.findComponent({ name: 'ReaderProgressBar' }).exists()).toBeTruthy()
  })
  describe('theme', () => {
    it('sets the theme based on current theme setting', async () => {
      const { wrapper } = getWrapper({ localStorageGeneral: { fontSizePercentage: 50 } })
      await nextTicks(2)
      expect((wrapper.vm as any).rendition.themes.select).toHaveBeenCalledWith('light')
    })
  })
  describe('font size', () => {
    it('initializes with default font size percentage', async () => {
      const { wrapper } = getWrapper()
      await nextTicks(2)
      expect((wrapper.vm as any).rendition.themes.fontSize).toHaveBeenCalledWith('100%')
    })
    it('initializes with local storage font size when set', async () => {
      const { wrapper } = getWrapper({ localStorageGeneral: { fontSizePercentage: 50 } })
      await nextTicks(2)
      expect((wrapper.vm as any).rendition.themes.fontSize).toHaveBeenCalledWith('50%')
    })
    describe('increase font size button', () => {
      it('increases font size when clicked', async () => {
        const { wrapper } = getWrapper()
        await nextTicks(2)
        await wrapper.find(selectors.increaseFontSize).trigger('click')
        expect((wrapper.vm as any).rendition.themes.fontSize).toHaveBeenCalledWith('110%')
      })
      it('is disabled when "MAX_FONT_SIZE_PERCENTAGE" is reached', () => {
        const { wrapper } = getWrapper({ localStorageGeneral: { fontSizePercentage: 150 } })
        expect(
          wrapper.find<HTMLButtonElement>(selectors.increaseFontSize).element.disabled
        ).toBeTruthy()
      })
    })
    describe('decrease font size button', () => {
      it('decreases font size when clicked', async () => {
        const { wrapper } = getWrapper()
        await nextTicks(2)
        await wrapper.find(selectors.decreaseFontSize).trigger('click')
        expect((wrapper.vm as any).rendition.themes.fontSize).toHaveBeenCalledWith('90%')
      })
      it('is disabled when "MIN_FONT_SIZE_PERCENTAGE" is reached', () => {
        const { wrapper } = getWrapper({ localStorageGeneral: { fontSizePercentage: 50 } })
        expect(
          wrapper.find<HTMLButtonElement>(selectors.decreaseFontSize).element.disabled
        ).toBeTruthy()
      })
    })
    describe('reset font size button', () => {
      it('resets font size when clicked', async () => {
        const { wrapper } = getWrapper({ localStorageGeneral: { fontSizePercentage: 50 } })
        await nextTicks(2)
        await wrapper.find(selectors.resetFontSize).trigger('click')
        expect((wrapper.vm as any).rendition.themes.fontSize).toHaveBeenCalledWith('100%')
      })
      it('shows the current font size', async () => {
        const { wrapper } = getWrapper()
        await nextTicks(2)
        await wrapper.find(selectors.decreaseFontSize).trigger('click')
        expect(wrapper.find(selectors.resetFontSize).text()).toBe('90%')
      })
    })
  })
  describe('location', () => {
    it('initializes with local storage location when set', async () => {
      const { wrapper } = getWrapper({
        localStorageResource: {
          currentLocation: { start: { cfi: 'epubcfi(/6/4!/4/4/14/2/150/2/1:23)' } }
        }
      })
      await nextTicks(2)
      expect((wrapper.vm as any).rendition.display).toHaveBeenCalledWith(
        'epubcfi(/6/4!/4/4/14/2/150/2/1:23)'
      )
    })
    it('seeks to a location when progress slider changes', async () => {
      const { wrapper } = getWrapper()
      await nextTicks(3)

      const slider = wrapper.find<HTMLInputElement>(selectors.progressSlider)
      await slider.setValue('35')
      await slider.trigger('change')

      expect((wrapper.vm as any).rendition.display).toHaveBeenCalledWith('cfi-0.35')
    })
    it('finds matches and navigates to next search result', async () => {
      const { wrapper } = getWrapper()
      await nextTicks(6)

      ;(wrapper.findComponent({ name: 'ReaderToolbar' }).vm as any).$emit(
        'searchTermChanged',
        'whale'
      )
      await nextTicks(6)
      expect((wrapper.vm as any).rendition.display).toHaveBeenLastCalledWith('cfi-search-1')
      expect((wrapper.vm as any).rendition.annotations.highlight).toHaveBeenCalledWith(
        'cfi-search-1',
        {},
        undefined,
        'epub-reader-search-highlight',
        {
          fill: 'var(--color-yellow-500)',
          'fill-opacity': '0.35'
        }
      )

      ;(wrapper.findComponent({ name: 'ReaderToolbar' }).vm as any).$emit('goToNextSearchResult')

      expect((wrapper.vm as any).rendition.display).toHaveBeenLastCalledWith('cfi-search-2')
    })

    it('wraps to first/last search result when navigating beyond bounds', async () => {
      const { wrapper } = getWrapper()
      await nextTicks(6)

      ;(wrapper.findComponent({ name: 'ReaderToolbar' }).vm as any).$emit(
        'searchTermChanged',
        'whale'
      )
      await nextTicks(6)

      ;(wrapper.findComponent({ name: 'ReaderToolbar' }).vm as any).$emit(
        'goToPreviousSearchResult'
      )
      expect((wrapper.vm as any).rendition.display).toHaveBeenLastCalledWith('cfi-search-3')

      ;(wrapper.findComponent({ name: 'ReaderToolbar' }).vm as any).$emit('goToNextSearchResult')
      expect((wrapper.vm as any).rendition.display).toHaveBeenLastCalledWith('cfi-search-1')
    })

    it('clears search highlight when search is closed', async () => {
      const { wrapper } = getWrapper()
      await nextTicks(6)

      ;(wrapper.findComponent({ name: 'ReaderToolbar' }).vm as any).$emit(
        'searchTermChanged',
        'whale'
      )
      await nextTicks(6)
      ;(wrapper.findComponent({ name: 'ReaderToolbar' }).vm as any).$emit('closeSearch')

      expect((wrapper.vm as any).rendition.annotations.remove).toHaveBeenCalledWith(
        'cfi-search-1',
        'highlight'
      )
    })

    it('prefers relocated location href to resolve chapters with same spine file', async () => {
      const { wrapper } = getWrapper()
      await nextTicks(3)

      ;(wrapper.vm as any).chapters = [
        {
          id: 'ch-109',
          label: 'Chapter 109',
          href: 'text/book.xhtml#ch109'
        },
        {
          id: 'ch-130',
          label: 'Chapter 130',
          href: 'text/book.xhtml#ch130'
        }
      ]

      ;(wrapper.vm as any).rendition.currentLocation.mockReturnValue({
        start: {
          cfi: 'epubcfi(/6/2)',
          href: 'text/book.xhtml#ch130',
          displayed: { page: 1, total: 12 }
        },
        atStart: false,
        atEnd: false
      })
      ;(wrapper.vm as any).book.spine.get.mockReturnValue({ href: 'text/book.xhtml' })
      ;(wrapper.vm as any).book.navigation.get.mockImplementation((href: string) => {
        if (href === 'text/book.xhtml#ch130') {
          return { id: 'ch-130', label: 'Chapter 130', href }
        }
        return { id: 'ch-109', label: 'Chapter 109', href: 'text/book.xhtml#ch109' }
      })

      const relocatedHandler = (wrapper.vm as any).rendition.on.mock.calls.find(
        ([eventName]: [string]) => eventName === 'relocated'
      )?.[1]
      relocatedHandler()
      await nextTicks(1)

      expect((wrapper.vm as any).currentChapter.id).toBe('ch-130')
    })

    it('recomputes progress after global locations are generated', async () => {
      const { wrapper, resolveGlobalLocationsGeneration } = getWrapper({
        deferGlobalLocationsGeneration: true
      })
      await nextTicks(3)

      ;(wrapper.vm as any).rendition.currentLocation.mockReturnValue({
        start: {
          cfi: 'epubcfi(/6/2)',
          displayed: { page: 0, total: 12 }
        },
        atStart: false,
        atEnd: false
      })

      const relocatedHandler = (wrapper.vm as any).rendition.on.mock.calls.find(
        ([eventName]: [string]) => eventName === 'relocated'
      )?.[1]
      relocatedHandler()
      await nextTicks(1)

      expect((wrapper.vm as any).readingProgressPercent).toBe(0)

      await resolveGlobalLocationsGeneration()
      await nextTicks(1)

      expect((wrapper.vm as any).readingProgressPercent).toBe(4.6)
      expect((wrapper.vm as any).readingProgressLabel).toBe('4.6%')
    })
  })
  describe('chapters', () => {
    describe('chapters list', () => {
      it('renders correctly', async () => {
        const { wrapper } = getWrapper()
        await nextTicks(2)
        const chapterElements = wrapper.findAll(selectors.chaptersListItem)
        expect(chapterElements.length).toEqual(2)
        expect(chapterElements[0].text()).toEqual('Chapter 1')
        expect(chapterElements[1].text()).toEqual('Chapter 2')
      })
      it('calls method "display" when item is clicked', async () => {
        const { wrapper } = getWrapper()
        await nextTicks(2)
        const chapterElements = wrapper.findAll(selectors.chaptersListItem)
        await chapterElements[1].find('.oc-button').trigger('click')
        expect((wrapper.vm as any).rendition.display).toHaveBeenCalledWith('c2')
      })
      it('marks clicked chapter as selected', async () => {
        const { wrapper } = getWrapper()
        await nextTicks(2)
        const chapterElements = wrapper.findAll(selectors.chaptersListItem)

        await chapterElements[1].find('.oc-button').trigger('click')

        expect(chapterElements[1].classes()).toContain('bg-role-secondary-container')
      })
    })
    describe('chapters select', () => {
      it('renders correctly', async () => {
        const { wrapper } = getWrapper()
        await nextTicks(2)
        expect(wrapper.find(selectors.chaptersSelect).exists()).toBeTruthy()
      })
      it('calls method "display" when chapter is selected', async () => {
        const { wrapper } = getWrapper()
        await nextTicks(2)
        ;(wrapper.findComponent({ name: 'ReaderToolbar' }).vm as any).$emit(
          'update:selectedChapter',
          {
            id: '2',
            label: 'Chapter 2',
            href: 'c2'
          }
        )
        expect((wrapper.vm as any).rendition.display).toHaveBeenCalledWith('c2')
      })
    })
  })
  describe('navigate', () => {
    describe('keyboard navigation', () => {
      it('calls method "prev" when left arrow key is pressed', async () => {
        const { wrapper } = getWrapper()
        await nextTicks(2)
        const keyboardEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
        document.dispatchEvent(keyboardEvent)
        expect((wrapper.vm as any).rendition.prev).toHaveBeenCalled()
      })
      it('calls method "next" when right arrow key is pressed', async () => {
        const { wrapper } = getWrapper()
        await nextTicks(2)
        const keyboardEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' })
        document.dispatchEvent(keyboardEvent)
        expect((wrapper.vm as any).rendition.next).toHaveBeenCalled()
      })
    })
    describe('navigate left button', () => {
      it('calls method "prev" when clicked', async () => {
        const { wrapper } = getWrapper()
        await nextTicks(2)
        await wrapper.find(selectors.navigateLeft).trigger('click')
        expect((wrapper.vm as any).rendition.prev).toHaveBeenCalled()
      })
    })
    describe('navigate right button', () => {
      it('calls method "next" when clicked', async () => {
        const { wrapper } = getWrapper()
        await nextTicks(2)
        await wrapper.find(selectors.navigateRight).trigger('click')
        expect((wrapper.vm as any).rendition.next).toHaveBeenCalled()
      })
    })
  })
})

function getWrapper({
  propsData = {},
  localStorageGeneral = {},
  localStorageResource = {},
  deferGlobalLocationsGeneration: shouldDeferGlobalLocationsGeneration = false
}: {
  propsData?: PartialComponentProps<typeof App>
  localStorageGeneral?: Record<string, unknown>
  localStorageResource?: Record<string, unknown>
  deferGlobalLocationsGeneration?: boolean
} = {}) {
  areGlobalLocationsGenerated = false
  deferGlobalLocationsGeneration = shouldDeferGlobalLocationsGeneration
  resolveGlobalLocationsGenerationPromise = null

  vi.mocked(useLocalStorage<unknown>).mockImplementationOnce(() => ref(localStorageGeneral))
  vi.mocked(useLocalStorage<unknown>).mockImplementationOnce(() => ref(localStorageResource))
  const defaultProps: ComponentProps<typeof App> = {
    applicationConfig: {},
    currentContent: '',
    isReadOnly: false,
    resource: mock<Resource>({
      id: '1'
    }),
    onClose: vi.fn()
  }
  const props: ComponentProps<typeof App> = {
    ...defaultProps,
    ...propsData,
    onClose: propsData.onClose ?? defaultProps.onClose
  }

  return {
    wrapper: mount(App, {
      props,
      global: {
        plugins: [...defaultPlugins()]
      }
    }),
    resolveGlobalLocationsGeneration: async () => {
      for (let attempt = 0; attempt < 10; attempt++) {
        if (resolveGlobalLocationsGenerationPromise) {
          resolveGlobalLocationsGenerationPromise()
          return
        }
        await Promise.resolve()
      }
    }
  }
}
