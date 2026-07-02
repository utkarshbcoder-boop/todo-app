import { useAdminStore } from '../store/adminStore'

export default function FeatureFlags() {
  const features = useAdminStore((s) => s.features)
  const enabledCount = Object.values(features).filter((f) => f.enabled).length
  const totalCount = Object.keys(features).length

  return (
    <div className="text-xs text-gray-400 dark:text-gray-500">
      {enabledCount}/{totalCount} features enabled
    </div>
  )
}
