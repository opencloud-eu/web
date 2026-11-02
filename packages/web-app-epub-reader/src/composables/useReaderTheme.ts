import { Rendition } from 'epubjs'
import { useThemeStore } from '@opencloud-eu/web-pkg'
import { computed, Ref, watch } from 'vue'

const INVERT_FILTER = 'invert(1) hue-rotate(180deg)'
/** Inverts the whole page and the images once more, so they keep their colors. */
const DARK_RULES = {
  html: { '-webkit-filter': INVERT_FILTER, filter: INVERT_FILTER },
  img: { '-webkit-filter': INVERT_FILTER, filter: INVERT_FILTER }
}
const LIGHT_RULES = {
  html: { '-webkit-filter': 'none', filter: 'none', background: 'white' },
  img: { '-webkit-filter': 'none', filter: 'none' }
}

/**
 * Renders the book content in the light or dark variant matching the web theme.
 *
 * Both variants are written into epub.js' default theme instead of two selectable themes:
 * epub.js never removes the stylesheet of a previously selected theme, so a dark theme would
 * keep inverting the page after switching to light. Re-registering the default theme appends
 * the new rules, which win over the earlier ones.
 */
export function useReaderTheme(rendition: Ref<Rendition | undefined>) {
  const themeStore = useThemeStore()
  const isDark = computed(() => themeStore.currentTheme?.isDark === true)

  watch(
    [rendition, isDark],
    ([currentRendition, dark]) => {
      currentRendition?.themes.register('default', dark ? DARK_RULES : LIGHT_RULES)
    },
    { immediate: true }
  )
}
