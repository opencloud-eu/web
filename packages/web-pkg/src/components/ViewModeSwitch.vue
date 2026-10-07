<template>
  <template v-if="isMobile">
    <oc-button
      id="viewmode-switch-toggle"
      v-oc-tooltip="$gettext('Switch view mode')"
      :aria-label="$gettext('Switch view mode')"
      appearance="raw"
      class="my-2 mx-1 p-1 align-middle"
    >
      <oc-icon v-if="activeViewMode" :icon="activeViewMode.icon" />
    </oc-button>
    <oc-drop
      :title="$gettext('View mode')"
      drop-id="viewmode-switch-drop"
      toggle="#viewmode-switch-toggle"
      class="w-auto"
      padding-size="small"
      close-on-click
    >
      <oc-list>
        <li v-for="viewMode in viewModes" :key="viewMode.name">
          <oc-button
            :appearance="currentViewMode === viewMode.name ? 'filled' : 'raw'"
            :color-role="currentViewMode === viewMode.name ? 'secondaryContainer' : 'secondary'"
            :no-hover="currentViewMode === viewMode.name"
            :class="[viewMode.name]"
            justify-content="left"
            class="p-1.5"
            @click="emit('select', viewMode)"
          >
            <div class="flex justify-between w-full">
              <span class="flex items-center gap-2">
                <oc-icon :icon="viewMode.icon" size-class="size-5" />
                <span v-text="$gettext(viewMode.label)" />
              </span>
              <oc-icon
                v-if="currentViewMode === viewMode.name"
                name="check"
                size-class="size-5"
                class="ml-1"
              />
            </div>
          </oc-button>
        </li>
      </oc-list>
    </oc-drop>
  </template>
  <div
    v-else
    id="viewmode-switch"
    class="oc-button-group my-2 mx-1"
    role="group"
    :aria-label="$gettext('View mode')"
  >
    <oc-button
      v-for="viewMode in viewModes"
      :key="viewMode.name"
      v-oc-tooltip="$gettext(viewMode.label)"
      :aria-label="$gettext(viewMode.label)"
      :aria-pressed="currentViewMode === viewMode.name"
      :appearance="currentViewMode === viewMode.name ? 'filled' : 'raw'"
      :color-role="currentViewMode === viewMode.name ? 'secondaryContainer' : 'secondary'"
      :no-hover="currentViewMode === viewMode.name"
      :class="[viewMode.name]"
      class="p-1"
      @click="emit('select', viewMode)"
    >
      <oc-icon :icon="viewMode.icon" />
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import { FolderView } from '../ui/types'

const { viewModes, currentViewMode } = defineProps<{
  viewModes: FolderView[]
  currentViewMode: string
}>()

const emit = defineEmits<{
  (e: 'select', viewMode: FolderView): void
}>()

const { isMobile } = useIsMobile()

const activeViewMode = computed(() => {
  return viewModes.find((viewMode) => viewMode.name === currentViewMode)
})
</script>
