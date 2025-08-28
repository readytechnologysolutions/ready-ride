"use client"

import type React from "react"

import { Clock } from "lucide-react"

interface ClosedRestaurantDialogProps {
  isOpen: boolean
  onClose: () => void
  restaurantName: string
  opensAt: string
}

export default function ClosedRestaurantDialog({
  isOpen,
  onClose,
  restaurantName,
  opensAt,
}: ClosedRestaurantDialogProps) {
  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleBackdropClick}>
      <div className="bg-white rounded-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Restaurant Closed</h3>
          <p className="text-gray-600 mb-6">
            Sorry, <span className="font-medium">{restaurantName}</span> is currently closed. It will open again at{" "}
            <span className="font-medium text-primary">{opensAt}</span>.
          </p>
          <button
            onClick={onClose}
            className="bg-primary text-white font-medium rounded-full px-6 py-2 w-full hover:bg-primary/90 transition-colors"
          >
            OK, I'll check back later
          </button>
        </div>
      </div>
    </div>
  )
}
