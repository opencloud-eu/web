<template>
  <plain-shell class="oc-login" :title="pageTitle">
    <template #banner>
      <announcement class="relative z-1" />
    </template>
    <router-view class="w-full max-w-md" />
  </plain-shell>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useRouteMeta } from '@opencloud-eu/web-pkg'
import Announcement from '../components/Announcement.vue'
import PlainShell from '../components/PlainShell.vue'

const { $gettext } = useGettext()

const title = useRouteMeta('title')

const pageTitle = computed(() => {
  return $gettext(unref(title) || '')
})
</script>
