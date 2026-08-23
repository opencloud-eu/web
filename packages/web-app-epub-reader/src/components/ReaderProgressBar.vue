<template>
  <div class="px-3 pb-3 pt-1">
    <div v-if="enabled" class="flex items-center gap-2">
      <div class="relative flex-1">
        <input
          :value="sliderValue"
          class="epub-reader-progress-slider oc-range bg-role-surface-container-high rounded-sm outline-0 w-full h-1.5 cursor-pointer disabled:cursor-not-allowed hover:opacity-100 appearance-none"
          :aria-label="$gettext('Reading progress')"
          type="range"
          min="0"
          max="100"
          step="0.1"
          :disabled="!enabled"
          @input="onProgressInput"
        />
      </div>
      <span
        v-oc-tooltip="progressTooltip"
        :aria-label="progressTooltip"
        class="epub-reader-progress-label min-w-[3.5rem] text-right text-xs text-role-on-surface-variant"
      >
        {{ progressLabel }}
      </span>
    </div>
    <div v-else>
      <div
        class="epub-reader-progress-shimmer relative h-[14px] w-full overflow-hidden rounded-sm bg-role-surface-container-high"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { throttle } from 'lodash-es'

const { readingProgressPercent, enabled } = defineProps<{
  readingProgressPercent: number | null
  enabled: boolean
}>()

const emit = defineEmits<{
  (e: 'seek', value: number): void
}>()

const { $gettext } = useGettext()

const sliderValue = computed(() => readingProgressPercent ?? 0)

const progressLabel = computed(() => {
  const percent = readingProgressPercent
  return percent !== null ? `${formatPercent(percent)}%` : '--'
})

const progressTooltip = computed(() =>
  $gettext('Reading progress %{progress}', { progress: progressLabel.value })
)

function parseSliderValue(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null
}

function formatPercent(value: number) {
  return Number(value.toFixed(2)).toString()
}

const throttledSeek = throttle(
  (value: number) => {
    emit('seek', value)
  },
  150,
  { leading: true, trailing: true }
)

function onProgressInput(event: Event) {
  const value = parseSliderValue(event)
  if (value !== null) {
    throttledSeek(value)
  }
}
</script>

<style scoped>
.epub-reader-progress-shimmer::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -40%;
  width: 40%;
  opacity: 0.55;
  animation: shimmer 1.25s linear infinite;
  background-image: linear-gradient(90deg, #ffffff00 0, #ffffffa8 50%, #ffffff00 100%);
}

@keyframes shimmer {
  from {
    left: -40%;
  }
  to {
    left: 100%;
  }
}

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
