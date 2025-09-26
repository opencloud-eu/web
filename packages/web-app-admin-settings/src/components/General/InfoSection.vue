<template>
  <div>
    <h2 class="py-2" v-text="$gettext('Info')" />
    <oc-definition-list :items="infoItems" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCapabilityStore } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  name: 'InfoSection',
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

    const infoItems = [
      { term: $gettext('OpenCloud'), definition: backendProductName },
      ...(backendEdition ? [{ term: $gettext('Edition'), definition: backendEdition }] : []),
      { term: $gettext('Version'), definition: backendVersion }
    ]

    return {
      backendProductName,
      backendVersion,
      backendEdition,
      infoItems
    }
  }
})
</script>
