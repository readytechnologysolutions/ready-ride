import Image from "next/image"

type RestaurantHeaderProps = {
  name: string
  type: "restaurant" | "food-joint"
  image: string
}

export default function RestaurantHeader({ name, type, image }: RestaurantHeaderProps) {
  return (
    <div className="relative h-64 w-full">
      <Image
        src={image || "/placeholder.svg?height=400&width=600&query=pizza"}
        alt={name}
        fill
        className="object-cover"
      />
      <div className="absolute top-4 left-4 bg-white bg-opacity-80 rounded-lg px-3 py-1">
        <span className="text-sm font-medium">{type === "restaurant" ? "Restaurant" : "Food joint"}</span>
      </div>
    </div>
  )
}
