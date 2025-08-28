// Types for location data
export type LocationData = {
  type: string
  coordinates: [number, number] // [lng, lat] format for consistency
  address: string
}

// Save location data to localStorage
export const saveLocationData = (type: string, data: LocationData): void => {
  try {
    localStorage.setItem(`${type}Location`, JSON.stringify(data))
  } catch (error) {
    console.error(`Error saving ${type} location data:`, error)
  }
}

// Get location data from localStorage
export const getLocationData = (type: string): LocationData | null => {
  try {
    const data = localStorage.getItem(`${type}Location`)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error(`Error retrieving ${type} location data:`, error)
    return null
  }
}

// Clear location data from localStorage
export const clearLocationData = (type: string): void => {
  try {
    localStorage.removeItem(`${type}Location`)
  } catch (error) {
    console.error(`Error clearing ${type} location data:`, error)
  }
}

// Format coordinates for display
export const formatCoordinates = (coordinates: [number, number]): string => {
  // Format as lat, lng for display (opposite of storage format)
  return `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}`
}

// Convert between Google Maps and Mapbox coordinate formats
export const convertToGoogleFormat = (coordinates: [number, number]): { lat: number; lng: number } => {
  // Mapbox uses [lng, lat], Google uses { lat, lng }
  return { lat: coordinates[1], lng: coordinates[0] }
}

export const convertToMapboxFormat = (latLng: { lat: number; lng: number }): [number, number] => {
  // Convert from Google { lat, lng } to Mapbox [lng, lat]
  return [latLng.lng, latLng.lat]
}
