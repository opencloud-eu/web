<template>
  <div>
    <label v-if="!labelHidden" :aria-hidden="true" :for="id" class="oc-label">
      {{ label }}
      <span v-if="requiredMark" class="text-role-on-error" aria-hidden="true">*</span>
    </label>
    <oc-contextual-helper
      v-if="contextualHelper?.isEnabled"
      v-bind="contextualHelper?.data"
      class="pl-1"
    />
    <vue-select
      ref="selectRef"
      :disabled="disabled || readOnly"
      :filter="filter"
      :loading="loading"
      :searchable="searchable"
      :clearable="clearable"
      :multiple="multiple"
      class="oc-select bg-transparent"
      :class="{
        'oc-select-position-fixed': positionFixed
      }"
      :dropdown-should-open="selectDropdownShouldOpen"
      :map-keydown="selectMapKeydown"
      v-bind="additionalAttributes"
      @update:model-value="emit('update:modelValue', $event)"
      @click="onSelectClick()"
      @search:blur="onSelectBlur()"
      @keydown="onSelectKeyDown($event)"
    >
      <template #search="{ attributes, events }">
        <input class="vs__search" v-bind="attributes" @input="userInput" v-on="events" />
      </template>
      <template v-for="(index, name) in $slots" #[name]="data">
        <slot v-if="name.toString() !== 'search'" :name="name" v-bind="data" />
      </template>
      <template #no-options>
        <div v-text="$gettext('No options available.')" />
      </template>
      <template #spinner="{ loading: loadingSpinner }">
        <oc-spinner v-if="loadingSpinner" />
      </template>
      <template #selected-option-container="{ option, deselect }">
        <span class="vs__selected" :class="{ 'vs__selected-readonly': option.readonly }">
          <slot name="selected-option" v-bind="option">
            <oc-icon v-if="readOnly" name="lock" class="mr-1" size="small" />
            {{ getOptionLabel(option) }}
          </slot>
          <span v-if="multiple" class="flex items-center ml-2 mr-1">
            <oc-icon v-if="option.readonly" class="vs__deselect-lock" name="lock" size="small" />
            <oc-button
              v-else
              appearance="raw"
              :title="$gettext('Deselect %{label}', { label: getOptionLabel(option) })"
              :aria-label="$gettext('Deselect %{label}', { label: getOptionLabel(option) })"
              class="vs__deselect mx-0"
              no-hover
              @mousedown.stop.prevent
              @click="deselect(option)"
            >
              <oc-icon name="close" size="small" />
            </oc-button>
          </span>
        </span>
      </template>
      <template #open-indicator>
        <oc-icon name="arrow-down-s" size="small" />
      </template>
    </vue-select>

    <div
      v-if="showMessageLine"
      class="oc-text-input-message text-sm"
      :class="{
        'oc-text-input-description': !!descriptionMessage,
        'oc-text-input-danger': !!errorMessage
      }"
    >
      <oc-icon
        v-if="!!errorMessage"
        name="error-warning"
        size="small"
        fill-type="line"
        aria-hidden="true"
        class="mr-1"
      />

      <span
        :id="messageId"
        :class="{
          'oc-text-input-description': !!descriptionMessage,
          'oc-text-input-danger': !!errorMessage
        }"
        v-text="messageText"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Fuse from 'fuse.js'
import { uniqueId } from '../../helpers'
import {
  ref,
  unref,
  nextTick,
  watch,
  computed,
  onMounted,
  onBeforeUnmount,
  useAttrs,
  useTemplateRef
} from 'vue'
import { useGettext } from 'vue3-gettext'
import 'vue-select/dist/vue-select.css'
import { ContextualHelper } from '../../helpers'

export interface Props {
  /**
   * @docs The element ID of the select.
   */
  id?: string
  /**
   * @docs The filter function for the select. Defaults to searching by label.
   */
  filter?: (items: unknown[], search: string, { label }: { label?: string }) => unknown[]
  /**
   * @docs Determines if the select is disabled.
   * @default false
   */
  disabled?: boolean
  /**
   * @docs The label of the select input.
   */
  label: string
  /**
   * @docs Determines if the label is visually hidden. Note that it will still be read by screen readers.
   * @default false
   */
  labelHidden?: boolean
  /**
   * @docs The contextual helper for the select. Please refer to the component source for the `ContextualHelper` type definition.
   */
  contextualHelper?: ContextualHelper
  /**
   * @docs The label key of the options object.
   * @default label
   */
  optionLabel?: string
  /**
   * @docs The getOptionLabel function of the options object. Takes precedence over the `optionLabel` prop.
   * @default function
   */
  getOptionLabel?: (option: unknown) => string
  /**
   * @docs Determines if the options of the select are searchable.
   * @default true
   */
  searchable?: boolean
  /**
   * @docs Determines if the select is clearable.
   * @default false
   */
  clearable?: boolean
  /**
   * @docs Determines if the select is in a loading state.
   * @default false
   */
  loading?: boolean
  /**
   * @docs The error message to be displayed below the select.
   */
  errorMessage?: string
  /**
   * @docs Determines if the message line should be fixed.
   * @default false
   */
  fixMessageLine?: boolean
  /**
   * @docs The description message to be displayed below the select.
   */
  descriptionMessage?: string
  /**
   * @docs Determines if the select allows multiple selections.
   * @default false
   */
  multiple?: boolean
  /**
   * @docs Determines if the select is read-only.
   * @default false
   */
  readOnly?: boolean
  /**
   * @docs Determines if the dropdown menu should be fixed to the viewport.
   * @default false
   */
  positionFixed?: boolean
  /**
   * @docs Determines if a required mark (*) should be displayed next to the label.
   * @default false
   */
  requiredMark?: boolean
}

export interface Emits {
  /**
   * @docs Emitted when the user has typed.
   */
  (e: 'search:input', search: string): void
  /**
   * @docs Emitted when the user has selected an option.
   */
  (e: 'update:modelValue', value: unknown): void
}

export interface Slots {
  /**
   * @docs Slot for when an option is selected.
   */
  selectedOption?: () => unknown
}

// the keycode property is deprecated in the JS event API, vue-select still works with it though
enum KeyCode {
  Enter = 13,
  ArrowDown = 40,
  ArrowUp = 38
}

const {
  id = uniqueId('oc-select-'),
  filter = (items: unknown[], search: string, { label }: { label?: string }) => {
    if (items.length < 1) {
      return []
    }

    const fuse = new Fuse(items, {
      ...(label && { keys: [label] }),
      shouldSort: true,
      threshold: 0,
      ignoreLocation: true,
      distance: 100,
      minMatchCharLength: 1
    })

    return search.length ? fuse.search(search).map(({ item }) => item) : items
  },
  disabled = false,
  label,
  labelHidden = false,
  contextualHelper,
  optionLabel = 'label',
  getOptionLabel: getOptionLabelProp = null,
  searchable = true,
  clearable = false,
  loading = false,
  errorMessage,
  fixMessageLine = false,
  descriptionMessage,
  multiple = false,
  readOnly = false,
  positionFixed = false,
  requiredMark = false
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const { $gettext } = useGettext()
const selectRef = useTemplateRef<typeof VueSelect>('selectRef')

const setComboBoxAriaLabel = () => {
  const comboBoxElement = unref(selectRef).$el.querySelector('div:first-child')
  comboBoxElement?.setAttribute('aria-label', `${label} - ${$gettext('Search for option')}`)
}

const userInput = (event: Event) => {
  emit('search:input', (event.target as HTMLInputElement).value)
}

const dropdownEnabled = ref(false)
const setDropdownEnabled = (enabled: boolean) => {
  dropdownEnabled.value = enabled
}

const selectDropdownShouldOpen = ({
  noDrop,
  open,
  mutableLoading
}: {
  noDrop?: boolean
  open?: boolean
  mutableLoading?: boolean
}) => {
  return !noDrop && open && !mutableLoading && unref(dropdownEnabled)
}

const onSelectClick = () => {
  setDropdownEnabled(true)
}

const onSelectBlur = () => {
  setDropdownEnabled(false)
}

const setKeyboardOutline = async () => {
  const optionEls = (unref(selectRef).$refs.dropdownMenu as HTMLElement).querySelectorAll('li')
  const highlightedOption = optionEls[unref(selectRef).typeAheadPointer]
  if (highlightedOption) {
    await nextTick()
    highlightedOption.classList.add('keyboard-outline')
  }
}

const selectMapKeydown = (map: Record<number, (e: KeyboardEvent) => void>) => {
  return {
    ...map,
    [KeyCode.Enter]: (e: KeyboardEvent) => {
      if (!unref(dropdownEnabled)) {
        setDropdownEnabled(true)
        return
      }
      map[KeyCode.Enter](e)
      unref(selectRef).searchEl.focus()
    },
    [KeyCode.ArrowDown]: async (e: KeyboardEvent) => {
      e.preventDefault()
      unref(selectRef).typeAheadDown()

      if (unref(dropdownOpen)) {
        await setKeyboardOutline()
      }
    },
    [KeyCode.ArrowUp]: async (e: KeyboardEvent) => {
      e.preventDefault()
      unref(selectRef).typeAheadUp()

      if (unref(dropdownOpen)) {
        await setKeyboardOutline()
      }
    }
  }
}

const onSelectKeyDown = async (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === 'Tab') {
    if (unref(dropdownOpen)) {
      await setKeyboardOutline()
    }
    return
  }
  setDropdownEnabled(true)
}

const setDropdownPosition = () => {
  const dropdownMenu = unref(selectRef).$refs.dropdownMenu
  if (!dropdownMenu) {
    return
  }

  const toggleClientRect = unref(selectRef).$refs.toggle.getBoundingClientRect()
  const dropdownMenuBottomOffset = 25
  const dropdownMenuMaxHeight = Math.min(
    window.innerHeight - toggleClientRect.bottom - dropdownMenuBottomOffset,
    window.innerHeight
  )

  dropdownMenu.style.maxHeight = `${dropdownMenuMaxHeight}px`
  dropdownMenu.style.width = `${toggleClientRect.width}px`
  dropdownMenu.style.top = `${toggleClientRect.top + toggleClientRect.height + 1}px`
  dropdownMenu.style.left = `${toggleClientRect.left}px`
}

const dropdownOpen = computed(() => {
  return unref(selectRef)?.dropdownOpen
})

watch(dropdownOpen, async () => {
  if (positionFixed && unref(dropdownOpen)) {
    await nextTick()
    setDropdownPosition()
  }
})

const getOptionLabel = computed(() => {
  return (
    getOptionLabelProp ||
    ((option: string | Record<string, unknown>): string => {
      if (typeof option === 'object') {
        const key = optionLabel || label
        if (!Object.hasOwn(option, key)) {
          console.warn(
            `[vue-select warn]: Label key "option.${key}" does not` +
              ` exist in options object ${JSON.stringify(option)}.\n` +
              'https://vue-select.org/api/html#getoptionlabel'
          )
          return ''
        }
        return option[key] as string
      }
      return option
    })
  )
})

onMounted(() => {
  setComboBoxAriaLabel()

  if (positionFixed) {
    window.addEventListener('resize', setDropdownPosition)
  }
})

onBeforeUnmount(() => {
  if (positionFixed) {
    window.removeEventListener('resize', setDropdownPosition)
  }
})

const attrs = useAttrs()
const additionalAttributes = computed(() => {
  const additionalAttrs: Record<string, unknown> = {}
  additionalAttrs['input-id'] = id
  additionalAttrs['getOptionLabel'] = unref(getOptionLabel)
  additionalAttrs['label'] = optionLabel

  return { ...attrs, ...additionalAttrs }
})

const showMessageLine = computed(() => {
  return fixMessageLine || !!errorMessage || !!descriptionMessage
})

const messageText = computed(() => {
  if (errorMessage) {
    return errorMessage
  }

  return descriptionMessage
})

const messageId = computed(() => {
  return `${id}-message`
})
</script>
<script lang="ts">
// @ts-ignore
import VueSelect from 'vue-select'

// importing VueSelect in script setup leads to an anomymousstub in unit tests
export default { components: { VueSelect } }
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-select {
    @apply py-[1px] normal-case;
  }
}
</style>
<style lang="scss">
.vs--disabled {
  cursor: not-allowed;

  .vs__clear,
  .vs__dropdown-toggle,
  .vs__open-indicator,
  .vs__search,
  .vs__selected {
    background-color: var(--oc-role-surface-container) !important;
    color: var(--oc-role-on-surface) !important;
    pointer-events: none;
  }

  .vs__actions {
    opacity: 0.3;
  }
}

.oc-select {
  color: var(--oc-role-on-surface);

  &-position-fixed {
    .vs__dropdown-menu {
      position: fixed;
      overflow-y: auto;
    }
  }

  // overwrite vue-select styles
  .vs {
    &__search {
      color: var(--oc-role-on-surface);
    }

    &__search::placeholder,
    &__dropdown-toggle,
    &__dropdown-menu {
      -webkit-appearance: none;
      color: var(--oc-role-on-surface);
      background-color: var(--oc-role-surface);
      border-radius: var(--radius-sm);
      border: 1px solid var(--oc-role-outline);
      box-sizing: border-box;
      line-height: inherit;
      max-width: 100%;
      outline: none;
      padding: 2px;
      transition-duration: 0.2s;
      transition-timing-function: ease-in-out;
      transition-property: color, background-color;
      width: 100%;
      background-color: var(--oc-role-surface);
      margin-top: -1px;
    }

    &__selected-readonly {
      background-color: var(--oc-role-surface-container-low) !important;
    }

    &__search,
    &__search:focus {
      padding: 0 5px;
    }

    &__clear,
    &__open-indicator,
    &__deselect {
      fill: var(--oc-role-on-surface);
    }

    &__dropdown-option,
    &__no-options {
      color: var(--oc-role-on-surface);
      white-space: normal;
      padding: 6px 0.6rem;
      border-radius: var(--radius-sm);

      &--highlight,
      &--selected {
        background-color: var(--oc-role-surface-container);
        color: var(--oc-role-on-surface);
      }

      &--selected {
        background-color: var(--oc-role-secondary-container);
      }
    }

    &__actions {
      flex-flow: row wrap;
      justify-content: center;
      gap: var(--oc-space-xsmall);
      cursor: pointer;
      padding: 0 4px 0 4px;

      svg {
        overflow: visible;
      }
    }

    &__clear svg {
      max-width: var(--oc-space-small);
    }

    &__selected-options {
      flex: auto;
      padding: 0;

      > * {
        padding: 0px 2px;
        margin: 2px 2px 2px 1px;
        color: var(--oc-role-on-surface);
      }

      > *:not(input) {
        padding-left: 3px;
        background-color: var(--oc-role-surface-container);
        fill: var(--oc-role-on-surface);
      }
    }
  }

  &.vs--multiple {
    .vs {
      &__selected-options > *:not(input) {
        color: var(--oc-role-on-surface);
        background-color: var(--oc-role-surface-container);
      }
    }
  }

  &:focus-within {
    .vs__dropdown-menu,
    .vs__dropdown-toggle {
      border: 1px solid var(--oc-role-surface);
      outline: 2px solid var(--oc-role-outline);
    }
  }

  .keyboard-outline {
    outline: 2px var(--oc-role-outline-variant) solid !important;
    outline-offset: -2px;
  }
}

.vs--single {
  &.vs--open .vs__selected {
    opacity: 0.8 !important;
  }

  .vs__selected-options > *:not(input) {
    background-color: transparent !important;
  }
}
</style>
