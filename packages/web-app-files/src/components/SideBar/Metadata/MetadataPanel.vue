<template>
  <div id="files-sidebar-panel-metadata" class="rounded-sm p-4 bg-role-surface-container">
    <div v-if="loading" class="flex justify-center">
      <oc-spinner :aria-label="$gettext('Loading metadata')" />
    </div>
    <div v-else-if="error" class="text-role-on-surface-variant">
      {{ $gettext('Could not load metadata.') }}
    </div>
    <div v-else-if="isEmpty" class="text-role-on-surface-variant">
      {{ $gettext('No metadata available.') }}
    </div>
    <dl
      v-else
      class="details-list grid grid-cols-[auto_minmax(0,1fr)] m-0"
      :aria-label="$gettext('Custom metadata for the selected item')"
    >
      <template v-for="(value, key) in metadata" :key="key">
        <dt class="font-medium" :data-testid="`metadata-key-${key}`">{{ formatKey(key) }}</dt>
        <dd :data-testid="`metadata-value-${key}`">{{ value || '-' }}</dd>
      </template>
    </dl>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, inject, onMounted, ref, Ref, unref, watch } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useClientService } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'MetadataPanel',
  setup() {
    const resource = inject<Ref<Resource>>('resource')
    const space = inject<Ref<SpaceResource>>('space')
    const clientService = useClientService()

    const metadata = ref<Record<string, string>>({})
    const loading = ref(false)
    const error = ref(false)

    const isEmpty = computed(() => Object.keys(unref(metadata)).length === 0)

    const formatKey = (key: string): string => {
      // Strip common prefixes for display
      // "oy.subject" → "Subject", "oy.creatorName" → "Creator Name"
      let display = key
      if (display.startsWith('oy.')) {
        display = display.substring(3)
      }
      // camelCase to Title Case
      display = display.replace(/([A-Z])/g, ' $1')
      return display.charAt(0).toUpperCase() + display.slice(1)
    }

    const fetchMetadata = async () => {
      const res = unref(resource)
      const sp = unref(space)
      if (!res?.id || !sp?.id) return

      loading.value = true
      error.value = false
      try {
        const httpClient = clientService.httpAuthenticated
        const response = await httpClient.get(
          `/graph/v1.0/drives/${sp.id}/items/${res.id}/metadata`
        )
        if (response.status === 200) {
          metadata.value = response.data as Record<string, string>
        } else {
          metadata.value = {}
        }
      } catch (e) {
        error.value = true
        metadata.value = {}
      } finally {
        loading.value = false
      }
    }

    onMounted(fetchMetadata)

    watch(
      () => unref(resource)?.id,
      () => fetchMetadata()
    )

    return {
      metadata,
      loading,
      error,
      isEmpty,
      formatKey
    }
  }
})
</script>
