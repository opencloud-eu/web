<template>
  <div class="px-3 pb-3 pt-1">
    <div class="flex items-center gap-2">
      <input
        :value="readingProgressPercent ?? 0"
        class="epub-reader-progress-slider oc-range bg-role-surface-container-high rounded-sm outline-0 w-full h-1.5 cursor-pointer disabled:cursor-not-allowed hover:opacity-100 appearance-none"
        :aria-label="$gettext('Reading progress')"
        type="range"
        min="0"
        max="100"
        step="0.1"
        :disabled="!enabled"
        @change="onProgressChange"
      />
      <span
        v-oc-tooltip="progressTooltip"
        :aria-label="progressTooltip"
        class="epub-reader-progress-label min-w-[3.5rem] text-right text-xs text-role-on-surface-variant"
      >
        {{ readingProgressLabel || '--' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'

const props = defineProps<{
  readingProgressPercent: number | null
  readingProgressLabel: string | null
  enabled: boolean
}>()

const emit = defineEmits<{
  (e: 'seek', value: number): void
}>()

const { $gettext } = useGettext()

const progressTooltip = computed(() => {
  return $gettext('Reading progress %{progress}', {
    progress: props.readingProgressLabel || '--'
  })
})

function onProgressChange(event: Event) {
  const input = event.target as HTMLInputElement
  const value = Number(input.value)
  if (!Number.isFinite(value)) {
    return
  }
  emit('seek', value)
}
</script>

<style scoped>
.epub-reader-progress-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  background: var(--oc-role-on-surface);
  border-radius: 50%;
  cursor: pointer;
  height: 1rem;
  width: 1rem;
}

.epub-reader-progress-slider:disabled::-webkit-slider-thumb {
  background: var(--oc-role-on-surface-variant);
  cursor: not-allowed;
}

.epub-reader-progress-slider::-moz-range-thumb {
  background: var(--oc-role-on-surface);
  border-radius: 50%;
  border: 0;
  cursor: pointer;
  height: 1rem;
  width: 1rem;
}

.epub-reader-progress-slider:disabled::-moz-range-thumb {
  background: var(--oc-role-on-surface-variant);
  cursor: not-allowed;
}
</style>
