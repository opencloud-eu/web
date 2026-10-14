import ListComponent from '../../components/Search/List.vue'
import { SearchFunction, SearchList, SearchResult } from '@opencloud-eu/web-pkg'
import { Component } from 'vue'

export const searchLimit = 200

export default class List implements SearchList {
  public readonly component: Component
  private readonly searchFunction: SearchFunction

  constructor(searchFunction: SearchFunction) {
    this.component = ListComponent
    this.searchFunction = searchFunction
  }

  public search(term: string): Promise<SearchResult> {
    // hidden results are kept, the resources store filters them reactively based on the settings
    return this.searchFunction(term, searchLimit, { includeHidden: true })
  }
}
