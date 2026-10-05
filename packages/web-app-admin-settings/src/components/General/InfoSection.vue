<template>
  <div>
    <div class="flex items-center">
      <div
        class="flex items-center justify-center bg-role-chrome w-[80px] h-[80px] rounded-full overflow-hidden me-8"
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

<script setup lang="ts">
import { useCapabilityStore, useThemeStore, VersionCheck } from '@opencloud-eu/web-pkg'

const capabilityStore = useCapabilityStore()
const { currentTheme } = useThemeStore()

const backendStatus = capabilityStore.status?.versionstring ? capabilityStore.status : undefined
const backendVersion = backendStatus?.productversion || backendStatus?.versionstring || ''
const backendEdition = backendStatus?.edition || ''
</script>
