<template>
  <div ref="root" class="pdf-viewer-tool-settings flex flex-col gap-3">
    <template v-for="setting in settings" :key="setting.id">
      <oc-color-input
        v-if="setting.type === 'color'"
        :class="`pdf-viewer-${setting.id}`"
        class="w-full! [&_.oc-color-input]:border-role-outline!"
        :label="setting.label"
        :model-value="values[setting.id] as string"
        :clear-button-enabled="false"
        @update:model-value="emit('update', setting.paramType, $event)"
      />
      <fieldset v-else-if="setting.type === 'swatches'" :class="`pdf-viewer-${setting.id}`">
        <legend class="mb-2" v-text="setting.label" />
        <div class="flex gap-2">
          <oc-button
            v-for="option in setting.options"
            :key="option.value"
            v-oc-tooltip="option.label"
            appearance="raw"
            no-hover
            class="pdf-viewer-swatch size-7 rounded-full! border-2 forced-colors:[forced-color-adjust:none]"
            :class="
              isSelected(setting, option.value)
                ? 'border-role-on-surface forced-colors:border-[CanvasText] forced-colors:outline-2 forced-colors:outline-offset-2 forced-colors:outline-[Highlight]'
                : 'border-role-outline forced-colors:border-[GrayText]'
            "
            :style="{ backgroundColor: option.value }"
            :aria-label="option.label"
            :aria-pressed="isSelected(setting, option.value)"
            @click="emit('update', setting.paramType, option.value)"
          />
        </div>
      </fieldset>
      <oc-switch
        v-else-if="setting.type === 'switch'"
        :class="`pdf-viewer-${setting.id}`"
        class="flex justify-between border-t border-role-border pt-3"
        :label="setting.label"
        :checked="!!values[setting.id]"
        @update:checked="updateSwitch(setting, $event)"
      />
      <oc-range
        v-else
        :class="[`pdf-viewer-${setting.id}`, { 'opacity-50': setting.disabled }]"
        :label="setting.label"
        :min="setting.min"
        :max="setting.max"
        :step="setting.step"
        :disabled="setting.disabled"
        :model-value="values[setting.id] as number"
        input-class="bg-role-outline-variant"
        @update:model-value="emit('update', setting.paramType, $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { nextTick, unref, useTemplateRef } from 'vue'
import { until } from '@vueuse/core'
import type { ToolSetting, ToolSettingValue } from '../composables/usePdfAnnotationTools'

const { settings, values } = defineProps<{
  settings: ToolSetting[]
  values: Record<string, ToolSettingValue>
}>()

const emit = defineEmits<{ update: [paramType: number, value: ToolSettingValue] }>()

const root = useTemplateRef<HTMLElement>('root')

// OcSwitch renders its button anew on every change (keyed by its state), which loses the focus.
async function updateSwitch(setting: ToolSetting, value: boolean) {
  emit('update', setting.paramType, value)
  await until(() => values[setting.id]).toBe(value, { timeout: 1000 })
  await nextTick()
  unref(root)?.querySelector<HTMLElement>(`.pdf-viewer-${setting.id} button`)?.focus()
}

function isSelected(setting: ToolSetting, value: string) {
  return String(values[setting.id]).toLowerCase() === value.toLowerCase()
}
</script>
