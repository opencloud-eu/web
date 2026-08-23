<template>
  <div
    ref="chapterListRoot"
    class="hidden lg:block w-80 shrink-0 overflow-y-auto bg-role-surface-container-low p-2 shadow-[8px_0_20px_-14px_rgb(0_0_0_/_0.28)]"
  >
    <oc-search-bar
      v-model="filterTerm"
      class="mb-2"
      :label="$gettext('Search chapters')"
      :placeholder="$gettext('Search chapters')"
      :is-rounded="false"
      button-hidden
    />
    <oc-list>
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
import { computed, nextTick, ref, unref, watch } from 'vue'
import type { NavItem } from 'epubjs'
import { useGettext } from 'vue3-gettext'

const { chapters, currentChapter } = defineProps<{
  chapters: NavItem[]
  currentChapter?: NavItem
}>()
const { $gettext } = useGettext()
const filterTerm = ref('')
const chapterListRoot = ref<HTMLElement>()

const filteredChapters = computed(() => {
  const term = unref(filterTerm).trim().toLowerCase()
  if (!term) {
    return chapters
  }
  return chapters.filter((chapter) => chapter.label.toLowerCase().includes(term))
})

const emit = defineEmits<{
  (e: 'chapterSelected', chapter: NavItem): void
}>()

function onChapterClick(chapter: NavItem) {
  emit('chapterSelected', chapter)
}

function scrollCurrentChapterIntoView() {
  const currentChapterId = currentChapter?.id
  if (!currentChapterId) {
    return
  }

  const chapterElements = unref(chapterListRoot)?.querySelectorAll<HTMLElement>(
    '.epub-reader-chapters-list-item'
  )
  const activeChapterElement = Array.from(chapterElements ?? []).find(
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
