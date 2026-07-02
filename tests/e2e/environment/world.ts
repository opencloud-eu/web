import { appConfig } from '../playwright.config'
import { environment } from '../support'
import { state } from './shared'

export class World {
  actorsEnvironment: environment.ActorsEnvironment
  filesEnvironment: environment.FilesEnvironment
  linksEnvironment: environment.LinksEnvironment
  spacesEnvironment: environment.SpacesEnvironment
  usersEnvironment: environment.UsersEnvironment
  uniquePrefix: string
  a11yEnabled: boolean = false
  tags: string[] = []

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
