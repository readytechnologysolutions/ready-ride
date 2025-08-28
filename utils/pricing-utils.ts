// Pricing calculation utilities for parcel delivery

export interface PricingResult {
  deliveryFee: number
  totalAmount: number
  breakdown: {
    baseFee: number
    distanceFee: number
    sizeFee: number
    timeFee: number
  }
}

export function calculateParcelPricingSync(
  collectTime: string,
  packageSize: string,
  distanceKm: number,
  appSettings: any,
): PricingResult {
  // Base delivery fee from app settings
  const baseFee = appSettings?.deliveryFee || 5

  // Distance-based pricing (per km)
  const distanceRate = appSettings?.distanceRate || 2
  const distanceFee = Math.max(0, (distanceKm - 1) * distanceRate) // First km included in base

  // Package size multiplier
  const sizeMultipliers = {
    small: 1,
    medium: 1.5,
    large: 2,
    extra_large: 2.5,
  }
  const sizeMultiplier = sizeMultipliers[packageSize as keyof typeof sizeMultipliers] || 1
  const sizeFee = baseFee * (sizeMultiplier - 1)

  // Time-based pricing
  const timeMultipliers = {
    express: 1.5, // Same day delivery
    standard: 1, // Next day delivery
    economy: 0.8, // 2-3 days delivery
  }
  const timeMultiplier = timeMultipliers[collectTime as keyof typeof timeMultipliers] || 1
  const timeFee = baseFee * (timeMultiplier - 1)

  // Calculate total
  const deliveryFee = Math.round((baseFee + distanceFee + sizeFee + timeFee) * 100) / 100
  const totalAmount = deliveryFee

  return {
    deliveryFee,
    totalAmount,
    breakdown: {
      baseFee,
      distanceFee,
      sizeFee,
      timeFee,
    },
  }
}

export function calculateEstimatedTime(collectTime: string, durationMinutes: number, durationText: string): string {
  const now = new Date()

  switch (collectTime) {
    case "express":
      // Same day delivery - add 2-4 hours to travel time
      const expressHours = Math.max(2, Math.ceil(durationMinutes / 60) + 2)
      const expressTime = new Date(now.getTime() + expressHours * 60 * 60 * 1000)
      return `Today by ${expressTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`

    case "standard":
      // Next day delivery
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(14, 0, 0, 0) // 2 PM next day
      return `Tomorrow by ${tomorrow.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`

    case "economy":
      // 2-3 days delivery
      const economyDate = new Date(now)
      economyDate.setDate(economyDate.getDate() + 2)
      return `${economyDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })}`

    default:
      return durationText || "Estimated delivery time not available"
  }
}

export function formatCurrency(amount: number, currency = "GHS"): string {
  return `${currency} ${amount.toFixed(2)}`
}

export function calculateDeliveryFeeByDistance(distanceKm: number, appSettings: any): number {
  const baseFee = appSettings?.deliveryFee || 5
  const distanceRate = appSettings?.distanceRate || 2

  // First km is included in base fee, charge for additional distance
  const additionalDistance = Math.max(0, distanceKm - 1)
  const distanceFee = additionalDistance * distanceRate

  return Math.round((baseFee + distanceFee) * 100) / 100
}
