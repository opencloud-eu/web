import { ApplicationInformation, useUserStore } from '@opencloud-eu/web-pkg'
import { computed } from 'vue'
import { Extension } from '@opencloud-eu/web-pkg'
import { urlJoin } from '@opencloud-eu/web-client'

export const extensions = (appInfo: ApplicationInformation) => {
  const userStore = useUserStore()

  return computed<Extension[]>(() => [
    ...((userStore.user && [
      {
        id: `app.${appInfo.id}.menuItem`,
        type: 'appMenuItem',
        label: () => appInfo.name,
        color: appInfo.color,
        icon: appInfo.icon,
        path: urlJoin(appInfo.id)
      }
    ]) ||
      [])
  ])
}
