<template>
  <div class="flex flex-col gap-2">
    <!-- Label wie bisher -->
    <label class="text-sm font-medium">
      {{ $gettext('Write email') }}
    </label>

    <!-- Vollständige Text-Toolbar (erscheint unter Subject, über dem Editor) -->
    <div
      v-if="showToolbar"
      class="flex flex-wrap gap-1 rounded border border-role-outline-variant bg-role-surface-variant px-2 py-1 text-sm"
    >
      <button
        type="button"
        class="px-2 py-1 rounded hover:bg-role-surface"
        :class="{ 'font-bold': editor?.isActive('bold') }"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        B
      </button>
      <button
        type="button"
        class="px-2 py-1 rounded italic hover:bg-role-surface"
        :class="{ 'font-bold': editor?.isActive('italic') }"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        I
      </button>
      <button
        type="button"
        class="px-2 py-1 rounded hover:bg-role-surface"
        :class="{ 'font-bold': editor?.isActive('heading', { level: 2 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        type="button"
        class="px-2 py-1 rounded hover:bg-role-surface"
        :class="{ 'font-bold': editor?.isActive('bulletList') }"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        • List
      </button>
      <button
        type="button"
        class="px-2 py-1 rounded hover:bg-role-surface"
        :class="{ 'font-bold': editor?.isActive('orderedList') }"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        1. List
      </button>
      <button
        type="button"
        class="px-2 py-1 rounded hover:bg-role-surface"
        :class="{ 'font-bold': editor?.isActive('blockquote') }"
        @click="editor?.chain().focus().toggleBlockquote().run()"
      >
        “ Quote
      </button>
      <button
        type="button"
        class="px-2 py-1 rounded font-mono hover:bg-role-surface"
        :class="{ 'font-bold': editor?.isActive('codeBlock') }"
        @click="editor?.chain().focus().toggleCodeBlock().run()"
      >
        &lt;/&gt;
      </button>
    </div>

    <!-- Editor + Bottom-Bar -->
    <div class="border border-role-outline-variant rounded-lg bg-role-surface overflow-hidden">
      <!-- Editor selbst -->
      <EditorContent
        v-if="editor"
        :editor="editor"
        class="min-h-[160px] px-3 py-2 text-sm leading-relaxed focus:outline-none"
      />

      <!-- Bottom-Bar mit Link, Bild, T -->
      <div
        class="flex items-center justify-between border-t border-role-outline-variant px-3 py-1.5 text-sm"
      >
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-2 py-1 rounded hover:bg-role-surface-variant"
            @click="onAddLink"
          >
            {{ $gettext('Add link') }}
          </button>
          <button
            type="button"
            class="px-2 py-1 rounded hover:bg-role-surface-variant"
            @click="onAddImage"
          >
            {{ $gettext('Add image') }}
          </button>
        </div>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full border border-role-outline-variant text-base font-semibold hover:bg-role-surface-variant"
          :aria-pressed="showToolbar ? 'true' : 'false'"
          :title="$gettext('Toggle text formatting toolbar')"
          @click="toggleToolbar"
        >
          T
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'

const { $gettext } = useGettext()

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const showToolbar = ref(false)

const toggleToolbar = () => {
  showToolbar.value = !showToolbar.value
}

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      // Link & Image kommen separat, hier also keine Konflikte
      link: false
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true
    }),
    Image.configure({
      inline: false
    })
  ],
  content: props.modelValue || '',
  onUpdate({ editor }) {
    emit('update:modelValue', editor.getHTML())
  }
})

// v-model von außen → Editor synchronisieren (z.B. Draft laden)
watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value) return
    const current = editor.value.getHTML()
    if (value !== current) {
      editor.value.commands.setContent(value || '', { emitUpdate: false })
    }
  }
)

const onAddLink = () => {
  if (!editor.value) return

  const previousUrl = editor.value.getAttributes('link').href as string | undefined
  const url = window.prompt($gettext('Enter URL'), previousUrl || '')

  if (url === null) {
    return
  }

  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }

  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

const onAddImage = () => {
  if (!editor.value) return

  const url = window.prompt($gettext('Enter image URL'))

  if (!url) return

  editor.value.chain().focus().setImage({ src: url }).run()
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
:deep(.ProseMirror) {
  outline: none;
}

/* Absätze */
:deep(.ProseMirror p) {
  margin: 0 0 0.5rem;
}

/* Ungeordnete Listen (Punkte) */
:deep(.ProseMirror ul) {
  list-style-type: disc;
  padding-left: 1.25rem; /* Einrückung */
  margin: 0.25rem 0 0.5rem;
}

/* Geordnete Listen (Nummern) */
:deep(.ProseMirror ol) {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin: 0.25rem 0 0.5rem;
}

:deep(.ProseMirror li) {
  margin: 0.125rem 0;
}

/* Bold / Italic (falls global resettet wurde) */
:deep(.ProseMirror strong) {
  font-weight: 600;
}

:deep(.ProseMirror em) {
  font-style: italic;
}

/* Blockquote */
:deep(.ProseMirror blockquote) {
  border-left: 2px solid rgba(148, 163, 184, 0.6); /* kannst du später auf Token umbauen */
  padding-left: 0.75rem;
  margin: 0.25rem 0 0.5rem;
  font-style: italic;
  opacity: 0.9;
}

/* Code-Block */
:deep(.ProseMirror pre) {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  background: rgba(148, 163, 184, 0.12);
  overflow-x: auto;
}

/* Inline-Code */
:deep(.ProseMirror code) {
  font-family: inherit;
  font-size: 0.875em;
  padding: 0.1rem 0.25rem;
  border-radius: 0.25rem;
  background: rgba(148, 163, 184, 0.18);
}
</style>
