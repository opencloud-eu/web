<template>
  <div class="flex items-center flex-nowrap">
    <oc-button
      data-testid="recipient-datepicker-btn"
      class="p-2"
      appearance="raw"
      justify-content="left"
      gap-size="none"
      :aria-label="dateCurrent ? $gettext('Edit expiration date') : $gettext('Set expiration date')"
      @click="showDatePickerModal"
    >
      <oc-icon name="calendar-event" fill-type="line" size="medium" />
      <span
        v-if="!dateCurrent"
        key="no-expiration-date-label"
        v-text="$gettext('Set expiration date')"
      />
      <span v-else key="set-expiration-date-label" v-text="$gettext('Edit expiration date')" />
    </oc-button>
  </div>
  <oc-button
    v-if="dateCurrent"
    class="p-2 align-middle"
    appearance="raw"
    :aria-label="$gettext('Remove expiration date')"
    @click="dateCurrent = null"
  >
    <oc-icon name="calendar-close" fill-type="line" size="medium" />
    <span key="no-expiration-date-label" v-text="$gettext('Remove expiration date')" />
  </oc-button>
</template>

<script lang="ts">
import { DateTime } from 'luxon'
import { watch, defineComponent, customRef, PropType, unref } from 'vue'
import { useModals, DatePickerModal } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  name: 'DateCurrentpicker',
  props: {
    shareTypes: {
      type: Array as PropType<number[]>,
      required: false,
      default: (): number[] => []
    }
  },
  emits: ['optionChange'],
  setup(props, { emit }) {
    const language = useGettext()
    const { dispatchModal } = useModals()

    const dateCurrent = customRef<DateTime>((track, trigger) => {
      let date: DateTime = null
      return {
        get() {
          track()
          return date
        },
        set(val: DateTime) {
          date = val
          trigger()
        }
      }
    })

    const showDatePickerModal = () => {
      dispatchModal({
        title: language.$gettext('Set expiration date'),
        hideActions: true,
        customComponent: DatePickerModal,
        customComponentAttrs: () => ({
          currentDate: unref(dateCurrent),
          minDate: DateTime.now()
        }),
        onConfirm: (expirationDateTime: DateTime) => {
          dateCurrent.value = expirationDateTime
        }
      })
    }

    watch(dateCurrent, () => {
      emit('optionChange', {
        expirationDate: unref(dateCurrent)?.isValid ? dateCurrent.value : null
      })
    })

    return {
      language,
      dateCurrent,
      showDatePickerModal
    }
  }
})
</script>
