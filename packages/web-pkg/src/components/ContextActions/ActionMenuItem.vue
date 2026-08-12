<template>
  <li v-oc-tooltip="componentProps.disabled ? action.disabledTooltip?.(actionOptions) : ''">
    <oc-button
      v-oc-tooltip="showTooltip || action.hideLabel ? action.label(actionOptions) : ''"
      :type="componentType"
      v-bind="componentProps"
      :class="[action.class, 'action-menu-item', 'align-middle', 'w-full', ...buttonClasses]"
      :aria-label="
        componentProps.disabled
          ? (action.disabledTooltip?.(actionOptions) ?? action.label(actionOptions))
          : action.label(actionOptions)
      "
      data-testid="action-handler"
      :size="size"
      justify-content="left"
      v-on="componentListeners"
    >
      <oc-image
        v-if="action.img"
        data-testid="action-img"
        :src="action.img"
        alt=""
        class="oc-icon oc-icon-m w-[22px]"
      />
      <oc-image
        v-else-if="hasExternalImageIcon"
        data-testid="action-img"
        :src="actionIcon"
        alt=""
        class="oc-icon oc-icon-m w-[22px]"
      />
      <oc-icon
        v-else-if="actionIcon"
        data-testid="action-icon"
        :name="actionIcon"
        :fill-type="action.iconFillType || 'line'"
        :size="size"
      />
      <span
        v-if="!action.hideLabel"
        class="oc-files-context-action-label flex flex-col"
        data-testid="action-label"
      >
        <span class="text-left" v-text="action.label(actionOptions)" />
      </span>
      <span
        v-if="action.shortcut && shortcutHint"
        class="text-sm flex-row-reverse"
        v-text="action.shortcut"
      />
    </oc-button>
  </li>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { Action, ActionOptions, useConfigStore } from '../../composables'
import { storeToRefs } from 'pinia'
import { AppearanceType } from '@opencloud-eu/design-system/helpers'

const {
  action,
  actionOptions,
  size = 'medium',
  appearance = 'raw',
  shortcutHint = true,
  showTooltip = false,
  buttonClasses = []
} = defineProps<{
  action: Action
  actionOptions: ActionOptions
  size?: 'small' | 'medium' | 'large'
  appearance?: AppearanceType
  shortcutHint?: boolean
  showTooltip?: boolean
  buttonClasses?: string[]
}>()

const configStore = useConfigStore()
const { options } = storeToRefs(configStore)

const componentType = computed<'a' | 'button' | 'router-link'>(() => {
  if (Object.hasOwn(action, 'route')) {
    return 'router-link'
  }
  if (Object.hasOwn(action, 'href')) {
    return 'a'
  }
  if (Object.hasOwn(action, 'handler')) {
    return 'button'
  }
  console.warn('ActionMenuItem: No handler, route or href callback found in action', action)
  return 'button'
})

const componentProps = computed(() => {
  const properties = {
    appearance: action.appearance || appearance,
    ...(action.isDisabled && {
      disabled: action.isDisabled(actionOptions)
    }),
    ...(action.id && { id: action.id })
  }

  return {
    ...properties,
    ...(unref(componentType) === 'router-link' && {
      to: action.route(actionOptions)
    }),
    ...(unref(componentType) === 'a' && {
      href: action.href(actionOptions)
    }),
    ...(['router-link', 'a'].includes(unref(componentType)) && {
      target: options.value.openFilesInNewTab ? ('_blank' as const) : ('_self' as const)
    })
  }
})

const actionIcon = computed(() => {
  return typeof action.icon === 'function' ? action.icon(actionOptions) : action.icon
})

const hasExternalImageIcon = computed(() => {
  return actionIcon.value && /^https?:\/\//i.test(actionIcon.value)
})

const componentListeners = computed(() => {
  if (typeof action.handler !== 'function') {
    return {}
  }

  const callback = () => action.handler({ ...actionOptions })
  if (action.keepOpen) {
    return {
      click: (event: Event) => {
        event.stopPropagation()
        callback()
      }
    }
  }
  return {
    click: callback
  }
})
</script>
