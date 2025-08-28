"use client"

import { useState, useEffect } from "react"

type MapMarkerProps = {
  lat?: number
  lng?: number
  draggable?: boolean
  onDragEnd?: (lat: number, lng: number) => void
}

export default function MapMarker({ draggable = false, onDragEnd }: MapMarkerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  // Animation effect when the marker appears
  useEffect(() => {
    const timer = setTimeout(() => {
      setPosition({ x: 0, y: -10 })
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // This is a simplified implementation since we're not using a real map
  // In a real app, you would use the map API's marker functionality

  return (
    <div
      className={`absolute left-1/2 top-1/2 -ml-6 -mt-12 transition-transform duration-300 ${
        isDragging ? "scale-110" : "scale-100"
      }`}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <div className="w-12 h-12 flex items-center justify-center">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center animate-pulse">
          <div className="w-4 h-4 bg-white rounded-full"></div>
        </div>
      </div>
      <div className="w-4 h-4 bg-primary rotate-45 absolute -bottom-1 left-4"></div>
    </div>
  )
}
