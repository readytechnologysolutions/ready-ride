"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin } from "lucide-react"
import MapLoading from "./map-loading"

type MapboxMapProps = {
  initialCenter?: [number, number]
  onLocationSelect: (location: {
    coordinates: [number, number]
    address: string
  }) => void
}

export default function MapboxMap({ initialCenter = [0, 0], onLocationSelect }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const marker = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapboxLoaded, setMapboxLoaded] = useState(false)

  // Initialize map when component mounts
  useEffect(() => {
    if (!mapContainer.current) return

    // Check for Mapbox token
    if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
      setError("Mapbox access token is missing. Please check your environment variables.")
      setLoading(false)
      return
    }

    // Dynamically import mapbox-gl to avoid SSR issues
    const loadMapbox = async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default

        // Import CSS
        await import("mapbox-gl/dist/mapbox-gl.css")

        setMapboxLoaded(true)

        // Set access token
        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

        // Try to get user's location first
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { longitude, latitude } = position.coords
            initializeMap(mapboxgl, [longitude, latitude])
          },
          () => {
            // Fallback to default location (Ghana)
            initializeMap(mapboxgl, [0.2057, 5.5913]) // Ghana coordinates
          },
        )
      } catch (err) {
        console.error("Error loading Mapbox:", err)
        setError("Failed to load map library. Please try again.")
        setLoading(false)
      }
    }

    function initializeMap(mapboxgl: any, center: [number, number]) {
      try {
        // Create map instance
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: "mapbox://styles/mapbox/streets-v12",
          center: center,
          zoom: 14,
          attributionControl: false,
        })

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), "top-right")

        // Add attribution control in bottom right
        map.current.addControl(new mapboxgl.AttributionControl(), "bottom-right")

        // Create the initial marker
        marker.current = new mapboxgl.Marker({
          color: "#ffa500", // Orange color
          draggable: true,
        })
          .setLngLat(center)
          .addTo(map.current)

        // Get initial location name
        reverseGeocode(center)

        // Add click event to map
        map.current.on("click", (e: any) => {
          const coordinates: [number, number] = [e.lngLat.lng, e.lngLat.lat]
          marker.current?.setLngLat(coordinates)
          reverseGeocode(coordinates)
        })

        // Add dragend event to marker
        marker.current.on("dragend", () => {
          const lngLat = marker.current?.getLngLat()
          if (lngLat) {
            const coordinates: [number, number] = [lngLat.lng, lngLat.lat]
            reverseGeocode(coordinates)
          }
        })

        map.current.on("load", () => {
          setLoading(false)
        })
      } catch (err) {
        console.error("Error initializing map:", err)
        setError("Failed to load map. Please try again.")
        setLoading(false)
      }
    }

    loadMapbox()

    return () => {
      if (map.current) {
        map.current.remove()
      }
    }
  }, [])

  // Function to perform reverse geocoding
  const reverseGeocode = async (coordinates: [number, number]) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates[0]},${coordinates[1]}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}&types=address,neighborhood,locality,place`,
      )

      if (!response.ok) throw new Error("Geocoding failed")

      const data = await response.json()

      // Get the most relevant place name
      let address = "Unknown location"
      if (data.features && data.features.length > 0) {
        address = data.features[0].place_name
      }

      // Pass the selected location back to parent
      onLocationSelect({ coordinates, address })
    } catch (err) {
      console.error("Reverse geocoding error:", err)
      onLocationSelect({
        coordinates,
        address: "Location details unavailable",
      })
    }
  }

  // If mapbox failed to load, use the SimpleMap fallback
  if (error || !mapboxLoaded) {
    return (
      <div className="relative w-full h-full">
        <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <MapPin size={24} className="text-primary" />
          </div>
          <p className="text-gray-500 text-center px-4">
            {error || "Map could not be loaded. Using simplified map view."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden" />
      {loading && <MapLoading />}
    </div>
  )
}
