import { ref, unref } from 'vue'
import { compareVersions, parseVersion, useCapabilityStore } from '@opencloud-eu/web-pkg'

export const APP_STORE_URL =
  'https://raw.githubusercontent.com/opencloud-eu/awesome-apps/main/webApps/apps.json'

export interface AppVersionConstraints {
  minOpenCloud?: string
  maxOpenCloud?: string
}

interface AppStoreVersion extends AppVersionConstraints {
  version: string
}

interface AppStoreApp {
  id: string
  name?: string
  versions: AppStoreVersion[]
}

function stripVersionPrefix(version: string) {
  return version?.replace(/^v/, '')
}

export function useAppCompatibility() {
  const capabilityStore = useCapabilityStore()

  const appStoreApps = ref<AppStoreApp[]>([])
  const loading = ref(false)
  const loadingFailed = ref(false)

  const serverVersion = capabilityStore.status?.productversion?.split('+')[0]

  async function loadAppStoreApps() {
    loading.value = true
    loadingFailed.value = false
    try {
      const response = await fetch(APP_STORE_URL)
      if (!response.ok) {
        throw new Error(`Failed to load app store apps: ${response.status}`)
      }
      const { apps } = await response.json()
      if (!Array.isArray(apps)) {
        throw new Error('Invalid app store apps')
      }
      appStoreApps.value = apps
    } catch (e) {
      console.error(e)
      loadingFailed.value = true
    } finally {
      loading.value = false
    }
  }

  /**
   * Installed apps are identified by their folder name, which is expected to equal the app
   * store id or to be its suffix after a dot. I.e. for an app store id of "com.example.myapp",
   * the installed app folder is expected to be "myapp" (or "example.myapp", ...).
   */
  function getAppStoreApp(appId: string) {
    return unref(appStoreApps).find(({ id }) => id === appId || id?.endsWith(`.${appId}`))
  }

  function getAppStoreName(appId: string) {
    return getAppStoreApp(appId)?.name
  }

  function getVersionConstraints(appId: string, version?: string): AppVersionConstraints {
    if (!version) {
      return {}
    }
    const app = getAppStoreApp(appId)
    const appVersion = app?.versions?.find(
      (v) => stripVersionPrefix(v.version) === stripVersionPrefix(version)
    )
    if (!appVersion) {
      return {}
    }
    return { minOpenCloud: appVersion.minOpenCloud, maxOpenCloud: appVersion.maxOpenCloud }
  }

  // max is a minor version line, i.e. a max of 7.5.0 still allows 7.5.x
  function exceedsMaxVersion(maxOpenCloud: string) {
    const server = parseVersion(serverVersion)
    const max = parseVersion(maxOpenCloud)
    if (server.major !== max.major) {
      return server.major > max.major
    }
    return server.minor > max.minor
  }

  function isCompatible({ minOpenCloud, maxOpenCloud }: AppVersionConstraints) {
    if (!serverVersion) {
      return true
    }
    if (minOpenCloud && compareVersions(serverVersion, minOpenCloud) < 0) {
      return false
    }
    if (maxOpenCloud && exceedsMaxVersion(maxOpenCloud)) {
      return false
    }
    return true
  }

  return {
    serverVersion,
    loading,
    loadingFailed,
    loadAppStoreApps,
    getAppStoreName,
    getVersionConstraints,
    isCompatible
  }
}
