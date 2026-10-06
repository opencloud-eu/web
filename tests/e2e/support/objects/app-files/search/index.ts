import { Page } from '@playwright/test'
import * as po from '../search/actions'

export class Search {
  #page: Page

  constructor({ page }: { page: Page }) {
    this.#page = page
  }

  getSearchResultMessage(): Promise<string> {
    return po.getSearchResultMessage({ page: this.#page })
  }

  async selectTagFilter({ tag: string }: { tag: string }): Promise<void> {
    await po.selectTagFilter({ tag: string, page: this.#page })
  }

  async selectMediaTypeFilter({ mediaType: string }: { mediaType: string }): Promise<void> {
    await po.selectMediaTypeFilter({ mediaType: string, page: this.#page })
  }

  async selectlastModifiedFilter({
    lastModified: string
  }: {
    lastModified: string
  }): Promise<void> {
    await po.selectLastModifiedFilter({ lastModified: string, page: this.#page })
  }

  async clearFilter({ filter: string }: { filter: string }): Promise<void> {
    await po.clearFilter({ page: this.#page, filter: string })
  }

  async toggleSearchTitleOnly({
    enableOrDisable: string
  }: {
    enableOrDisable: string
  }): Promise<void> {
    await po.toggleSearchTitleOnly({ enableOrDisable: string, page: this.#page })
  }

  async openLocationSearchPanel(): Promise<void> {
    await po.openLocationSearchPanel({ page: this.#page })
  }

  getFoundContentMatch(
    args: Omit<Parameters<typeof po.getFoundContentMatch>[0], 'page'>
  ): Promise<{ match: string; isFullyVisible: boolean }> {
    return po.getFoundContentMatch({ ...args, page: this.#page })
  }

  getMatchingTags(args: Omit<Parameters<typeof po.getMatchingTags>[0], 'page'>): Promise<string[]> {
    return po.getMatchingTags({ ...args, page: this.#page })
  }

  getFoundContentAndMatchingTagsCount(
    args: Omit<Parameters<typeof po.getFoundContentAndMatchingTagsCount>[0], 'page'>
  ): Promise<number> {
    return po.getFoundContentAndMatchingTagsCount({ ...args, page: this.#page })
  }
}
