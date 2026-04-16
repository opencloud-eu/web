<template>
  <div class="flex items-center min-w-0 mb-4">
    <user-avatar
      class="mr-3 shrink-0"
      :width="40"
      :user-id="user.id"
      :user-name="user.displayName"
    />
    <div class="min-w-0">
      <h2 class="font-semibold m-0 text-base truncate" v-text="user.displayName" />
      <span
        class="block text-role-on-surface-variant truncate"
        v-text="user.onPremisesSamAccountName"
      />
    </div>
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
