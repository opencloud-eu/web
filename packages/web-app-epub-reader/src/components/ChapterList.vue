<template>
  <div
    class="hidden lg:flex w-80 shrink-0 flex-col bg-role-surface-container-low shadow-[8px_0_20px_-14px_rgb(0_0_0_/_0.28)]"
  >
    <oc-search-bar
      v-model="filterTerm"
      class="shrink-0 p-2 pb-0"
      :label="$gettext('Search chapters')"
      :placeholder="$gettext('Search chapters')"
      :is-rounded="false"
      button-hidden
      is-filter
    />
    <oc-list ref="chapterListRoot" class="min-h-0 flex-1 overflow-y-auto p-2">
      <li
        v-for="chapter in filteredChapters"
        :key="chapter.id"
        :data-chapter-id="chapter.id"
        class="epub-reader-chapters-list-item mb-1 rounded-sm"
        :class="{
          'bg-role-secondary-container text-role-on-secondary-container':
            currentChapter?.id === chapter.id
        }"
      >
        <oc-button
          class="max-w-full justify-start py-1.5 pl-[calc(0.5rem+var(--depth)*0.75rem)] pr-2"
          :class="{
            'font-semibold': currentChapter?.id === chapter.id
          }"
          :style="{ '--depth': chapter.depth }"
          appearance="raw"
          no-hover
          @click="onChapterClick(chapter)"
        >
          <span v-oc-tooltip="chapter.label" class="truncate mr-2" v-text="chapter.label" />
        </oc-button>
      </li>
      <li
        v-if="filteredChapters.length === 0"
        class="epub-reader-chapters-empty px-2 py-1.5 text-sm text-role-on-surface-variant"
      >
        <span v-text="$gettext('No chapters found')" />
      </li>
    </oc-list>
  </div>
</template>

<script setup lang="ts">
import { ComponentPublicInstance, computed, nextTick, ref, unref, useTemplateRef, watch } from 'vue'
import type { Chapter } from '../types'
import { useGettext } from 'vue3-gettext'

const { chapters, currentChapter } = defineProps<{
  chapters: Chapter[]
  currentChapter?: Chapter
}>()
const { $gettext } = useGettext()
const filterTerm = ref('')
const chapterListRoot = useTemplateRef<ComponentPublicInstance>('chapterListRoot')

const filteredChapters = computed(() => {
  const term = unref(filterTerm).trim().toLowerCase()
  if (!term) {
    return chapters
  }
  return chapters.filter((chapter) => chapter.label.toLowerCase().includes(term))
})

const emit = defineEmits<{
  (e: 'chapterSelected', chapter: Chapter): void
}>()

function onChapterClick(chapter: Chapter) {
  emit('chapterSelected', chapter)
}

function scrollCurrentChapterIntoView() {
  const currentChapterId = currentChapter?.id
  if (!currentChapterId) {
    return
  }

  const chapterElements = (
    unref(chapterListRoot)?.$el as HTMLElement | undefined
  )?.querySelectorAll<HTMLElement>('.epub-reader-chapters-list-item')
  const activeChapterElement = Array.from(chapterElements || []).find(
    (element) => element.dataset.chapterId === currentChapterId
  )
  activeChapterElement?.scrollIntoView({ block: 'nearest' })
}

watch(
  () => [currentChapter?.id, unref(filteredChapters).length],
  async () => {
    await nextTick()
    scrollCurrentChapterIntoView()
  },
  { flush: 'post' }
)
</script>
