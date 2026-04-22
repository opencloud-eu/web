<template>
  <template v-if="floatingActionButton && isMobile && !floatingActionButton?.isDisabled?.()">
    <oc-floating-action-button
      :button-id="getButtonId(floatingActionButton.id)"
      class="oc-app-floating-action-button"
      mode="action"
      :handler="floatingActionButton.handler"
    />
    <template v-if="floatingActionButton.dropComponent && floatingActionButton.mode() === 'drop'">
      <component
        :is="floatingActionButton.dropComponent"
        :toggle="`#${getButtonId(floatingActionButton.id)}`"
      />
    </template>
  </template>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import {
  FloatingActionButtonExtension,
  useActiveApp,
  useExtensionRegistry
} from '@opencloud-eu/web-pkg'
import { useIsMobile } from '@opencloud-eu/design-system/composables'

const { requestExtensions } = useExtensionRegistry()
const { isMobile } = useIsMobile({ includeTablet: true })
const activeApp = useActiveApp()

const floatingActionButton = computed(() => {
  return requestExtensions<FloatingActionButtonExtension>({
    id: `app.${unref(activeApp)}.floating-action-button`,
    extensionType: 'floatingActionButton'
  }).find(({ isVisible }) => !isVisible || isVisible())
})

function getButtonId(extensionId: string): string {
  return `mobile-app-floating-action-button-${extensionId.replace(/\./g, '-')}`
}
</script>
