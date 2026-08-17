<template>
  <span
    v-oc-tooltip="showTooltip ? tooltip : undefined"
    class="motion-photo-badge inline-flex items-center justify-center text-white"
    :class="[
      resolvedSizeClass,
      { 'pointer-events-none': !interactive, 'cursor-pointer': interactive }
    ]"
    :aria-label="tooltip"
    :role="interactive ? 'button' : 'img'"
    data-testid="motion-photo-badge"
  >
    <!-- MDI motion-play/pause-outline geometry; the dot is a separate <g> so it
         can orbit the ring as a buffer indicator while loading -->

    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      class="motion-photo-badge-glyph size-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]"
    >
      <path :d="basePath" />
      <g
        class="motion-photo-badge-orbit"
        :class="{ 'motion-photo-badge-orbit--spinning': loading }"
      >
        <path :d="DOT" />
      </g>
    </svg>
    <!-- enlarge the tap target on touch (coarse pointer) devices only; desktop
         keeps the small badge as the exact hit area -->
    <span
      v-if="interactive"
      class="absolute -inset-3 hidden pointer-coarse:block"
      aria-hidden="true"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { SizeType } from '@opencloud-eu/design-system/helpers'

// MDI motion-*-outline sub-paths (viewBox 0 0 24 24)
const RING =
  'M22 12C22 6.46 17.54 2 12 2C10.83 2 9.7 2.19 8.62 2.56L9.32 4.5C10.17 4.16 11.06 3.97 12 3.97C16.41 3.97 20.03 7.59 20.03 12C20.03 16.41 16.41 20.03 12 20.03C7.59 20.03 3.97 16.41 3.97 12C3.97 11.06 4.16 10.12 4.5 9.28L2.56 8.62C2.19 9.7 2 10.83 2 12C2 17.54 6.46 22 12 22C17.54 22 22 17.54 22 12'
const PLAY = 'M10 16.5L16 12L10 7.5'
const PAUSE = 'M9 9H11V15H9M13 9H15V15H13'
const DOT =
  'M5.47 3.97C6.32 3.97 7 4.68 7 5.47C7 6.32 6.32 7 5.47 7C4.68 7 3.97 6.32 3.97 5.47C3.97 4.68 4.68 3.97 5.47 3.97Z'

const {
  size = 'small',
  interactive = false,
  loading = false,
  icon = 'play-circle',
  label: labelProp
} = defineProps<{
  /** Size of the glyph (mirrors OcIcon's SizeType, same tailwind size classes). */
  size?: SizeType
  /**
   * When true the badge is meant to be clicked (e.g. as a play/pause trigger)
   * and keeps pointer events. Passive indicators leave this false so they never
   * intercept clicks on the underlying resource.
   */
  interactive?: boolean
  /** While true the motion dot orbits the ring as a buffer/progress indicator. */
  loading?: boolean
  /** Glyph, e.g. 'play-circle' or 'pause-circle' (only the play/pause part is used). */
  icon?: string
  /** Accessible label / tooltip. Defaults to "Motion photo". */
  label?: string
}>()

const isPause = computed(() => icon.includes('pause'))
const basePath = computed(() => `${isPause.value ? PAUSE : PLAY}${RING}`)

// mirror OcIcon's SizeType -> tailwind size mapping so the badge matches the
// app's icon sizes exactly (same classes OcIcon applies)
const SIZE_MAP: Record<SizeType, string> = {
  xsmall: 'size-3',
  small: 'size-4',
  medium: 'size-5',
  large: 'size-8',
  xlarge: 'size-12',
  xxlarge: 'size-22',
  xxxlarge: 'size-42'
}
const resolvedSizeClass = computed(() => SIZE_MAP[size])

const { $gettext } = useGettext()
const label = computed(() => labelProp ?? $gettext('Motion photo'))
const tooltip = computed(() => (loading ? $gettext('Loading motion photo') : label.value))
const showTooltip = computed(() => !interactive)
</script>

<style scoped>
.motion-photo-badge-orbit {
  transform-box: view-box;
  transform-origin: 12px 12px;
}

.motion-photo-badge-orbit--spinning {
  animation: motion-photo-badge-orbit 0.8s linear infinite;
}

@keyframes motion-photo-badge-orbit {
  to {
    transform: rotate(360deg);
  }
}
</style>
