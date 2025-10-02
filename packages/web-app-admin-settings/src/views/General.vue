<template>
  <div>
    <app-template
      ref="template"
      :breadcrumbs="breadcrumbs"
      :show-app-bar="false"
      :is-side-bar-open="isSideBarOpen"
      :side-bar-active-panel="sideBarActivePanel"
      :side-bar-available-panels="sideBarAvailablePanels"
    >
      <template #mainContent>
        <div class="px-4">
          <InfoSection />
        </div>
      </template>
    </app-template>
  </div>
</template>

<script lang="ts">
import { ComponentPublicInstance, defineComponent, useTemplateRef } from 'vue'
import AppTemplate from '../components/AppTemplate.vue'
import InfoSection from '../components/General/InfoSection.vue'
import DetailsPanel from '../components/General/SideBar/DetailsPanel.vue'
import { useGettext } from 'vue3-gettext'
import { useSideBar } from '@opencloud-eu/web-pkg'

export default defineComponent({
  components: {
    AppTemplate,
    InfoSection
  },
  setup() {
    const template = useTemplateRef<ComponentPublicInstance<typeof AppTemplate>>('template')
    const { $gettext } = useGettext()

    const sideBarAvailablePanels = [
      {
        name: 'DetailsPanel',
        icon: 'settings-4',
        title: () => $gettext('Details'),
        component: DetailsPanel,
        isRoot: () => true,
        isVisible: () => true
      }
    ]

    return {
      template,
      sideBarAvailablePanels,
      ...useSideBar()
    }
  },
  computed: {
    breadcrumbs() {
      return [
        { text: this.$gettext('Administration Settings'), to: { path: '/admin-settings' } },
        {
          text: this.$gettext('General')
        }
      ]
    }
  }
})
</script>
