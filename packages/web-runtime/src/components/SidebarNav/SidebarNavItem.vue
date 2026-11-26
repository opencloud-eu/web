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
import { FillType, Icon, isImageIcon, toNamedIcon } from '@opencloud-eu/design-system/helpers'
import { AppNavigationItemDrop, useRouter } from '@opencloud-eu/web-pkg'
import { computed, unref, useTemplateRef } from 'vue'
import { RouteLocationRaw } from 'vue-router'
import { useNavItemDrop } from '../../composables/sidebarNav'

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
const { isDropTargetActive, dropHint, dropListeners } = useNavItemDrop({
  drop: () => drop,
  navItem
})

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
