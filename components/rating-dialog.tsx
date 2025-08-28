"use client"

import type React from "react"

import { useState } from "react"
import { Star, X } from "lucide-react"
import Image from "next/image"

type RatingDialogProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (rating: number, comment: string) => void
  itemName: string
}

export default function RatingDialog({ isOpen, onClose, onSubmit, itemName }: RatingDialogProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [showThankYou, setShowThankYou] = useState(false)

  const handleStarClick = (selectedRating: number) => {
    setRating(selectedRating)
  }

  const handleStarHover = (hoveredRating: number) => {
    setHoveredRating(hoveredRating)
  }

  const handleStarLeave = () => {
    setHoveredRating(0)
  }

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Limit comment to 200 characters
    if (e.target.value.length <= 200) {
      setComment(e.target.value)
    }
  }

  const handleSubmit = () => {
    if (rating === 0) return // Require at least 1 star

    onSubmit(rating, comment)
    setShowThankYou(true)
  }

  const handleClose = () => {
    setRating(0)
    setComment("")
    setShowThankYou(false)
    onClose()
  }

  if (!isOpen) return null

  const getRatingLabel = () => {
    const activeRating = hoveredRating || rating
    switch (activeRating) {
      case 1:
        return "Poor"
      case 2:
        return "Fair"
      case 3:
        return "Good"
      case 4:
        return "Very Good"
      case 5:
        return "Excellent"
      default:
        return "Rate this item"
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-white rounded-xl w-[90%] max-w-md overflow-hidden animate-slide-up">
        {!showThankYou ? (
          <>
            <div className="p-4 flex justify-between items-center border-b border-gray-200">
              <h2 className="text-xl font-bold">Rate Your Food</h2>
              <button onClick={handleClose} className="p-1 rounded-full" aria-label="Close">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <h3 className="text-center text-lg font-medium mb-2">{itemName}</h3>

              {/* Star Rating */}
              <div className="flex justify-center space-x-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => handleStarHover(star)}
                    onMouseLeave={handleStarLeave}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      size={36}
                      className={
                        star <= (hoveredRating || rating)
                          ? "text-primary fill-primary"
                          : "text-gray-300 stroke-gray-300"
                      }
                      strokeWidth={1}
                    />
                  </button>
                ))}
              </div>

              <p className="text-center text-gray-500 mb-6">{getRatingLabel()}</p>

              {/* Comment Box */}
              <div className="mb-6">
                <textarea
                  value={comment}
                  onChange={handleCommentChange}
                  placeholder="Tell us about your experience (optional)"
                  className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                ></textarea>
                <div className="text-right text-gray-500 text-sm">{comment.length}/200</div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={rating === 0}
                className="w-full bg-primary text-white py-4 rounded-full text-center text-xl font-medium disabled:opacity-50"
              >
                Submit Rating
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center p-6">
            <div className="mb-6">
              <Image src="https://getreadyride.com/uploads/images/rate_image.png" alt="Thank you" width={150} height={150} />
            </div>
            <h2 className="text-3xl font-bold text-primary mb-4">Thank you!</h2>
            <p className="text-center text-lg mb-6">Your feedback helps us improve our service.</p>
            <button
              onClick={handleClose}
              className="w-full bg-primary text-white py-4 rounded-full text-center text-xl font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
