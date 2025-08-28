"use client"

import Image from "next/image"
import Link from "next/link"
import { useViewportHeight } from "@/hooks/use-viewport-height"

export default function OnboardingPage2Client() {
  const viewportHeight = useViewportHeight()

  return (
    <div className="onboarding-container" style={{ height: viewportHeight }}>
      <div className="onboarding-image-container">
        <Image src="/onboard-2.png" alt="Parcel delivery" fill className="onboarding-image" priority />
      </div>

      <h1 className="onboarding-heading">Send and Receive Anything, Anytime</h1>
      <p className="onboarding-text">
        Our reliable parcel delivery service ensures your items reach their destination quickly and securely.
      </p>

      <div className="pagination-dots">
        <div className="pagination-dot bg-gray-300"></div>
        <div className="pagination-dot active"></div>
        <div className="pagination-dot bg-gray-300"></div>
      </div>

      <div className="navigation-buttons">
        <Link href="/onboarding/skip" className="text-secondary font-medium">
          Skip
        </Link>
        <Link href="/onboarding/3" className="text-primary font-medium">
          Next
        </Link>
      </div>
    </div>
  )
}
