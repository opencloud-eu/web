import { defineStore } from 'pinia'
import { ref } from 'vue'
import { AppStoreRepository } from '../types'
import { APPID } from '../appid'

export const useRepositoriesStore = defineStore(`${APPID}-repositories`, () => {
  const repositories = ref<AppStoreRepository[]>([])

  function setRepositories(repos: AppStoreRepository[]) {
    repositories.value = repos
  }

  return {
    repositories,
    setRepositories
  }
})
