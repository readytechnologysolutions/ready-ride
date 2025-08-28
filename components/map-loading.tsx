import { Loader2 } from "lucide-react"

type MapLoadingProps = {
  message?: string
}

export default function MapLoading({ message = "Loading map..." }: MapLoadingProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 bg-opacity-75 z-10">
      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
      <p className="text-gray-700 font-medium">{message}</p>
    </div>
  )
}
