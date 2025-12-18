<template>
  <component
    :is="isNavigatable ? 'router-link' : 'oc-button'"
    v-if="isResourceClickable"
    :to="isNavigatable ? link : undefined"
    :target="isNavigatable ? linkTarget : undefined"
    :rel="isNavigatable && linkTarget === '_blank' ? 'noopener noreferrer' : undefined"
    :appearance="!isNavigatable ? 'raw' : undefined"
    :gap-size="!isNavigatable ? 'none' : undefined"
    :justify-content="!isNavigatable ? 'left' : undefined"
    :type="!isNavigatable ? 'button' : undefined"
    :no-hover="!isNavigatable ? true : undefined"
    :draggable="false"
    class="oc-resource-link max-w-full"
    @dragstart.prevent.stop
    @click="emitClick"
  >
    <slot />
  </component>
  <span v-else>
    <slot />
  </span>
</template>

<script lang="ts">
import { useConfigStore } from '../../composables'
import { storeToRefs } from 'pinia'
import { computed, PropType, unref } from 'vue'
import { RouteLocationRaw } from 'vue-router'

/**
 * Wraps content in a resource link
 */
export default {
  name: 'ResourceLink',
  props: {
    /**
     * The resource folder link
     */
    link: {
      type: Object as PropType<RouteLocationRaw>,
      required: false,
      default: null
    },
    /**
     * The resource to be displayed
     */
    resource: {
      type: Object,
      required: true
    },
    /**
     * Asserts whether clicking on the resource name triggers any action
     */
    isResourceClickable: {
      type: Boolean,
      required: false,
      default: true
    }
  },
  emits: ['click'],
  setup: (props) => {
    const configStore = useConfigStore()
    const { options } = storeToRefs(configStore)

    const linkTarget = computed(() => {
      return unref(options).cernFeatures && props.link && !props.resource.isFolder
        ? '_blank'
        : '_self'
    })

    return {
      linkTarget
    }
  },
  computed: {
    isNavigatable() {
      if (!this.resource) {
        return false
      }
      return this.link && !this.resource.disabled
    },
    isClickable() {
      return this.isResourceClickable && !this.resource?.disabled
    }
  },
  methods: {
    emitClick(e: MouseEvent) {
      if (!e || typeof e.stopPropagation !== 'function') {
        return
      }
      if (this.isNavigatable) {
        return
      }
      /**
       * Triggered when the resource is a file and the name is clicked
       */
      this.$emit('click', e)
    }
  }
}
</script>
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-resource-link {
    @apply inline-flex;
  }
}
</style>
