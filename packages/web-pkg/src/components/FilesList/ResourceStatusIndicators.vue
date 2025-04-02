<template>
  <oc-status-indicators v-if="indicators.length > 0" v-bind="attrs" :indicators="indicators" />
</template>

<script setup lang="ts">
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { ResourceIndicator, getIndicators } from '../../helpers'
import { computed, useAttrs } from 'vue'
import { useResourcesStore, useUserStore } from '../../composables/piniaStores'
import { OcStatusIndicators } from '@opencloud-eu/design-system/components'

const attrs = useAttrs() as (typeof OcStatusIndicators)['props']
const { space, resource, filter } = defineProps<{
  space: SpaceResource
  resource: Resource
  filter?: (indicator: ResourceIndicator) => boolean
}>()

const userStore = useUserStore()
const resourcesStore = useResourcesStore()
const indicators = computed(() => {
  const list = getIndicators({
    space,
    resource,
    ancestorMetaData: resourcesStore.ancestorMetaData,
    user: userStore.user
  })

  if (filter) {
    return list.filter(filter)
  }

  return list
})
</script>
