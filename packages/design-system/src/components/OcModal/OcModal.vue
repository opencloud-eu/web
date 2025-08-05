<template>
  <div class="oc-modal-background">
    <focus-trap :active="true" :initial-focus="initialFocusRef" :tabbable-options="tabbableOptions">
      <div
        :id="elementId"
        ref="ocModal"
        :class="classes"
        tabindex="0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="oc-modal-title"
        @keydown.esc.stop="cancelModalAction"
      >
        <div class="oc-modal-title">
          <h2 id="oc-modal-title" class="oc-text-truncate" v-text="title" />
        </div>
        <div class="oc-modal-body">
          <div v-if="$slots.content" key="modal-slot-content" class="oc-modal-body-message">
            <slot name="content" />
          </div>
          <template v-else>
            <p
              v-if="message"
              key="modal-message"
              class="oc-modal-body-message oc-mt-rm"
              :class="{ 'oc-mb-rm': !hasInput || contextualHelperData }"
              v-text="message"
            />
            <div
              v-if="contextualHelperData"
              class="oc-modal-body-contextual-helper"
              :class="{ 'oc-mb-rm': !hasInput }"
            >
              <span class="text" v-text="contextualHelperLabel" />
              <oc-contextual-helper class="oc-pl-xs" v-bind="contextualHelperData" />
            </div>
            <oc-text-input
              v-if="hasInput"
              key="modal-input"
              ref="ocModalInput"
              v-model="userInputValue"
              class="oc-modal-body-input"
              :error-message="inputError"
              :label="inputLabel"
              :type="inputType"
              :description-message="inputDescription"
              :required-mark="inputRequiredMark"
              :fix-message-line="true"
              :selection-range="inputSelectionRange"
              @update:model-value="inputOnInput"
              @keydown.enter.prevent="confirm"
            />
          </template>
        </div>

        <div v-if="!hideActions" class="oc-modal-body-actions oc-flex oc-flex-right">
          <div class="oc-modal-body-actions-grid">
            <oc-button
              class="oc-modal-body-actions-cancel"
              :disabled="isLoading"
              @click="cancelModalAction"
              >{{ $gettext(buttonCancelText) }}
            </oc-button>
            <oc-button
              v-if="!hideConfirmButton"
              class="oc-modal-body-actions-confirm oc-ml-s"
              :appearance="buttonConfirmAppearance"
              :disabled="isLoading || buttonConfirmDisabled || !!inputError"
              :show-spinner="showSpinner"
              @click="confirm"
              >{{ $gettext(buttonConfirmText) }}
            </oc-button>
          </div>
        </div>
      </div>
    </focus-trap>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, unref, useTemplateRef, watch } from 'vue'
import OcButton, { Props as ButtonProps } from '../OcButton/OcButton.vue'
import OcTextInput from '../OcTextInput/OcTextInput.vue'
import { FocusTargetOrFalse, FocusTrapTabbableOptions } from 'focus-trap'
import { ContextualHelperData } from '../../helpers'
import { useGettext } from 'vue3-gettext'

export interface Props {
  /**
   * @docs Title of the modal.
   */
  title: string
  /**
   * @docs Text for the cancel button.
   * @default Cancel
   */
  buttonCancelText?: string
  /**
   * @docs Disables the confirm button.
   * @default false
   */
  buttonConfirmDisabled?: boolean
  /**
   * @docs Text for the confirm button.
   * @default Confirm
   */
  buttonConfirmText?: string
  /**
   * @docs Contextual helper data. Please refer to the component source for the `ContextualHelperData` type definition.
   */
  contextualHelperData?: ContextualHelperData
  /**
   * @docs Label of the contextual helper.
   */
  contextualHelperLabel?: string
  /**
   * @docs Additional class(es) to be added to the modal.
   */
  elementClass?: string
  /**
   * @docs Element ID of the modal.
   */
  elementId?: string
  /**
   * @docs Selector of the element that is supposed to receive the initial focus inside the modal.
   */
  focusTrapInitial?: string | boolean
  /**
   * @docs Determines if the modal has an input field.
   * @default false
   */
  hasInput?: boolean
  /**
   * @docs Hide the action buttons.
   * @default false
   */
  hideActions?: boolean
  /**
   * @docs Hide the confirm button.
   * @default false
   */
  hideConfirmButton?: boolean
  /**
   * @docs Description to be displayed below the input field.
   */
  inputDescription?: string
  /**
   * @docs Determines if a required mark should be displayed next to the input label.
   */
  inputRequiredMark?: boolean
  /**
   * @docs Error message to be displayed below the input field.
   */
  inputError?: string
  /**
   * @docs Label of the input field.
   */
  inputLabel?: string
  /**
   * @docs Selection range of the input field in case parts of the input content should be selected on first render.
   */
  inputSelectionRange?: [number, number]
  /**
   * @docs Type of the input field.
   * @default text
   */
  inputType?: 'text' | 'number' | 'email' | 'password' | 'date'
  /**
   * @docs Value of the input field.
   */
  inputValue?: string
  /**
   * @docs Determines if the modal is in a loading state.
   * @default false
   */
  isLoading?: boolean
  /**
   * @docs Message of the modal.
   */
  message?: string
}

export interface Emits {
  /**
   * @docs Emitted when the cancel button has been clicked.
   */
  (e: 'cancel'): void

  /**
   * @docs Emitted when the confirm button has been clicked.
   */
  (e: 'confirm', value: string): void

  /**
   * @docs Emitted when the user has typed something in the input field.
   */
  (e: 'input', value: string): void
}

export interface Slots {
  /**
   * @docs Custom content of the modal.
   */
  content?: () => unknown
}

const {
  title,
  buttonCancelText = 'Cancel',
  buttonConfirmDisabled = false,
  buttonConfirmText = 'Confirm',
  contextualHelperData,
  contextualHelperLabel = '',
  elementClass,
  elementId,
  focusTrapInitial = null,
  hasInput = false,
  hideActions = false,
  hideConfirmButton = false,
  inputDescription,
  inputRequiredMark = false,
  inputError,
  inputLabel,
  inputSelectionRange,
  inputType = 'text',
  inputValue,
  isLoading = false,
  message
} = defineProps<Props>()

const emit = defineEmits<Emits>()

const { $gettext } = useGettext()

const showSpinner = ref(false)
const userInputValue = ref<string>()
const buttonConfirmAppearance = ref<ButtonProps['appearance']>('filled')
const ocModal = useTemplateRef<HTMLElement>('ocModal')
const ocModalInput = useTemplateRef<typeof OcTextInput>('ocModalInput')

const tabbableOptions = computed((): FocusTrapTabbableOptions => {
  return {
    getShadowRoot: true
  }
})

const resetLoadingState = () => {
  showSpinner.value = false
  buttonConfirmAppearance.value = 'filled'
}

const setLoadingState = () => {
  showSpinner.value = true
  buttonConfirmAppearance.value = 'outline'
}

watch(
  () => isLoading,
  () => {
    if (!isLoading) {
      return resetLoadingState()
    }
    setTimeout(() => {
      if (!isLoading) {
        return resetLoadingState()
      }
      setLoadingState()
    }, 700)
  },
  { immediate: true }
)

const initialFocusRef = computed<FocusTargetOrFalse>(() => {
  if (focusTrapInitial || focusTrapInitial === false) {
    return focusTrapInitial as FocusTargetOrFalse
  }
  // needs to be one of those elements or undefined. null will throw errors
  return () => unref(ocModalInput)?.$el || unref(ocModal) || undefined
})

const classes = computed(() => {
  return ['oc-modal', elementClass]
})

watch(
  () => inputValue,
  (value) => {
    userInputValue.value = value
  },
  { immediate: true }
)

const cancelModalAction = () => {
  emit('cancel')
}

const confirm = () => {
  if (buttonConfirmDisabled || inputError) {
    return
  }
  emit('confirm', unref(userInputValue))
}

const inputOnInput = (value: string) => {
  emit('input', value)
}
</script>

<script lang="ts">
// this needs to be non-script-setup so we can use FocusTrap in unit tests
import { FocusTrap } from 'focus-trap-vue'

export default {
  components: { FocusTrap }
}
</script>

<style lang="scss">
.oc-modal {
  background-color: var(--oc-role-surface);
  border: 1px solid var(--oc-role-outline);
  border-radius: 5px;
  box-shadow: 5px 0 25px rgba(0, 0, 0, 0.3);
  max-height: 90vh;
  max-width: 500px;
  overflow: auto;
  width: 100%;

  &:focus {
    outline: none;
  }

  &-background {
    align-items: center;
    background-color: rgba(0, 0, 0, 0.4);
    display: flex;
    flex-flow: row wrap;
    height: 100%;
    justify-content: center;
    left: 0;
    position: fixed;
    top: 0;
    width: 100%;
    z-index: var(--oc-z-index-modal);
  }

  &-title {
    align-items: center;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    display: flex;
    flex-flow: row wrap;
    line-height: 1.625;
    padding: calc(var(--oc-space-small) + var(--oc-space-xsmall)) var(--oc-space-medium);
    background-color: var(--oc-role-surface-container);

    > h2 {
      font-size: 1rem;
      font-weight: bold;
      margin: 0;
    }
  }

  &-body {
    color: var(--oc-role-on-surface);
    line-height: 1.625;
    padding: var(--oc-space-medium) var(--oc-space-medium) 0;

    &-message {
      margin-bottom: var(--oc-space-medium);
      margin-top: var(--oc-space-small);
    }

    &-contextual-helper {
      margin-bottom: var(--oc-space-medium);
    }

    .oc-input {
      line-height: normal;
    }

    &-input {
      /* FIXME: this is ugly, but required so that the bottom padding doesn't look off when reserving vertical space for error messages below the input. */
      margin-bottom: -20px;
      padding-bottom: var(--oc-space-medium);

      .oc-text-input-message {
        margin-bottom: var(--oc-space-xsmall);
      }
    }

    &-actions {
      text-align: right;
      border-bottom-right-radius: 15px;
      border-bottom-left-radius: 15px;
      padding: var(--oc-space-medium);

      .oc-button {
        border-radius: 4px;
      }

      &-grid {
        display: inline-grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
      }
    }
  }
}
</style>
