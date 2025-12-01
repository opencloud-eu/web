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
      class="rounded-full h-10 w-10"
      appearance="filled"
      color-role="primary"
      :type="mode === 'action' && items[0]?.to ? 'router-link' : 'button'"
      :to="items[0]?.to"
      @click="onPrimaryButtonClicked"
    >
      <oc-icon :name="expanded ? 'close' : icon" fill-type="line" />
    </oc-button>
  </div>
</template>
<script setup lang="ts">
import { ref, unref } from 'vue'
import { RouteLocationNamedRaw } from 'vue-router'

export interface Props {
  /**
   * @docs The icon of the floating action button element.
   * @default add
   */
  icon?: string
  /**
   * @docs The mode of the floating action button element.
   * @default menu
   */
  mode?: 'action' | 'menu'
  /**
   * @docs The items of the floating action button element.
   */
  items: {
    icon: string
    label: string
    handler?: () => void
    to?: RouteLocationNamedRaw
  }[]
}

const { icon = 'add', mode = 'menu', items } = defineProps<Props>()

const expanded = ref(false)

const onPrimaryButtonClicked = () => {
  if (mode === 'action') {
    items[0]?.handler?.()
    return
  }

  expanded.value = !unref(expanded)
}

const onChildButtonClicked = (item: Props['items'][number]) => {
  item.handler?.()
  expanded.value = false
}
</script>
