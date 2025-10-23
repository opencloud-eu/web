<template>
  <div class="size-full">
    <app-loading-spinner />
  </div>
</template>

<script setup lang="ts">
import { authService } from '../services/auth'
import { queryItemAsString, useRouteQuery, AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import { unref } from 'vue'

const redirectUrl = useRouteQuery('redirectUrl')
authService.loginUser(queryItemAsString(unref(redirectUrl)))
</script>
