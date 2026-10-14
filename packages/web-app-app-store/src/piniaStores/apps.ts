import { defineStore } from 'pinia'
import { ref, unref } from 'vue'
import { App, AppStoreRepository, RawAppListSchema } from '../types'
import { APPID } from '../appid'
import { useRepositoriesStore } from './repositories'

export const useAppsStore = defineStore(`${APPID}-apps`, () => {
  const repositoriesStore = useRepositoriesStore()

  const apps = ref<App[]>([])
  const loadingFailed = ref(false)

  function getById(id: string) {
    return unref(apps).find((app) => app.id === id)
  }

  async function loadAppsByRepo(repo: AppStoreRepository): Promise<App[] | null> {
    try {
      const response = await fetch(repo.url)
      if (!response.ok) {
        throw new Error(`Failed to load apps from ${repo.url}: ${response.status}`)
      }
      const { apps } = RawAppListSchema.parse(await response.json())
      return apps
        .map((app) => ({ ...app, repository: repo, mostRecentVersion: app.versions[0] }))
        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    } catch (e) {
      console.error(e)
      return null
    }
  }

  async function loadApps() {
    const appsByRepo = await Promise.all(repositoriesStore.repositories.map(loadAppsByRepo))
    const loadedAppsByRepo = appsByRepo.filter((repoApps) => repoApps !== null)
    loadingFailed.value = appsByRepo.length > 0 && !loadedAppsByRepo.length
    apps.value = loadedAppsByRepo.flat()
  }

  return {
    apps,
    loadingFailed,
    getById,
    loadApps
  }
})
