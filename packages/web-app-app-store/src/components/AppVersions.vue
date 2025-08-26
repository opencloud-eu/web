<template>
  <oc-table class="oc-width-1-1" :data="data" :fields="fields" padding-x="remove">
    <template #version="{ item }">
      v{{ item.version }}
      <oc-tag v-if="item.version === app.mostRecentVersion.version" size="small" class="ml-2">
        {{ $gettext('most recent') }}
      </oc-tag>
    </template>
    <template #actions="{ item }">
      <app-actions :app="app" :version="item" />
    </template>
  </oc-table>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from 'vue'
import { App } from '../types'
import { useGettext } from 'vue3-gettext'
import AppActions from './AppActions.vue'
import { isEmpty } from 'lodash-es'
import { FieldType } from '@opencloud-eu/design-system/helpers'

export default defineComponent({
  name: 'AppVersions',
  components: { AppActions },
  props: {
    app: {
      type: Object as PropType<App>,
      required: true,
      default: (): App => undefined
    }
  },
  setup(props) {
    const { $gettext } = useGettext()

    const data = computed(() => {
      return (props.app.versions || [])
        .filter((version) => {
          if (isEmpty(version.version) || isEmpty(version.url)) {
            return false
          }
          try {
            new URL(version.url)
          } catch {
            return false
          }
          return true
        })
        .map((version) => {
          return {
            ...version,
            minOpenCloud: version.minOpenCloud ? `v${version.minOpenCloud}` : '-',
            id: version.version
          }
        })
    })
    const fields = computed<FieldType[]>(() => {
      return [
        {
          name: 'version',
          type: 'slot',
          width: 'expand',
          wrap: 'truncate',
          title: $gettext('App Version')
        },
        {
          name: 'minOpenCloud',
          type: 'raw',
          width: 'shrink',
          wrap: 'nowrap',
          title: $gettext('OpenCloud Version')
        },
        {
          name: 'actions',
          type: 'slot',
          alignH: 'right',
          width: 'shrink',
          wrap: 'nowrap',
          title: ''
        }
      ]
    })

    return {
      data,
      fields
    }
  }
})
</script>
