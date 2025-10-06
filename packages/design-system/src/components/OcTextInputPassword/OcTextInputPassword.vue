<template>
  <div
    class="oc-text-input-password-wrapper flex flex-row border rounded-sm"
    :class="{
      'oc-text-input-password-wrapper-danger text-role-error focus:text-role-error border-role-error':
        hasError,
      'border-role-surface outline-2 outline-role-outline': hasFocus,
      'border-role-outline': !hasFocus
    }"
  >
    <input
      v-bind="$attrs"
      ref="passwordInput"
      v-model="password"
      class="grow-2 border-0 focus:border-0 focus:outline-0"
      :type="showPassword ? 'text' : 'password'"
      :disabled="disabled"
      @focus="hasFocus = true"
      @blur="hasFocus = false"
    />
    <oc-button
      v-if="password && !disabled"
      v-oc-tooltip="showPassword ? $gettext('Hide password') : $gettext('Show password')"
      :aria-label="showPassword ? $gettext('Hide password') : $gettext('Show password')"
      class="oc-text-input-show-password-toggle px-2"
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
      class="oc-text-input-copy-password-button px-2"
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
      class="oc-text-input-generate-password-button px-2"
      appearance="raw"
      size="small"
      @click="generatePassword"
    >
      <oc-icon size="small" name="refresh" fill-type="line" />
    </oc-button>
  </div>
  <portal v-if="showPasswordPolicyInformation" to="app.design-system.password-policy">
    <div class="flex flex-row flex-wrap text-sm pt-2 gap-x-2">
      <div
        v-for="(testedRule, index) in testedPasswordPolicy.rules"
        :key="index"
        class="flex items-center oc-text-input-password-policy-rule"
      >
        <oc-icon
          size="small"
          class="mr-1"
          :name="testedRule.verified ? 'checkbox-circle' : 'close-circle'"
          :color="testedRule.verified ? 'var(--oc-role-on-surface)' : 'var(--oc-role-error)'"
        />
        <span
          :class="[{ 'oc-text-input-danger': !testedRule.verified }]"
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
import { computed, ref, unref, useTemplateRef, watch } from 'vue'
import OcIcon from '../OcIcon/OcIcon.vue'
import OcButton from '../OcButton/OcButton.vue'
import { useGettext } from 'vue3-gettext'
import { PasswordPolicy, PasswordPolicyRule } from '../../helpers'

export interface Props {
  disabled?: boolean
  generatePasswordMethod?: (...args: unknown[]) => string
  hasError?: boolean
  passwordPolicy?: PasswordPolicy
  value?: string
}

const {
  disabled = false,
  generatePasswordMethod,
  hasError = false,
  passwordPolicy,
  value = ''
} = defineProps<Props>()

const emit = defineEmits([
  'passwordChallengeCompleted',
  'passwordChallengeFailed',
  'passwordGenerated'
])

const passwordInput = useTemplateRef('passwordInput')
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

const select = () => {
  unref(passwordInput).select()
}

const setSelectionRange = (start: number, end: number) => {
  unref(passwordInput).setSelectionRange(start, end)
}

defineExpose({ focus, select, setSelectionRange })

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
