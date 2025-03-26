<template>
  <div>
    <h2 class="oc-py-s" v-text="$gettext('Info')" />
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
    let webClientVersion = ''

    const backendStatus = capabilityStore.status

    if (backendStatus && backendStatus.versionstring) {
      backendProductName = backendStatus.product || 'OpenCloud'
      backendVersion = backendStatus.productversion || backendStatus.versionstring
      webClientVersion = process.env.PACKAGE_VERSION
    }

    const infoItems = [
      { term: $gettext('OpenCloud'), definition: backendProductName },
      { term: $gettext('Version'), definition: backendVersion },
      { term: $gettext('Web client version'), definition: webClientVersion }
    ]

    return {
      backendProductName,
      backendVersion,
      infoItems,
      webClientVersion
    }
  }
})
</script>
