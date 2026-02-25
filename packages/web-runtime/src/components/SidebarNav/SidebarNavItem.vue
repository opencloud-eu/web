<template>
  <li class="oc-sidebar-nav-item pb-1 px-2" :aria-current="active ? 'page' : null">
    <oc-button
      :type="handler ? 'button' : 'router-link'"
      :appearance="active ? 'filled' : 'raw-inverse'"
      color-role="secondaryContainer"
      :justify-content="'space-between'"
      :class="[
        'oc-sidebar-nav-item-link',
        'relative',
        'w-full',
        'whitespace-nowrap',
        'p-2',
        'opacity-100',
        'select-none',
        { 'active overflow-hidden': active },
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
        <span class="ml-4 text" :class="{ 'text-invisible opacity-0': collapsed }" v-text="name" />
      </span>
    </oc-button>
  </li>
</template>
<script lang="ts">
import { FillType } from '@opencloud-eu/design-system/helpers'
import { useRouter } from '@opencloud-eu/web-pkg'
import { computed, defineComponent, PropType, unref } from 'vue'
import { RouteLocationRaw } from 'vue-router'

export default defineComponent({
  props: {
    name: {
      type: String,
      required: true
    },
    active: {
      type: Boolean,
      required: false,
      default: false
    },
    target: {
      type: [String, Object] as PropType<RouteLocationRaw>,
      required: false,
      default: null
    },
    icon: {
      type: String,
      required: true
    },
    fillType: {
      type: String as PropType<FillType>,
      required: false,
      default: 'fill'
    },
    collapsed: {
      type: Boolean,
      required: false,
      default: false
    },
    handler: {
      type: Function as PropType<() => void>,
      required: false,
      default: null
    }
  },
  setup(props) {
    const router = useRouter()

    const attrs = computed(() => {
      return {
        ...(props.handler && { onClick: props.handler }),
        ...(props.target && { to: props.target })
      }
    })

    const navName = computed(() => {
      if (props.target) {
        return router?.resolve(props.target, unref(router.currentRoute))?.name || 'route.name'
      }
      return props.name
    })

    return { attrs, navName }
  }
})
</script>
