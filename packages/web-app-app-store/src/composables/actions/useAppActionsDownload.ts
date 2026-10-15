import { Action } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { App, AppVersion } from '../../types'

export type AppActionOptions = {
  app: App
  version?: AppVersion
}

export function useAppActionsDownload() {
  const { $gettext } = useGettext()

  function getDownloadVersion({ app, version }: AppActionOptions) {
    return version || app.mostRecentVersion
  }

  function getDownloadFilename(options: AppActionOptions) {
    const { filename, url } = getDownloadVersion(options)
    return filename || url.split('/').pop()
  }

  const downloadAppAction: Action<AppActionOptions> = {
    name: 'download-app',
    icon: 'download',
    label: () => {
      return $gettext('Download')
    },
    // a link instead of a click handler, so the download url can be copied
    href(options?) {
      return getDownloadVersion(options).url
    },
    isVisible: () => {
      return true
    },
    appearance: 'outline'
  }

  return {
    downloadAppAction,
    getDownloadVersion,
    getDownloadFilename
  }
}
