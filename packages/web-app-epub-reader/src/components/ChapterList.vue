<template>
  <oc-list
    class="hidden lg:block w-80 shrink-0 overflow-y-auto bg-role-surface-container-low p-2 shadow-[8px_0_20px_-14px_rgb(0_0_0_/_0.28)]"
  >
    <li
      v-for="chapter in chapters"
      :key="chapter.id"
      class="epub-reader-chapters-list-item mb-1 rounded-sm"
      :class="{
        'bg-role-secondary-container text-role-on-secondary-container':
          currentChapter?.id === chapter.id
      }"
    >
      <oc-button
        class="max-w-full justify-start px-2 py-1.5"
        :class="{
          'font-semibold': currentChapter?.id === chapter.id
        }"
        appearance="raw"
        no-hover
        @click="onChapterClick(chapter)"
      >
        <span v-oc-tooltip="chapter.label" class="truncate mr-2" v-text="chapter.label" />
      </oc-button>
    </li>
  </oc-list>
</template>

<script setup lang="ts">
import type { NavItem } from 'epubjs'

defineProps<{
  chapters: NavItem[]
  currentChapter?: NavItem
}>()

const emit = defineEmits<{
  (e: 'chapterSelected', chapter: NavItem): void
}>()

function onChapterClick(chapter: NavItem) {
  emit('chapterSelected', chapter)
}
</script>
