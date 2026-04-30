<template>
  <oc-mobile-drop
    v-if="useBottomDrawer"
    ref="bottomDrawerRef"
    :drawer-id="dropId"
    :toggle="toggle"
    :close-on-click="closeOnClick"
    :title="title"
    :register-click-handler="mode !== 'manual'"
    @show="emit('showDrop')"
    @hide="emit('hideDrop')"
  >
    <slot />
  </oc-mobile-drop>
  <template v-else>
    <Transition name="oc-drop">
      <Teleport :disabled="!teleport" :to="teleport ? teleport : undefined">
        <div
          v-if="isOpen"
          :id="dropId"
          ref="drop"
          class="oc-drop shadow-sm/10 rounded-xl bg-role-surface border border-role-surface-container-highest"
          :class="attrs?.class"
          :tabindex="-1"
          @click="onClick"
        >
          <oc-card v-if="$slots.default" :body-class="[getTailwindPaddingClass(paddingSize)]">
            <slot />
          </oc-card>
          <slot v-else name="special" />
        </div>
      </Teleport>
    </Transition>
  </template>
</template>

<script setup lang="ts">
import {
  computePosition,
  offset as offsetFn,
  flip,
  Placement,
  shift,
  size,
  VirtualElement
} from '@floating-ui/dom'
import { getTailwindPaddingClass, SizeType, uniqueId } from '../../helpers'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  useAttrs,
  useTemplateRef,
  watch
} from 'vue'
import { useIsMobile } from '../../composables'
import OcMobileDrop from './OcMobileDrop.vue'
import OcCard from '../OcCard/OcCard.vue'
import { useEventListeners } from './useEventListeners'
import { getFocusableItems } from '../../helpers/getFocusableElements'

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
   * @docs The position of the drop. Check the floating-ui documentation for more details on the type.
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
  /**
   * @docs Teleport the drop to a different DOM element. This can be useful to prevent overflow issues.
   */
  teleport?: string
  /**
   * @docs Enables navigation through the drop with arrow keys. Use this if the drop only contains menu items. Disabling this disables arrow key navigation but enables regular tab navigation.
   * @default true
   */
  isMenu?: boolean
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
  enforceDropOnMobile = false,
  teleport = '',
  isMenu = true
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const attrs = useAttrs()
const { registerEventListener, unregisterEventListeners } = useEventListeners()
const { isMobile } = useIsMobile()
const isOpen = ref(false)

const useBottomDrawer = computed(() => unref(isMobile) && !enforceDropOnMobile)
const bottomDrawerRef = useTemplateRef<typeof OcMobileDrop>('bottomDrawerRef')
const drop = useTemplateRef('drop')

const anchor = computed<HTMLElement | null>(() => {
  if (!toggle) {
    return null
  }
  return document.querySelector<HTMLButtonElement>(toggle)
})

const show = async ({
  anchorElement = undefined,
  noFocus = false
}: {
  anchorElement?: HTMLElement | VirtualElement
  noFocus?: boolean
} = {}) => {
  if (unref(useBottomDrawer)) {
    unref(bottomDrawerRef).show()
    return
  }
  if (unref(isOpen)) {
    return
  }
  showDrop({ anchorElement })

  if (!noFocus) {
    // usually, opening the drop should also focus it to allow for keyboard navigation within the drop.
    // however, in certain situations (e.g. when typing opens a drop), this may be unwanted behavior.
    await nextTick()
    unref(drop).focus({ preventScroll: true })
  }
}
const hide = () => {
  if (unref(useBottomDrawer)) {
    unref(bottomDrawerRef).hide()
    return
  }
  hideDrop()
}

const update = async ({
  anchorElement = undefined
}: {
  anchorElement?: HTMLElement | VirtualElement
} = {}) => {
  if (!unref(isOpen) || !unref(drop)) {
    return
  }
  const anchorEl = anchorElement || unref(anchor)
  if (!anchorEl) {
    return
  }
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
}

defineExpose({ show, hide, update })

const onClick = (event: Event) => {
  const isNestedDropToggle = (event.target as HTMLElement)
    .closest('.oc-button')
    ?.hasAttribute('aria-expanded')

  if (closeOnClick && !isNestedDropToggle) {
    hideDrop()
  }
}

const awaitAnimationFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

const showDrop = async ({
  anchorElement
}: { anchorElement?: HTMLElement | VirtualElement } = {}) => {
  if (unref(isOpen)) {
    hideDrop()
    return
  }

  const anchorEl: HTMLElement | VirtualElement | null = anchorElement || unref(anchor)
  isOpen.value = true
  await nextTick()
  if (!anchorEl) {
    console.warn('OcDrop cannot be opened: anchor element not found')
    return
  }

  // fixes a timing issue with the rendering of the drop
  await awaitAnimationFrame()

  if (isMenu) {
    // if drop is a menu, set role="menu" on all ul elements in the drop for better screen reader support
    const uls = unref(drop)?.getElementsByTagName('ul')
    Array.from(uls || []).forEach((ul) => ul.setAttribute('role', 'menu'))

    // li elements sit between role="menu" and role="menuitem"; marking them as role="none" removes
    // them from the accessibility tree so the required parent-child relationship is satisfied
    const lis = unref(drop)?.querySelectorAll('ul li')
    Array.from(lis || []).forEach((li) => li.setAttribute('role', 'none'))

    const menuItems = unref(drop)?.querySelectorAll('ul li button, ul li a')
    Array.from(menuItems || []).forEach((item) => {
      item.setAttribute('role', 'menuitem') // menu items should have role="menuitem" for better screen reader support
      item.setAttribute('tabindex', '-1') // menu items should not be focussable via tabs
    })
  }

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
  registerEventListener(unref(drop), 'keydown', handleDropKeydown, 'drop')

  if (!isMenu) {
    // when the drop is not a menu, we need to close it when the user leaves the drop after tabbing through it
    registerEventListener(unref(drop), 'focusout', handleDropFocusOut, 'drop')
  }

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

const handleDropClickOutside = async (event: Event) => {
  const target = event.target as Node
  const clickedOutsideDrop = unref(drop) && !unref(drop).contains(target)
  if (clickedOutsideDrop) {
    const anchorEl = unref(anchor)
    const clickedOnAnchor = anchorEl && anchorEl.contains(target)
    if (!clickedOnAnchor) {
      await awaitAnimationFrame()
      hideDrop()
    }
  }
}

const handleDropKeydown = (event: Event) => {
  if (!isKeyboardEvent(event)) {
    return
  }

  if (['ArrowLeft', 'ArrowRight'].includes(event.code)) {
    // arrow left/right are used to open sub drops
    if (mode === 'hover') {
      hideDrop()
      unref(anchor)?.focus()
    }
    return
  }

  if (event.code === 'Escape') {
    // close drop on escape
    event.stopPropagation()
    hideDrop()
    unref(anchor)?.focus()
    return
  }

  if (event.code === 'Space' && event.target instanceof HTMLAnchorElement) {
    // make space click work for anchor elements inside a drop
    event.target.click()
    return
  }

  if (!isMenu) {
    // everything below goes for arrow navigation only, hence early return if this is disabled
    return
  }

  event.stopPropagation()

  if (event.code === 'Tab') {
    // hide drop on tab because the focus now went from the anchor to the next element
    hideDrop()
    return
  }

  if (['ArrowDown', 'ArrowUp'].includes(event.code)) {
    // navigate through focusable items in the drop with arrow up/down
    event.preventDefault()
    const items = getFocusableItems(unref(drop))
    if (!items.length) {
      return
    }
    const currentIndex = items.indexOf(document.activeElement as HTMLElement)
    if (event.code === 'ArrowDown') {
      const next = currentIndex === -1 || currentIndex === items.length - 1 ? 0 : currentIndex + 1
      items[next].focus()
    } else if (event.code === 'ArrowUp') {
      const prev = currentIndex <= 0 ? items.length - 1 : currentIndex - 1
      items[prev].focus()
    }
  }
}

const handleAnchorKeydown = async (event: Event) => {
  if (!isKeyboardEvent(event)) {
    return
  }

  const openDropAndFocusFirstEl = async () => {
    showDrop()
    await nextTick()
    const focusableItems = getFocusableItems(unref(drop))
    focusableItems[0]?.focus()
  }

  if (event.code === 'Enter') {
    // enter should open a drop
    event.preventDefault()
    await openDropAndFocusFirstEl()
    return
  }

  if (mode === 'hover') {
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      // sub drops that open on hover can be opened via arrow left/right or space
      event.preventDefault()
      await openDropAndFocusFirstEl()
    }
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

const handleAnchorClick = async () => {
  showDrop({})
  if (unref(isOpen)) {
    await nextTick()
    unref(drop).focus({ preventScroll: true })
  }
}

const handleAnchorMouseEnter = () => {
  clearHoverTimeout()
  if (!unref(isOpen)) {
    showDrop({})
  }
}

const handleAnchorMouseLeave = () => {
  hoverCloseTimeout = setTimeout(hideDrop, 100)
}

const setupAriaAttributes = () => {
  unref(anchor)?.setAttribute('aria-haspopup', 'true')
  unref(anchor)?.setAttribute('aria-expanded', 'false')
}

const setupAnchorEvents = () => {
  const anchorEl = unref(anchor)
  if (!anchorEl || unref(useBottomDrawer)) {
    return
  }

  switch (mode) {
    case 'click':
      registerEventListener(anchorEl, 'click', handleAnchorClick, 'anchor')
      registerEventListener(anchorEl, 'keydown', handleAnchorKeydown, 'anchor')
      break
    case 'hover':
      registerEventListener(anchorEl, 'keydown', handleAnchorKeydown, 'anchor')
      registerEventListener(anchorEl, 'mouseenter', handleAnchorMouseEnter, 'anchor')
      registerEventListener(anchorEl, 'mouseleave', handleAnchorMouseLeave, 'anchor')
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

  unref(anchor)?.removeAttribute('aria-expanded')
  unref(anchor)?.removeAttribute('aria-haspopup')
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

.oc-drop:focus-visible {
  @apply shadow-md/20 outline-0;
}
</style>
