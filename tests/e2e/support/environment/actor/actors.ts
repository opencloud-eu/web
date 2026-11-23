import { Actor } from '../../types'
import { ActorsOptions } from './shared'
import { ActorEnvironment } from './actor'
import { actorStore } from '../../store'

export class ActorsEnvironment {
  private readonly options: ActorsOptions

  constructor(options: ActorsOptions) {
    this.options = options
  }

  public getActor({ key }: { key: string }): Actor {
    if (!actorStore.has(key)) {
      throw new Error(`actor with key '${key}' not found`)
    }

    return actorStore.get(key)
  }

  public async createActor({ key }: { key: string }): Promise<Actor> {
    if (actorStore.has(key)) {
      return this.getActor({ key })
    }

    const actor = new ActorEnvironment({ id: key, ...this.options })
    await actor.setup()
    actor.on('closed', () => actorStore.delete(key))

    actorStore.set(key, actor)

    return actor
  }

  public async close(): Promise<void> {
    await Promise.allSettled([...actorStore.values()].map((actor) => actor.close()))
  }
}
