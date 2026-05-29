<template>
  <div class="flex items-center flex-nowrap">
    <oc-button
      data-testid="recipient-datepicker-btn"
      appearance="raw"
      justify-content="left"
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
    appearance="raw"
    justify-content="left"
    :aria-label="$gettext('Remove expiration date')"
    @click="removeExpirationDate"
  >
    <oc-icon name="calendar-close" fill-type="line" size="medium" />
    <span key="no-expiration-date-label" v-text="$gettext('Remove expiration date')" />
  </oc-button>
</template>

<script lang="ts">
import { DateTime } from 'luxon'
import { defineComponent, customRef, markRaw, PropType, unref, watch } from 'vue'
import { useModals, DatePickerModal } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  name: 'DateCurrentpicker',
  props: {
    shareTypes: {
      type: Array as PropType<number[]>,
      required: false,
      default: (): number[] => []
    },
    currentExpirationDate: {
      type: String as PropType<string | null>,
      required: false,
      default: null
    },
    onOptionChange: {
      type: Function as PropType<(expirationDate: string | null) => void>,
      required: false,
      default: null
    }
  },
  setup(props) {
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

    watch(
      () => props.currentExpirationDate,
      () => {
        if (!props.currentExpirationDate) {
          dateCurrent.value = null
          return
        }

        const parsedDate = DateTime.fromISO(props.currentExpirationDate)
        dateCurrent.value = parsedDate.isValid ? parsedDate : null
      },
      { immediate: true }
    )

    const showDatePickerModal = () => {
      dispatchModal({
        title: language.$gettext('Set expiration date'),
        hideActions: true,
        customComponent: markRaw(DatePickerModal),
        customComponentAttrs: () => ({
          currentDate: unref(dateCurrent),
          minDate: DateTime.now()
        }),
        onConfirm: (expirationDateTime: DateTime) => {
          dateCurrent.value = expirationDateTime
          setExpirationDateChange(expirationDateTime)
        }
      })
    }

    const setExpirationDateChange = (expirationDate: DateTime | null) => {
      props.onOptionChange?.(expirationDate?.isValid ? expirationDate.toISO() : null)
    }

    const removeExpirationDate = () => {
      dateCurrent.value = null
      setExpirationDateChange(null)
    }

    return {
      language,
      dateCurrent,
      showDatePickerModal,
      removeExpirationDate
    }
  }
})
</script>
