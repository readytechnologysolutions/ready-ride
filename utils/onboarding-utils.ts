// Utility functions for managing onboarding state

export const ONBOARDING_COMPLETED_KEY = "onboarding_completed"

// Check if onboarding has been completed
export const isOnboardingCompleted = (): boolean => {
  if (typeof window === "undefined") return false

  try {
    const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY)
    return completed === "true"
  } catch (error) {
    console.error("Error checking onboarding status:", error)
    return false
  }
}

// Mark onboarding as completed
export const markOnboardingCompleted = (): void => {
  try {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true")
  } catch (error) {
    console.error("Error marking onboarding as completed:", error)
  }
}

// Reset onboarding status (for testing purposes)
export const resetOnboardingStatus = (): void => {
  try {
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY)
  } catch (error) {
    console.error("Error resetting onboarding status:", error)
  }
}
