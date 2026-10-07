import { defineStore } from 'pinia'
import { computed, ref, unref } from 'vue'
import {
  AppConfigObject,
  ApplicationInformation,
  ApplicationFileExtension,
  ApplicationTranslationLoaders,
  ApplicationTranslations
} from '../../apps'
import { Icon, isImageIcon, NamedIcon } from '@opencloud-eu/design-system/helpers'

function mergeDeprecatedIconFields(
  icon: Icon,
  { fillType, color }: Pick<NamedIcon, 'fillType' | 'color'>,
  { fieldsTakePrecedence = false }: { fieldsTakePrecedence?: boolean } = {}
): Icon {
  if (isImageIcon(icon) || (!fillType && !color)) {
    return icon
  }

  const namedIcon = typeof icon === 'string' ? { name: icon } : icon
  const fields = { ...(fillType && { fillType }), ...(color && { color }) }
  return fieldsTakePrecedence ? { ...namedIcon, ...fields } : { ...fields, ...namedIcon }
}

export const useAppsStore = defineStore('apps', () => {
  const apps = ref<Record<string, ApplicationInformation>>({})
  const appLoadingFailure = ref<Record<string, { error?: Error }>>({})
  const externalAppConfig = ref<Record<string, AppConfigObject>>({})
  const fileExtensions = ref<ApplicationFileExtension[]>([])

  const appIds = computed(() => Object.keys(unref(apps)))

  const registerApp = (
    appInfo: ApplicationInformation,
    translations?: ApplicationTranslations | ApplicationTranslationLoaders
  ) => {
    if (!appInfo.id) {
      return
    }

    unref(apps)[appInfo.id] = {
      defaultExtension: appInfo.defaultExtension || '',
      name: appInfo.name || appInfo.id,
      translations,
      ...appInfo,
      icon: mergeDeprecatedIconFields(appInfo.icon || 'puzzle', {
        fillType: appInfo.iconFillType
      })
    }

    if (appInfo.extensions) {
      appInfo.extensions.forEach((extension) => {
        registerFileExtension({ appId: appInfo.id, data: extension })
      })
    }
  }

  const registerFileExtension = ({
    appId,
    data
  }: {
    appId: string
    data: ApplicationFileExtension
  }) => {
    const deprecatedIconFields = { fillType: data.iconFillType, color: data.iconColor }
    const appIcon = unref(apps)[appId]?.icon
    const icon = data.icon
      ? mergeDeprecatedIconFields(data.icon, deprecatedIconFields)
      : appIcon &&
        mergeDeprecatedIconFields(appIcon, deprecatedIconFields, { fieldsTakePrecedence: true })

    unref(fileExtensions).push({
      ...data,
      ...(icon && { icon }),
      app: appId,
      hasPriority:
        data.hasPriority ||
        unref(externalAppConfig)?.[appId]?.priorityExtensions?.includes(data.extension) ||
        false,
      secureView: data.secureView || false
    })
  }

  const loadExternalAppConfig = ({ appId, config }: { appId: string; config: AppConfigObject }) => {
    externalAppConfig.value = { ...unref(externalAppConfig), [appId]: config }
  }

  const isAppEnabled = (appId: string) => {
    return unref(appIds).includes(appId)
  }

  const registerAppLoadingFailure = (appId: string, error?: Error) => {
    unref(appLoadingFailure)[appId] = { error }
  }

  return {
    apps,
    appLoadingFailure,
    externalAppConfig,
    appIds,
    fileExtensions,

    registerApp,
    registerFileExtension,
    loadExternalAppConfig,
    isAppEnabled,
    registerAppLoadingFailure
  }
})

export type AppsStore = ReturnType<typeof useAppsStore>
