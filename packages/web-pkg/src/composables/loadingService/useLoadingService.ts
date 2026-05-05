import { LoadingService } from '../../services'
import { useService } from '../service'

const fallbackLoadingService = new LoadingService()

export const useLoadingService = (): LoadingService => {
  return useService<LoadingService>('$loadingService') || fallbackLoadingService
}
