export default function Loading() {
  return (
    <div className="min-h-screen bg-[#fffcea] p-4">
      <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
      <div className="h-64 w-full bg-gray-200 rounded animate-pulse mb-4"></div>
      <div className="h-40 bg-gray-200 rounded-xl animate-pulse mb-4"></div>
      <div className="h-80 bg-gray-200 rounded-xl animate-pulse mb-4"></div>
      <div className="h-20 bg-gray-200 rounded-xl animate-pulse"></div>
    </div>
  )
}
