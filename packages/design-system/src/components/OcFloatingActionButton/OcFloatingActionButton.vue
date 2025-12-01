<template>
  <div class="fixed flex flex-col items-end bottom-[20px] right-[20px]">
    <template v-if="expanded">
      <oc-button
        v-for="item in items"
        :key="item.label"
        class="mb-2 rounded-full"
        appearance="filled"
        color-role="primary"
        :type="item.to ? 'router-link' : 'button'"
        :to="item.to"
        @click="onChildButtonClicked(item)"
      >
        <oc-icon :name="item.icon" />
        <span v-text="item.label" />
      </oc-button>
    </template>
    <oc-button
      class="rounded-full size-14"
      appearance="filled"
      color-role="primary"
      :aria-label="computedAriaLabel"
      :type="mode === 'action' && to ? 'router-link' : 'button'"
      :to="to"
      @click="onPrimaryButtonClicked"
    >
      <oc-icon :name="expanded ? 'close' : 'add'" fill-type="line" />
    </oc-button>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, unref } from 'vue'
import { RouteLocationRaw } from 'vue-router'
import { useGettext } from 'vue3-gettext'

export interface Props {
  /**
   * @docs The aria label of the primary action button.
   */
  ariaLabel?: string
  /**
   * @docs The mode of the floating action button.
   * @default menu
   */
  mode?: 'action' | 'menu'
  /**
   * @docs The route location of the primary action button when the `mode` is set to `action`.
   */
  to?: RouteLocationRaw
  /**
   * @docs The handler of the primary action button when the `mode` is set to `action`.
   */
  handler?: () => void
  /**
   * @docs The menu items of the floating action button element.
   */
  items?: {
    icon: string
    label: string
    handler?: () => void
    to?: RouteLocationRaw
  }[]
}

const {
  mode = 'menu',
  ariaLabel = '',
  items = [],
  handler = null,
  to = null
} = defineProps<Props>()

const { $gettext } = useGettext()

const expanded = ref(false)

const computedAriaLabel = computed(() => {
  return ariaLabel ? ariaLabel : $gettext('Open actions menu')
})

const onPrimaryButtonClicked = () => {
  if (mode === 'action') {
    handler?.()
    return
  }

  expanded.value = !unref(expanded)
}

const onChildButtonClicked = (item: Props['items'][number]) => {
  item.handler?.()
  expanded.value = false
}
</script>
