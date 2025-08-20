<template>
  <span :id="`files-role-${(role as ShareRole).id}`" class="roles-select-role-item">
    <span
      class="font-semibold oc-display-block oc-width-1-1 leading-4"
      v-text="$gettext((role as ShareRole).displayName)"
    />
    <span
      class="m-0 text-sm oc-display-block leading-4"
      v-text="$gettext((role as ShareRole).description)"
    />
  </span>
</template>

<script lang="ts">
import { ShareRole } from '@opencloud-eu/web-client'
import { defineComponent, PropType } from 'vue'

export default defineComponent({
  name: 'RoleItem',
  props: {
    role: {
      type: Object as PropType<ShareRole>,
      required: true
    }
  }
})
</script>

<style lang="scss" scoped>
.roles-select-role-item {
  text-align: left;
}
</style>
