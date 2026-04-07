import { ConfigStore, SearchFunction, SearchPreview, SearchResult } from '@opencloud-eu/web-pkg'
import { Component } from 'vue'
import { ResourcePreview } from '@opencloud-eu/web-pkg'

export const previewSearchLimit = 8

export default class Preview implements SearchPreview {
  public readonly component: Component
  private readonly searchFunction: SearchFunction
  private readonly configStore: ConfigStore

  constructor(searchFunction: SearchFunction, configStore: ConfigStore) {
    this.component = ResourcePreview
    this.searchFunction = searchFunction
    this.configStore = configStore
  }

  public search(term: string): Promise<SearchResult> {
    return this.searchFunction(term, previewSearchLimit)
  }

  public get available(): boolean {
    return !this.configStore.options?.embed?.enabled
  }
}
