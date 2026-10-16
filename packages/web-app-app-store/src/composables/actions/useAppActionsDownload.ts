import { App, AppVersion } from '../../types'

export type AppActionOptions = {
  app: App
  version?: AppVersion
}

export function useAppActionsDownload() {
  function getDownloadVersion({ app, version }: AppActionOptions) {
    return version || app.mostRecentVersion
  }

  function getDownloadFilename(options: AppActionOptions) {
    const { filename, url } = getDownloadVersion(options)
    return filename || url.split('/').pop()
  }

  return {
    getDownloadVersion,
    getDownloadFilename
  }
}
