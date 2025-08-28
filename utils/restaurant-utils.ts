export function isRestaurantOpen(opens: string, closes: string): boolean {
  try {
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes() // Current time in minutes

    // Parse opening time
    const openTime = parseTimeString(opens)
    // Parse closing time
    const closeTime = parseTimeString(closes)

    // Handle overnight restaurants (closes after midnight)
    if (closeTime < openTime) {
      // Restaurant is open overnight
      return currentTime >= openTime || currentTime <= closeTime
    } else {
      // Normal operating hours
      return currentTime >= openTime && currentTime <= closeTime
    }
  } catch (error) {
    console.error("Error checking restaurant hours:", error)
    return true // Default to open if we can't parse the times
  }
}

function parseTimeString(timeStr: string): number {
  try {
    // Remove extra spaces and convert to uppercase
    const cleanTime = timeStr.trim().toUpperCase()

    // Extract time and AM/PM
    const match = cleanTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/)
    if (!match) return 0

    let hours = Number.parseInt(match[1])
    const minutes = Number.parseInt(match[2])
    const period = match[3]

    // Convert to 24-hour format
    if (period === "PM" && hours !== 12) {
      hours += 12
    } else if (period === "AM" && hours === 12) {
      hours = 0
    }

    return hours * 60 + minutes // Return time in minutes
  } catch (error) {
    console.error("Error parsing time string:", timeStr, error)
    return 0
  }
}

export function formatOperatingHours(opens: string, closes: string): string {
  return `${opens} - ${closes}`
}

export function getEstimatedDeliveryTime(): string {
  // Generate a random delivery time between 20-45 minutes
  const min = 20 + Math.floor(Math.random() * 10)
  const max = min + 10 + Math.floor(Math.random() * 10)
  return `${min}-${max} min`
}

export function getDeliveryFee(): string {
  // Generate a random delivery fee between GH₵3-8
  const fee = 3 + Math.floor(Math.random() * 6)
  return `GH₵${fee}.00`
}
