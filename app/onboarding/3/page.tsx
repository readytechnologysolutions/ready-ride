import type { Metadata } from "next"
import OnboardingPage3Client from "./OnboardingPage3Client"

export const metadata: Metadata = {
  title: "Ready Ride - Real-time Tracking",
  description: "Track your deliveries in real-time",
}

export default function OnboardingPage3() {
  return <OnboardingPage3Client />
}
