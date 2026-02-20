<template>
  <div
    v-for="floatingActionButton in floatingActionButtonExtensions"
    :key="floatingActionButton.id"
  >
    <template v-if="floatingActionButton.isActive()">
      <div v-if="!isMobile" class="py-2 px-2">
        <oc-button
          :id="getButtonId(floatingActionButton.id)"
          :disabled="floatingActionButton.isDisabled?.()"
          appearance="filled"
          class="oc-app-floating-action-button w-full"
          @click="floatingActionButton.handler?.()"
        >
          <oc-icon :name="floatingActionButton.icon" />
          <span v-text="floatingActionButton.label()" />
        </oc-button>
        <component
          :is="floatingActionButton.dropComponent"
          v-if="floatingActionButton.dropComponent"
          :toggle="`#${getButtonId(floatingActionButton.id)}`"
        />
      </div>
      <template v-else-if="!floatingActionButton.isDisabled?.()">
        <oc-floating-action-button
          :button-id="getButtonId(floatingActionButton.id)"
          class="oc-app-floating-action-button"
          mode="action"
          :handler="floatingActionButton.handler"
        />
        <component
          :is="floatingActionButton.dropComponent"
          v-if="floatingActionButton.dropComponent"
          :toggle="`#${getButtonId(floatingActionButton.id)}`"
        />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { FloatingActionButtonExtension, useExtensionRegistry } from '@opencloud-eu/web-pkg'
import { useIsMobile } from '@opencloud-eu/design-system/composables'

const { requestExtensions } = useExtensionRegistry()
const { isMobile } = useIsMobile()

const floatingActionButtonExtensions = computed(() => {
  return requestExtensions<FloatingActionButtonExtension>({
    id: 'global.floating-action-button',
    extensionType: 'floatingActionButton'
  })
})

const getButtonId = (extensionId: string): string => {
  const prefix = unref(isMobile) ? 'mobile-' : ''
  return `${prefix}app-floating-action-button-${extensionId.replace(/\./g, '-')}`
}
</script>
