<template>
  <oc-status-indicators
    v-if="indicators.length > 0"
    v-bind="attrs"
    :indicators="indicators"
    :resource="resource"
  />
</template>

<script setup lang="ts">
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { getIndicators, ResourceIndicator } from '../../helpers'
import { computed, useAttrs } from 'vue'
import { useResourcesStore, useUserStore } from '../../composables/piniaStores'
import { OcStatusIndicators } from '@opencloud-eu/design-system/components'
import { useInterceptModifierClick } from '../../composables/keyboardActions'

const attrs = useAttrs() as (typeof OcStatusIndicators)['props']
const {
  resource,
  space = undefined,
  filter = undefined
} = defineProps<{
  resource: Resource
  space?: SpaceResource
  filter?: (indicator: ResourceIndicator) => boolean
}>()

const userStore = useUserStore()
const resourcesStore = useResourcesStore()
const { interceptModifierClick } = useInterceptModifierClick()

const indicators = computed(() => {
  const list = getIndicators({
    space,
    resource,
    ancestorMetaData: resourcesStore.ancestorMetaData,
    user: userStore.user,
    interceptModifierClick
  })

  if (filter) {
    return list.filter(filter)
  }

  return list
})
</script>
