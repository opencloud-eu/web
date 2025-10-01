<template>
  <component
    :is="type"
    v-bind="additionalAttributes"
    :aria-label="ariaLabel || undefined"
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
import { AppearanceType, JustifyContentType, SizeType } from '../../helpers'
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
  colorRole?:
    | 'primary'
    | 'primaryContainer'
    | 'primaryFixed'
    | 'secondary'
    | 'secondaryContainer'
    | 'secondaryFixed'
    | 'tertiary'
    | 'tertiaryContainer'
    | 'tertiaryFixed'
    | 'surface'
    | 'surfaceContainer'
    | 'chrome'
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
  type?: 'button' | 'a' | 'router-link'
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
}
</style>
<style lang="scss">
@mixin oc-button-color-role($color, $on-color) {
  &-raw,
  &-raw-inverse {
    background-color: transparent;
    color: $color;
    .oc-icon > svg {
      fill: $color;
    }

    &:focus:not([disabled]):not(button),
    &:hover:not([disabled]):not(button) {
      background-color: transparent;
    }

    &:focus:not([disabled]):not(.active):not(.no-hover),
    &:hover:not([disabled]):not(.active):not(.no-hover) {
      background-color: var(--oc-role-surface-container);
      color: var(--oc-role-on-surface);
      .oc-icon > svg {
        fill: var(--oc-role-on-surface);
      }
    }
  }
  &-raw-inverse {
    color: $on-color;
    .oc-icon > svg {
      fill: $on-color;
    }
  }

  &-filled {
    background-color: $color;
    color: $on-color !important;
    .oc-icon > svg {
      fill: $on-color;
    }
  }

  &-outline {
    outline: 1px solid $color;
    outline-offset: -1px;
    background-color: transparent;
    color: $color;
    .oc-icon > svg {
      fill: $color;
    }
  }
}

.oc-button {
  @layer components {
    &-primary {
      @include oc-button-color-role(var(--oc-role-primary), var(--oc-role-on-primary));
    }
    &-primary-container {
      @include oc-button-color-role(
        var(--oc-role-primary-container),
        var(--oc-role-on-primary-container)
      );
    }
    &-primary-fixed {
      @include oc-button-color-role(var(--oc-role-primary-fixed), var(--oc-role-on-primary-fixed));
    }
    &-secondary {
      @include oc-button-color-role(var(--oc-role-secondary), var(--oc-role-on-secondary));
    }
    &-secondary-container {
      @include oc-button-color-role(
        var(--oc-role-secondary-container),
        var(--oc-role-on-secondary-container)
      );
    }
    &-secondary-fixed {
      @include oc-button-color-role(
        var(--oc-role-secondary-fixed),
        var(--oc-role-on-secondary-fixed)
      );
    }
    &-tertiary {
      @include oc-button-color-role(var(--oc-role-tertiary), var(--oc-role-on-tertiary));
    }
    &-tertiary-container {
      @include oc-button-color-role(
        var(--oc-role-tertiary-container),
        var(--oc-role-on-tertiary-container)
      );
    }
    &-tertiary-fixed {
      @include oc-button-color-role(
        var(--oc-role-tertiary-fixed),
        var(--oc-role-on-tertiary-fixed)
      );
    }
    &-surface {
      @include oc-button-color-role(var(--oc-role-surface), var(--oc-role-on-surface));
    }
    &-surface-container {
      @include oc-button-color-role(var(--oc-role-surface-container), var(--oc-role-on-surface));
    }
    &-chrome {
      @include oc-button-color-role(var(--oc-role-chrome), var(--oc-role-on-chrome));
    }

    &:hover:not(.no-hover, .oc-button-raw-inverse, .oc-button-raw, .active, .selected, [disabled]) {
      filter: brightness(85%);
    }

    &-outline:hover:not(.no-hover, [disabled]) {
      background-color: var(--oc-role-surface-container);
      filter: none !important;
    }
  }
}
.quick-action-button,
.raw-hover-surface {
  &:hover {
    // overwrite default hover with an inverted one for buttons on backgrounds that have the default hover color
    background-color: var(--oc-role-surface) !important;
  }
}
</style>
