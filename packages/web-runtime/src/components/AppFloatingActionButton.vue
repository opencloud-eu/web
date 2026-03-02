<template>
  <template v-if="floatingActionButton">
    <div v-if="!isMobile" class="py-2 px-2">
      <oc-button
        :id="getButtonId(floatingActionButton.id)"
        :disabled="isDisabled"
        appearance="filled"
        class="oc-app-floating-action-button w-full"
        @click="floatingActionButton.handler?.()"
      >
        <oc-icon :name="floatingActionButton.icon" />
        <span v-text="floatingActionButton.label()" />
      </oc-button>
      <component
        :is="floatingActionButton.dropComponent"
        v-if="floatingActionButton.dropComponent && floatingActionButton.mode() === 'drop'"
        :toggle="`#${getButtonId(floatingActionButton.id)}`"
      />
    </div>
    <template v-else-if="!isDisabled">
      <oc-floating-action-button
        :button-id="getButtonId(floatingActionButton.id)"
        class="oc-app-floating-action-button"
        mode="action"
        :handler="floatingActionButton.handler"
      />
      <component
        :is="floatingActionButton.dropComponent"
        v-if="floatingActionButton.dropComponent && floatingActionButton.mode() === 'drop'"
        :toggle="`#${getButtonId(floatingActionButton.id)}`"
      />
    </template>
  </template>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, unref, watchEffect } from 'vue'
import { FloatingActionButtonExtension, useExtensionRegistry } from '@opencloud-eu/web-pkg'
import { useIsMobile } from '@opencloud-eu/design-system/composables'

const { requestExtensions } = useExtensionRegistry()
const { isMobile } = useIsMobile()

const isDisabled = ref(false)

const floatingActionButton = computed(() => {
  return requestExtensions<FloatingActionButtonExtension>({
    id: 'global.floating-action-button',
    extensionType: 'floatingActionButton'
  }).find(({ isActive }) => isActive())
})

const getButtonId = (extensionId: string): string => {
  const prefix = unref(isMobile) ? 'mobile-' : ''
  return `${prefix}app-floating-action-button-${extensionId.replace(/\./g, '-')}`
}

let timeoutId: ReturnType<typeof setTimeout> | null = null

// use a timeout to avoid flickering of the button in case the isDisabled state changes rapidly
watchEffect(() => {
  const disabled = unref(floatingActionButton)?.isDisabled?.() ?? false
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
  timeoutId = setTimeout(() => {
    isDisabled.value = disabled
    timeoutId = null
  }, 50)
})

onBeforeUnmount(() => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
})
</script>
