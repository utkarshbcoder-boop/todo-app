export default function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-20 rounded-2xl" />
      ))}
    </div>
  )
}
