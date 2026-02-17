<template>
  <oc-mobile-drop
    v-if="useBottomDrawer"
    ref="bottomDrawerRef"
    :drawer-id="dropId"
    :toggle="toggle"
    :close-on-click="closeOnClick"
    :title="title"
    @show="emit('showDrop')"
    @hide="emit('hideDrop')"
  >
    <slot />
  </oc-mobile-drop>
  <template v-else>
    <Transition name="oc-drop">
      <div
        v-if="isOpen"
        :id="dropId"
        ref="drop"
        class="oc-drop shadow-md/20 rounded-sm bg-role-surface"
        @click="onClick"
      >
        <oc-card v-if="$slots.default" :body-class="[getTailwindPaddingClass(paddingSize)]">
          <slot />
        </oc-card>
        <slot name="special" />
      </div>
    </Transition>
  </template>
</template>

<script setup lang="ts">
import { computePosition, offset as offsetFn, flip, Placement, shift, size } from '@floating-ui/dom'
import { getTailwindPaddingClass, SizeType, uniqueId } from '../../helpers'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  useTemplateRef,
  watch
} from 'vue'
import { useIsMobile } from '../../composables'
import OcMobileDrop from './OcMobileDrop.vue'
import OcCard from '../OcCard/OcCard.vue'
import { useEventListeners } from './useEventListeners'

export interface Props {
  /**
   * @docs The title of the drop. This is only being displayed in the bottom drawer in the mobile view.
   */
  title?: string
  /**
   * @docs Determines if the drop should close when clicked.
   * @default false
   */
  closeOnClick?: boolean
  /**
   * @docs The element ID of the drop.
   */
  dropId?: string
  /**
   * @docs Determines the event that triggers the drop. `manual` can be used to control the drop programmatically via the exposed `show` and `hide` methods.
   * @default 'click'
   */
  mode?: 'click' | 'hover' | 'manual'
  /**
   * @docs The vertical offset of the drop.
   * @default 5
   */
  offset?: number
  /**
   * @docs The padding size of the drop.
   * @default 'medium'
   */
  paddingSize?: SizeType | 'remove'
  /**
   * @docs The position of the drop. Check the floating-ui document for more details on the type.
   * @default 'bottom-start'
   */
  position?: Placement
  /**
   * @docs CSS selector for the element to be used as toggle. By default, the preceding element is used. Note that a toggle is mandatory for the bottom drawer in mobile view.
   */
  toggle?: string
  /**
   * @docs Enforce the drop to be displayed even on mobile devices where usually a bottom drawer is used.
   * @default false
   */
  enforceDropOnMobile?: boolean
}

export interface Emits {
  /**
   * @docs Emitted when the drop has been hidden.
   */
  (e: 'hideDrop'): void

  /**
   * @docs Emitted when the drop has been displayed.
   */
  (e: 'showDrop'): void
}

export interface Slots {
  /**
   * @docs Content of the drop that is displayed in a card-style.
   */
  default?: () => unknown
  /**
   * @docs This slot can be used if you don't want the drop to be displayed in a card-style.
   */
  special?: () => unknown
}

const {
  closeOnClick = false,
  dropId = uniqueId('oc-drop-'),
  mode = 'click',
  offset = 5,
  paddingSize = 'medium',
  position = 'bottom-start',
  toggle = '',
  title = '',
  enforceDropOnMobile = false
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const { registerEventListener, unregisterEventListeners } = useEventListeners()
const { isMobile } = useIsMobile()
const isOpen = ref(false)

const useBottomDrawer = computed(() => unref(isMobile) && !enforceDropOnMobile)
const bottomDrawerRef = useTemplateRef<typeof OcMobileDrop>('bottomDrawerRef')
const drop = useTemplateRef('drop')

const anchor = computed(() => {
  if (!toggle) {
    return null
  }
  return document.querySelector(toggle)
})

const show = ({ event, useMouseAnchor }: { event?: Event; useMouseAnchor?: boolean } = {}) => {
  if (unref(useBottomDrawer)) {
    unref(bottomDrawerRef).show()
    return
  }
  if (unref(isOpen)) {
    return
  }
  showDrop({ event, useMouseAnchor })
}
const hide = () => {
  if (unref(useBottomDrawer)) {
    unref(bottomDrawerRef).hide()
    return
  }
  hideDrop()
}

defineExpose({ show, hide })

const onClick = (event: Event) => {
  const isNestedDropToggle = (event.target as HTMLElement)
    .closest('.oc-button')
    ?.hasAttribute('aria-expanded')

  if (closeOnClick && !isNestedDropToggle) {
    hideDrop()
  }
}

const showDrop = async ({
  event,
  useMouseAnchor
}: { event?: Event; useMouseAnchor?: boolean } = {}) => {
  if (unref(isOpen)) {
    hideDrop()
    return
  }

  let anchorEl = unref(anchor)
  if (useMouseAnchor) {
    // use mouse position as anchor element
    const mouseEvent = event as MouseEvent
    anchorEl = {
      getBoundingClientRect() {
        return {
          width: 0,
          height: 0,
          x: mouseEvent.clientX,
          y: mouseEvent.clientY,
          top: mouseEvent.clientY,
          left: mouseEvent.clientX,
          right: mouseEvent.clientX,
          bottom: mouseEvent.clientY
        }
      }
    } as Element
  }

  isOpen.value = true
  await nextTick()
  if (!anchorEl) {
    console.warn('OcDrop cannot be opened: anchor element not found')
    return
  }

  // fixes a timing issue with the rendering of the drop
  await new Promise((resolve) => setTimeout(resolve, 0))

  const { x, y } = await computePosition(anchorEl, unref(drop), {
    placement: position,
    middleware: [
      offsetFn(offset),
      flip(),
      shift({ padding: 5 }),
      size({
        apply({ availableWidth, availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxWidth: `${Math.min(400, availableWidth - 10)}px`,
            maxHeight: `${Math.max(0, availableHeight - 10)}px`
          })
        }
      })
    ]
  })

  Object.assign(unref(drop).style, { left: `${x}px`, top: `${y}px` })
  unref(anchor)?.setAttribute('aria-expanded', 'true')
  emit('showDrop')

  registerEventListener(document, 'click', handleDropClickOutside, 'document', {
    capture: true
  })
  registerEventListener(document, 'contextmenu', handleDropClickOutside, 'document', {
    capture: true
  })
  registerEventListener(document, 'keydown', handleDropKeydown, 'document')
  registerEventListener(unref(drop), 'focusout', handleDropFocusOut, 'drop')

  if (mode === 'hover') {
    registerEventListener(unref(drop), 'mouseenter', handleDropMouseEnter, 'drop')
    registerEventListener(unref(drop), 'mouseleave', handleDropMouseLeave, 'drop')
  }
}

const hideDrop = () => {
  unregisterEventListeners(['drop', 'document'])
  isOpen.value = false
  unref(anchor)?.setAttribute('aria-expanded', 'false')
  emit('hideDrop')
}

const isFocusEvent = (event: Event): event is FocusEvent => event instanceof FocusEvent
const isKeyboardEvent = (event: Event): event is KeyboardEvent => event instanceof KeyboardEvent

const handleDropFocusOut = (event: Event) => {
  if (!isFocusEvent(event)) {
    return
  }
  const focusLeft = event.relatedTarget && !unref(drop)?.contains(event.relatedTarget as Node)
  if (focusLeft) {
    hideDrop()
  }
}

const handleDropClickOutside = (event: Event) => {
  const target = event.target as Node
  const clickedOutsideDrop = unref(drop) && !unref(drop).contains(target)
  if (clickedOutsideDrop) {
    const anchorElement = unref(anchor)
    const clickedOnAnchor = anchorElement && anchorElement.contains(target)
    if (!clickedOnAnchor) {
      hideDrop()
    }
  }
}

const handleDropKeydown = (event: Event) => {
  if (isKeyboardEvent(event) && event.code === 'Escape') {
    hideDrop()
    ;(unref(anchor) as HTMLElement)?.focus()
  }
}

let hoverCloseTimeout: ReturnType<typeof setTimeout> | null = null

const clearHoverTimeout = () => {
  if (hoverCloseTimeout !== null) {
    clearTimeout(hoverCloseTimeout)
    hoverCloseTimeout = null
  }
}

const handleDropMouseEnter = () => {
  clearHoverTimeout()
}

const handleDropMouseLeave = () => {
  hoverCloseTimeout = setTimeout(hideDrop, 100)
}

const handleAnchorClick = (event: Event) => {
  showDrop({ event })
}

const handleAnchorMouseEnter = (event: Event) => {
  clearHoverTimeout()
  if (!unref(isOpen)) {
    showDrop({ event })
  }
}

const handleAnchorMouseLeave = () => {
  hoverCloseTimeout = setTimeout(hideDrop, 100)
}

const setupAriaAttributes = () => {
  const anchorElement = unref(anchor)
  if (!anchorElement) {
    return
  }
  anchorElement.setAttribute('aria-haspopup', 'true')
  anchorElement.setAttribute('aria-expanded', 'false')
}

const setupAnchorEvents = () => {
  const anchorElement = unref(anchor)
  if (!anchorElement || unref(useBottomDrawer)) {
    return
  }

  switch (mode) {
    case 'click':
      registerEventListener(anchorElement, 'click', handleAnchorClick, 'anchor')
      break
    case 'hover':
      registerEventListener(anchorElement, 'mouseenter', handleAnchorMouseEnter, 'anchor')
      registerEventListener(anchorElement, 'mouseleave', handleAnchorMouseLeave, 'anchor')
      break
    case 'manual':
      break
  }
}

watch(useBottomDrawer, () => {
  setupAriaAttributes()
  if (unref(useBottomDrawer)) {
    unregisterEventListeners()
  } else {
    setupAnchorEvents()
  }
})

onMounted(() => {
  setupAnchorEvents()
  setupAriaAttributes()
})

onBeforeUnmount(() => {
  clearHoverTimeout()
  unregisterEventListeners()

  const anchorEl = unref(anchor)
  anchorEl?.removeAttribute('aria-expanded')
  anchorEl?.removeAttribute('aria-haspopup')
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-drop {
    @apply w-xs absolute top-[-9999px] left-[-9999px] overflow-y-auto;
    z-index: 1000;
  }

  .oc-drop-enter-active {
    transition: opacity 250ms ease;
  }

  .oc-drop-enter-from,
  .oc-drop-leave-to {
    opacity: 0;
  }

  .oc-mobile-drop li a,
  .oc-mobile-drop li button,
  .oc-drop li a,
  .oc-drop li button {
    @apply p-2 w-full;
  }

  .oc-mobile-drop li,
  .oc-drop li {
    @apply mb-1;
  }

  .oc-mobile-drop li:first-child,
  .oc-drop li:first-child {
    @apply mt-0;
  }

  .oc-mobile-drop li:last-child,
  .oc-drop li:last-child {
    @apply mb-0;
  }
}
</style>
