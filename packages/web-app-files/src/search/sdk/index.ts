import Preview from './preview'
import List from './list'
import {
  CapabilityStore,
  ConfigStore,
  SearchFunction,
  SearchList,
  SearchPreview,
  SearchProvider,
  $gettext
} from '@opencloud-eu/web-pkg'

export default class Provider implements SearchProvider {
  public readonly id: string
  public readonly displayName: string
  public readonly previewSearch: SearchPreview
  public readonly listSearch: SearchList
  private readonly capabilityStore: CapabilityStore

  constructor(
    capabilityStore: CapabilityStore,
    searchFunction: SearchFunction,
    configStore: ConfigStore,
    listSearchFunction: SearchFunction = searchFunction
  ) {
    this.id = 'files.sdk'
    this.displayName = $gettext('Files')
    this.previewSearch = new Preview(searchFunction, configStore)
    this.listSearch = new List(listSearchFunction)
    this.capabilityStore = capabilityStore
  }

  public get available(): boolean {
    return this.capabilityStore.davReports.includes('search-files')
  }
}
