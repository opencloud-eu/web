<template>
  <div>
    <oc-loader v-if="sharesLoading || !resource" :aria-label="$gettext('Loading list of shares')" />
    <template v-else>
      <space-members v-if="showSpaceMembers" class="px-2 py-2" />
      <file-shares v-else class="px-2 py-2" />
      <file-links v-if="showLinks" class="px-2 py-2" />
    </template>
  </div>
</template>

<script setup lang="ts">
import FileLinks from './FileLinks.vue'
import FileShares from './FileShares.vue'
import SpaceMembers from './SpaceMembers.vue'
import { useSharesStore } from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'
import { storeToRefs } from 'pinia'
import { inject, Ref } from 'vue'

const { showSpaceMembers = false, showLinks = false } = defineProps<{
  showSpaceMembers?: boolean
  showLinks?: boolean
}>()

// the sidebar resource is null while it is still loading, e.g. when the space's
// permissions are fetched first, and the panels below require it
const resource = inject<Ref<Resource>>('resource')

const sharesStore = useSharesStore()
const { loading: sharesLoading } = storeToRefs(sharesStore)
</script>
