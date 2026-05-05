import { getLoadingService, LoadingService } from '../../services'
import { useService } from '../service'

export const useLoadingService = (): LoadingService => {
  return useService<LoadingService>('$loadingService') || getLoadingService()
}
