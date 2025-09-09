<template>
  <div
    :role="isFilter ? undefined : 'search'"
    class="oc-search flex items-center"
    :class="{ 'oc-search-small': small }"
  >
    <div class="flex-1 relative">
      <input
        v-model="model"
        :class="inputClass"
        :aria-label="label"
        :disabled="loading"
        :placeholder="placeholder"
        @keydown.enter="onSearch"
        @keyup="$emit('keyup', $event)"
      />
      <slot name="locationFilter" />
      <oc-button
        v-if="icon"
        :aria-label="$gettext('Search')"
        class="absolute top-[50%] transform-[translateY(-50%)] right-0 mx-4 mb-4 mt-0"
        appearance="raw"
        no-hover
        @click.prevent.stop="$emit('advancedSearch', $event)"
      >
        <oc-icon v-show="!loading" :name="icon" size="small" fill-type="line" />
        <oc-spinner
          v-show="loading"
          :size="small ? 'xsmall' : 'medium'"
          :aria-label="loadingAccessibleLabelValue"
        />
      </oc-button>
    </div>
    <div class="oc-search-button-wrapper" :class="{ 'sr-only': buttonHidden }">
      <oc-button
        class="oc-search-button z-0 ml-4 rounded-l-none transform-[translateX(-1px)]"
        appearance="filled"
        :size="small ? 'small' : 'medium'"
        :disabled="loading || model.length < 1"
        @click="onSearch"
      >
        {{ buttonLabel }}
      </oc-button>
    </div>
    <oc-button
      v-if="showCancelButton"
      :appearance="cancelButtonAppearance"
      class="ml-4"
      no-hover
      @click="onCancel"
    >
      <span v-text="$gettext('Cancel')" />
    </oc-button>
  </div>
</template>

<script lang="ts" setup>
import { computed, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import OcButton from '../OcButton/OcButton.vue'
import OcIcon from '../OcIcon/OcIcon.vue'
import OcSpinner from '../OcSpinner/OcSpinner.vue'
import { AppearanceType } from '../../helpers'

export interface Props {
  /**
   * @docs The name of the icon to be displayed in the search bar. Please refer to the `OcIcon` component to see how to use icon names.
   */
  icon?: string
  /**
   * @docs The placeholder text of the search bar input.
   */
  placeholder?: string
  /**
   * @docs The label of the search bar input.
   */
  label: string
  /**
   * @docs Determines if the search bar is small.
   * @default false
   */
  small?: boolean
  /**
   * @docs The label of the search button.
   * @default Search
   */
  buttonLabel?: string
  /**
   * @docs Determines if the search button is hidden.
   * @default false
   */
  buttonHidden?: boolean
  /**
   * @docs Determines if the search bar should perform a search on each keyup event.
   * @default false
   */
  typeAhead?: boolean
  /**
   * @docs Determines if the search query should be trimmed.
   * @default true
   */
  trimQuery?: boolean
  /**
   * @docs Determines if the search bar is in a loading state.
   * @default false
   */
  loading?: boolean
  /**
   * @docs Determines if the search bar acts as a local filter. If set to `true`, the `role` attribute will not be set.
   * @default false
   */
  isFilter?: boolean
  /**
   * @docs The accessible label for the loading spinner.
   */
  loadingAccessibleLabel?: string
  /**
   * @docs Determines if the cancel button should be shown. This is mostly used in mobile views.
   * @default false
   */
  showCancelButton?: boolean
  /**
   * @docs The appearance of the cancel button.
   * @default raw
   */
  cancelButtonAppearance?: AppearanceType
  /**
   * @docs The handler for the cancel button.
   */
  cancelHandler?: () => void
}

export interface Emits {
  /**
   * @docs Emitted when the search button has been clicked.
   */
  (e: 'advancedSearch', event: MouseEvent): void

  /**
   * @docs Emitted when the user has typed.
   */
  (e: 'keyup', event: KeyboardEvent): void

  /**
   * @docs Emitted when the user has performed a search.
   */
  (e: 'search', query: string): void
}

export interface Slots {
  /**
   * @docs Can be used to add additional filter options inside the search input.
   */
  locationFilter?: () => unknown
}

const {
  icon = 'search',
  placeholder = '',
  label,
  small = false,
  buttonLabel = 'Search',
  buttonHidden = false,
  typeAhead = false,
  trimQuery = true,
  loading = false,
  isFilter = false,
  loadingAccessibleLabel = '',
  showCancelButton = false,
  cancelButtonAppearance = 'raw',
  cancelHandler = () => {}
} = defineProps<Props>()

const model = defineModel<string>({ default: '' })
watch(model, () => {
  if (typeAhead) {
    onSearch()
  }
})

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const { $gettext } = useGettext()

const inputClass = computed(() => {
  const classes = [
    'oc-search-input',
    'oc-input',
    'p-4',
    'rounded-4xl',
    'disabled:cursor-not-allowed',
    'focus:bg-none'
  ]
  if (!buttonHidden) {
    classes.push(...['oc-search-input-button', 'rounded-r-none'])
  }
  if (small) {
    classes.push(...['leading-7', 'h-8'])
  } else {
    classes.push('h-10')
  }
  return classes
})

const loadingAccessibleLabelValue = computed(() => {
  return loadingAccessibleLabel || 'Loading results'
})

const onSearch = () => {
  emit('search', trimQuery ? unref(model).trim() : unref(model))
}

const onCancel = () => {
  model.value = ''
  if (!typeAhead) {
    onSearch()
  }
  cancelHandler()
}
</script>
