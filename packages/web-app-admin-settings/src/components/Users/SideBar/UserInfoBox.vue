<template>
  <div class="oc-flex user-info oc-mb-l">
    <user-avatar class="oc-mb-m" :width="80" :user-id="user.id" :user-name="user.displayName" />
    <span v-text="user.onPremisesSamAccountName"></span>
    <span class="oc-text-muted user-info-display-name" v-text="user.displayName"></span>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import UserAvatar from '@opencloud-eu/web-pkg/src/components/Avatars/UserAvatar.vue'

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

.user-info-display-name {
  font-size: 1.5rem;
}
</style>
