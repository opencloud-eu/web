<template>
  <oc-bottom-drawer
    v-if="useBottomDrawer"
    ref="bottomDrawerRef"
    :drawer-id="dropId"
    :toggle="toggle"
    :close-on-click="closeOnClick"
    :title="title"
    :is-nested-element="isNestedElement"
    :nested-parent-ref="nestedParentRef"
    use-portal
    @show="emit('showDrop')"
    @hide="emit('hideDrop')"
  >
    <slot />
  </oc-bottom-drawer>
  <div v-else :id="dropId" ref="drop" class="oc-drop shadow-md/20 rounded-sm" @click="onClick">
    <oc-card v-if="$slots.default" :body-class="[getTailwindPaddingClass(paddingSize)]">
      <slot />
    </oc-card>
    <slot v-else name="special" />
  </div>
</template>

<script setup lang="ts">
import tippy, { hideAll, Props as TippyProps, Instance } from 'tippy.js'
import { detectOverflow, Modifier } from '@popperjs/core'
import { destroy, hideOnEsc } from '../../directives/OcTooltip'
import { getTailwindPaddingClass, NestedDrop, SizeType, uniqueId } from '../../helpers'
import { computed, nextTick, onBeforeUnmount, ref, unref, useTemplateRef, watch } from 'vue'
import { useIsMobile } from '../../composables'
import OcBottomDrawer from '../OcBottomDrawer/OcBottomDrawer.vue'
import OcCard from '../OcCard/OcCard.vue'

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
   * @docs Determines if the drop element is nested.
   * @default false
   */
  isNestedElement?: boolean
  /**
   * @docs The parent `OcDrop` ref of the nested drop.
   */
  nestedParentRef?: NestedDrop
  /**
   * @docs Determines the event that triggers the drop.
   * @default 'click'
   */
  mode?: 'click' | 'hover' | 'manual'
  /**
   * @docs The visual offset of the drop.
   * @default [0, 0]
   */
  offset?: TippyProps['offset']
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
  isNestedElement = false,
  mode = 'click',
  offset = [0, 0],
  paddingSize = 'medium',
  popperOptions = {},
  position = 'bottom-start',
  target,
  toggle = '',
  title = '',
  enforceDropOnMobile = false,
  nestedParentRef = null
} = defineProps<Props>()

const emit = defineEmits<Emits>()
defineSlots<Slots>()

const { isMobile } = useIsMobile()

const useBottomDrawer = computed(() => unref(isMobile) && !enforceDropOnMobile)
const bottomDrawerRef = useTemplateRef<typeof OcBottomDrawer>('bottomDrawerRef')

const drop = useTemplateRef('drop')
const tippyInstance = ref<Instance | null>(null)

const show = () => {
  if (unref(useBottomDrawer)) {
    unref(bottomDrawerRef).show()
    return
  }
  unref(tippyInstance)?.show()
}
const hide = () => {
  if (unref(useBottomDrawer)) {
    unref(bottomDrawerRef).hide()
    return
  }
  unref(tippyInstance)?.hide()
}

const getElement = () => {
  return unref(useBottomDrawer) ? unref(bottomDrawerRef).getElement() : unref(drop)
}

defineExpose({ show, hide, getElement, tippy: tippyInstance })

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

const triggerMapping = computed(() => {
  return (
    {
      hover: 'mouseenter focus',
      click: undefined,
      manual: undefined
    }[mode] || mode
  )
})

watch(
  () => position,
  () => {
    unref(tippyInstance)?.setProps({ placement: position })
  }
)

watch(
  () => mode,
  () => {
    unref(tippyInstance)?.setProps({ trigger: triggerMapping.value })
  }
)

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
  const config: Partial<TippyProps> = {
    trigger: triggerMapping.value,
    placement: position,
    arrow: false,
    hideOnClick: !isNestedElement,
    interactive: true,
    plugins: [hideOnEsc],
    theme: 'none',
    maxWidth: 416,
    offset,
    ...(!isNestedElement && {
      onShow: (instance) => {
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
  useBottomDrawer,
  async () => {
    await nextTick()
    if (unref(useBottomDrawer)) {
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
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-drop {
    @apply w-xs max-w-full;
  }

  .oc-bottom-drawer li a,
  .oc-bottom-drawer li button,
  .oc-drop li a,
  .oc-drop li button {
    @apply p-2 w-full;
  }

  .oc-bottom-drawer li,
  .oc-drop li {
    @apply mb-1;
  }

  .oc-bottom-drawer li:first-child,
  .oc-drop li:first-child {
    @apply mt-0;
  }

  .oc-bottom-drawer li:last-child,
  .oc-drop li:last-child {
    @apply mb-0;
  }
}

.tippy-box[data-theme~='none'] {
  /* overwrite tippy styles */
  background-color: transparent;
  font-size: inherit;
  line-height: inherit;
}
</style>
