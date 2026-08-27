<template>
  <div class="min-h-screen overflow-y-auto flex flex-col bg-role-surface-container h-full">
    <announcement />
    <h1 class="sr-only" v-text="pageTitle" />
    <div class="flex grow items-center justify-center">
      <oc-spinner v-if="pathIsRoot" size="large" :aria-label="$gettext('Loading')" />
      <router-view v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useRoute } from 'vue-router'
import { useRouteMeta } from '@opencloud-eu/web-pkg'
import Announcement from '../components/Announcement.vue'

const { $gettext } = useGettext()
const route = useRoute()

const title = useRouteMeta('title')

const pageTitle = computed(() => $gettext(unref(title) || ''))
const pathIsRoot = computed(() => unref(route)?.fullPath === '/')
</script>
