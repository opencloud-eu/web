import { appConfig } from '../playwright.config'
import { environment } from '../support'
import { state } from './shared'
import { searchFilter } from '../support/objects/app-files/resource/actions'

export interface GlobalSearch {
  keyword: string
  filter: searchFilter
  pressEnter: boolean
}

export class World {
  actorsEnvironment: environment.ActorsEnvironment
  filesEnvironment: environment.FilesEnvironment
  linksEnvironment: environment.LinksEnvironment
  spacesEnvironment: environment.SpacesEnvironment
  usersEnvironment: environment.UsersEnvironment
  uniquePrefix: string
  a11yEnabled: boolean = false
  tags: string[] = []
  lastGlobalSearch: Record<string, GlobalSearch> = {}

  constructor() {
    this.usersEnvironment = new environment.UsersEnvironment()
    this.spacesEnvironment = new environment.SpacesEnvironment()
    this.filesEnvironment = new environment.FilesEnvironment()
    this.linksEnvironment = new environment.LinksEnvironment()
    this.actorsEnvironment = new environment.ActorsEnvironment({
      context: {
        acceptDownloads: appConfig.acceptDownloads,
        failOnUncaughtConsoleError: appConfig.failOnUncaughtConsoleError
      },
      browser: state.browser
    })
  }
}
