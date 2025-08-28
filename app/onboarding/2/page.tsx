import type { Metadata } from "next"
import OnboardingPage2Client from "./OnboardingPage2Client"

export const metadata: Metadata = {
  title: "Ready Ride - Parcel Delivery",
  description: "Send and receive parcels with Ready Ride",
}

export default function OnboardingPage2() {
  return <OnboardingPage2Client />
}
