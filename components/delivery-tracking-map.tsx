"use client"

import { useEffect, useRef, useState } from "react"
import { loadGoogleMapsApi } from "@/utils/google-maps-loader"
import type { google } from "google-maps"

interface DeliveryTrackingMapProps {
  userLocation: { lat: number; lng: number }
  restaurantLocation?: { lat: number; lng: number }
  riderLocation?: { lat: number; lng: number }
  riderId?: string
  trackLiveLocation?: boolean
}

export default function DeliveryTrackingMap({
  userLocation,
  restaurantLocation,
  riderLocation,
  riderId,
  trackLiveLocation = true,
}: DeliveryTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const riderMarkerRef = useRef<google.maps.Marker | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      try {
        await loadGoogleMapsApi()

        if (!mapRef.current || !window.google) return

        const map = new window.google.maps.Map(mapRef.current, {
          center: userLocation,
          zoom: 14,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        })

        mapInstanceRef.current = map

        // Add user location marker
        new window.google.maps.Marker({
          position: userLocation,
          map: map,
          title: "Your Location",
          icon: {
            url:
              "data:image/svg+xml;charset=UTF-8," +
              encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="#4F46E5" stroke="white" strokeWidth="4"/>
                <circle cx="16" cy="16" r="4" fill="white"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 16),
          },
        })

        // Add restaurant location marker if provided
        if (restaurantLocation) {
          new window.google.maps.Marker({
            position: restaurantLocation,
            map: map,
            title: "Restaurant",
            icon: {
              url:
                "data:image/svg+xml;charset=UTF-8," +
                encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="12" fill="#EF4444" stroke="white" strokeWidth="4"/>
                  <path d="M12 10h8v2h-8v-2zm0 4h8v2h-8v-2zm0 4h6v2h-6v-2z" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(32, 32),
              anchor: new window.google.maps.Point(16, 16),
            },
          })
        }

        // Add initial rider location marker if provided
        if (riderLocation) {
          riderMarkerRef.current = new window.google.maps.Marker({
            position: riderLocation,
            map: map,
            title: "Rider",
            icon: {
              url:
                "data:image/svg+xml;charset=UTF-8," +
                encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="12" fill="#10B981" stroke="white" strokeWidth="4"/>
                  <path d="M16 8l-4 8h8l-4-8z" fill="white"/>
                  <circle cx="16" cy="20" r="2" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(32, 32),
              anchor: new window.google.maps.Point(16, 16),
            },
          })
        }

        // Fit bounds to show all markers
        const bounds = new window.google.maps.LatLngBounds()
        bounds.extend(userLocation)
        if (restaurantLocation) bounds.extend(restaurantLocation)
        if (riderLocation) bounds.extend(riderLocation)

        map.fitBounds(bounds)

        // Ensure minimum zoom level
        const listener = window.google.maps.event.addListener(map, "idle", () => {
          if (map.getZoom()! > 16) map.setZoom(16)
          window.google.maps.event.removeListener(listener)
        })

        setIsLoaded(true)
      } catch (error) {
        console.error("Error initializing map:", error)
      }
    }

    initMap()
  }, [userLocation, restaurantLocation, riderLocation])

  // Track rider location
  useEffect(() => {
    if (!riderId || !trackLiveLocation || !isLoaded) return

    const fetchRiderLocation = async () => {
      try {
        const response = await fetch(`/api/rider-location/${riderId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.location && riderMarkerRef.current) {
            const newPosition = {
              lat: data.location.lat,
              lng: data.location.lng,
            }
            riderMarkerRef.current.setPosition(newPosition)
          }
        }
      } catch (error) {
        console.error("Error fetching rider location:", error)
      }
    }

    // Fetch immediately
    fetchRiderLocation()

    // Set up interval for live tracking
    intervalRef.current = setInterval(fetchRiderLocation, 10000) // Update every 10 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [riderId, trackLiveLocation, isLoaded])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <div className="w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  )
}
