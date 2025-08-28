"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, Search, X } from "lucide-react"
import { loadGoogleMapsApi } from "@/utils/google-maps-loader"

interface LocationData {
  address: string
  lat: number
  lng: number
}

type Prediction = {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
  types: string[]
}

type PlaceDetails = {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
}

interface LocationPickerDialogProps {
  isOpen: boolean
  onClose: () => void
  onLocationSelect: (location: LocationData) => void
  title: string
  currentLocation?: LocationData | null
}

export default function LocationPickerDialog({
  isOpen,
  onClose,
  onLocationSelect,
  title,
  currentLocation,
}: LocationPickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(currentLocation || null)
  const [isLoading, setIsLoading] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Reset selected location when currentLocation changes
  useEffect(() => {
    setSelectedLocation(currentLocation || null)
  }, [currentLocation])

  // Debounced search for predictions
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setPredictions([])
      setSearchError(null)
      return
    }

    const timeoutId = setTimeout(() => {
      searchPredictions(searchQuery)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Initialize Google Maps when map is shown
  useEffect(() => {
    if (showMap && mapRef.current) {
      initializeMap()
    }
  }, [showMap])

  const searchPredictions = async (query: string) => {
    try {
      setIsSearching(true)
      setSearchError(null)

      const response = await fetch(`/api/places-text-search?query=${encodeURIComponent(query)}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setPredictions(data.predictions || [])
        if (data.predictions?.length === 0 && data.message) {
          console.log(data.message)
        }
      } else {
        setSearchError(data.error || "Failed to search places")
        setPredictions([])
      }
    } catch (error) {
      console.error("Error searching predictions:", error)
      setSearchError("Network error occurred. Please try again.")
      setPredictions([])
    } finally {
      setIsSearching(false)
    }
  }

  const getPlaceDetails = async (placeId: string) => {
    try {
      setIsLoadingDetails(true)
      setSearchError(null)

      const response = await fetch("/api/places-text-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ place_id: placeId }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.result) {
        return {
          place_id: placeId,
          name: data.result.name || "Selected Location",
          formatted_address: data.result.formatted_address || "",
          geometry: {
            location: {
              lat: data.result.geometry.location.lat,
              lng: data.result.geometry.location.lng,
            },
          },
        }
      } else {
        throw new Error(data.error || "Failed to get place details")
      }
    } catch (error) {
      console.error("Error getting place details:", error)
      setSearchError("Failed to get location details. Please try again.")
      return null
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const handleSelectPrediction = async (prediction: Prediction) => {
    const placeDetails = await getPlaceDetails(prediction.place_id)

    if (!placeDetails) return

    setSelectedPlace(placeDetails)
    const locationData = {
      address: placeDetails.formatted_address,
      lat: placeDetails.geometry.location.lat,
      lng: placeDetails.geometry.location.lng,
    }
    setSelectedLocation(locationData)

    // Show map with smooth animation
    setShowMap(true)
  }

  const initializeMap = async () => {
    try {
      setIsLoading(true)
      await loadGoogleMapsApi()

      if (!mapRef.current || !selectedLocation) return

      // Initialize map centered on selected location
      const map = new (window as any).google.maps.Map(mapRef.current, {
        center: { lat: selectedLocation.lat, lng: selectedLocation.lng },
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })

      mapInstanceRef.current = map

      // Wait for the first tile draw before dropping the marker
      ;(window as any).google.maps.event.addListenerOnce(map, "tilesloaded", () => {
        addMarker(selectedLocation.lat, selectedLocation.lng, selectedLocation.address)
        setIsLoading(false)
      })
    } catch (error) {
      console.error("Error initializing map:", error)
      setIsLoading(false)
    }
  }

  const addMarker = (lat: number, lng: number, address: string) => {
    if (!mapInstanceRef.current) {
      console.log("Map not ready for marker")
      return
    }

    console.log("Adding draggable marker at:", lat, lng)

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null)
    }

    // Create draggable marker
    const marker = new (window as any).google.maps.Marker({
      position: { lat, lng },
      map: mapInstanceRef.current,
      title: address,
      draggable: true,
      animation: (window as any).google.maps.Animation.DROP,
      icon: {
        path: (window as any).google.maps.SymbolPath.CIRCLE,
        fillColor: "#ef4444",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
        scale: 8,
      },
    })

    // Add drag end listener to update location
    marker.addListener("dragend", () => {
      const position = marker.getPosition()
      const newLat = position.lat()
      const newLng = position.lng()

      console.log("Marker dragged to:", newLat, newLng)

      // Reverse geocode to get new address
      reverseGeocode(newLat, newLng)
    })

    markerRef.current = marker
    console.log("Draggable marker created successfully")
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const geocoder = new (window as any).google.maps.Geocoder()
      const response = await geocoder.geocode({ location: { lat, lng } })

      if (response.results && response.results.length > 0) {
        const address = response.results[0].formatted_address

        // Update selected location with new coordinates and address
        setSelectedLocation({
          address,
          lat,
          lng,
        })

        console.log("Location updated after drag:", { address, lat, lng })
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Clear predictions immediately if empty
    if (!value.trim()) {
      setPredictions([])
      return
    }
  }

  const handleConfirm = () => {
    console.log("Confirm clicked, selectedLocation:", selectedLocation)
    if (selectedLocation) {
      onLocationSelect(selectedLocation)
      onClose()
    } else {
      console.error("No location selected")
    }
  }

  const handleClose = () => {
    setSearchQuery("")
    setPredictions([])
    setSelectedLocation(currentLocation || null)
    setShowMap(false)
    setSelectedPlace(null)
    setSearchError(null)

    // Clear search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    onClose()
  }

  const handleBackToSearch = () => {
    setShowMap(false)
    setSelectedLocation(null)
    setSelectedPlace(null)
  }

  const resetSearch = () => {
    setSearchQuery("")
    setPredictions([])
    setSearchError(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {showMap && (
                <button
                  onClick={handleBackToSearch}
                  className="mr-3 p-1 rounded-full hover:bg-gray-100"
                  aria-label="Back to search"
                >
                  <X size={20} className="rotate-45" />
                </button>
              )}
              <DialogTitle>{showMap ? "Confirm Location" : title}</DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X size={20} />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col">
          {/* Search Bar - Only show when map is hidden */}
          {!showMap && (
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Search for a location in Ghana..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
                {searchQuery && (
                  <button
                    onClick={resetSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    aria-label="Clear search"
                  >
                    <X size={18} className="text-gray-400" />
                  </button>
                )}
                {(isSearching || isLoadingDetails) && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>

              {searchError && <p className="mt-2 text-sm text-red-600">{searchError}</p>}

              {/* Predictions Results */}
              {predictions.length > 0 && !isLoadingDetails && (
                <div className="mt-2 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {predictions.map((prediction) => (
                    <button
                      key={prediction.place_id}
                      onClick={() => handleSelectPrediction(prediction)}
                      className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 flex items-center"
                    >
                      <MapPin size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{prediction.structured_formatting.main_text}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {prediction.structured_formatting.secondary_text}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!isSearching &&
                !isLoadingDetails &&
                predictions.length === 0 &&
                searchQuery.trim().length >= 2 &&
                !searchError && (
                  <div className="mt-2 text-center py-4 text-gray-500">
                    <MapPin className="h-8 w-8 mx-auto mb-1 text-gray-300" />
                    <p className="text-sm">No locations found for "{searchQuery}"</p>
                  </div>
                )}
            </div>
          )}

          {/* Map - Only show when showMap is true */}
          {showMap && (
            <div
              className={`transition-all duration-300 ease-in-out ${showMap ? "flex-1 opacity-100" : "h-0 opacity-0"}`}
            >
              {isLoading && (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading map...</p>
                  </div>
                </div>
              )}
              <div ref={mapRef} className="w-full h-full" />
            </div>
          )}

          {/* Selected Location Info - Show when map is visible */}
          {showMap && selectedLocation && (
            <div className="p-4 bg-green-50 border-t border-green-200">
              <div className="flex items-start">
                <div className="flex items-center justify-center w-5 h-5 bg-green-500 rounded-full mr-3 mt-0.5 flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-green-900">✓ Location set - ready to confirm</h3>
                  <p className="text-sm text-green-700 line-clamp-2">{selectedLocation.address}</p>
                  <p className="text-xs text-green-600 mt-1">Drag the marker to adjust the exact location if needed</p>
                </div>
              </div>
            </div>
          )}

          {/* Empty State - Show when no search and no map */}
          {!showMap && searchQuery.trim().length < 2 && (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Search className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Search for a location in Ghana</p>
                <p className="text-sm mt-1">Type at least 2 characters to search</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={!selectedLocation} className="flex-1">
                Confirm Location
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
