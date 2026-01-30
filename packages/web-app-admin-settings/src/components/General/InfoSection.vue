<template>
  <div>
    <h2 class="py-2" v-text="$gettext('Info')" />
    <dl class="details-list grid grid-cols-[auto_minmax(0,1fr)]">
      <template v-if="backendEdition">
        <dt v-text="$gettext('Edition')" />
        <dd v-text="backendEdition" />
      </template>
      <dt class="flex items-start" v-text="$gettext('Version')" />
      <dd>
        <div class="flex flex-col">
          <span v-text="backendVersion" />
          <version-check />
        </div>
      </dd>
    </dl>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCapabilityStore, VersionCheck } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  name: 'InfoSection',
  components: { VersionCheck },
  setup() {
    const capabilityStore = useCapabilityStore()
    const { $gettext } = useGettext()

    let backendProductName = ''
    let backendVersion = ''
    let backendEdition = ''

    const backendStatus = capabilityStore.status

    if (backendStatus && backendStatus.versionstring) {
      backendProductName = backendStatus.product || 'OpenCloud'
      backendVersion = backendStatus.productversion || backendStatus.versionstring
      backendEdition = backendStatus.edition
    }

    return {
      backendProductName,
      backendVersion,
      backendEdition
    }
  }
})
</script>
