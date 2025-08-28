"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin, Search, X, Loader2, Navigation } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { updateUserAddress } from "@/lib/firestore-service"
import { loadGoogleMapsApi } from "@/utils/google-maps-loader"

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

type LocationDialogProps = {
  isOpen: boolean
  onClose: () => void
  onSelectLocation: (location: string) => void
}

export default function LocationDialog({ isOpen, onClose, onSelectLocation }: LocationDialogProps) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<{
    coordinates: [number, number]
    address: string
    name?: string
  } | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)

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
          geometry: data.result.geometry,
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

    // Set location data with coordinates in [lng, lat] format for consistency
    setSelectedLocation({
      coordinates: [placeDetails.geometry.location.lng, placeDetails.geometry.location.lat],
      address: placeDetails.formatted_address,
      name: placeDetails.name,
    })

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
        center: {
          lat: selectedLocation.coordinates[1], // lat is at index 1
          lng: selectedLocation.coordinates[0], // lng is at index 0
        },
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })

      mapInstanceRef.current = map

      // Wait for map to be ready, then add marker
      ;(window as any).google.maps.event.addListenerOnce(map, "tilesloaded", () => {
        addMarker(selectedLocation.coordinates[1], selectedLocation.coordinates[0], selectedLocation.address)
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
          coordinates: [lng, lat], // Keep [lng, lat] format
          address,
          name: selectedPlace?.name || "Selected Location",
        })

        console.log("Location updated after drag:", { address, lat, lng })
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error)
    }
  }

  const handleConfirmLocation = async () => {
    if (!user || !selectedLocation) {
      console.error("Cannot confirm: missing user or location")
      return
    }

    try {
      setIsUpdatingLocation(true)

      const addressData = {
        name: selectedLocation.name || "Selected Location",
        address: selectedLocation.address,
        lat: selectedLocation.coordinates[1], // Convert from [lng, lat] to lat
        lon: selectedLocation.coordinates[0], // Convert from [lng, lat] to lng
      }

      console.log("Updating address with data:", addressData)

      const success = await updateUserAddress(user.uid, addressData)

      if (success) {
        onSelectLocation(selectedLocation.name || "Selected Location")
        onClose()
        // Reset state
        resetDialog()
      } else {
        setSearchError("Failed to update location")
      }
    } catch (error) {
      console.error("Error updating location:", error)
      setSearchError("Failed to update location")
    } finally {
      setIsUpdatingLocation(false)
    }
  }

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsUpdatingLocation(true)
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords

          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
            )
            const data = await response.json()

            if (data.status === "OK" && data.results.length > 0) {
              const result = data.results[0]
              const addressData = {
                name: "Current Location",
                address: result.formatted_address || "Current Location",
                lat: latitude,
                lon: longitude,
              }

              console.log("Updating address with current location data:", addressData)

              if (user) {
                const success = await updateUserAddress(user.uid, addressData)
                if (success) {
                  onSelectLocation("Current Location")
                  onClose()
                  resetDialog()
                } else {
                  setSearchError("Failed to update location")
                }
              }
            } else {
              setSearchError("Could not determine your address")
            }
          } catch (error) {
            console.error("Error getting current location:", error)
            setSearchError("Failed to get current location")
          } finally {
            setIsUpdatingLocation(false)
          }
        },
        (error) => {
          console.error("Geolocation error:", error)
          setSearchError("Location access denied")
          setIsUpdatingLocation(false)
        },
      )
    } else {
      setSearchError("Geolocation not supported")
    }
  }

  const resetSearch = () => {
    setSearchQuery("")
    setPredictions([])
    setSearchError(null)
  }

  const resetDialog = () => {
    setSearchQuery("")
    setPredictions([])
    setSearchError(null)
    setSelectedPlace(null)
    setSelectedLocation(null)
    setShowMap(false)
  }

  const handleBackToSearch = () => {
    setShowMap(false)
    setSelectedLocation(null)
    setSelectedPlace(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col justify-end animate-fade-in">
      <div className="bg-white rounded-t-xl animate-slide-up max-h-[90vh] flex flex-col">
        <div className="p-4 flex items-center justify-between border-b border-gray-200">
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
            <h1 className="text-2xl font-bold">{showMap ? "Confirm Location" : "Select Location"}</h1>
          </div>
          <button onClick={onClose} className="p-1 rounded-full" aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {/* Search Bar - Only show when map is hidden */}
        {!showMap && (
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a location in Ghana..."
                className="w-full py-3 pl-10 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              {searchQuery && (
                <button
                  onClick={resetSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label="Clear search"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              )}
            </div>

            {searchError && <p className="mt-2 text-sm text-red-600">{searchError}</p>}
          </div>
        )}

        {/* Map Section - Only show when showMap is true */}
        {showMap && (
          <div
            className={`transition-all duration-300 ease-in-out border-b border-gray-200 ${
              showMap ? "h-80 opacity-100" : "h-0 opacity-0"
            }`}
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
          <div className="p-4 bg-green-50 border-b border-gray-200">
            <div className="flex items-start">
              <div className="flex items-center justify-center w-5 h-5 bg-green-500 rounded-full mr-3 mt-0.5 flex-shrink-0">
                <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
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

        {/* Confirm Button - Show when location is selected */}
        {showMap && selectedLocation && (
          <div className="p-4 bg-blue-50 border-b border-gray-200">
            <button
              onClick={handleConfirmLocation}
              disabled={isUpdatingLocation}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center"
            >
              {isUpdatingLocation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Confirming Location...
                </>
              ) : (
                "Confirm This Location"
              )}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Current Location Button - Only show when map is hidden */}
          {!showMap && (
            <div className="p-4 border-b border-gray-200">
              <button
                onClick={handleUseCurrentLocation}
                disabled={isUpdatingLocation}
                className="w-full flex items-center p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <Navigation className="text-primary mr-3" size={20} />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Use Current Location</h3>
                  <p className="text-sm text-gray-500">Get your current location automatically</p>
                </div>
                {isUpdatingLocation && <Loader2 className="h-5 w-5 animate-spin text-primary ml-auto" />}
              </button>
            </div>
          )}

          {/* Predictions Results - Only show when map is hidden */}
          {!showMap && (
            <div className="p-4 space-y-3">
              {(isSearching || isLoadingDetails) && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span className="text-gray-600">
                    {isLoadingDetails ? "Getting location details..." : "Searching locations..."}
                  </span>
                </div>
              )}

              {!isSearching &&
                !isLoadingDetails &&
                predictions.length === 0 &&
                searchQuery.trim().length >= 2 &&
                !searchError && (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No locations found for "{searchQuery}"</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </div>
                )}

              {!isLoadingDetails &&
                predictions.map((prediction) => (
                  <div
                    key={prediction.place_id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white border border-gray-200 hover:border-primary cursor-pointer transition-colors"
                    onClick={() => handleSelectPrediction(prediction)}
                  >
                    <div className="flex items-start flex-1">
                      <MapPin className="text-primary mr-3 mt-1 flex-shrink-0" size={20} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {prediction.structured_formatting.main_text}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {prediction.structured_formatting.secondary_text}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

              {!isSearching && searchQuery.trim().length < 2 && (
                <div className="text-center py-8 text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Search for a location in Ghana</p>
                  <p className="text-sm mt-1">Type at least 2 characters to search</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
