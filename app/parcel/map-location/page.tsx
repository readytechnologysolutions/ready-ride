"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import GoogleMap, { type GoogleMapRef } from "@/components/google-map"
import MapSearchBar from "@/components/map-search-bar"
import { saveLocationData, formatCoordinates } from "@/utils/location-utils"
import { saveParcelData } from "@/utils/parcel-utils"

export default function MapLocationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get("type") || "pickup" // pickup or delivery
  const mapRef = useRef<GoogleMapRef>(null)

  const [selectedLocation, setSelectedLocation] = useState<{
    coordinates: [number, number]
    address: string
  } | null>(null)

  const [isMapReady, setIsMapReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [viewportHeight, setViewportHeight] = useState("100vh")

  // Set viewport height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`)
    }

    // Initial update
    updateHeight()

    // Update on resize
    window.addEventListener("resize", updateHeight)

    return () => {
      window.removeEventListener("resize", updateHeight)
    }
  }, [])

  // Handle location selection from map
  const handleLocationSelect = useCallback((location: { coordinates: [number, number]; address: string } | null) => {
    if (!location) {
      setMapError("Could not determine location. Please try again.")
      return
    }

    console.log("Location selected:", location)
    setMapError(null)
    setSelectedLocation(location)
    setIsMapReady(true)
  }, [])

  // Handle place selection from search
  const handlePlaceSelect = useCallback((place: any) => {
    if (place && place.geometry && place.geometry.location) {
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()

      console.log("Place selected:", place.formatted_address, lat, lng)

      // Center map on selected location
      if (mapRef.current) {
        mapRef.current.centerMap(lat, lng)
      }
    }
  }, [])

  // Handle confirm button
  const handleConfirm = () => {
    if (!isMapReady || !selectedLocation) return

    // Save location data using the utility function
    saveLocationData(type, {
      type,
      coordinates: selectedLocation.coordinates,
      address: selectedLocation.address,
    })

    // Also save to parcel data with coordinates
    if (type === "pickup" || type === "sender") {
      saveParcelData({
        senderLocation: selectedLocation.address,
        senderLat: selectedLocation.coordinates[1], // lat
        senderLon: selectedLocation.coordinates[0], // lng
      })
    } else {
      saveParcelData({
        receiverLocation: selectedLocation.address,
        receiverLat: selectedLocation.coordinates[1], // lat
        receiverLon: selectedLocation.coordinates[0], // lng
      })
    }

    // Go back to the previous page
    router.back()
  }

  return (
    <div className="flex flex-col h-full bg-white" style={{ height: viewportHeight }}>
      {/* Header */}
      <div className="p-4 bg-[#fffcea]">
        <div className="flex items-center mb-3">
          <button onClick={() => router.back()} className="mr-4" aria-label="Go back">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">
            {type === "pickup" ? "Select Pickup Location" : "Select Delivery Location"}
          </h1>
        </div>
        <MapSearchBar onSearch={(query) => console.log("Search:", query)} onPlaceSelect={handlePlaceSelect} />
      </div>

      {/* Map Container - Using flex-1 to fill available space */}
      <div className="flex-1 relative">
        <GoogleMap ref={mapRef} onLocationSelect={handleLocationSelect} />
        {mapError && (
          <div className="absolute bottom-20 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-20">
            <p>{mapError}</p>
          </div>
        )}
      </div>

      {/* Address and Confirm Button - Fixed at bottom */}
      <div className="p-4 bg-white border-t border-gray-200">
        <h2 className="text-xl font-bold mb-1 line-clamp-2">{selectedLocation?.address || "Loading location..."}</h2>
        {isMapReady && selectedLocation && (
          <p className="text-gray-500 mb-2 text-sm">{formatCoordinates(selectedLocation.coordinates)}</p>
        )}
        <p className="text-gray-500 mb-4 text-sm">
          {isMapReady ? "Tap on the map to adjust the pin location" : "Loading map..."}
        </p>
        <button
          onClick={handleConfirm}
          disabled={!isMapReady}
          className="w-full bg-primary text-white py-4 rounded-full text-center text-xl font-medium disabled:opacity-50"
        >
          Confirm {type === "pickup" ? "Pickup" : "Delivery"} Location
        </button>
      </div>
    </div>
  )
}
