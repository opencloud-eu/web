<template>
  <div
    class="oc-text-input-password-wrapper flex flex-row border rounded-sm"
    :class="{
      'oc-text-input-password-wrapper-danger text-role-error focus:text-role-error border-role-error':
        hasError,
      'outline-1 outline-role-secondary -outline-offset-2': hasFocus,
      'border-role-outline': !hasError
    }"
  >
    <input
      v-bind="$attrs"
      ref="passwordInput"
      v-model="password"
      class="grow-2 border-0 focus:border-0 focus:outline-0"
      :aria-describedby="getAriaDescribedBy()"
      :aria-invalid="getAriaInvalid()"
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
      <oc-icon size-class="size-4" :name="showPassword ? 'eye-off' : 'eye'" />
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
      <oc-icon size-class="size-4" :name="copyPasswordIcon" />
    </oc-button>
    <oc-hidden-announcer ref="copyPasswordAnnouncer" />
    <oc-button
      v-if="generatePasswordMethod && !disabled"
      v-oc-tooltip="$gettext('Generate password')"
      :aria-label="$gettext('Generate password')"
      class="oc-text-input-generate-password-button px-2"
      appearance="raw"
      size="small"
      @click="generatePassword"
    >
      <oc-icon size-class="size-4" name="refresh" fill-type="line" />
    </oc-button>
  </div>
  <teleport v-if="showPasswordPolicyInformation" defer :to="`#${teleportId}`">
    <div class="flex flex-row flex-wrap text-sm pt-2 gap-x-2">
      <div
        v-for="(testedRule, index) in testedPasswordPolicy.rules"
        :key="index"
        class="flex items-center oc-text-input-password-policy-rule"
      >
        <oc-icon
          size-class="size-4"
          class="mr-1"
          :name="testedRule.verified ? 'checkbox-circle' : 'close-circle'"
          :color="testedRule.verified ? 'var(--oc-role-on-surface)' : 'var(--oc-role-error)'"
        />
        <span
          :class="[{ 'oc-text-input-danger': !testedRule.verified }]"
          v-text="getPasswordPolicyRuleMessage(testedRule)"
        ></span>
        <span
          class="sr-only"
          v-text="
            testedRule.verified ? $gettext('Requirement met') : $gettext('Requirement not met')
          "
        />
        <oc-contextual-helper
          v-if="testedRule.helperMessage"
          :text="testedRule.helperMessage"
          :title="$gettext('Password policy')"
        />
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, HTMLAttributes, ref, unref, useAttrs, useTemplateRef, watch } from 'vue'
import OcIcon from '../OcIcon/OcIcon.vue'
import OcButton from '../OcButton/OcButton.vue'
import OcHiddenAnnouncer from '../OcHiddenAnnouncer/OcHiddenAnnouncer.vue'
import { useGettext } from 'vue3-gettext'
import { PasswordPolicy, PasswordPolicyRule } from '../../helpers'

export interface Props {
  disabled?: boolean
  generatePasswordMethod?: (...args: unknown[]) => string
  hasError?: boolean
  passwordPolicy?: PasswordPolicy
  teleportId?: string
  value?: string
}

const {
  disabled = false,
  generatePasswordMethod,
  hasError = false,
  passwordPolicy,
  value = '',
  teleportId = ''
} = defineProps<Props>()

const emit = defineEmits([
  'passwordChallengeCompleted',
  'passwordChallengeFailed',
  'passwordGenerated'
])

const passwordInput = useTemplateRef('passwordInput')
const copyPasswordAnnouncer = useTemplateRef('copyPasswordAnnouncer')
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

// attrs are not reactive, so these are plain functions evaluated on every render
const attrs = useAttrs()

function getAriaDescribedBy() {
  const ids = [attrs['aria-describedby'] as string]
  // the teleport target only holds the policy rules
  if (unref(showPasswordPolicyInformation) && teleportId) {
    ids.push(teleportId)
  }
  return ids.filter(Boolean).join(' ') || undefined
}

function getAriaInvalid(): HTMLAttributes['aria-invalid'] {
  const policyFailed =
    unref(showPasswordPolicyInformation) &&
    !!unref(password) &&
    unref(testedPasswordPolicy).rules.some((rule) => !rule.verified)
  if (policyFailed) {
    return 'true'
  }
  return attrs['aria-invalid'] as HTMLAttributes['aria-invalid']
}

const getPasswordPolicyRuleMessage = (rule: PasswordPolicyRule) => {
  const paramObj: Record<string, string> = {}

  for (let formatKey = 0; formatKey < rule.format.length; formatKey++) {
    paramObj[`param${formatKey + 1}`] = rule.format[formatKey]?.toString()
  }

  return $gettext(rule.message, paramObj)
}

const copyPasswordToClipboard = () => {
  navigator.clipboard.writeText(unref(password))
  copyPasswordIcon.value = 'check'
  unref(copyPasswordAnnouncer)?.announce($gettext('Copied to clipboard!'))
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

watch(
  () => value,
  (newValue) => {
    password.value = newValue
  }
)

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
