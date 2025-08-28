import Image from "next/image"
import RatingStars from "./rating-stars"

type ReviewItemProps = {
  userName: string
  userImage: string
  rating: number
  comment: string
  time: string
}

export default function ReviewItem({ userName, userImage, rating, comment, time }: ReviewItemProps) {
  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full overflow-hidden mr-3">
            <Image
              src={userImage || "/placeholder.svg"}
              alt={userName}
              width={38}
              height={38}
              className="object-cover"
            />
          </div>
          <h3 className="font-bold text-md">{userName}</h3>
        </div>
        <RatingStars rating={rating} />
      </div>
      <p className="text-gray-600  text-sm my-2">{comment}</p>
      <div className="text-right text-gray-400 text-sm">{time}</div>
    </div>
  )
}
