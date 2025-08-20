<template>
  <div class="flex user-info mb-6">
    <user-avatar class="mb-4" :width="80" :user-id="user.id" :user-name="user.displayName" />
    <span v-text="user.onPremisesSamAccountName"></span>
    <span class="oc-text-muted user-info-display-name text-2xl" v-text="user.displayName"></span>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import { UserAvatar } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'UserInfoBox',
  components: { UserAvatar },
  props: {
    user: {
      type: Object,
      required: true
    }
  }
})
</script>
<style lang="scss">
.user-info {
  align-items: center;
  flex-direction: column;
}
</style>
