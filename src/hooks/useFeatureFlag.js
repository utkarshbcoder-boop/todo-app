import { useAdminStore } from '../store/adminStore'

export function useFeatureFlag(featureKey) {
  const features = useAdminStore((s) => s.features)
  return features[featureKey]?.enabled ?? false
}
