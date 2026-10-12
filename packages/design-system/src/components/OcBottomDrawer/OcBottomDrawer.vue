<template>
  <dialog
    ref="dialog"
    class="oc-bottom-drawer fixed inset-0 m-0 border-0 p-0 max-w-none max-h-none bg-black/40 size-full"
    :aria-label="accessibleName"
    @click="$emit('clicked', $event)"
    @cancel.prevent="$emit('close', $event)"
    @close="isDrawerActive && $emit('close', $event)"
  >
    <focus-trap :active="isFocusTrapActive">
      <div
        :id="id"
        tabindex="-1"
        autofocus
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
import { computed, nextTick, unref, useTemplateRef, watch } from 'vue'
import { useGettext } from 'vue3-gettext'

export interface Props {
  /**
   * @docs The DOM ID of the bottom drawer element.
   */
  id: string
  /**
   * @docs The accessible name announced when the bottom drawer opens.
   */
  ariaLabel?: string
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
  ariaLabel = '',
  isDrawerActive = true,
  isFocusTrapActive = true,
  hasFullHeight = false,
  maxHeight = 'max-h-[66vh]'
} = defineProps<Props>()

const { $gettext } = useGettext()
const accessibleName = computed(() => ariaLabel || $gettext('Bottom drawer'))
const dialog = useTemplateRef<HTMLDialogElement>('dialog')

export interface Emits {
  /**
   * @docs Emitted when the bottom drawer or its background is clicked.
   */
  (e: 'clicked', event: MouseEvent): void
  /**
   * @docs Emitted when the browser requests that the drawer be dismissed, such as when Escape is pressed, or when the native dialog closes.
   */
  (e: 'close', event: Event): void
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
    await nextTick()
    const dialogEl = unref(dialog)

    if (!dialogEl) {
      return
    }

    if (isDrawerActive) {
      if (!dialogEl.open) {
        dialogEl.showModal()
      }
      document.getElementById(id)?.classList.add('active')
    } else if (dialogEl.open) {
      dialogEl.close()
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

  .oc-bottom-drawer::backdrop {
    background: transparent;
  }
}
</style>
