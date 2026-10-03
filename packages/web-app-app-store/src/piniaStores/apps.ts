import { defineStore } from 'pinia'
import { ref, unref } from 'vue'
import { App, AppStoreRepository, RawAppListSchema } from '../types'
import { APPID } from '../appid'
import { useRepositoriesStore } from './repositories'

export const useAppsStore = defineStore(`${APPID}-apps`, () => {
  const repositoriesStore = useRepositoriesStore()

  const apps = ref<App[]>([])

  function getById(id: string) {
    return unref(apps).find((app) => app.id === id)
  }

  async function loadAppsByRepo(repo: AppStoreRepository): Promise<App[]> {
    try {
      const response = await fetch(repo.url)
      const { apps } = RawAppListSchema.parse(await response.json())
      return apps
        .map((app) => ({ ...app, repository: repo, mostRecentVersion: app.versions[0] }))
        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    } catch (e) {
      console.error(e)
      return []
    }
  }

  async function loadApps() {
    const appsByRepo = await Promise.all(repositoriesStore.repositories.map(loadAppsByRepo))
    apps.value = appsByRepo.flat()
  }

  return {
    apps,
    getById,
    loadApps
  }
})
