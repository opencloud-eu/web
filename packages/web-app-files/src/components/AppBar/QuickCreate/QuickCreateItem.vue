<template>
  <!-- wrapper keeps the tooltip working on disabled buttons -->
  <div v-oc-tooltip="tooltip" class="quick-create-item flex min-w-0">
    <oc-button
      :id="action.id"
      :type="componentType"
      :to="route"
      :href="href"
      class="w-full min-w-0"
      :class="[
        action.class,
        action.ext ? `quick-create-item-${action.ext}` : null,
        { 'outline-role-outline-variant': appearance === 'outline' }
      ]"
      :appearance="appearance"
      :justify-content="iconOnly ? 'center' : 'left'"
      gap-size="small"
      :disabled="isDisabled"
      :aria-label="iconOnly ? label : undefined"
      v-on="listeners"
    >
      <oc-icon name="add" fill-type="line" size="small" class="shrink-0" />
      <resource-icon v-if="action.ext" :resource="iconResource" class="shrink-0" />
      <oc-icon v-else :icon="icon" :fill-type="action.iconFillType || 'line'" class="shrink-0" />
      <!-- kept invisible in icon only mode so the button height doesn't change with the mode -->
      <span
        class="quick-create-item-text flex min-w-0 flex-col text-start leading-tight"
        :class="{ 'invisible -ml-1 w-0 overflow-hidden': iconOnly }"
        :aria-hidden="iconOnly ? 'true' : undefined"
      >
        <span class="truncate" v-text="label" />
        <span
          v-if="description"
          class="quick-create-item-description truncate text-xs text-role-on-surface-variant"
          v-text="description"
        />
      </span>
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { FileAction, ResourceIcon } from '@opencloud-eu/web-pkg'
import { AppearanceType } from '@opencloud-eu/design-system/helpers'

const {
  action,
  space,
  iconOnly = false,
  appearance = 'outline'
} = defineProps<{
  action: FileAction
  space: SpaceResource
  iconOnly?: boolean
  appearance?: AppearanceType
}>()

const label = computed(() => action.label({ space }))

const description = computed(() => action.description?.({ space }))

const isDisabled = computed(() => action.isDisabled?.({ space }) ?? false)

const tooltip = computed(() => {
  if (unref(isDisabled) && action.disabledTooltip) {
    return action.disabledTooltip({ space })
  }
  return iconOnly ? unref(label) : null
})

const icon = computed(() =>
  typeof action.icon === 'function' ? action.icon({ space }) : action.icon
)

const route = computed(() => action.route?.({ space }))
const href = computed(() => action.href?.({ space }))

const componentType = computed(() => {
  if (unref(route)) {
    return 'router-link'
  }
  return unref(href) ? 'a' : 'button'
})

const listeners = computed(() => {
  if (typeof action.handler !== 'function') {
    return {}
  }
  return { click: () => action.handler({ space }) }
})

const iconResource = computed(() => ({ type: 'file', extension: action.ext }) as Resource)
</script>
