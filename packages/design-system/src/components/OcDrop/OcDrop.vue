<template>
  <div :id="dropId" ref="drop" class="oc-drop oc-box-shadow-medium oc-rounded" @click="onClick">
    <div
      v-if="$slots.default"
      :class="['oc-card oc-card-body oc-background-secondary', paddingClass]"
    >
      <slot />
    </div>
    <slot v-else name="special" />
  </div>
</template>

<script setup lang="ts">
import tippy, { ReferenceElement, hideAll, Props as TippyProps } from 'tippy.js'
import { Modifier, detectOverflow } from '@popperjs/core'
import { destroy, hideOnEsc } from '../../directives/OcTooltip'
import { getSizeClass, uniqueId } from '../../helpers'
import { ref, onBeforeUnmount, onMounted, computed, watch, unref } from 'vue'

export interface Props {
  closeOnClick?: boolean
  dropId?: string
  isNested?: boolean
  mode?: 'click' | 'hover' | 'manual'
  offset?: string
  paddingSize?:
    | 'xsmall'
    | 'small'
    | 'medium'
    | 'large'
    | 'xlarge'
    | 'xxlarge'
    | 'xxxlarge'
    | 'remove'
  popperOptions?: TippyProps['popperOptions']
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
  target?: string
  toggle?: string
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
  toggle = ''
} = defineProps<Props>()

const emit = defineEmits(['hideDrop', 'showDrop'])

const drop = ref<HTMLElement | null>(null)
const tippyInstance = ref(null)

const show = (duration?: number) => {
  unref(tippyInstance)?.show(duration)
}
const hide = (duration?: number) => {
  unref(tippyInstance)?.hide(duration)
}

defineExpose({ show, hide, tippy: tippyInstance })

const onClick = () => {
  if (closeOnClick) {
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

onMounted(() => {
  drop.value?.addEventListener('focusout', onFocusOut)
})

onBeforeUnmount(() => {
  drop.value?.removeEventListener('focusout', onFocusOut)
})

const triggerMapping = computed(() => {
  return (
    {
      hover: 'mouseenter focus'
    }[mode] || mode
  )
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

watch(
  () => mode,
  () => {
    unref(tippyInstance)?.setProps({ trigger: triggerMapping.value })
  }
)

onBeforeUnmount(() => {
  destroy(unref(tippyInstance))
})

onMounted(() => {
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
    hideOnClick: true,
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
})
</script>

<style lang="scss">
.tippy-box[data-theme~='none'] {
  background-color: transparent;
  font-size: inherit;
  line-height: inherit;

  .tippy-content {
    // note: needed so that the box shadow from `oc-box-shadow-medium` doesn't get suppressed
    padding: 8px;
  }

  li.oc-menu-item-hover {
    a,
    .item-has-switch,
    button:not([role='switch']) {
      box-sizing: border-box;
      padding: var(--oc-space-small);
      color: var(--oc-color-swatch-passive-default);

      &:focus:not([disabled]),
      &:hover:not([disabled]) {
        background-color: var(--oc-color-background-hover);

        text-decoration: none !important;
        border-radius: 5px;
      }

      &:hover span {
        color: var(--oc-color-swatch-brand-contrast) !important;

        svg {
          fill: var(--oc-color-swatch-brand-contrast) !important;
        }
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
