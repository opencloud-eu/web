<template>
  <div class="px-3 pb-3 pt-1">
    <div v-if="enabled" class="flex items-center gap-2">
      <div class="relative flex-1">
        <oc-range
          :model-value="sliderValue"
          :label="$gettext('Reading progress')"
          hide-label
          class="epub-reader-progress-slider"
          :min="0"
          :max="100"
          :step="0.1"
          @update:model-value="onProgressInput"
          @change="onProgressChange"
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
import { computed, ref, unref, watch } from 'vue'
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

/**
 * While dragging, the slider position is owned locally. Seeking is live, so the parent keeps
 * reporting the position it already rendered, which would otherwise drag the thumb away from
 * the pointer on every relocation.
 */
const dragValue = ref<number | null>(null)
const isDragging = ref(false)

const sliderValue = computed(() => unref(dragValue) ?? readingProgressPercent ?? 0)

const progressLabel = computed(() => {
  const percent = readingProgressPercent
  return percent !== null ? `${formatPercent(percent)}%` : '--'
})

const progressTooltip = computed(() =>
  $gettext('Reading progress %{progress}', { progress: progressLabel.value })
)

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, value))
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

function onProgressInput(sliderValue: number) {
  const value = clampProgress(sliderValue)

  isDragging.value = true
  dragValue.value = value
  throttledSeek(value)
}

function onProgressChange(sliderValue: number) {
  const value = clampProgress(sliderValue)

  isDragging.value = false
  dragValue.value = value
  throttledSeek.cancel()
  emit('seek', value)
}

// Hand the slider position back to the parent once it reports the sought location.
watch(
  () => readingProgressPercent,
  () => {
    if (!unref(isDragging)) {
      dragValue.value = null
    }
  }
)

watch(
  () => enabled,
  (isEnabled) => {
    if (!isEnabled) {
      isDragging.value = false
      dragValue.value = null
    }
  }
)
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
</style>
