import { Page, Locator } from '@playwright/test'
import * as po from './actions'
import { SpacesEnvironment } from '../../../environment'

export class Trashbin {
  #page: Page
  #spacesEnvironment: SpacesEnvironment

  constructor({ page }: { page: Page }) {
    this.#page = page
    this.#spacesEnvironment = new SpacesEnvironment()
  }

  async open(key: string): Promise<void> {
    const { id } = this.#spacesEnvironment.getSpace({ key })
    await po.openTrashbin({ page: this.#page, id })
  }

  async showEmptyTrashbins(): Promise<void> {
    await po.showEmptyTrashbins(this.#page)
  }

  async getEmptyTrashbinLocator(space: string): Promise<Locator> {
    return await po.getEmptyTrashbinLocator({ page: this.#page, space })
  }

  async emptyTrashbinUsingQuickAction(space: string): Promise<void> {
    await po.emptyTrashbinUsingQuickAction({ page: this.#page, space })
  }

  getTrashbinListFooterText(): Promise<string> {
    return po.getTrashbinListFooterText({ page: this.#page })
  }
}
