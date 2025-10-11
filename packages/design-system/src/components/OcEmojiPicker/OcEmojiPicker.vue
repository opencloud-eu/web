<template>
  <div v-if="isLoading" class="flex justify-center">
    <oc-spinner size="large" />
  </div>
  <div v-else ref="emojiPickerRef"></div>
</template>

<script setup lang="ts">
import { Emoji } from 'emoji-mart'
import { nextTick, ref, unref, useTemplateRef, watch } from 'vue'
import { useGettext } from 'vue3-gettext'

export interface Props {
  /**
   * @docs Theme of the emoji picker.
   * @default light
   */
  theme?: 'light' | 'dark'
}

export interface Emits {
  /**
   * @docs Emitted when an emoji has been selected.
   */
  (e: 'emojiSelect', emoji: string): void
  /**
   * @docs Emitted when the user has clicked outside of the emoji picker.
   */
  (e: 'clickOutside'): void
}

const { theme = 'light' } = defineProps<Props>()

const emit = defineEmits<Emits>()

const language = useGettext()
const { $gettext } = language
const emojiPickerRef = useTemplateRef<HTMLElement>('emojiPickerRef')

const isLoading = ref(true)

watch(
  [() => theme, language.current],
  async () => {
    isLoading.value = true

    await nextTick()
    const i18n = {
      search: $gettext('Search'),
      search_no_results_1: $gettext('Oh no!'),
      search_no_results_2: $gettext('That emoji couldn’t be found'),
      pick: $gettext('Pick an emoji…'),
      add_custom: $gettext('Add custom emoji'),
      categories: {
        activity: $gettext('Activity'),
        custom: $gettext('Custom'),
        flags: $gettext('Flags'),
        foods: $gettext('Food & Drink'),
        frequent: $gettext('Frequently used'),
        nature: $gettext('Animals & Nature'),
        objects: $gettext('Objects'),
        people: $gettext('Smileys & People'),
        places: $gettext('Travel & Places'),
        search: $gettext('Search Results'),
        symbols: $gettext('Symbols')
      },
      skins: {
        choose: $gettext('Choose default skin tone'),
        '1': $gettext('Default'),
        '2': $gettext('Light'),
        '3': $gettext('Medium-Light'),
        '4': $gettext('Medium'),
        '5': $gettext('Medium-Dark'),
        '6': $gettext('Dark')
      }
    }

    const data = (await import('@emoji-mart/data')).default

    const pickerOptions = {
      onEmojiSelect: (emoji: Emoji['component']) => emit('emojiSelect', emoji.native),
      onClickOutside: () => emit('clickOutside'),
      i18n,
      data,
      autoFocus: true,
      theme
    }

    // lazy loading to avoid loading the whole package on page load
    const { Picker } = await import('emoji-mart')
    const picker = new Picker(pickerOptions)

    isLoading.value = false
    await nextTick()

    unref(emojiPickerRef).innerHTML = ''
    unref(emojiPickerRef).appendChild(picker as any)
  },
  { immediate: true }
)
</script>
