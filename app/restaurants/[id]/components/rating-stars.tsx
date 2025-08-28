import { Star } from "lucide-react"

type RatingStarsProps = {
  rating: number
  size?: number
}

export default function RatingStars({ rating, size = 20 }: RatingStarsProps) {
  // Calculate full and partial stars
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5

  return (
    <div className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="text-yellow-400"
          size={size}
          fill={i < fullStars || (i === fullStars && hasHalfStar) ? "currentColor" : "none"}
          stroke="currentColor"
        />
      ))}
    </div>
  )
}
