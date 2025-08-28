"use client"

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { MapPin } from "lucide-react"
import MapLoading from "./map-loading"
import { loadGoogleMapsApi, isGoogleMapsLoaded } from "@/utils/google-maps-loader"

export type GoogleMapRef = {
  centerMap: (lat: number, lng: number) => void
}

type GoogleMapProps = {
  initialCenter?: [number, number]
  onLocationSelect: (
    location: {
      coordinates: [number, number]
      address: string
    } | null,
  ) => void
}

const GoogleMap = forwardRef<GoogleMapRef, GoogleMapProps>(({ initialCenter = [0, 0], onLocationSelect }, ref) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const geocoderRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiLoaded, setApiLoaded] = useState(isGoogleMapsLoaded())

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    centerMap: (lat: number, lng: number) => {
      if (googleMapRef.current) {
        googleMapRef.current.setCenter({ lat, lng })
        // Don't create marker here - wait for user to tap
      }
    },
  }))

  // Function to perform reverse geocoding
  const reverseGeocode = (coordinates: [number, number]) => {
    if (!geocoderRef.current) {
      console.error("Geocoder not initialized")
      return
    }

    const latlng = { lat: coordinates[1], lng: coordinates[0] }

    geocoderRef.current.geocode({ location: latlng }, (results: any, status: any) => {
      if (status === "OK") {
        if (results[0]) {
          const address = results[0].formatted_address
          console.log("Geocoded address:", address)

          // Pass the selected location back to parent
          onLocationSelect({
            coordinates,
            address,
          })
        } else {
          console.warn("No geocoding results found")
          onLocationSelect({
            coordinates,
            address: "No address found",
          })
        }
      } else {
        console.error("Geocoder failed due to:", status)
        onLocationSelect({
          coordinates,
          address: "Address lookup failed",
        })
      }
    })
  }

  // Create marker at specified location
  const createMarker = (lat: number, lng: number) => {
    if (!googleMapRef.current || !window.google) {
      console.error("Map or Google Maps not available")
      return
    }

    // Remove existing marker if it exists
    if (markerRef.current) {
      markerRef.current.setMap(null)
    }

    // Create new marker
    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng },
      map: googleMapRef.current,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
    })

    console.log("Marker created at:", lat, lng)

    // Add drag end event to marker
    window.google.maps.event.addListener(markerRef.current, "dragend", () => {
      const position = markerRef.current.getPosition()
      const markerLat = position.lat()
      const markerLng = position.lng()

      console.log("Marker dragged to:", markerLat, markerLng)

      // Get address for new position
      reverseGeocode([markerLng, markerLat])
    })

    // Get address for the marker position
    reverseGeocode([lng, lat])
  }

  // Initialize map when Google Maps API is loaded
  const initializeMap = () => {
    if (!mapRef.current || !window.google) {
      console.error("Map ref or Google Maps not available")
      return
    }

    try {
      // Create geocoder
      geocoderRef.current = new window.google.maps.Geocoder()

      // Default to Ghana if no initial center provided
      const center =
        initialCenter[0] === 0 && initialCenter[1] === 0
          ? { lat: 5.6037, lng: -0.187 } // Ghana coordinates
          : { lat: initialCenter[1], lng: initialCenter[0] } // Convert [lng, lat] to {lat, lng}

      // Create map
      const mapOptions = {
        center,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      }

      googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions)

      // Add click event to map - this is where marker gets created
      window.google.maps.event.addListener(googleMapRef.current, "click", (e: any) => {
        const lat = e.latLng.lat()
        const lng = e.latLng.lng()

        console.log("Map clicked at:", lat, lng)

        // Create marker at clicked location
        createMarker(lat, lng)
      })

      // Map loaded
      window.google.maps.event.addListenerOnce(googleMapRef.current, "tilesloaded", () => {
        setLoading(false)
        console.log("Map tiles loaded")
      })

      // Try to get user's location for initial centering (but don't create marker)
      if (navigator.geolocation && initialCenter[0] === 0 && initialCenter[1] === 0) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            const latLng = { lat: latitude, lng: longitude }

            console.log("User location:", latitude, longitude)

            // Center map on user's location but don't create marker
            googleMapRef.current.setCenter(latLng)
          },
          (err) => {
            console.warn("Error getting user location:", err)
            // Continue with default location
          },
        )
      }
    } catch (err) {
      console.error("Error initializing map:", err)
      setError("Failed to initialize map. Please try again.")
      setLoading(false)
    }
  }

  // Load Google Maps API
  useEffect(() => {
    if (apiLoaded) {
      initializeMap()
      return
    }

    loadGoogleMapsApi()
      .then(() => {
        console.log("Google Maps API loaded successfully")
        setApiLoaded(true)
      })
      .catch((err) => {
        console.error("Failed to load Google Maps API:", err)
        setError("Failed to load Google Maps. Please check your internet connection.")
        setLoading(false)
      })
  }, [])

  // Initialize map when API is loaded
  useEffect(() => {
    if (apiLoaded && mapRef.current) {
      initializeMap()
    }

    return () => {
      // Clean up event listeners
      if (googleMapRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(googleMapRef.current)
      }

      if (markerRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(markerRef.current)
      }
    }
  }, [apiLoaded])

  // If there's an error, show fallback
  if (error) {
    return (
      <div className="relative w-full h-full">
        <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <MapPin size={24} className="text-primary" />
          </div>
          <p className="text-gray-500 text-center px-4">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="absolute inset-0" />
      {loading && <MapLoading />}
    </div>
  )
})

GoogleMap.displayName = "GoogleMap"

export default GoogleMap
