<template>
  <h1 v-text="$gettext('App Tokens')" />
</template>
<script setup lang="ts">
import { useGettext } from 'vue3-gettext'

const { $gettext } = useGettext()
</script>
