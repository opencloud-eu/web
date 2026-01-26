<template>
  <dialog
    class="oc-bottom-drawer fixed inset-0 bg-black/40 size-full"
    :open="isDrawerActive"
    @click="$emit('clicked', $event)"
  >
    <focus-trap :active="isFocusTrapActive">
      <div
        :id="id"
        tabindex="-1"
        class="fixed inset-x-0 rounded-t-xl w-full overflow-y-auto transition-all duration-200 -bottom-full overflow-x-hidden"
        :class="[
          {
            '[&.active]:bottom-0': isDrawerActive,
            'h-full': hasFullHeight
          },
          maxHeight
        ]"
      >
        <slot />
      </div>
    </focus-trap>
  </dialog>
</template>

<script setup lang="ts">
import { FocusTrap } from 'focus-trap-vue'
import { nextTick, watch } from 'vue'

export interface Props {
  /**
   * @docs The DOM ID of the bottom drawer element.
   */
  id: string
  /**
   * @docs Determines if the bottom drawer is active and should be displayed.
   * @default true
   */
  isDrawerActive?: boolean
  /**
   * @docs Determines if the focus is trapped within the bottom drawer when it's active.
   * @default true
   */
  isFocusTrapActive?: boolean
  /**
   * @docs Determines if the bottom drawer should take the full height of the given viewport.
   * @default false
   */
  hasFullHeight?: boolean
  /**
   * @docs The maximum height of the bottom drawer element, given as a Tailwind CSS class.
   * @default 'max-h-[66vh]'
   */
  maxHeight?: string
}

const {
  id,
  isDrawerActive = true,
  isFocusTrapActive = true,
  hasFullHeight = false,
  maxHeight = 'max-h-[66vh]'
} = defineProps<Props>()

export interface Emits {
  /**
   * @docs Emitted when the bottom drawer or its background is clicked.
   */
  (e: 'clicked', event: MouseEvent): void
}

defineEmits<Emits>()

export interface Slots {
  /**
   * @docs Bottom drawer content.
   */
  default?: () => unknown
}

defineSlots<Slots>()

watch(
  () => isDrawerActive,
  async () => {
    if (isDrawerActive) {
      await nextTick()
      const drawerEl = document.getElementById(id)
      drawerEl?.classList.add('active')
    }
  },
  { immediate: true }
)
</script>
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-bottom-drawer {
    @apply z-100;
  }
}
</style>
