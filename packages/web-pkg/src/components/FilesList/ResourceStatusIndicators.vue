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
import { computed, useAttrs } from 'vue'
import { OcStatusIndicators } from '@opencloud-eu/design-system/components'
import { ResourceIndicator, useResourceIndicators } from '../../composables'

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

const { getIndicators } = useResourceIndicators()

const indicators = computed(() => {
  const list = getIndicators({ space, resource })
  if (filter) {
    return list.filter(filter)
  }

  return list
})
</script>
