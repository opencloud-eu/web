<template>
  <portal-target-vue v-bind="properties" />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { eventBus } from '../services'
import { PortalTargetEventTopics } from '../composables/portalTarget'
import { PortalTarget as PortalTargetVue } from 'portal-vue'

const props = { ...PortalTargetVue.props }
const properties = computed<typeof PortalTargetVue.props>(() => props)
onMounted(() => {
  eventBus.publish(PortalTargetEventTopics.mounted, props)
})
</script>
