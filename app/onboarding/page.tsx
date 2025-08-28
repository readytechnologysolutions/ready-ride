import type { Metadata } from "next"
import OnboardingClientPage from "./OnboardingClientPage"

export const metadata: Metadata = {
  title: "Ready Ride - Onboarding",
  description: "Get started with Ready Ride",
}

export default function OnboardingPage() {
  return <OnboardingClientPage />
}
