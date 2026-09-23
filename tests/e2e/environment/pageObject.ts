import { Page } from '@playwright/test'
import { World } from './world'

export function actorPage(world: World, key: string): Page {
  return world.actorsEnvironment.getActor({ key }).page
}

type PageObjectClass<PageObjectType> = new (args: { page: Page }) => PageObjectType

export function pageObjectFor<PageObjectType>(
  world: World,
  key: string,
  PageObject: PageObjectClass<PageObjectType>
): PageObjectType {
  return new PageObject({ page: actorPage(world, key) })
}
