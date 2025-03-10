<template>
  <div class="oc-status-indicators">
    <template v-for="indicator in indicators">
      <oc-button
        v-if="hasHandler(indicator) && !disableHandler"
        :id="indicator.id"
        :key="`${indicator.id}-handler`"
        v-oc-tooltip="$gettext(indicator.label)"
        class="oc-status-indicators-indicator oc-ml-xs"
        :aria-label="$gettext(indicator.label)"
        :aria-describedby="getIndicatorDescriptionId(indicator)"
        appearance="raw"
        :data-testid="indicator.id"
        :data-test-indicator-type="indicator.type"
        no-hover
        @click="indicator.handler(resource)"
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
        class="oc-status-indicators-indicator oc-ml-xs"
        :name="indicator.icon"
        :fill-type="indicator.fillType"
        :accessible-label="$gettext(indicator.label)"
        :aria-describedby="getIndicatorDescriptionId(indicator)"
        :data-testid="indicator.id"
        :data-test-indicator-type="indicator.type"
      />
      <p
        v-if="getIndicatorDescriptionId(indicator)"
        :id="getIndicatorDescriptionId(indicator)"
        :key="getIndicatorDescriptionId(indicator)"
        class="oc-invisible-sr"
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

export interface Indicator {
  id: string
  icon: string
  label: string
  handler?: any
  accessibleDescription?: string
  visible?: boolean
  type?: string
  fillType?: FillType
}

export interface Props {
  /**
   * @docs The resource that the indicators are related to.
   */
  resource: Record<string, unknown>
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
