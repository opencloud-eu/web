<template>
  <div>
    <div class="flex items-center">
      <div
        class="flex items-center justify-center bg-role-chrome w-[80px] h-[80px] rounded-full overflow-hidden mr-8"
      >
        <img :src="currentTheme.logo" class="px-2" alt="OpenCloud logo" />
      </div>
      <dl class="details-list">
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
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCapabilityStore, useThemeStore, VersionCheck } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'InfoSection',
  components: { VersionCheck },
  setup() {
    const capabilityStore = useCapabilityStore()
    const { currentTheme } = useThemeStore()

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
      backendEdition,
      currentTheme
    }
  }
})
</script>
