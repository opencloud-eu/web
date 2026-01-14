<template>
  <span class="inline-flex items-center" @click="$emit('click', $event)">
    <input
      :id="id"
      v-model="model"
      type="checkbox"
      name="checkbox"
      class="oc-checkbox m-0.5 border-2 border-role-outline outline-0 focus-visible:outline outline-role-secondary rounded-sm checked:bg-white disabled:bg-role-surface-container-low indeterminate:bg-white bg-transparent inline-block overflow-hidden cursor-pointer disabled:opacity-40 disabled:cursor-default bg-no-repeat bg-center appearance-none align-middle"
      :class="{
        'oc-checkbox-checked bg-white': isChecked,
        'size-3': size === 'small',
        'size-4': size === 'medium',
        'size-5': size === 'large'
      }"
      :value="option"
      :disabled="disabled"
      :aria-label="labelHidden ? label : null"
      @keydown.enter="keydownEnter"
    />
    <label
      v-if="!labelHidden"
      :for="id"
      :class="{ 'cursor-pointer': !disabled }"
      class="ml-1"
      v-text="label"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { isEqual } from 'lodash-es'
import { uniqueId } from '../../helpers'

export interface Props {
  /**
   * @docs The label of the checkbox element.
   */
  label: string
  /**
   * @docs Determines if the checkbox is disabled.
   *
   */
  disabled?: boolean
  /**
   * @docs The element ID of the checkbox.
   */
  id?: string
  /**
   * @docs Determines if the label is hidden visually. Note that the label will still be read by screen readers.
   * @default false
   */
  labelHidden?: boolean
  /**
   * @docs The option value of the checkbox.
   */
  option?: unknown
  /**
   * @docs The size of the checkbox.
   * @default medium
   */
  size?: 'small' | 'medium' | 'large'
}

export interface Emits {
  /**
   * @docs Emitted when the checkbox has been clicked.
   */
  (e: 'click', event: MouseEvent | KeyboardEvent): void
}

const {
  label,
  disabled = false,
  id = uniqueId('oc-checkbox-'),
  option,
  labelHidden = false,
  size = 'medium'
} = defineProps<Props>()

const emit = defineEmits<Emits>()

const model = defineModel<boolean>()

const isChecked = computed(() => {
  const val = unref(model)
  if (Array.isArray(val)) {
    return val.some((m) => isEqual(m, option))
  }
  return val
})

const keydownEnter = (event: KeyboardEvent) => {
  model.value = !model.value
  emit('click', event)
}
</script>

<style lang="scss" scoped>
.oc-checkbox {
  $internal-form-checkbox-image: 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2214%22%20height%3D%2211%22%20viewBox%3D%220%200%2014%2011%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%20%20%20%20%3Cpolygon%20fill%3D%22#000%22%20points%3D%2212%201%205%207.5%202%205%201%205.5%205%2010%2013%201.5%22%20%2F%3E%0A%3C%2Fsvg%3E%0A' !default;
  $internal-form-checkbox-indeterminate-image: 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%20%20%20%20%3Crect%20fill%3D%22#000%22%20x%3D%223%22%20y%3D%228%22%20width%3D%2210%22%20height%3D%221%22%20%2F%3E%0A%3C%2Fsvg%3E' !default;

  @function str-replace($string, $search, $replace: '') {
    $index: string.index($string, $search);

    @if $index {
      @return string.slice($string, 1, $index - 1) + $replace +
        str-replace(string.slice($string, $index + string.length($search)), $search, $replace);
    }

    @return $string;
  }

  @mixin svg-fill($src, $color-default, $color-new) {
    $replace-src: str-replace($src, $color-default, $color-new) !default;
    $replace-src: str-replace($replace-src, '#', '%23');
    $replace-src: string.quote($replace-src);

    background-image: url($replace-src);
  }

  &-checked,
  :checked {
    @include svg-fill($internal-form-checkbox-image, '#000', '#000');
  }

  &:indeterminate {
    @include svg-fill($internal-form-checkbox-indeterminate-image, '#000', '#000');
  }

  &:disabled:checked {
    @include svg-fill($internal-form-checkbox-image, '#000', var(--oc-role-on-surface-variant));
  }

  &:disabled:indeterminate {
    @include svg-fill(
      $internal-form-checkbox-indeterminate-image,
      '#000',
      var(--oc-role-on-surface-variant)
    );
  }
}
</style>
