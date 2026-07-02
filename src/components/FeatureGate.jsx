import { useFeatureFlag } from '../hooks/useFeatureFlag'

export default function FeatureGate({ feature, children, fallback = null }) {
  const enabled = useFeatureFlag(feature)
  return enabled ? children : fallback
}
