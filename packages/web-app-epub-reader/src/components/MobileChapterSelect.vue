<template>
  <div
    ref="chapterSelectRoot"
    class="epub-reader-controls-chapters-select block min-w-0 max-w-[200px] lg:hidden"
  >
    <oc-button
      id="epub_reader_chapter_toggle"
      class="w-full min-w-0 justify-between px-2.5 py-2"
      appearance="raw"
      no-hover
    >
      <span
        class="min-w-0 flex-1 truncate text-left"
        v-text="selectedChapter?.label || $gettext('Chapter')"
      />
      <oc-icon name="arrow-drop-down" size-class="size-4" />
    </oc-button>
    <oc-drop
      :title="$gettext('Chapter')"
      toggle="#epub_reader_chapter_toggle"
      mode="click"
      close-on-click
      padding-size="small"
      class="w-full"
      @show-drop="scrollSelectedChapterIntoView"
    >
      <oc-list class="max-h-[60vh] overflow-y-auto">
        <li v-for="chapter in chapters" :key="chapter.id">
          <oc-button
            class="epub-reader-chapter-option w-full justify-start"
            :class="{
              'epub-reader-chapter-option-selected': selectedChapter?.id === chapter.id,
              'bg-role-secondary-container text-role-on-secondary-container':
                selectedChapter?.id === chapter.id
            }"
            :aria-current="selectedChapter?.id === chapter.id ? 'true' : undefined"
            appearance="raw"
            @click="onChapterClick(chapter)"
          >
            <span class="truncate" v-text="chapter.label" />
          </oc-button>
        </li>
      </oc-list>
    </oc-drop>
  </div>
</template>

<script setup lang="ts">
import { nextTick, unref, useTemplateRef } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { Chapter } from '../types'

const chapterSelectRoot = useTemplateRef<HTMLElement>('chapterSelectRoot')

defineProps<{
  chapters: Chapter[]
  selectedChapter?: Chapter
}>()

const { $gettext } = useGettext()

const emit = defineEmits<{
  (e: 'update:selectedChapter', value: Chapter): void
}>()

function onChapterClick(chapter: Chapter) {
  emit('update:selectedChapter', chapter)
}

function findSelectedChapter() {
  return (
    unref(chapterSelectRoot)?.querySelector<HTMLElement>('.epub-reader-chapter-option-selected') ||
    document.querySelector<HTMLElement>('.epub-reader-chapter-option-selected')
  )
}

async function scrollSelectedChapterIntoView() {
  await nextTick()
  findSelectedChapter()?.scrollIntoView({ block: 'nearest' })
}
</script>
