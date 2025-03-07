<template>
  <div
    ref="inputWrapperRef"
    class="oc-text-input-password-wrapper"
    :class="{
      'oc-text-input-password-wrapper-warning': hasWarning,
      'oc-text-input-password-wrapper-danger': hasError,
      'oc-text-input-password-wrapper-focused': hasFocus
    }"
  >
    <input
      v-bind="$attrs"
      ref="passwordInput"
      v-model="password"
      :type="showPassword ? 'text' : 'password'"
      :disabled="disabled"
      @focus="hasFocus = true"
      @blur="hasFocus = false"
    />
    <oc-button
      v-if="password && !disabled"
      v-oc-tooltip="showPassword ? $gettext('Hide password') : $gettext('Show password')"
      :aria-label="showPassword ? $gettext('Hide password') : $gettext('Show password')"
      class="oc-text-input-show-password-toggle oc-px-s"
      appearance="raw"
      size="small"
      @click="showPassword = !showPassword"
    >
      <oc-icon size="small" :name="showPassword ? 'eye-off' : 'eye'" />
    </oc-button>
    <oc-button
      v-if="password && !disabled"
      v-oc-tooltip="$gettext('Copy password')"
      :aria-label="$gettext('Copy password')"
      class="oc-text-input-copy-password-button oc-px-s"
      appearance="raw"
      size="small"
      @click="copyPasswordToClipboard"
    >
      <oc-icon size="small" :name="copyPasswordIcon" />
    </oc-button>
    <oc-button
      v-if="generatePasswordMethod && !disabled"
      v-oc-tooltip="$gettext('Generate password')"
      :aria-label="$gettext('Generate password')"
      class="oc-text-input-generate-password-button oc-px-s"
      appearance="raw"
      size="small"
      @click="generatePassword"
    >
      <oc-icon size="small" name="refresh" fill-type="line" />
    </oc-button>
  </div>
  <portal v-if="showPasswordPolicyInformation" to="app.design-system.password-policy">
    <div class="oc-flex oc-text-small oc-text-input-password-policy-rule-wrapper oc-pt-s">
      <div
        v-for="(testedRule, index) in testedPasswordPolicy.rules"
        :key="index"
        class="oc-flex oc-flex-middle oc-text-input-password-policy-rule"
      >
        <oc-icon
          size="small"
          class="oc-mr-xs"
          :name="testedRule.verified ? 'checkbox-circle' : 'close-circle'"
          :variation="testedRule.verified ? 'success' : 'danger'"
        />
        <span
          :class="[
            { 'oc-text-input-success': testedRule.verified },
            { 'oc-text-input-danger': !testedRule.verified }
          ]"
          v-text="getPasswordPolicyRuleMessage(testedRule)"
        ></span>
        <oc-contextual-helper
          v-if="testedRule.helperMessage"
          :text="testedRule.helperMessage"
          :title="$gettext('Password policy')"
        />
      </div>
    </div>
  </portal>
</template>

<script setup lang="ts">
import { computed, ref, unref, watch } from 'vue'
import OcIcon from '../OcIcon/OcIcon.vue'
import OcButton from '../OcButton/OcButton.vue'
import { useGettext } from 'vue3-gettext'
import { PasswordPolicy, PasswordPolicyRule } from '../../helpers'

export interface Props {
  disabled?: boolean
  generatePasswordMethod?: (...args: unknown[]) => string
  hasError?: boolean
  hasWarning?: boolean
  passwordPolicy?: PasswordPolicy
  value?: string
}

const {
  disabled = false,
  generatePasswordMethod,
  hasError = false,
  hasWarning = false,
  passwordPolicy,
  value = ''
} = defineProps<Props>()

const emit = defineEmits([
  'passwordChallengeCompleted',
  'passwordChallengeFailed',
  'passwordGenerated'
])

const passwordInput = ref(null)
const { $gettext } = useGettext()
const password = ref(value)
const showPassword = ref(false)
const copyPasswordIconInitial = 'file-copy'
const copyPasswordIcon = ref(copyPasswordIconInitial)
const hasFocus = ref(false)

const showPasswordPolicyInformation = computed(() => {
  return !!Object.keys(passwordPolicy?.rules || {}).length
})

const testedPasswordPolicy = computed(() => {
  return passwordPolicy?.missing(unref(password))
})

const getPasswordPolicyRuleMessage = (rule: PasswordPolicyRule) => {
  const paramObj: Record<string, string> = {}

  for (let formatKey = 0; formatKey < rule.format.length; formatKey++) {
    paramObj[`param${formatKey + 1}`] = rule.format[formatKey]?.toString()
  }

  return $gettext(rule.message, paramObj, true)
}

const copyPasswordToClipboard = () => {
  navigator.clipboard.writeText(unref(password))
  copyPasswordIcon.value = 'check'
  setTimeout(() => (copyPasswordIcon.value = copyPasswordIconInitial), 1500)
}

const generatePassword = () => {
  const generatedPassword = generatePasswordMethod()
  password.value = generatedPassword
  emit('passwordGenerated', password.value)
}

const focus = () => {
  unref(passwordInput).focus()
}

defineExpose({ focus })

watch(password, (value) => {
  if (!Object.keys(passwordPolicy).length) {
    return
  }

  if (!passwordPolicy.check(value)) {
    return emit('passwordChallengeFailed')
  }

  emit('passwordChallengeCompleted')
})
</script>

<style lang="scss">
.oc-text-input-password {
  &-wrapper {
    display: flex;
    flex-direction: row;
    padding: 0;
    border-radius: 5px;
    border: 1px solid var(--oc-role-outline);

    &-focused {
      border: 1px solid var(--oc-role-surface);
      outline: 2px solid var(--oc-role-outline);
    }

    input {
      flex-grow: 2;
      border: none !important;

      &:focus {
        outline: none;
      }
    }

    &-warning,
    &-warning:focus {
      border-color: var(--oc-color-swatch-warning-default) !important;
      color: var(--oc-color-swatch-warning-default) !important;
    }

    &-danger,
    &-danger:focus {
      border-color: var(--oc-color-swatch-danger-default) !important;
      color: var(--oc-color-swatch-danger-default) !important;
    }
  }

  &-policy-rule-wrapper {
    flex-direction: row;
    flex-wrap: wrap;
    column-gap: var(--oc-space-small);
  }
}
</style>
