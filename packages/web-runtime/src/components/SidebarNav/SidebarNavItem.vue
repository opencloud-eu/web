<template>
  <li
    ref="navItem"
    v-oc-tooltip="dropHint"
    class="oc-sidebar-nav-item pb-1 px-2"
    :aria-current="active ? 'page' : null"
    v-on="dropListeners"
  >
    <oc-button
      :type="handler ? 'button' : 'router-link'"
      :appearance="active ? 'filled' : 'raw-inverse'"
      color-role="surface"
      :justify-content="'space-between'"
      :class="[
        'oc-sidebar-nav-item-link',
        'relative',
        'w-full',
        'whitespace-nowrap',
        'px-2',
        'py-3',
        'opacity-100',
        'select-none',
        'rounded-xl',
        { 'active overflow-hidden outline': active },
        { '!bg-role-secondary-container': isDropTargetActive },
        {
          'hover:bg-role-surface-container-highest focus:bg-role-surface-container-highest': !active
        }
      ]"
      :data-nav-name="navName"
      :aria-label="
        collapsed ? $gettext('Navigate to %{ pageName } page', { pageName: name }) : undefined
      "
      v-bind="attrs"
    >
      <span class="flex min-w-0">
        <oc-icon :icon="iconInFillType" class="shrink-0" />
        <span
          class="ms-4 font-bold truncate"
          :class="{ 'text-invisible opacity-0': collapsed }"
          :title="collapsed ? undefined : name"
          v-text="name"
        />
      </span>
    </oc-button>
    <oc-hidden-announcer v-if="drop" :announcement="dropHint" />
  </li>
</template>
<script setup lang="ts">
import {
  FillType,
  Icon,
  hideElementTooltip,
  isImageIcon,
  showElementTooltip,
  toNamedIcon
} from '@opencloud-eu/design-system/helpers'
import { AppNavigationItemDrop, useRouter } from '@opencloud-eu/web-pkg'
import { computed, nextTick, onBeforeUnmount, ref, unref, useTemplateRef } from 'vue'
import { RouteLocationRaw } from 'vue-router'

const {
  name,
  icon,
  active = false,
  target = undefined,
  fillType = 'fill',
  collapsed = false,
  handler = undefined,
  drop = undefined
} = defineProps<{
  name: string
  icon: Icon
  active?: boolean
  target?: RouteLocationRaw
  fillType?: FillType
  collapsed?: boolean
  handler?: () => void
  drop?: AppNavigationItemDrop
}>()

const router = useRouter()

const iconInFillType = computed((): Icon => {
  if (isImageIcon(icon)) {
    return icon
  }
  return { ...toNamedIcon(icon), fillType }
})

const attrs = computed(() => {
  return {
    ...(handler && { onClick: handler }),
    ...(target && { to: target })
  }
})

const navItem = useTemplateRef<HTMLElement>('navItem')
const isDropTargetActive = ref(false)
// explains why a drag can't be dropped, hover tooltips don't work while dragging
const dropHint = ref('')

async function showDropHint(message: string) {
  if (unref(dropHint) === message) {
    return
  }
  dropHint.value = message
  // the tooltip directive picks up the new text on the next render
  await nextTick()
  await showElementTooltip(unref(navItem))
}

function hideDropHint() {
  if (!unref(dropHint)) {
    return
  }
  hideElementTooltip(unref(navItem))
  dropHint.value = ''
}

// a drag can end without leaving the item (e.g. cancelled via Escape), dragend fires at the drag
// source and bubbles up to the document. a new drag can also start without leaving the item.
function listenForDragEnd() {
  document.addEventListener('dragend', resetDropState)
  document.addEventListener('dragstart', resetDropState)
}

function resetDropState() {
  document.removeEventListener('dragend', resetDropState)
  document.removeEventListener('dragstart', resetDropState)
  isDropTargetActive.value = false
  hideDropHint()
}

function onDragOver(event: DragEvent) {
  if (!drop.isAllowed(event)) {
    isDropTargetActive.value = false
    const message = drop.notAllowedMessage?.(event)
    if (message) {
      listenForDragEnd()
      showDropHint(message)
    }
    return
  }
  hideDropHint()
  // allows the drop, otherwise the browser shows the "not allowed" cursor
  event.preventDefault()
  listenForDragEnd()
  isDropTargetActive.value = true
}

function onDragLeave(event: DragEvent) {
  if ((event.currentTarget as HTMLElement).contains(event.relatedTarget as HTMLElement)) {
    return
  }
  resetDropState()
}

function onDrop(event: DragEvent) {
  resetDropState()
  if (!drop.isAllowed(event)) {
    return
  }
  event.preventDefault()
  drop.handler(event)
}

const dropListeners = computed(() => {
  if (!drop) {
    return {}
  }
  return { dragenter: onDragOver, dragover: onDragOver, dragleave: onDragLeave, drop: onDrop }
})

onBeforeUnmount(resetDropState)

const navName = computed(() => {
  if (target) {
    return router?.resolve(target, unref(router.currentRoute))?.name || 'route.name'
  }
  return name
})
</script>

<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-sidebar-nav-item-link:is(.active) {
    outline-color: var(--oc-role-surface-container-highest);
  }
  .oc-sidebar-nav-item-link:not(.active) {
    color: var(--oc-role-on-surface-variant);
  }
}
</style>
