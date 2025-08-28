"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Search } from "lucide-react"

interface MapSearchBarProps {
  onSearch: (query: string) => void
  onPlaceSelect?: (place: any) => void
}

export default function MapSearchBar({ onSearch, onPlaceSelect }: MapSearchBarProps) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const initAutocomplete = () => {
      if (!inputRef.current || !window.google || !window.google.maps || !window.google.maps.places) {
        console.log("Google Maps Places API not available yet")
        return
      }

      try {
        console.log("Initializing Places Autocomplete")

        // Create the autocomplete object
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "geometry", "name"],
          types: ["geocode", "establishment"],
        })

        // Add listener for place selection
        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current.getPlace()
          console.log("Place selected from autocomplete:", place)

          if (place && place.geometry && onPlaceSelect) {
            onPlaceSelect(place)
          }
        })
      } catch (error) {
        console.error("Error initializing Places Autocomplete:", error)
      }
    }

    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      initAutocomplete()
    } else {
      // Wait for Google Maps API to load
      const checkGoogleMapsInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkGoogleMapsInterval)
          initAutocomplete()
        }
      }, 100)

      // Clean up interval
      return () => {
        clearInterval(checkGoogleMapsInterval)
      }
    }

    return () => {
      // Clean up
      if (autocompleteRef.current && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [onPlaceSelect])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a location"
          className="w-full py-2 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
      </div>
    </form>
  )
}
