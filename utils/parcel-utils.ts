import { getUserProfile, getAppSettings, type AppSettings } from "@/lib/firestore-service"

// Define types for parcel data
export interface ParcelData {
  // Sender details
  senderName?: string
  senderContact?: string
  senderLocation?: string
  senderLat?: number
  senderLon?: number

  // Receiver details
  receiverName?: string
  receiverContact?: string
  receiverLocation?: string
  receiverLat?: number
  receiverLon?: number

  // Package details
  packageType?: string
  packageSize?: string
  collectTime?: string
  specialInstructions?: string

  // Bus station details
  fromBusStation?: string
  stationName?: string
  driverContact?: string
  plateNumber?: string
  receiptUrl?: string

  // Pricing and calculations
  basePrice?: number
  expressCharge?: number
  deliveryFee?: number
  totalAmount?: number
  estimatedTime?: string

  // Map data
  distance?: number
  duration?: number
  distanceText?: string
  durationText?: string
  polyLines?: string
}

export interface DistanceMatrixResult {
  distance: number
  duration: number
  distanceText: string
  durationText: string
  polyLines?: string
}

// Local storage key
const PARCEL_DATA_KEY = "ready_ride_parcel_data"

// Cache for distance calculations to prevent duplicate API calls
const distanceCache = new Map<string, DistanceMatrixResult>()

// Save parcel data to localStorage
export const saveParcelData = (data: Partial<ParcelData>) => {
  try {
    const existingData = getParcelData() || {}
    const updatedData = { ...existingData, ...data }
    localStorage.setItem(PARCEL_DATA_KEY, JSON.stringify(updatedData))
    return true
  } catch (error) {
    console.error("Error saving parcel data:", error)
    return false
  }
}

// Get parcel data from localStorage
export const getParcelData = (): ParcelData | null => {
  try {
    const data = localStorage.getItem(PARCEL_DATA_KEY)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error("Error getting parcel data:", error)
    return null
  }
}

// Clear parcel data from localStorage
export const clearParcelData = () => {
  try {
    localStorage.removeItem(PARCEL_DATA_KEY)
    distanceCache.clear() // Clear distance cache too
    return true
  } catch (error) {
    console.error("Error clearing parcel data:", error)
    return false
  }
}

// Generate cache key for distance calculations
const generateCacheKey = (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): string => {
  return `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}-${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}`
}

// Get distance and duration using Distance Matrix API with caching
export const getDistanceMatrix = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<DistanceMatrixResult | null> => {
  const cacheKey = generateCacheKey(origin, destination)

  // Check cache first
  if (distanceCache.has(cacheKey)) {
    console.log("Using cached distance data for:", cacheKey)
    return distanceCache.get(cacheKey)!
  }

  try {
    console.log("🚀 Calling Distance Matrix API with:", { origin, destination })

    const response = await fetch("/api/distance-matrix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        origins: [`${origin.lat},${origin.lng}`],
        destinations: [`${destination.lat},${destination.lng}`],
      }),
    })

    console.log("📡 Distance Matrix API response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }))
      console.error("❌ Distance Matrix API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      })

      // Return null instead of throwing to allow graceful fallback
      return null
    }

    const data = await response.json()
    console.log("📊 Distance Matrix API response data:", data)

    if (data.success && data.results && data.results.length > 0) {
      const result = data.results[0]
      console.log("✅ Distance Matrix result:", result)

      const distanceResult: DistanceMatrixResult = {
        distance: result.distance,
        duration: result.duration,
        distanceText: result.distance_text,
        durationText: result.duration_text,
        polyLines: result.polyline,
      }

      // Cache the result
      distanceCache.set(cacheKey, distanceResult)

      return distanceResult
    }

    console.error("❌ Distance Matrix API returned no valid results:", data)
    return null
  } catch (error) {
    console.error("💥 Error fetching distance matrix:", error)
    return null
  }
}

// Calculate distance and update parcel data
export const calculateDistanceAndSave = async (
  senderLat: number,
  senderLng: number,
  receiverLat: number,
  receiverLng: number,
): Promise<DistanceMatrixResult | null> => {
  try {
    /* Check if we already have this data in localStorage
    const existingData = getParcelData()
    if (existingData?.distance && existingData?.distanceText && existingData?.durationText) {
      console.log("Distance data already exists in localStorage, skipping API call")
      return {
        distance: existingData.distance,
        duration: existingData.duration || 0,
        distanceText: existingData.distanceText,
        durationText: existingData.durationText,
        polyLines: existingData.polyLines,
      }
    }*/

    const distanceData = await getDistanceMatrix(
      { lat: senderLat, lng: senderLng },
      { lat: receiverLat, lng: receiverLng },
    )

    if (distanceData) {
      // Save distance data to parcel storage
      saveParcelData({
        distance: distanceData.distance,
        duration: distanceData.duration,
        distanceText: distanceData.distanceText,
        durationText: distanceData.durationText,
        polyLines: distanceData.polyLines,
      })

      return distanceData
    }

    return null
  } catch (error) {
    console.error("Error calculating and saving distance:", error)
    return null
  }
}

export const getPackageTypeNumber = (packageType: string): number => {
  switch (packageType) {
    case "cube":
      return 1
    case "box":
      return 2
    case "flat":
      return 3
    default:
      return 2
  }
}

// Calculate parcel pricing using app settings and distance data
export const calculateParcelPricing = async (
  collectTime = "standard",
  packageSize = "small",
  distance = 0,
): Promise<{
  basePrice: number
  expressCharge: number
  deliveryFee: number
  totalAmount: number
  estimatedTime: string
}> => {
  try {
    // Get app settings for pricing
    const appSettings = await getAppSettings()

    // Package pricing from app settings
    let package_price = 0
    switch (packageSize) {
      case "large":
        package_price = appSettings?.large_package_price || 15
        break
      case "medium":
        package_price = appSettings?.medium_package_price || 10
        break
      case "small":
      default:
        package_price = appSettings?.small_package_price || 5
        break
    }

    // Express charge (using base_fare as express charge)
    const expressCharge = collectTime === "express" ? appSettings?.express_delivery_charge : 0

    // Calculate delivery fee using distance_rate from app settings
    const baseFare = appSettings?.base_fare || 15
    const distanceRate = appSettings?.distance_rate || 4

    // Always calculate delivery fee regardless of distance
    let deliveryFee = baseFare
    if (distance > 3000) {
      const distanceInKm = distance / 1000
      // Add distance rate per km
      const remainingDistance = totalDistance - 3000
      deliveryFee = (baseFare || 15) + (remainingDistance / 1000) * (distanceRate || 3.5)
    }

    // Calculate estimated time
    let estimatedTime = ""
    if (collectTime === "express") {
      estimatedTime = "1-2 hours"
    } else {
      estimatedTime = "Within 24 hours"
    }

    // Calculate total
    const totalAmount = package_price + expressCharge + deliveryFee

    return {
      basePrice,
      expressCharge,
      deliveryFee,
      totalAmount,
      estimatedTime,
    }
  } catch (error) {
    console.error("Error calculating parcel pricing:", error)

    // Fallback pricing if app settings fail
    let package_price = 0
    switch (packageSize) {
      case "large":
        package_price = 15
        break
      case "medium":
        package_price = 10
        break
      case "small":
      default:
        package_price = 5
        break
    }

    const expressCharge = collectTime === "express" ? 10 : 0
    const deliveryFee = 15 + (distance > 0 ? Math.round((distance / 1000) * 3.5) : 0)
    const estimatedTime = collectTime === "express" ? "1-2 hours" : "Within 24 hours"
    const totalAmount = package_price + expressCharge + deliveryFee

    return {
      basePrice,
      expressCharge,
      deliveryFee,
      totalAmount,
      estimatedTime,
    }
  }
}

// Synchronous version for when app settings are already available
export const calculateParcelPricingSync = (
  collectTime = "standard",
  packageSize = "small",
  distance = 0,
  appSettings?: AppSettings,
): {
  basePrice: number
  expressCharge: number
  deliveryFee: number
  totalAmount: number
  estimatedTime: string
} => {
  // Package pricing from app settings
  let basePrice = 0
  switch (packageSize) {
    case "large":
      basePrice = appSettings?.large_package_price || 15
      break
    case "medium":
      basePrice = appSettings?.medium_package_price || 10
      break
    case "small":
    default:
      basePrice = appSettings?.small_package_price || 5
      break
  }

  // Express charge (using base_fare as express charge)
  const expressCharge = collectTime === "express" ? appSettings?.base_fare || 10 : 0

  // Calculate delivery fee using distance_rate from app settings
  const baseFare = appSettings?.base_fare || 10
  const distanceRate = appSettings?.distance_rate || 4

  let deliveryFee = baseFare
  if (distance > 0) {
    const distanceInKm = distance / 1000
    // Add distance rate per km
    deliveryFee = Math.round(baseFare + distanceInKm * distanceRate)
  }

  // Calculate estimated time based on actual duration
  let estimatedTime = ""
  if (collectTime === "express") {
    estimatedTime = "1-2 hours"
  } else {
    estimatedTime = "Within 24 hours"
  }

  // Calculate total
  const totalAmount = basePrice + expressCharge + deliveryFee

  return {
    basePrice,
    expressCharge,
    deliveryFee,
    totalAmount,
    estimatedTime,
  }
}

// Calculate estimated time with actual travel duration
export const calculateEstimatedTime = (collectTime: string, actualDuration?: number, durationText?: string): string => {
  if (collectTime === "standard") {
    return "Within 24hrs"
  }

  // For express delivery, calculate based on actual travel time
  if (actualDuration && actualDuration > 0) {
    const travelTimeMinutes = Math.ceil(actualDuration / 60)
    const bufferTime = Math.max(60, Math.ceil(travelTimeMinutes * 0.5)) // At least 1 hour or 50% of travel time
    const totalTimeMinutes = travelTimeMinutes + bufferTime

    if (totalTimeMinutes < 60) {
      return `${totalTimeMinutes} mins`
    } else if (totalTimeMinutes < 120) {
      const hours = Math.floor(totalTimeMinutes / 60)
      const minutes = totalTimeMinutes % 60
      return minutes > 0 ? `${hours}hr ${minutes}mins` : `${hours}hr`
    } else {
      const hours = Math.ceil(totalTimeMinutes / 60)
      return `${hours}hrs`
    }
  }

  // Use duration text if available
  if (durationText && collectTime === "express") {
    // Parse duration text and add buffer
    const match = durationText.match(/(\d+)\s*(min|hour|hr)/i)
    if (match) {
      const value = Number.parseInt(match[1])
      const unit = match[2].toLowerCase()

      if (unit.includes("min")) {
        const totalMinutes = value + 60 // Add 1 hour buffer
        if (totalMinutes < 60) {
          return `${totalMinutes} mins`
        } else {
          const hours = Math.floor(totalMinutes / 60)
          const mins = totalMinutes % 60
          return mins > 0 ? `${hours}hr ${mins}mins` : `${hours}hr`
        }
      } else {
        return `${value + 1}hrs` // Add 1 hour buffer
      }
    }
  }

  // Default fallback for express
  return "1-2hrs"
}

// Get parcel tracking URL
export const getParcelTrackingUrl = (parcelId: string): string => {
  return `/track/parcel/${parcelId}`
}

// Check if delivery is a parcel type
export const isParcelDelivery = (orderType: string): boolean => {
  return orderType.toLowerCase() === "parcel"
}

export const initializeParcelDataWithUser = async (userId: string): Promise<Partial<ParcelData>> => {
  try {
    const userProfile = await getUserProfile(userId)

    if (userProfile) {
      return {
        senderName: userProfile.display_name || "",
        senderContact: userProfile.phone_number || "",
        senderLocation: userProfile.address?.address || "",
        senderLat: userProfile.address?.lat,
        senderLon: userProfile.address?.lon,
      }
    }

    return {}
  } catch (error) {
    console.error("Error initializing parcel data with user:", error)
    return {}
  }
}

// Map package type to numeric value for database
export const mapPackageTypeToNumber = (packageType: string): number => {
  switch (packageType) {
    case "cube":
      return 1
    case "box":
      return 2
    case "flat":
      return 3
    default:
      return 2 // Default to box
  }
}

// Generate a tracking ID for parcels
export const generateTrackingId = (): string => {
  const prefix = "PD"
  const randomNum = Math.floor(100000 + Math.random() * 900000)
  return `${prefix}${randomNum}`
}

// Format the current date for order creation
export const formatOrderDate = (): string => {
  const now = new Date()
  return now.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

// Check if parcel delivery is within max distance
export const isWithinMaxDistance = async (distance: number): Promise<boolean> => {
  try {
    const appSettings = await getAppSettings()
    const maxDistance = appSettings?.max_distance || 30000 // Default 30km
    return distance <= maxDistance
  } catch (error) {
    console.error("Error checking max distance:", error)
    return distance <= 30000 // Default fallback
  }
}

// Check if parcel service is currently open
export const isParcelServiceOpen = async (): Promise<boolean> => {
  try {
    const appSettings = await getAppSettings()
    if (!appSettings?.opens || !appSettings?.closes) {
      return true // Default to open if times not set
    }

    const now = new Date()
    const currentTime = now.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
    })

    const opensTime = appSettings.opens
    const closesTime = appSettings.closes

    // Simple time comparison (this could be enhanced for better accuracy)
    const currentHour = now.getHours()
    const opensHour = Number.parseInt(opensTime.split(":")[0])
    const closesHour = Number.parseInt(closesTime.split(":")[0])

    // Adjust for AM/PM
    const opensHour24 = opensTime.includes("AM") ? opensHour : opensHour + 12
    const closesHour24 = closesTime.includes("PM") ? (closesHour === 12 ? 12 : closesHour + 12) : closesHour

    return currentHour >= opensHour24 && currentHour < closesHour24
  } catch (error) {
    console.error("Error checking service hours:", error)
    return true // Default to open
  }
}

// Prepare parcel data for Firestore
export const prepareParcelForFirestore = async (userData: any): Promise<any> => {
  const parcelData = getParcelData()
  if (!parcelData) return null

  const trackingId = generateTrackingId()
  const orderDate = formatOrderDate()

  return {
    tracking_id: trackingId,
    total_amount: parcelData.totalAmount || 0,
    created_date: orderDate,
    order_type: "Parcel",
    map_data: {
      distance: parcelData.distance || 0,
      seconds: parcelData.duration || 0,
      poly_lines: parcelData.polyLines || "",
      duration: parcelData.durationText || "Unknown",
      distance_text: parcelData.distanceText || "Unknown",
    },
    package_size: parcelData.packageSize?.charAt(0).toUpperCase() + parcelData.packageSize?.slice(1) || "Small",
    package_type: mapPackageTypeToNumber(parcelData.packageType || "box"),
    sender: {
      name: parcelData.senderName || userData?.displayName || "",
      contact: parcelData.senderContact || userData?.phoneNumber || "",
      lat: parcelData.senderLat || 0,
      lon: parcelData.senderLon || 0,
      location: parcelData.senderLocation || "",
    },
    receiver: {
      name: parcelData.receiverName || "",
      contact: parcelData.receiverContact || "",
      lat: parcelData.receiverLat || 0,
      lon: parcelData.receiverLon || 0,
      location: parcelData.receiverLocation || "",
    },
    special_instructions: parcelData.specialInstructions || "",
    payment_method: {
      account: "CASH", // Default to cash, would be updated during payment
    },
    paid: false,
    station:
      parcelData.fromBusStation === "yes"
        ? {
            name: parcelData.stationName || "",
            receipt: parcelData.receiptUrl || "",
            driver_contact: parcelData.driverContact || "",
            plate_number: parcelData.plateNumber || "",
          }
        : null,
    uid: userData?.uid || "",
    status: "Pending",
    delivery_fee: parcelData.deliveryFee || 0,
    collect_time: parcelData.collectTime?.charAt(0).toUpperCase() + parcelData.collectTime?.slice(1) || "Standard",
  }
}
