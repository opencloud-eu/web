<template>
  <div
    v-if="isOpen && !isExpanded"
    class="z-50 transition absolute inset-0 md:fixed md:inset-0 pointer-events-auto md:pointer-events-none bg-transparent"
  >
    <div
      class="oc-mail-compose-widget pointer-events-auto absolute bg-role-surface border-0 md:border md:border-role-outline-variant flex flex-col md:rounded-xl top-0 left-0 right-0 bottom-0 md:top-auto md:bottom-2 md:left-auto md:right-8 md:w-[720px] md:h-[800px]"
    >
      <div class="flex items-center justify-between px-4 py-2">
        <h2
          class="oc-mail-compose-widget-headline text-lg font-bold"
          v-text="$gettext('New message')"
        />
        <div class="flex items-center gap-1">
          <oc-button
            class="hidden md:inline-flex"
            appearance="raw"
            :aria-label="
              isExpanded ? $gettext('Collapse compose window') : $gettext('Expand compose window')
            "
            @click="toggleCollapseExpand"
          >
            <oc-icon
              :name="isExpanded ? 'collapse-diagonal' : 'expand-diagonal'"
              fill-type="line"
            />
          </oc-button>
          <oc-button appearance="raw" :aria-label="$gettext('Close')" @click="close">
            <oc-icon name="close" fill-type="line" />
          </oc-button>
        </div>
      </div>

      <div class="flex flex-col flex-1 min-h-0">
        <div class="flex-1 min-h-0 overflow-auto">
          <MailComposeForm
            v-model="composeState"
            :show-formatting-toolbar="showFormattingToolbar"
          />
        </div>

        <div class="px-4 pt-3 pb-2">
          <div class="flex items-center justify-start gap-3">
            <oc-button appearance="filled" class="min-w-[120px]">
              <span v-text="$gettext('Send')" />
            </oc-button>
            <oc-button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full border border-role-outline-variant bg-role-surface hover:bg-role-surface-variant transition"
              :aria-pressed="showFormattingToolbar ? 'true' : 'false'"
              :title="$gettext('Toggle text formatting toolbar')"
              @click="showFormattingToolbar = !showFormattingToolbar"
            >
              <oc-icon name="text" fill-type="none" class="text-base text-role-on-surface" />
            </oc-button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <oc-modal
    v-if="isOpen && isExpanded"
    :title="$gettext('New message')"
    :hide-actions="true"
    element-class="mail-compose-modal"
  >
    <template #modal-slot-header-actions>
      <oc-button
        class="hidden md:inline-flex"
        appearance="raw"
        :aria-label="$gettext('Collapse compose window')"
        @click="toggleCollapseExpand"
      >
        <oc-icon name="collapse-diagonal" fill-type="line" />
      </oc-button>
      <oc-button appearance="raw" :aria-label="$gettext('Close')" @click="close">
        <oc-icon name="close" fill-type="line" />
      </oc-button>
    </template>

    <template #content>
      <div class="flex flex-col flex-1 min-h-0">
        <div class="flex-1 min-h-0 overflow-auto">
          <MailComposeForm
            v-model="composeState"
            :show-formatting-toolbar="showFormattingToolbar"
          />
        </div>

        <div class="px-4 pt-3">
          <div class="flex items-center justify-start gap-3">
            <oc-button appearance="filled" class="min-w-[120px]">
              <span v-text="$gettext('Send')" />
            </oc-button>

            <oc-button
              type="button"
              appearance="raw"
              class="flex !h-9 !w-9 items-center justify-center rounded-full border border-role-outline-variant bg-role-surface hover:bg-role-surface-variant transition"
              :class="{ 'bg-role-surface-variant': showFormattingToolbar }"
              :aria-pressed="showFormattingToolbar ? 'true' : 'false'"
              :title="$gettext('Toggle text formatting toolbar')"
              @click="showFormattingToolbar = !showFormattingToolbar"
            >
              <oc-icon name="text" fill-type="none" class="text-base text-role-on-surface" />
            </oc-button>
          </div>
        </div>
      </div>
    </template>
  </oc-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import MailComposeForm, { ComposeFormState } from './MailComposeForm.vue'

const { $gettext } = useGettext()

const props = defineProps<{
  modelValue?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

const isExpanded = ref(false)

const composeState = ref<ComposeFormState>({
  from: undefined,
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  body: ''
})

const showFormattingToolbar = ref(false)

const isOpen = computed({
  get: () => props.modelValue ?? true,
  set: (value: boolean) => {
    emit('update:modelValue', value)
    if (!value) emit('close')
  }
})

const toggleCollapseExpand = () => {
  isExpanded.value = !isExpanded.value
}

const close = () => {
  isExpanded.value = false
  isOpen.value = false
}
</script>

<style>
.mail-compose-modal {
  width: 90vw;
  max-width: 90vw;
  height: 90vh;
  display: flex;
  flex-direction: column;
}

.mail-compose-modal .oc-modal-body,
.mail-compose-modal .oc-modal-body-message {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
