<template>
  <oc-bottom-drawer
    v-if="useAppDrawer"
    :drawer-id="dropId"
    :toggle="toggle"
    :close-on-click="closeOnClick"
    :title="title"
    use-portal
    @open="emit('showDrop')"
    @close="emit('hideDrop')"
  >
    <slot />
  </oc-bottom-drawer>
  <div
    v-else
    :id="dropId"
    ref="drop"
    class="oc-drop oc-box-shadow-medium oc-rounded"
    @click="onClick"
  >
    <div v-if="$slots.default" :class="['oc-card oc-card-body', paddingClass]">
      <slot />
    </div>
    <slot v-else name="special" />
  </div>
</template>

<script setup lang="ts">
import tippy, { hideAll, Props as TippyProps, ReferenceElement } from 'tippy.js'
import { detectOverflow, Modifier } from '@popperjs/core'
import { destroy, hideOnEsc } from '../../directives/OcTooltip'
import { getSizeClass, SizeType, uniqueId } from '../../helpers'
import { computed, nextTick, onBeforeUnmount, ref, unref, watch } from 'vue'
import { useIsMobile } from '../../composables'
import OcBottomDrawer from '../OcBottomDrawer/OcBottomDrawer.vue'

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
   * @docs Determines if the drop is nested.
   * @default false
   */
  isNested?: boolean
  /**
   * @docs Determines the event that triggers the drop.
   * @default 'click'
   */
  mode?: 'click' | 'hover' | 'manual'
  /**
   * @docs The visual offset of the drop.
   */
  offset?: string
  /**
   * @docs The padding size of the drop.
   * @default 'medium'
   */
  paddingSize?: SizeType | 'remove'
  /**
   * @docs The popper options of the drop. Please refer to the component source for more information.
   */
  popperOptions?: TippyProps['popperOptions']
  /**
   * @docs The position of the drop.
   * @default 'bottom-start'
   */
  position?:
    | 'top-start'
    | 'right-start'
    | 'bottom-start'
    | 'left-start'
    | 'auto-start'
    | 'top-end'
    | 'right-end'
    | 'bottom-end'
    | 'left-end'
    | 'auto-end'
  /**
   * @docs Element selector that can be used as a target of the drop.
   */
  target?: string
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
  isNested = false,
  mode = 'click',
  offset,
  paddingSize = 'medium',
  popperOptions = {},
  position = 'bottom-start',
  target,
  toggle = '',
  title = '',
  enforceDropOnMobile = false
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const { isMobile } = useIsMobile()
const useAppDrawer = computed(() => unref(isMobile) && !enforceDropOnMobile)

const drop = ref<HTMLElement | null>(null)
const tippyInstance = ref(null)

const show = (duration?: number) => {
  unref(tippyInstance)?.show(duration)
}
const hide = (duration?: number) => {
  unref(tippyInstance)?.hide(duration)
}

defineExpose({ show, hide, tippy: tippyInstance })

const onClick = (event: Event) => {
  const isNestedDropToggle = (event.target as HTMLElement)
    .closest('.oc-button')
    ?.hasAttribute('aria-expanded')

  if (closeOnClick && !isNestedDropToggle) {
    hide()
  }
}

const onFocusOut = (event: FocusEvent) => {
  const tippyBox = drop.value?.closest('.tippy-box')
  const focusLeft = event.relatedTarget && !tippyBox?.contains(event.relatedTarget as Node)
  if (focusLeft) {
    hide()
  }
}

onBeforeUnmount(() => {
  drop.value?.removeEventListener('focusout', onFocusOut)
})

const isTouchDevice = () => {
  return window.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches
}

const triggerMapping = computed(() => {
  return (
    {
      hover: 'mouseenter focus'
    }[unref(dropMode)] || unref(dropMode)
  )
})

const dropMode = computed(() => {
  return isTouchDevice() ? 'click' : mode
})

const paddingClass = computed(() => {
  return `oc-p-${getSizeClass(paddingSize)}`
})

watch(
  () => position,
  () => {
    unref(tippyInstance)?.setProps({ placement: position })
  }
)

watch(dropMode, () => {
  unref(tippyInstance)?.setProps({ trigger: triggerMapping.value })
})

onBeforeUnmount(() => {
  destroy(unref(tippyInstance))
})

const initializeTippy = () => {
  destroy(unref(tippyInstance))
  const to = target
    ? document.querySelector(target)
    : toggle
      ? document.querySelector(toggle)
      : drop.value?.previousElementSibling
  const content = drop.value

  if (!to || !content) {
    return
  }
  const config: any = {
    trigger: triggerMapping.value,
    placement: position,
    arrow: false,
    hideOnClick: !(isNested && unref(dropMode) === 'hover'),
    interactive: true,
    plugins: [hideOnEsc],
    theme: 'none',
    maxWidth: 416,
    offset: offset ?? 0,
    ...(!isNested && {
      onShow: (instance: ReferenceElement) => {
        emit('showDrop')
        hideAll({ exclude: instance })
      },
      onHide: () => {
        emit('hideDrop')
      }
    }),
    popperOptions: {
      ...popperOptions,
      modifiers: [
        ...(popperOptions?.modifiers ? popperOptions.modifiers : []),
        {
          name: 'fixVerticalPosition',
          enabled: true,
          phase: 'beforeWrite',
          requiresIfExists: ['offset', 'preventOverflow', 'flip'],
          fn({ state }) {
            const overflow = detectOverflow(state)
            const dropHeight = state.modifiersData.fullHeight || state.elements.popper.offsetHeight
            const dropYPos = overflow.top * -1 - 10
            const availableHeight = dropYPos + dropHeight + overflow.bottom * -1
            const spaceBelow = availableHeight - dropYPos
            const spaceAbove = availableHeight - spaceBelow

            if (dropHeight > spaceBelow && dropHeight > spaceAbove) {
              state.styles.popper.top = `-${dropYPos}px`
              state.modifiersData.fullHeight = dropHeight
            }

            if (dropHeight > availableHeight) {
              state.styles.popper.maxHeight = `${availableHeight - 10}px`
              state.styles.popper.overflowY = `auto`
              state.styles.popper.overflowX = `hidden`
            }
          }
        } as Modifier<'fixVerticalPosition', unknown>
      ]
    },
    content
  }

  if (target) {
    config.triggerTarget = toggle
      ? document.querySelector(toggle)
      : drop.value?.previousElementSibling
  }

  tippyInstance.value = tippy(to, config)
  drop.value?.addEventListener('focusout', onFocusOut)
}

watch(
  useAppDrawer,
  async () => {
    await nextTick()
    if (unref(useAppDrawer)) {
      if (unref(tippyInstance)) {
        destroy(unref(tippyInstance))
      }
      return
    }
    initializeTippy()
  },
  { immediate: true }
)
</script>

<style lang="scss">
.tippy-box[data-theme~='none'] {
  background-color: transparent;
  font-size: inherit;
  line-height: inherit;

  .tippy-content {
    // note: needed so that the box shadow from `oc-box-shadow-medium` doesn't get suppressed
    padding: var(--oc-space-small);
  }

  li.oc-menu-item-hover {
    a,
    .item-has-switch,
    button:not([role='switch']) {
      box-sizing: border-box;
      padding: var(--oc-space-small);

      &:focus:not([disabled]),
      &:hover:not([disabled]) {
        text-decoration: none !important;
        border-radius: 5px;
      }

      span {
        text-decoration: none !important;
      }
    }
  }
}

.oc-drop {
  max-width: 100%;
  width: 300px;

  .oc-card {
    border-radius: var(--oc-space-small) !important;
  }
}
</style>
