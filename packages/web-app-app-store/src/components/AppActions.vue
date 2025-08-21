<template>
  <oc-list class="app-actions flex justify-start">
    <action-menu-item
      v-for="action in actions"
      :key="`app-action-${action.name}`"
      size="small"
      :action="action"
      :action-options="{ app, version }"
      :button-classes="['raw-hover-surface']"
    />
  </oc-list>
</template>
<script lang="ts">
import { ActionMenuItem } from '@opencloud-eu/web-pkg'
import { useAppActionsDownload } from '../composables'
import { computed, defineComponent, PropType } from 'vue'
import { App, AppVersion } from '../types'

export default defineComponent({
  name: 'AppActions',
  components: { ActionMenuItem },
  props: {
    app: {
      type: Object as PropType<App>,
      required: true,
      default: (): App => undefined
    },
    version: {
      type: Object as PropType<AppVersion>,
      required: false,
      default: null
    }
  },
  setup() {
    const { downloadAppAction } = useAppActionsDownload()

    const actions = computed(() => {
      return [downloadAppAction]
    })

    return {
      actions
    }
  }
})
</script>

<style lang="scss">
.app-actions {
  gap: 1rem;
}
</style>
