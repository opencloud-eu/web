<template>
  <component
    :is="type"
    v-bind="additionalAttributes"
    :aria-label="ariaLabel"
    :class="[
      `oc-button-${kebabCase(colorRole)}`,
      `oc-button-${appearance}`,
      `oc-button-${kebabCase(colorRole)}-${appearance}`,
      {
        ...getTailwindGapClass(gapSize),
        ...getTailwindJustifyContentClass(justifyContent),
        // size
        'text-sm min-h-3': size === 'small',
        'text-base min-h-4': size === 'medium',
        'text-lg min-h-7': size === 'large',
        // hover
        'no-hover': noHover
      }
    ]"
    class="oc-button cursor-pointer disabled:opacity-60 disabled:cursor-default"
    v-on="handlers"
  >
    <oc-spinner v-if="showSpinner" size="small" class="spinner" />
    <!-- @slot Content of the button -->
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouteLocationRaw } from 'vue-router'
import { ColorRoleType, AppearanceType, JustifyContentType, SizeType } from '../../helpers'
import { kebabCase } from 'lodash-es'
import { getTailwindGapClass, getTailwindJustifyContentClass } from '../../helpers/tailwind'

export interface Props {
  /**
   * @docs The appearance of the button.
   * @default outline
   */
  appearance?: AppearanceType
  /**
   * @docs The aria label of the button. Needs to be present if the button doesn't have a visible label.
   */
  ariaLabel?: string
  /**
   * @docs Material design color role.
   * @default secondary
   */
  colorRole?: ColorRoleType
  /**
   * @docs Determines if the button is disabled.
   * @default false
   */
  disabled?: boolean
  /**
   * @docs The gap size between content elements of the button.
   * @default medium
   */
  gapSize?: SizeType | 'none'
  /**
   * @docs The href if the `type` is set to `a'.
   */
  href?: string
  /**
   * @docs The alignment of the button content.
   * @default center
   */
  justifyContent?: JustifyContentType
  /**
   * @docs Determines if a spinner should be shown inside the button.
   * @default false
   */
  showSpinner?: boolean
  /**
   * @docs The size of the button.
   * @default medium
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * @docs The type of the button element. Only takes effect if the `type` is set to `button`.
   * @default button
   */
  submit?: 'null' | 'button' | 'submit' | 'reset'
  /**
   * @docs The target of the button if the `type` is set to `a`.
   */
  target?: '_blank' | '_self' | '_parent' | '_top'
  /**
   * @docs The route location if the `type` is set to `router-link`.
   */
  to?: RouteLocationRaw
  /**
   * @docs The type of the button element.
   * @default button
   */
  type?: 'button' | 'a' | 'router-link' | 'nuxt-link'
  /**
   * @docs Determines if the button should have no hover effect.
   * @default false
   */
  noHover?: boolean
}

export interface Emits {
  /**
   * @docs Emitted when the button has been clicked.
   */
  (e: 'click', event: MouseEvent): void
}

export interface Slots {
  /**
   * @docs Button content.
   */
  default?: () => unknown
}

const {
  appearance = 'outline',
  ariaLabel,
  colorRole = 'secondary',
  disabled = false,
  gapSize = 'medium',
  href,
  justifyContent = 'center',
  showSpinner = false,
  size = 'medium',
  submit = 'button',
  target,
  to,
  type = 'button',
  noHover = false
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const additionalAttributes = computed(() => {
  return {
    ...(href && { href }),
    ...(target && { target }),
    ...(to && { to }),
    ...(type === 'button' && { type: submit }),
    ...(type === 'button' && { disabled })
  }
})

const handlers = computed(() => {
  return {
    ...(type === 'button' && { click: onClick })
  }
})

const onClick = (event: MouseEvent) => {
  emit('click', event)
}
</script>

<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-button:not(.oc-button-raw, .oc-button-raw-inverse) {
    @apply py-1.5 px-2.5;
  }
  .oc-button {
    @apply rounded-sm items-center inline-flex;
  }
  .oc-button-group {
    @apply inline-flex flex-row flex-wrap rounded-sm outline outline-role-secondary outline-offset-[-1px];
  }
  .oc-button-group .oc-button {
    @apply rounded-none first:rounded-l-sm last:rounded-r-sm outline-0;
  }

  /* The color role classes only map their two role colors onto these custom properties,
     the appearance rules below consume them. Defaults live on `.oc-button` so a button
     never inherits the colors of a surrounding button. */
  .oc-button {
    --oc-button-color: var(--oc-role-secondary);
    --oc-button-on-color: var(--oc-role-on-secondary);
  }

  .oc-button-primary {
    --oc-button-color: var(--oc-role-primary);
    --oc-button-on-color: var(--oc-role-on-primary);
  }
  .oc-button-primary-container {
    --oc-button-color: var(--oc-role-primary-container);
    --oc-button-on-color: var(--oc-role-on-primary-container);
  }
  .oc-button-primary-fixed {
    --oc-button-color: var(--oc-role-primary-fixed);
    --oc-button-on-color: var(--oc-role-on-primary-fixed);
  }
  .oc-button-secondary {
    --oc-button-color: var(--oc-role-secondary);
    --oc-button-on-color: var(--oc-role-on-secondary);
  }
  .oc-button-secondary-container {
    --oc-button-color: var(--oc-role-secondary-container);
    --oc-button-on-color: var(--oc-role-on-secondary-container);
  }
  .oc-button-secondary-fixed {
    --oc-button-color: var(--oc-role-secondary-fixed);
    --oc-button-on-color: var(--oc-role-on-secondary-fixed);
  }
  .oc-button-tertiary {
    --oc-button-color: var(--oc-role-tertiary);
    --oc-button-on-color: var(--oc-role-on-tertiary);
  }
  .oc-button-tertiary-container {
    --oc-button-color: var(--oc-role-tertiary-container);
    --oc-button-on-color: var(--oc-role-on-tertiary-container);
  }
  .oc-button-tertiary-fixed {
    --oc-button-color: var(--oc-role-tertiary-fixed);
    --oc-button-on-color: var(--oc-role-on-tertiary-fixed);
  }
  .oc-button-surface {
    --oc-button-color: var(--oc-role-surface);
    --oc-button-on-color: var(--oc-role-on-surface);
  }
  .oc-button-surface-container {
    --oc-button-color: var(--oc-role-surface-container);
    --oc-button-on-color: var(--oc-role-on-surface);
  }
  .oc-button-chrome {
    --oc-button-color: var(--oc-role-chrome);
    --oc-button-on-color: var(--oc-role-on-chrome);
  }

  :is(.oc-button-raw, .oc-button-raw-inverse) {
    background-color: transparent;
    color: var(--oc-button-color);
  }
  :is(.oc-button-raw, .oc-button-raw-inverse) .oc-icon > svg {
    fill: var(--oc-button-color);
  }
  :is(.oc-button-raw, .oc-button-raw-inverse):focus:not([disabled]):not(button),
  :is(.oc-button-raw, .oc-button-raw-inverse):hover:not([disabled]):not(button) {
    background-color: transparent;
  }
  :is(.oc-button-raw, .oc-button-raw-inverse):focus:not([disabled]):not(.active):not(.no-hover),
  :is(.oc-button-raw, .oc-button-raw-inverse):hover:not([disabled]):not(.active):not(.no-hover) {
    background-color: var(--oc-role-surface-container);
    color: var(--oc-role-on-surface);
  }
  :is(.oc-button-raw, .oc-button-raw-inverse):focus:not([disabled]):not(.active):not(.no-hover)
    .oc-icon
    > svg,
  :is(.oc-button-raw, .oc-button-raw-inverse):hover:not([disabled]):not(.active):not(.no-hover)
    .oc-icon
    > svg {
    fill: var(--oc-role-on-surface);
  }

  .oc-button-raw-inverse {
    color: var(--oc-button-on-color);
  }
  .oc-button-raw-inverse .oc-icon > svg {
    fill: var(--oc-button-on-color);
  }

  .oc-button-filled {
    background-color: var(--oc-button-color);
    color: var(--oc-button-on-color) !important;
  }
  .oc-button-filled .oc-icon > svg {
    fill: var(--oc-button-on-color);
  }

  .oc-button-outline {
    outline: 1px solid var(--oc-button-color);
    outline-offset: -1px;
    background-color: transparent;
    color: var(--oc-button-color);
  }
  .oc-button-outline .oc-icon > svg {
    fill: var(--oc-button-color);
  }

  .oc-button:hover:not(
      .no-hover,
      .oc-button-raw-inverse,
      .oc-button-raw,
      .active,
      .selected,
      [disabled]
    ) {
    filter: brightness(85%);
  }

  .oc-button-outline:hover:not(.no-hover, [disabled]) {
    color: var(--oc-role-on-surface);
    background-color: var(--oc-role-surface-container);
    filter: none !important;
  }
}

/* overwrite default hover with an inverted one for buttons on backgrounds that have the default hover color */
.quick-action-button:hover,
.raw-hover-surface:hover {
  background-color: var(--oc-role-surface) !important;
}
</style>
