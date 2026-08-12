<template>
  <div ref="readerRoot" class="epub-reader flex h-full bg-role-surface text-role-on-surface">
    <chapter-list
      :chapters="chapters"
      :current-chapter="currentChapter"
      @chapter-selected="showChapter"
    />
    <div class="flex min-w-0 flex-1 flex-col">
      <reader-toolbar
        :chapters="chapters"
        :selected-chapter="currentChapter"
        :chapter-label="$gettext('Chapter')"
        :previous-page-label="$gettext('Navigate to previous page')"
        :next-page-label="$gettext('Navigate to next page')"
        :decrease-font-size-label="$gettext('Decrease font size')"
        :reset-font-size-label="$gettext('Reset font size')"
        :increase-font-size-label="$gettext('Increase font size')"
        :current-font-size-percentage="currentFontSizePercentage"
        :font-size-step="FONT_SIZE_PERCENTAGE_STEP"
        :navigate-left-disabled="navigateLeftDisabled"
        :navigate-right-disabled="navigateRightDisabled"
        :decrease-font-size-disabled="decreaseFontSizeDisabled"
        :increase-font-size-disabled="increaseFontSizeDisabled"
        :reading-progress-label="readingProgressLabel"
        :fullscreen-label="
          isFullScreenModeActivated
            ? $gettext('Exit fullscreen')
            : $gettext('Enter fullscreen')
        "
        :is-full-screen-mode-activated="isFullScreenModeActivated"
        @update:selected-chapter="showChapter"
        @navigate-left="navigateLeft"
        @navigate-right="navigateRight"
        @decrease-font-size="decreaseFontSize"
        @reset-font-size="resetFontSize"
        @increase-font-size="increaseFontSize"
        @toggle-fullscreen="toggleFullScreenMode"
      />
      <div class="flex min-h-0 flex-1 items-stretch gap-2 px-2 py-2 md:px-4">
        <div class="flex min-w-0 flex-1 items-center justify-center overflow-hidden">
          <div class="relative mx-auto h-full min-h-[420px] w-[650px] max-w-full">
            <div id="reader" ref="bookContainer" class="h-full w-full" />
            <oc-button
              v-oc-tooltip="$gettext('Navigate to previous page')"
              class="epub-reader-navigate-left absolute left-0 top-1/2 hidden -translate-x-10 -translate-y-1/2 rounded-sm text-role-on-surface-variant md:flex"
              :aria-label="$gettext('Navigate to previous page')"
              :disabled="navigateLeftDisabled"
              appearance="raw"
              @click="navigateLeft"
            >
              <oc-icon name="arrow-left-s" fill-type="line" size-class="size-10" />
            </oc-button>
            <oc-button
              v-oc-tooltip="$gettext('Navigate to next page')"
              class="epub-reader-navigate-right absolute right-0 top-1/2 hidden translate-x-10 -translate-y-1/2 rounded-sm text-role-on-surface-variant md:flex"
              :aria-label="$gettext('Navigate to next page')"
              :disabled="navigateRightDisabled"
              appearance="raw"
              @click="navigateRight"
            >
              <oc-icon name="arrow-right-s" fill-type="line" size-class="size-10" />
            </oc-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, unref, watch } from 'vue'
import {
  Key,
  useKeyboardActions,
  useLocalStorage,
  useThemeStore,
  type AppWrapperSlotProps,
  type EditorSlotProps
} from '@opencloud-eu/web-pkg'
import ePub, { Book, NavItem, Rendition, Location } from 'epubjs'
import ReaderToolbar from './components/ReaderToolbar.vue'
import ChapterList from './components/ChapterList.vue'

const DARK_THEME_CONFIG = {
  html: {
    '-webkit-filter': 'invert(1) hue-rotate(180deg)',
    filter: 'invert(1) hue-rotate(180deg)'
  },
  img: {
    '-webkit-filter': 'invert(1) hue-rotate(180deg)',
    filter: 'invert(1) hue-rotate(180deg)'
  }
}
const LIGHT_THEME_CONFIG = {
  html: { background: 'white' }
}
const MAX_FONT_SIZE_PERCENTAGE = 150
const MIN_FONT_SIZE_PERCENTAGE = 50
const FONT_SIZE_PERCENTAGE_STEP = 10
const GLOBAL_LOCATION_CHARS = 1200

// `applicationConfig` is declared but never read here. Without it the wrapper's
// slot binding has nowhere to land it and Vue falls it through to the root
// element as `applicationconfig="[object Object]"`.
const { currentContent, resource } = defineProps<
  EditorSlotProps & Pick<AppWrapperSlotProps, 'applicationConfig'>
>()

const keyboardActions = useKeyboardActions()
const readerRoot = ref<HTMLElement>()
const bookContainer = ref<Element>()
const chapters = ref<NavItem[]>([])
const currentChapter = ref<NavItem>()
const navigateLeftDisabled = ref(false)
const navigateRightDisabled = ref(false)
const readingProgressLabel = ref<string | null>(null)
const localStorageData = useLocalStorage<{ fontSizePercentage?: number }>(`oc_epubReader`, {})
const currentFontSizePercentage = ref(unref(localStorageData).fontSizePercentage || 100)
const themeStore = useThemeStore()
const book = ref<Book>()
const rendition = ref<Rendition>()
const isFullScreenModeActivated = ref(false)

const navigateLeft = () => {
  unref(rendition).prev()
}

const navigateRight = () => {
  unref(rendition).next()
}

const showChapter = (chapter: NavItem) => {
  currentChapter.value = chapter
  unref(rendition).display(chapter.href)
}

const syncFullscreenState = () => {
  isFullScreenModeActivated.value = Boolean(document.fullscreenElement)
}

const toggleFullScreenMode = async () => {
  if (!document.fullscreenElement) {
    await unref(readerRoot)?.requestFullscreen?.()
    return
  }
  await document.exitFullscreen?.()
}

const increaseFontSize = () => {
  currentFontSizePercentage.value = Math.min(
    unref(currentFontSizePercentage) + FONT_SIZE_PERCENTAGE_STEP,
    MAX_FONT_SIZE_PERCENTAGE
  )
}

const resetFontSize = () => {
  currentFontSizePercentage.value = 100
}

const decreaseFontSize = () => {
  currentFontSizePercentage.value = Math.max(
    unref(currentFontSizePercentage) - FONT_SIZE_PERCENTAGE_STEP,
    MIN_FONT_SIZE_PERCENTAGE
  )
}

const increaseFontSizeDisabled = computed(() => {
  return unref(currentFontSizePercentage) >= MAX_FONT_SIZE_PERCENTAGE
})

const decreaseFontSizeDisabled = computed(() => {
  return unref(currentFontSizePercentage) <= MIN_FONT_SIZE_PERCENTAGE
})

keyboardActions.bindKeyAction({ primary: Key.ArrowLeft }, () => navigateLeft())
keyboardActions.bindKeyAction({ primary: Key.ArrowRight }, () => navigateRight())

watch(
  () => currentContent,
  async () => {
    await nextTick()

    if (unref(book)) {
      unref(book).destroy()
    }

    const localStorageResourceData = useLocalStorage<{ currentLocation?: Location }>(
      `oc_epubReader_resource_${resource.id}`,
      {}
    )

    book.value = ePub(currentContent)
    readingProgressLabel.value = null

    unref(book).loaded.navigation.then(({ toc }) => {
      chapters.value = toc
      currentChapter.value = toc?.[0]
    })

    await unref(book).ready
    if (unref(book).locations) {
      await unref(book).locations.generate(GLOBAL_LOCATION_CHARS)
    }

    rendition.value = unref(book).renderTo(unref(bookContainer), {
      flow: 'paginated',
      spread: 'none',
      width: '100%',
      height: '100%'
    })

    unref(rendition).themes.register('dark', DARK_THEME_CONFIG)
    unref(rendition).themes.register('light', LIGHT_THEME_CONFIG)
    unref(rendition).themes.select(themeStore.currentTheme.isDark ? 'dark' : 'light')
    unref(rendition).themes.fontSize(`${unref(currentFontSizePercentage)}%`)
    unref(rendition).display(unref(localStorageResourceData)?.currentLocation?.start?.cfi)

    unref(rendition).on('keydown', (event: KeyboardEvent) => {
      if (event.key === Key.ArrowLeft) {
        navigateLeft()
      }
      if (event.key === Key.ArrowRight) {
        navigateRight()
      }
    })

    unref(rendition).on('relocated', () => {
      const currentLocation = unref(rendition).currentLocation() as any & Location
      localStorageResourceData.value = { currentLocation }
      navigateLeftDisabled.value = currentLocation.atStart === true
      navigateRightDisabled.value = currentLocation.atEnd === true
      const locationCfi = currentLocation?.start?.cfi
      const globalPercentage =
        locationCfi && unref(book)?.locations?.percentageFromCfi
          ? unref(book).locations.percentageFromCfi(locationCfi)
          : null

      if (typeof globalPercentage === 'number' && Number.isFinite(globalPercentage)) {
        const clamped = Math.min(1, Math.max(0, globalPercentage))
        readingProgressLabel.value = `${(clamped * 100).toFixed(1)}%`
      } else {
        const chapterPage = currentLocation?.start?.displayed?.page
        const chapterTotal = currentLocation?.start?.displayed?.total
        readingProgressLabel.value =
          typeof chapterPage === 'number' && typeof chapterTotal === 'number'
            ? `${chapterPage}/${chapterTotal}`
            : null
      }

      const spineItem = unref(book).spine.get(locationCfi)
      const navItem = unref(book).navigation.get(spineItem.href)
      // Might be sub nav item and therefore undefined
      if (navItem) {
        currentChapter.value = navItem
      }
    })
  },
  {
    immediate: true
  }
)

watch(currentFontSizePercentage, () => {
  unref(rendition).themes.fontSize(`${unref(currentFontSizePercentage)}%`)
  localStorageData.value = {
    ...unref(localStorageData),
    fontSizePercentage: unref(currentFontSizePercentage)
  }
})

onMounted(() => {
  document.addEventListener('fullscreenchange', syncFullscreenState)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFullscreenState)
})
</script>
