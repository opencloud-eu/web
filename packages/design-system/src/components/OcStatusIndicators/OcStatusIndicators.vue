<template>
  <div class="oc-status-indicators flex items-center gap-0.5">
    <template v-for="(indicator, index) in indicators">
      <template v-if="indicator.kind === 'tag'">
        <oc-tag
          :id="indicator.id"
          :key="indicator.id"
          :class="indicator.class"
          :aria-describedby="getIndicatorDescriptionId(indicator)"
          appearance="filled"
          class="border-0 !rounded-sm"
          size="small"
          :data-testid="indicator.id"
          :data-test-indicator-type="indicator.type"
          :data-test-indicator-resource-name="resource.name"
          :data-test-indicator-resource-path="resource.path"
        >
          <span v-text="indicator.label" />
        </oc-tag>
      </template>
      <template v-if="indicator.kind === 'icon'">
        <oc-button
          v-if="hasHandler(indicator) && !disableHandler"
          :id="indicator.id"
          :key="`${indicator.id}-handler`"
          v-oc-tooltip="$gettext(indicator.label)"
          class="oc-status-indicators-indicator"
          :class="{ 'ml-1': index > 0 }"
          :aria-label="$gettext(indicator.label)"
          :aria-describedby="getIndicatorDescriptionId(indicator)"
          appearance="raw"
          :data-testid="indicator.id"
          :data-test-indicator-type="indicator.type"
          :data-test-indicator-resource-name="resource.name"
          :data-test-indicator-resource-path="resource.path"
          no-hover
          @click="(e: MouseEvent) => indicator.handler?.(resource, e)"
        >
          <oc-icon :name="indicator.icon" size="small" :fill-type="indicator.fillType" />
        </oc-button>
        <oc-icon
          v-else
          :id="indicator.id"
          :key="indicator.id"
          v-oc-tooltip="$gettext(indicator.label)"
          tabindex="-1"
          size="small"
          class="oc-status-indicators-indicator"
          :class="{ 'ml-1': index > 0 }"
          :name="indicator.icon"
          :fill-type="indicator.fillType"
          :accessible-label="$gettext(indicator.label)"
          :aria-describedby="getIndicatorDescriptionId(indicator)"
          :data-testid="indicator.id"
          :data-test-indicator-type="indicator.type"
        />
      </template>
      <p
        v-if="getIndicatorDescriptionId(indicator)"
        :id="getIndicatorDescriptionId(indicator)"
        :key="getIndicatorDescriptionId(indicator)"
        class="sr-only"
        v-text="$gettext(indicator.accessibleDescription)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, unref } from 'vue'
import { FillType, uniqueId } from '../../helpers'
import { useGettext } from 'vue3-gettext'
import OcIcon from '../OcIcon/OcIcon.vue'
import OcButton from '../OcButton/OcButton.vue'

export type Indicator = IndicatorIcon | IndicatorTag

export interface IndicatorIcon {
  id: string
  icon: string
  label: string
  handler?: (...args: any) => void
  accessibleDescription?: string
  type?: string
  fillType?: FillType
  kind: 'icon'
}

export interface IndicatorTag {
  id: string
  label: string
  accessibleDescription?: string
  type?: string
  class?: string
  kind: 'tag'
}

export interface Props {
  /**
   * @docs The resource that the indicators are related to.
   */
  resource: { id?: string; name?: string; path?: string }
  /**
   * @docs The indicators to be displayed. Please refer to the component source code for the `Indicator` type definition.
   */
  indicators: Indicator[]
  /**
   * @docs Determines if the click handler on the indicators should be disabled.
   * @default false
   */
  disableHandler?: boolean
}

const { resource, indicators, disableHandler = false } = defineProps<Props>()

const { $gettext } = useGettext()

const accessibleDescriptionIds = ref({} as Record<string, string>)

const hasHandler = (indicator: Indicator): boolean => {
  return Object.hasOwn(indicator, 'handler')
}

const getIndicatorDescriptionId = (indicator: Indicator): string | null => {
  if (!indicator.accessibleDescription) {
    return null
  }

  if (!unref(accessibleDescriptionIds)[indicator.id]) {
    unref(accessibleDescriptionIds)[indicator.id] = uniqueId('oc-indicator-description-')
  }

  return unref(accessibleDescriptionIds)[indicator.id]
}
</script>
