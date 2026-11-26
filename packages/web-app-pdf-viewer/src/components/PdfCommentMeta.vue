<template>
  <span class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
    <span
      class="size-2.5 shrink-0 rounded-full border border-role-outline-variant"
      :style="{ backgroundColor: getCommentColor(comment) ?? 'transparent' }"
    />
    <time
      class="shrink-0 text-xs text-role-on-surface-variant"
      :datetime="date?.toISOString()"
      v-text="date ? formatDateFromJSDate(date, language.current) : ''"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { formatDateFromJSDate } from '@opencloud-eu/web-pkg'
import { getCommentColor, getCommentDate, type CommentData } from '../helpers/comments'

const { comment } = defineProps<{ comment: CommentData }>()

const language = useGettext()
// Date and time like elsewhere in OpenCloud, e.g. "Oct 8, 2026, 7:46 PM".
const date = computed(() => getCommentDate(comment))
</script>
