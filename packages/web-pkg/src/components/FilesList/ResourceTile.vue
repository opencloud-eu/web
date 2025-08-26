<template>
  <div
    ref="observerTarget"
    class="oc-tile-card oc-card flex flex-col"
    :data-item-id="resource.id"
    :class="{
      'oc-tile-card-selected bg-role-secondary-container outline-2 outline-role-outline':
        isResourceSelected,
      'bg-role-surface-container hover:bg-role-surface-container-highest outline outline-role-surface-container-highest':
        !isResourceSelected,
      'oc-tile-card-disabled': isResourceDisabled && !isProjectSpaceResource(resource),
      'state-trashed': isResourceDisabled && isProjectSpaceResource(resource)
    }"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <div v-if="isHidden" class="oc-tile-card-lazy-shimmer"></div>
    <template v-else>
      <resource-link
        class="oc-card-media-top flex justify-center items-center m-0 w-full"
        :resource="resource"
        :link="resourceRoute"
        :is-resource-clickable="isResourceClickable"
        tabindex="-1"
        @click="$emit('click')"
      >
        <div class="oc-tile-card-selection">
          <div v-if="isLoading" class="oc-tile-card-loading-spinner m-2">
            <oc-spinner :aria-label="$gettext('File is being processed')" />
          </div>
          <slot v-else name="selection" :item="resource" />
        </div>
        <oc-tag
          v-if="isResourceDisabled && isProjectSpaceResource(resource)"
          class="resource-disabled-indicator oc-position-absolute text-role-on-surface"
          type="span"
        >
          <span v-text="$gettext('Disabled')" />
        </oc-tag>
        <div
          v-oc-tooltip="tooltipLabelIcon"
          class="oc-tile-card-preview flex items-center justify-center text-center size-full"
          :class="{ 'p-2': isResourceSelected }"
          :aria-label="tooltipLabelIcon"
        >
          <slot name="imageField" :item="resource">
            <oc-image
              v-if="resource.thumbnail"
              class="tile-preview rounded-t-sm w-full"
              :class="{ 'rounded-sm': isResourceSelected }"
              :src="resource.thumbnail"
              @click="toggleTile([resource, $event])"
            />
            <resource-icon
              v-else
              :resource="resource"
              :size="resourceIconSize"
              class="tile-default-image pt-1"
            >
              <template v-if="showStatusIcon" #status>
                <oc-icon v-bind="statusIconAttrs" size="xsmall" />
              </template>
            </resource-icon>
          </slot>
        </div>
      </resource-link>
      <div class="oc-card-body p-2" @click.stop="toggleTile([resource, $event])">
        <div class="flex justify-between items-center">
          <div class="flex items-center truncate resource-name-wrapper text-role-on-surface">
            <resource-list-item
              :resource="resource"
              :is-icon-displayed="false"
              :is-extension-displayed="isExtensionDisplayed"
              :is-resource-clickable="isResourceClickable"
              :link="resourceRoute"
              @click.stop="$emit('click')"
            />
          </div>
          <div class="flex items-center">
            <!-- Slot for indicators !-->
            <slot name="indicators" :item="resource" class="resource-indicators" />
            <!-- Slot for individual actions -->
            <slot name="actions" :item="resource" />
            <!-- Slot for contextmenu -->
            <slot name="contextMenu" :item="resource" />
          </div>
        </div>
        <p v-if="resourceDescription" class="text-left my-0 truncate">
          <small v-text="resourceDescription" />
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, customRef, ref, unref } from 'vue'
import ResourceIcon from './ResourceIcon.vue'
import ResourceListItem from './ResourceListItem.vue'
import ResourceLink from './ResourceLink.vue'
import { isProjectSpaceResource, Resource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import { isSpaceResource } from '@opencloud-eu/web-client'
import { RouteLocationRaw } from 'vue-router'
import { useIsVisible } from '@opencloud-eu/design-system/composables'
import { SizeType } from '@opencloud-eu/design-system/helpers'
import { useToggleTile } from '../../composables/selection'

const {
  resource,
  resourceRoute,
  isResourceSelected = false,
  isResourceClickable = true,
  isResourceDisabled = false,
  isExtensionDisplayed = true,
  resourceIconSize = 'xlarge',
  lazy = false,
  isLoading = false
} = defineProps<{
  resource?: Resource
  resourceRoute?: RouteLocationRaw
  isResourceSelected?: boolean
  isResourceClickable?: boolean
  isResourceDisabled?: boolean
  isExtensionDisplayed?: boolean
  resourceIconSize?: SizeType
  lazy?: boolean
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'contextmenu', event: MouseEvent | KeyboardEvent): void
  (e: 'itemVisible'): void
}>()

defineSlots<{
  actions?: (props: { item: Resource }) => unknown
  contextMenu?: (props: { item: Resource }) => unknown
  imageField?: (props: { item: Resource }) => unknown
  indicators?: (props: { item: Resource }) => unknown
  selection?: (props: { item: Resource }) => unknown
}>()

const { toggleTile } = useToggleTile()
const { $gettext } = useGettext()

const observerTarget = customRef((track, trigger) => {
  let $el: HTMLElement
  return {
    get() {
      track()
      return $el
    },
    set(value) {
      $el = value
      trigger()
    }
  }
})

const showStatusIcon = computed(() => {
  return resource.locked || resource.processing
})

const statusIconAttrs = computed(() => {
  if (resource.locked) {
    return {
      name: 'lock',
      fillType: 'fill' as const
    }
  }

  if (resource.processing) {
    return {
      name: 'loop-right',
      fillType: 'line' as const
    }
  }

  return {}
})

const tooltipLabelIcon = computed(() => {
  if (resource.locked) {
    return $gettext('This item is locked')
  }
  return null
})
const resourceDescription = computed(() => {
  if (isSpaceResource(resource)) {
    return resource.description
  }
  return ''
})

const { isVisible } = lazy
  ? useIsVisible({
      target: observerTarget,
      onVisibleCallback: () => emit('itemVisible')
    })
  : { isVisible: ref(true) }

const isHidden = computed(() => !unref(isVisible))

if (!lazy) {
  emit('itemVisible')
}
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .oc-tile-card-selection input {
    background-color: var(--oc-role-surface-container);
  }
  .oc-tile-card:hover .tile-preview {
    @apply rounded-sm;
  }
  .oc-tile-card:hover .oc-tile-card-preview {
    @apply p-2;
  }
}
</style>
<style lang="scss">
.oc-tile-card {
  box-shadow: none;
  height: 100%;

  &-disabled {
    pointer-events: none;
    opacity: 0.7;
    filter: grayscale(0.6);

    // Show tooltip on status indicators without handler
    span.oc-status-indicators-indicator {
      pointer-events: all;
    }
  }

  &-loading-spinner {
    z-index: 99;
  }

  &.state-trashed {
    .tile-image,
    .tile-default-image > svg {
      filter: grayscale(100%);
      opacity: 80%;
    }
  }

  .tile-default-image {
    position: relative;
  }

  .oc-card-media-top {
    position: relative;
    aspect-ratio: 16/9;
    justify-content: center;

    .oc-tag {
      &.resource-disabled-indicator {
        z-index: 1;
      }
    }

    .tile-preview {
      aspect-ratio: 16/9;
      height: 100%;
      object-fit: cover;
    }
  }

  &-selection {
    z-index: 1;
    position: absolute;
    top: 0;
    left: 0;
  }

  &-preview {
    position: absolute;
  }

  .resource-name-wrapper {
    overflow: hidden;
  }

  &-lazy-shimmer {
    height: 120px;
    opacity: 0.2;
    position: relative;
    overflow: hidden;
  }

  &-lazy-shimmer::after {
    animation: shimmer 2s infinite;
    background-image: linear-gradient(
      90deg,
      rgba(#4c5f79, 0) 0,
      rgba(#4c5f79, 0.2) 20%,
      rgba(#4c5f79, 0.5) 60%,
      rgba(#4c5f79, 0)
    );
    bottom: 0;
    content: '';
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
    transform: translateX(-100%);
  }

  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }
}
</style>
