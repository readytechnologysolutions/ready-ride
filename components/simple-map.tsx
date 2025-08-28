"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { MapPin } from "lucide-react"

type SimpleMapProps = {
  onLocationSelect: (location: {
    coordinates: [number, number]
    address: string
  }) => void
}

export default function SimpleMap({ onLocationSelect }: SimpleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [markerPosition, setMarkerPosition] = useState({ x: 50, y: 50 }) // Percentage values
  const [loading, setLoading] = useState(true)
  const [mapCenter, setMapCenter] = useState<[number, number]>([0.2057, 5.5913]) // Default to Ghana

  // Simulate getting user's location
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
      // Simulate a successful geolocation
      handleLocationFound([0.2057, 5.5913]) // Ghana coordinates
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleLocationFound = (coordinates: [number, number]) => {
    setMapCenter(coordinates)
    // Generate a realistic address based on the coordinates
    generateAddress(coordinates)
  }

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapContainerRef.current) return

    const rect = mapContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setMarkerPosition({ x, y })

    // Calculate simulated coordinates based on click position
    const longitude = mapCenter[0] + (x - 50) / 500
    const latitude = mapCenter[1] - (y - 50) / 500

    generateAddress([longitude, latitude])
  }

  const generateAddress = (coordinates: [number, number]) => {
    // Simulate reverse geocoding with a delay
    setTimeout(() => {
      // Generate a realistic address based on the coordinates
      const address = `${Math.abs(coordinates[1]).toFixed(4)}° ${coordinates[1] >= 0 ? "N" : "S"}, ${Math.abs(coordinates[0]).toFixed(4)}° ${coordinates[0] >= 0 ? "E" : "W"}`

      // For Ghana, add some realistic street names
      const streetNames = [
        "Market Circle",
        "High Street",
        "Beach Road",
        "Liberation Road",
        "Independence Avenue",
        "Effia-Nkwanta Road",
        "Anaji Estate",
      ]

      const randomStreet = streetNames[Math.floor(Math.random() * streetNames.length)]
      const fullAddress = `${randomStreet}, Takoradi, Ghana`

      onLocationSelect({
        coordinates: coordinates,
        address: fullAddress,
      })
    }, 500)
  }

  return (
    <div className="w-full h-full absolute inset-0">
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div
          ref={mapContainerRef}
          className="absolute inset-0 cursor-pointer w-full h-full"
          onClick={handleMapClick}
          style={{ touchAction: "manipulation" }}
        >
          {/* Simulated map background */}
          <div className="absolute inset-0 w-full h-full">
            <Image src="/map-route.jpg" alt="Map" fill className="object-cover" priority />
          </div>

          {/* Centered marker */}
          <div
            className="absolute transform -translate-x-1/2 -translate-y-full z-10"
            style={{
              left: `${markerPosition.x}%`,
              top: `${markerPosition.y}%`,
              transition: isDragging ? "none" : "all 0.2s ease-out",
            }}
          >
            <div className="flex flex-col items-center">
              <MapPin size={36} className="text-primary" fill="#ffa500" />
              <div className="w-2 h-2 -mt-1 bg-primary rounded-full"></div>
            </div>
          </div>

          {/* Map attribution */}
          <div className="absolute bottom-2 right-2 text-xs text-gray-700 bg-white bg-opacity-75 px-2 py-1 rounded">
            Map data © OpenStreetMap contributors
          </div>
        </div>
      )}
    </div>
  )
}
