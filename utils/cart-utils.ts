import { getRestaurantById } from "@/lib/firestore-service"

export interface CartItem {
  name: string
  required: number
  price: number
  description: string
  id: string
  food_id: string
  food_name: string
  eatery_id: string
  quantity: number
  notes: string
}

export interface CartGroup {
  eatery_id: string
  eatery_name: string
  eatery_address: string
  eatery_coordinates: { lat: number; lon: number }
  eatery_contact: string
  items: CartItem[]
  subtotal: number
}

export interface Cart {
  order_details: CartItem[]
}

export interface DeliveryCalculation {
  totalDistance: number
  deliveryFee: number
  exceedsMaxDistance: boolean
  maxDistance: number
}

// Get cart from localStorage
export const getCart = (): Cart => {
  try {
    const cartData = localStorage.getItem("cart")
    return cartData ? JSON.parse(cartData) : { order_details: [] }
  } catch (error) {
    console.error("Error getting cart from localStorage:", error)
    return { order_details: [] }
  }
}

// Save cart to localStorage
export const saveCart = (cart: Cart): void => {
  try {
    localStorage.setItem("cart", JSON.stringify(cart))
  } catch (error) {
    console.error("Error saving cart to localStorage:", error)
  }
}

// Add item to cart
export const addToCart = (item: CartItem): void => {
  const cart = getCart()
  const existingItemIndex = cart.order_details.findIndex(
    (cartItem) => cartItem.id === item.id && cartItem.eatery_id === item.eatery_id,
  )

  if (existingItemIndex >= 0) {
    // Update quantity if item already exists
    cart.order_details[existingItemIndex].quantity += item.quantity
  } else {
    // Add new item
    cart.order_details.push(item)
  }

  saveCart(cart)
}

// Update item quantity in cart
export const updateCartItemQuantity = (itemId: string, eateryId: string, quantity: number): void => {
  const cart = getCart()
  const itemIndex = cart.order_details.findIndex((item) => item.id === itemId && item.eatery_id === eateryId)

  if (itemIndex >= 0) {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      cart.order_details.splice(itemIndex, 1)
    } else {
      cart.order_details[itemIndex].quantity = quantity
    }
    saveCart(cart)
  }
}

// Remove item from cart
export const removeFromCart = (itemId: string, eateryId: string): void => {
  const cart = getCart()
  cart.order_details = cart.order_details.filter((item) => !(item.id === itemId && item.eatery_id === eateryId))
  saveCart(cart)
}

// Clear entire cart
export const clearCart = (): void => {
  saveCart({ order_details: [] })
}

// Get cart items (alias for backward compatibility)
export const getCartItems = (): CartItem[] => {
  return getCart().order_details
}

// Group cart items by eatery with full restaurant data
export const groupCartByEatery = async (): Promise<CartGroup[]> => {
  const cart = getCart()
  const eateryGroups: { [key: string]: CartGroup } = {}

  for (const item of cart.order_details) {
    if (!eateryGroups[item.eatery_id]) {
      // Fetch eatery details
      const eatery = await getRestaurantById(item.eatery_id)

      eateryGroups[item.eatery_id] = {
        eatery_id: item.eatery_id,
        eatery_name: eatery?.name || "Unknown Restaurant",
        eatery_address: eatery?.address || "",
        eatery_coordinates: eatery?.gps || null,
        eatery_contact: eatery?.contact || "",
        items: [],
        subtotal: 0,
      }
    }

    eateryGroups[item.eatery_id].items.push(item)
  }

  // Calculate subtotals
  Object.values(eateryGroups).forEach((group) => {
    group.subtotal = group.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  })

  return Object.values(eateryGroups)
}

// Calculate distance between two coordinates using our server-side Distance Matrix API
export const calculateDistance = async (lat1: number, lon1: number, lat2: number, lon2: number): Promise<number> => {
  try {
    console.log(`🚀 Calculating distance from ${lat1},${lon1} to ${lat2},${lon2}`)

    const response = await fetch("/api/distance-matrix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        origins: [`${lat1},${lon1}`],
        destinations: [`${lat2},${lon2}`],
      }),
    })

    if (!response.ok) {
      console.error(`❌ Distance Matrix API HTTP error: ${response.status}`)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log("📊 Distance Matrix API response:", data)

    if (data.success && data.results && data.results.length > 0) {
      const distanceValue = data.results[0].distance // Distance in meters
      console.log(`✅ Distance calculated: ${distanceValue}m`)
      return distanceValue
    } else {
      console.warn("❌ Distance Matrix API returned non-OK status, falling back to Haversine formula")
      return calculateDistanceHaversine(lat1, lon1, lat2, lon2)
    }
  } catch (error) {
    console.error("💥 Error calculating distance with server API, falling back to Haversine formula:", error)
    return calculateDistanceHaversine(lat1, lon1, lat2, lon2)
  }
}

// Fallback: Calculate distance using Haversine formula
const calculateDistanceHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  console.log("Distance in meters: " + R * c)
  return R * c // Distance in meters
}

// Calculate optimal route: user -> nearest restaurant -> next nearest -> ... -> user
const calculateOptimalRoute = async (
  startPoints: { lat: number; lon: number }[],
  restaurantPoints: { lat: number; lon: number }[],
  endPoint: { lat: number; lon: number },
): Promise<number> => {
  if (restaurantPoints.length === 0) return 0

  const start = startPoints[0] // User location
  let totalDistance = 0
  let currentLocation = start
  const unvisitedRestaurants = [...restaurantPoints]

  // Visit each restaurant in nearest-neighbor order
  while (unvisitedRestaurants.length > 0) {
    let nearestIndex = 0
    let nearestDistance = await calculateDistance(
      currentLocation.lat,
      currentLocation.lon,
      unvisitedRestaurants[0].lat,
      unvisitedRestaurants[0].lon,
    )

    // Find nearest unvisited restaurant
    for (let i = 1; i < unvisitedRestaurants.length; i++) {
      const distance = await calculateDistance(
        currentLocation.lat,
        currentLocation.lon,
        unvisitedRestaurants[i].lat,
        unvisitedRestaurants[i].lon,
      )
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }

    // Move to nearest restaurant
    totalDistance += nearestDistance
    currentLocation = unvisitedRestaurants[nearestIndex]
    unvisitedRestaurants.splice(nearestIndex, 1)
  }

  /* Return to user location
  const returnDistance = await calculateDistance(currentLocation.lat, currentLocation.lon, endPoint.lat, endPoint.lon)
  totalDistance += returnDistance*/

  return totalDistance
}

// Calculate delivery fee using optimal route (user -> restaurants -> user)
export const calculateDeliveryFee = async (
  cartGroups: CartGroup[],
  userAddress: { lat: number; lon: number },
  baseFare: number,
  distanceRate: number,
  maxDistance: number,
): Promise<DeliveryCalculation> => {
  try {
    if (cartGroups.length === 0) {
      return {
        totalDistance: 0,
        deliveryFee: baseFare || 10,
        exceedsMaxDistance: false,
        maxDistance: maxDistance || 50000,
      }
    }

    // Calculate optimal route distance using Google Distance Matrix API
    const restaurantCoords = cartGroups.map((group) => group.eatery_coordinates)
    const totalDistance = await calculateOptimalRoute([userAddress], restaurantCoords, userAddress)

    console.log("Total distance calculated:", totalDistance)

    // Always calculate delivery fee regardless of distance
    let fee = baseFare
    if (totalDistance > 3000) {
      const remainingDistance = totalDistance - 3000
      fee = (baseFare || 15) + (remainingDistance / 1000) * (distanceRate || 3.5)
    }

    const deliveryFee = fee
    const exceedsMaxDistance = totalDistance > (maxDistance || 5000)

    return {
      totalDistance: Math.round(totalDistance),
      deliveryFee: Math.round(deliveryFee * 100) / 100,
      exceedsMaxDistance,
      maxDistance: maxDistance || 50000,
    }
  } catch (error) {
    console.error("Error calculating delivery fee:", error)
    return {
      totalDistance: 3500,
      deliveryFee: baseFare || 15,
      exceedsMaxDistance: false,
      maxDistance: maxDistance || 50000,
    }
  }
}

// Calculate map data using optimal route with Google Distance Matrix API
export const calculateMapData = async (
  cartItems: CartItem[],
  userAddress: { lat: number; lon: number },
): Promise<{
  total_distance: number
  total_distance_text: string
  total_seconds: number
  total_duration: string
}> => {
  try {
    const eateryGroups = await groupCartByEatery()

    if (eateryGroups.length === 0) {
      return {
        total_distance: 0,
        total_distance_text: "0 km",
        total_seconds: 0,
        total_duration: "0 minutes",
      }
    }

    // Calculate optimal route distance using Google Distance Matrix API
    const restaurantCoords = eateryGroups.map((group) => group.eatery_coordinates)
    const totalDistance = await calculateOptimalRoute([userAddress], restaurantCoords, userAddress)

    // For duration, we can use the Distance Matrix API to get more accurate travel time
    // For now, estimate travel time (assuming average speed of 30 km/h in city)
    const timeInHours = totalDistance / 1000 / 30
    const totalSeconds = timeInHours * 3600

    const distanceInKm = Math.round((totalDistance / 1000) * 10) / 10 // Round to 1 decimal place
    const minutes = Math.round(totalSeconds / 60)

    return {
      total_distance: Math.round(totalDistance),
      total_distance_text: `${distanceInKm} km`,
      total_seconds: Math.round(totalSeconds),
      total_duration: `${minutes} minutes`,
    }
  } catch (error) {
    console.error("Error calculating map data:", error)
    return {
      total_distance: 0,
      total_distance_text: "0 km",
      total_seconds: 0,
      total_duration: "0 minutes",
    }
  }
}

// Get cart item count
export const getCartItemCount = (): number => {
  const cart = getCart()
  return cart.order_details.reduce((total, item) => total + item.quantity, 0)
}

// Get cart total (excluding delivery)
export const getCartTotal = (): number => {
  const cart = getCart()
  return cart.order_details.reduce((total, item) => total + item.price * item.quantity, 0)
}

// Apply user promo to delivery fee (not food total)
export const applyPromoToDeliveryFee = (
  deliveryFee: number,
  promo: { discount: string; min_price: string },
): { discountAmount: number; finalDeliveryFee: number; canApply: boolean } => {
  const minPrice = Number.parseFloat(promo.min_price)
  const discountPercent = Number.parseFloat(promo.discount)

  // Check if delivery fee meets minimum requirement
  if (deliveryFee < minPrice) {
    return {
      discountAmount: 0,
      finalDeliveryFee: deliveryFee,
      canApply: false,
    }
  }

  const discountAmount = (deliveryFee * discountPercent) / 100
  const finalDeliveryFee = Math.max(0, deliveryFee - discountAmount) // Ensure delivery fee doesn't go below 0

  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    finalDeliveryFee: Math.round(finalDeliveryFee * 100) / 100,
    canApply: true,
  }
}

// Legacy function for backward compatibility (now applies to delivery fee)
export const applyPromoToCart = (
  deliveryFee: number,
  promo: { discount: string; min_price: string },
): { discountAmount: number; finalTotal: number; canApply: boolean } => {
  const result = applyPromoToDeliveryFee(deliveryFee, promo)
  return {
    discountAmount: result.discountAmount,
    finalTotal: result.finalDeliveryFee,
    canApply: result.canApply,
  }
}
