<template>
  <ul class="mb-0 p-0">
    <li v-for="resource in resources" :key="resource.label">
      <a
        :href="resource.url"
        data-testid="resource-link"
        target="_blank"
        class="inline-flex items-center"
      >
        <oc-icon
          v-if="resource.icon"
          data-testid="resource-icon"
          :name="resource.icon"
          size="medium"
          class="mr-1"
        />
        <span data-testid="resource-label">{{ resource.label }}</span>
      </a>
    </li>
  </ul>
</template>
<script lang="ts">
import { computed, defineComponent, PropType } from 'vue'
import { App } from '../types'
import { isEmpty } from 'lodash-es'

export default defineComponent({
  name: 'AppResources',
  props: {
    app: {
      type: Object as PropType<App>,
      required: true,
      default: (): App => undefined
    }
  },
  setup(props) {
    const resources = computed(() => {
      return (props.app.resources || []).filter((resource) => {
        if (isEmpty(resource.url) || isEmpty(resource.label)) {
          return false
        }
        try {
          new URL(resource.url)
        } catch {
          return false
        }
        return true
      })
    })

    return {
      resources
    }
  }
})
</script>
