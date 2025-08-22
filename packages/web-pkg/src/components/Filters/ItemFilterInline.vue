<template>
  <div>
    <div class="item-inline-filter inline-flex" :class="`item-inline-filter-${filterName}`">
      <oc-button
        v-for="(option, index) in filterOptions"
        :id="option.name"
        :key="index"
        class="item-inline-filter-option py-1 px-2 text-xs"
        :class="{
          'item-inline-filter-option-selected': activeOption === option.name
        }"
        :appearance="activeOption === option.name ? 'filled' : 'raw-inverse'"
        :color-role="activeOption === option.name ? 'secondaryContainer' : 'surface'"
        :no-hover="activeOption === option.name"
        @click="toggleFilter(option)"
      >
        <span class="truncate item-inline-filter-option-label" v-text="option.label" />
      </oc-button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, unref } from 'vue'
import omit from 'lodash-es/omit'
import { useRoute, useRouteQuery, useRouter, queryItemAsString } from '../../composables'
import { PropType } from 'vue'
import { InlineFilterOption } from './types'

export default defineComponent({
  name: 'ItemFilterInline',
  props: {
    filterName: {
      type: String,
      required: true
    },
    filterOptions: {
      type: Array as PropType<InlineFilterOption[]>,
      required: true
    }
  },
  emits: ['toggleFilter'],
  setup: function (props, { emit }) {
    const router = useRouter()
    const currentRoute = useRoute()
    const activeOption = ref<string>(props.filterOptions[0].name)

    const queryParam = `q_${props.filterName}`
    const currentRouteQuery = useRouteQuery(queryParam)
    const setRouteQuery = (optionName: string) => {
      return router.push({
        query: {
          ...omit(unref(currentRoute).query, [queryParam]),
          [queryParam]: optionName
        }
      })
    }

    const toggleFilter = async (option: InlineFilterOption) => {
      activeOption.value = option.name
      await setRouteQuery(option.name)
      emit('toggleFilter', option)
    }

    onMounted(() => {
      const queryStr = queryItemAsString(unref(currentRouteQuery))
      if (queryStr && props.filterOptions.some(({ name }) => name === queryStr)) {
        activeOption.value = queryStr
        emit(
          'toggleFilter',
          props.filterOptions.find(({ name }) => name === queryStr)
        )
      }
    })

    return {
      queryParam,
      activeOption,
      toggleFilter
    }
  }
})
</script>
<style lang="scss">
.item-inline-filter {
  border-radius: 99px;
  border: 1px solid var(--oc-role-outline);

  button {
    height: 24px;
  }

  button:first-child {
    border-top-left-radius: 99px !important;
    border-bottom-left-radius: 99px !important;
    border-top-right-radius: 0px !important;
    border-bottom-right-radius: 0px !important;
  }
  button:last-child {
    border-top-left-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
    border-top-right-radius: 99px !important;
    border-bottom-right-radius: 99px !important;
  }
}
</style>
