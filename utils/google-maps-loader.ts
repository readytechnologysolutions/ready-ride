// Define the Google Maps API key
const GOOGLE_MAPS_API_KEY = "AIzaSyCvZ5bGmKRtw2RVXTpXeiQuL5U7VJommJ8"

// Define types for Google Maps
interface GoogleMapWindow extends Window {
  google?: any
  initMap?: () => void
  mapsApiLoaded?: boolean
}

declare const window: GoogleMapWindow

// Flag to track if we've started loading the API
let isLoading = false

/**
 * Loads the Google Maps API if it's not already loaded
 * @returns A promise that resolves when the API is loaded
 */
export function loadGoogleMapsApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (window.google && window.google.maps) {
      console.log("Google Maps API already loaded")
      return resolve()
    }

    // If already loading, wait for it
    if (isLoading) {
      console.log("Google Maps API already loading")
      const checkLoaded = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkLoaded)
          resolve()
        }
      }, 100)
      return
    }

    // Set global callback
    window.initMap = () => {
      console.log("Google Maps API initialized")
      window.mapsApiLoaded = true
      resolve()
    }

    // Start loading
    isLoading = true
    console.log("Loading Google Maps API")

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&libraries=places`
    script.async = true
    script.defer = true

    script.onerror = () => {
      console.error("Google Maps API failed to load")
      isLoading = false
      reject(new Error("Failed to load Google Maps API"))
    }

    document.head.appendChild(script)
  })
}

/**
 * Checks if the Google Maps API is loaded
 * @returns True if the API is loaded
 */
export function isGoogleMapsLoaded(): boolean {
  return !!(window.google && window.google.maps)
}
