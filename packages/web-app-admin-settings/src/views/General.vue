<template>
  <div>
    <app-template
      ref="template"
      :breadcrumbs="[
        {
          text: $gettext('General')
        }
      ]"
      :show-app-bar="false"
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

<script setup lang="ts">
import AppTemplate from '../components/AppTemplate.vue'
import InfoSection from '../components/General/InfoSection.vue'
import DetailsPanel from '../components/General/SideBar/DetailsPanel.vue'
import { useGettext } from 'vue3-gettext'

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
</script>
