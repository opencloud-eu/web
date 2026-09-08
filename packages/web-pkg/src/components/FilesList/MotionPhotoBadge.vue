<template>
  <component
    :is="interactive ? 'button' : 'span'"
    v-oc-tooltip="showTooltip ? tooltip : undefined"
    class="motion-photo-badge inline-flex items-center justify-center text-white"
    :class="[
      sizeClass,
      {
        'pointer-events-none': !interactive,
        'cursor-pointer': interactive,
        'opacity-50': muted
      }
    ]"
    :type="interactive ? 'button' : undefined"
    :role="interactive ? undefined : 'img'"
    :aria-label="tooltip"
    data-testid="motion-photo-badge"
  >
    <oc-icon
      :name="isPause ? 'motion-pause' : 'motion-play'"
      fill-type="line"
      :size-class="sizeClass"
      class="motion-photo-badge-glyph drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]"
      :class="{ 'motion-photo-badge-glyph--loading': loading }"
    />
    <span
      v-if="interactive"
      class="absolute -inset-3 hidden pointer-coarse:block"
      aria-hidden="true"
    />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'

const {
  sizeClass = 'size-4',
  interactive = false,
  muted = false,
  loading = false,
  icon = 'play-circle',
  label: labelProp
} = defineProps<{
  sizeClass?: string
  interactive?: boolean
  muted?: boolean
  loading?: boolean
  icon?: string
  label?: string
}>()

const isPause = computed(() => icon.includes('pause'))

const { $gettext } = useGettext()
const label = computed(() => labelProp ?? $gettext('Motion photo'))
const tooltip = computed(() => (loading ? $gettext('Loading motion photo') : label.value))
const showTooltip = computed(() => !interactive)
</script>

<style scoped>
/* the icon's dot (separate <g> in the svg) orbits the ring while loading */
.motion-photo-badge-glyph :deep(.motion-dot) {
  transform-box: view-box;
  transform-origin: 12px 12px;
}

.motion-photo-badge-glyph--loading :deep(.motion-dot) {
  animation: motion-photo-badge-orbit 0.8s linear infinite;
}

@keyframes motion-photo-badge-orbit {
  to {
    transform: rotate(360deg);
  }
}
</style>
