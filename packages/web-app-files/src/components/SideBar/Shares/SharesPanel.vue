<template>
  <div>
    <oc-loader v-if="sharesLoading" :aria-label="$gettext('Loading list of shares')" />
    <template v-else>
      <space-members v-if="showSpaceMembers" class="bg-role-surface-container p-4 mb-2" />
      <file-shares v-else class="bg-role-surface-container p-4 mb-2" />
      <file-links v-if="showLinks" class="bg-role-surface-container p-4" />
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import FileLinks from './FileLinks.vue'
import FileShares from './FileShares.vue'
import SpaceMembers from './SpaceMembers.vue'
import { useSharesStore } from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'

export default defineComponent({
  name: 'SharesPanel',
  components: {
    FileLinks,
    FileShares,
    SpaceMembers
  },
  props: {
    showSpaceMembers: { type: Boolean, default: false },
    showLinks: { type: Boolean, default: false }
  },
  setup() {
    const sharesStore = useSharesStore()
    const { loading: sharesLoading } = storeToRefs(sharesStore)

    return {
      sharesLoading
    }
  }
})
</script>
