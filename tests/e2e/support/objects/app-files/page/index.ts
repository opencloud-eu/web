import { WithMe } from './shares/withMe'
import { Personal } from './spaces/personal'
import { Projects } from './spaces/projects'
import { WithOthers } from './shares/withOthers'
import { ViaLink } from './shares/viaLink'
import { Favorites } from './favorites/favorites'

export { Public } from './public'

import { Overview } from './trashbin/overview'

export const shares = { WithMe, WithOthers, ViaLink }
export const spaces = { Personal, Projects }
export const trashbin = { Overview }
export const favorites = { Favorites }
