<template>
  <oc-card
    tag="li"
    class="app-tile bg-role-surface-container flex flex-col border h-full overflow-hidden shadow-none"
    header-class="p-0"
  >
    <template #header>
      <router-link
        :to="{ name: `${APPID}-details`, params: { appId: encodeURIComponent(app.id) } }"
      >
        <app-image-gallery :app="app" />
      </router-link>
    </template>
    <div class="app-tile-body flex flex-col justify-between h-full">
      <div class="app-tile-content">
        <div class="flex items-center">
          <h3 class="my-2 truncate mark-element app-tile-title">
            <router-link
              :to="{ name: `${APPID}-details`, params: { appId: encodeURIComponent(app.id) } }"
            >
              {{ app.name }}
            </router-link>
          </h3>
          <span class="ml-2 text-role-on-surface-variant text-sm mt-1">
            v{{ app.mostRecentVersion.version }}
          </span>
        </div>
        <p class="my-2 mark-element">{{ app.subtitle }}</p>
      </div>
      <app-tags :app="app" @click="emitSearchTerm" />
      <app-actions :app="app" class="mt-4" />
    </div>
  </oc-card>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { App } from '../types'
import { APPID } from '../appid'
import AppTags from './AppTags.vue'
import AppActions from './AppActions.vue'
import AppImageGallery from './AppImageGallery.vue'

export default defineComponent({
  name: 'AppTile',
  components: { AppImageGallery, AppActions, AppTags },
  props: {
    app: {
      type: Object as PropType<App>,
      required: true,
      default: (): App => undefined
    }
  },
  emits: ['search'],
  setup(props, { emit }) {
    const emitSearchTerm = (term: string) => {
      emit('search', term)
    }

    return {
      emitSearchTerm,
      APPID
    }
  }
})
</script>
