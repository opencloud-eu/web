<template>
  <oc-grid
    direction="column"
    :role="isFilter ? undefined : 'search'"
    class="oc-search oc-flex-middle"
    :class="{ 'oc-search-small': small }"
  >
    <div class="oc-width-expand oc-position-relative">
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
        class="oc-position-small oc-position-center-right mt-0"
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
    <div class="oc-search-button-wrapper" :class="{ 'oc-invisible-sr': buttonHidden }">
      <oc-button
        class="oc-search-button ml-4"
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
  </oc-grid>
</template>

<script lang="ts" setup>
import { computed, unref, useSlots, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import OcButton from '../OcButton/OcButton.vue'
import OcGrid from '../OcGrid/OcGrid.vue'
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
const slots = useSlots()

const inputIconRightPadding = computed(() => {
  if (Object.hasOwn(slots, 'locationFilter')) {
    return '125px'
  }
  return '48px'
})

const inputClass = computed(() => {
  const classes = ['oc-search-input', 'oc-input']
  if (!buttonHidden) {
    classes.push('oc-search-input-button')
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

<style lang="scss">
.oc-search {
  min-width: $form-width-medium;

  &-button {
    border-bottom-left-radius: 0;
    border-top-left-radius: 0;
    // Prevent double borders
    // from input and button
    transform: translateX(-1px);
    z-index: 0;
  }

  &-icon {
    align-items: center;
    bottom: 0;
    display: inline-flex;
    justify-content: center;
    left: 0;
    position: absolute;
    top: 0;
    width: 40px;
  }

  &-input {
    border-radius: 25px !important;
    border: none;
    padding: var(--oc-space-medium) !important;
    height: 2.3rem;

    &:focus {
      background-image: none;
    }

    &::-ms-clear,
    &::-ms-reveal {
      display: none;
    }
  }

  &-input-icon {
    padding-left: var(--oc-space-xlarge) !important;
    padding-right: v-bind(inputIconRightPadding) !important;
  }

  &-input-button {
    border-bottom-right-radius: 0;
    border-top-right-radius: 0;
  }

  &-small {
    .oc-search-input {
      height: 30px;
      line-height: 28px;
      padding-left: var(--oc-space-xlarge);
    }

    .oc-icon {
      &,
      svg {
        height: 18px;
        width: 18px;
      }
    }
  }
}
</style>
