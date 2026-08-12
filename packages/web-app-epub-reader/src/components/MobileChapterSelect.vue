<template>
  <div class="epub-reader-controls-chapters-select block min-w-0 max-w-[200px] lg:hidden">
    <oc-button
      id="epub_reader_chapter_toggle"
      class="w-full min-w-0 justify-between px-2.5 py-2"
      appearance="raw"
      no-hover
    >
      <span
        class="min-w-0 flex-1 truncate text-left"
        v-text="selectedChapter?.label || chapterLabel"
      />
      <oc-icon name="arrow-drop-down" size-class="size-4" />
    </oc-button>
    <oc-drop
      :title="chapterLabel"
      toggle="#epub_reader_chapter_toggle"
      mode="click"
      close-on-click
      padding-size="small"
      class="w-full"
    >
      <oc-list>
        <li v-for="chapter in chapters" :key="chapter.id">
          <oc-button
            class="epub-reader-chapter-option w-full justify-start"
            :class="{
              'bg-role-secondary-container text-role-on-secondary-container':
                selectedChapter?.id === chapter.id
            }"
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
import type { NavItem } from 'epubjs'

type ChapterOption = NavItem

defineProps<{
  chapters: ChapterOption[]
  selectedChapter?: ChapterOption
  chapterLabel: string
}>()

const emit = defineEmits<{
  (e: 'update:selectedChapter', value: ChapterOption): void
}>()

function onChapterClick(chapter: ChapterOption) {
  emit('update:selectedChapter', chapter)
}
</script>
