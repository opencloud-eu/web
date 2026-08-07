<template>
  <li class="oc-sidebar-nav-item pb-1 px-2" :aria-current="active ? 'page' : null">
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
      <span class="flex">
        <oc-icon :name="icon" :fill-type="fillType" />
        <span
          class="ml-4 font-bold"
          :class="{ 'text-invisible opacity-0': collapsed }"
          v-text="name"
        />
      </span>
    </oc-button>
  </li>
</template>
<script setup lang="ts">
import { FillType } from '@opencloud-eu/design-system/helpers'
import { useRouter } from '@opencloud-eu/web-pkg'
import { computed, unref } from 'vue'
import { RouteLocationRaw } from 'vue-router'

const {
  name,
  icon,
  active = false,
  target = undefined,
  fillType = 'fill',
  collapsed = false,
  handler = undefined
} = defineProps<{
  name: string
  icon: string
  active?: boolean
  target?: RouteLocationRaw
  fillType?: FillType
  collapsed?: boolean
  handler?: () => void
}>()

const router = useRouter()

const attrs = computed(() => {
  return {
    ...(handler && { onClick: handler }),
    ...(target && { to: target })
  }
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
