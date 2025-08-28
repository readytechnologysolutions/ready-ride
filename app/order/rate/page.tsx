"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Star } from "lucide-react"
import Image from "next/image"

export default function RateOrderPage() {
  const router = useRouter()
  const [rating, setRating] = useState(4)
  const [comment, setComment] = useState("")
  const [showThankYou, setShowThankYou] = useState(false)

  const ratingLabels = ["Poor", "Fair", "Good", "Very Good", "Excellent"]

  const handleStarClick = (selectedRating: number) => {
    setRating(selectedRating)
  }

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Limit comment to 50 characters
    if (e.target.value.length <= 50) {
      setComment(e.target.value)
    }
  }

  const handleSubmit = () => {
    // In a real app, you would send the rating and comment to your API
    console.log("Submitting rating:", {
      rating,
      comment,
    })

    // Show thank you dialog
    setShowThankYou(true)
  }

  const handleClose = () => {
    setShowThankYou(false)
    router.push("/home")
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="p-4 flex items-center bg-white">
        <button onClick={() => router.back()} className="mr-4" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Rate Order</h1>
      </div>

      <div className="flex flex-col items-center p-6 pt-12">
        <h2 className="text-2xl font-bold mb-6">How will you rate rider?</h2>

        {/* Star Rating */}
        <div className="flex space-x-4 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => handleStarClick(star)} className="focus:outline-none">
              <Star
                size={48}
                className={star <= rating ? "text-primary fill-primary" : "text-primary"}
                strokeWidth={1}
              />
            </button>
          ))}
        </div>

        {/* Rating Label */}
        <p className="text-gray-500 text-xl mb-8">{ratingLabels[rating - 1]}</p>

        {/* Comment Box */}
        <div className="w-full mb-8">
          <textarea
            value={comment}
            onChange={handleCommentChange}
            placeholder="Kindly add any additional comment about rider here"
            className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          ></textarea>
          <div className="text-right text-gray-500">{comment.length}/50</div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          className="w-full bg-primary text-white py-4 rounded-full text-center text-xl font-medium mt-auto"
        >
          Done
        </button>
      </div>

      {/* Thank You Dialog */}
      {showThankYou && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[90%] max-w-md overflow-hidden animate-fade-in-up">
            <div className="flex flex-col items-center p-6">
              <div className="mb-6">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Ready_Ride-5MZ8SXhfI7ilv7ipASgb3BqOruGiQ1.png"
                  alt="Thank you"
                  width={200}
                  height={200}
                />
              </div>
              <h2 className="text-3xl font-bold text-primary mb-4">Thank you</h2>
              <p className="text-center text-lg">Your feedback was successfully submitted</p>
            </div>

            <div className="border-t border-gray-200">
              <button onClick={handleClose} className="w-full py-4 text-gray-500 font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
