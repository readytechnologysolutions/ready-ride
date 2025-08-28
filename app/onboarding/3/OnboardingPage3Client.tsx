"use client"

import { markOnboardingCompleted } from "@/utils/onboarding-utils"
import { useRouter } from "next/navigation"

const OnboardingPage3Client = () => {
  const router = useRouter()

  const handleGetStarted = () => {
    markOnboardingCompleted()
    router.push("/home")
  }

  return (
    <div>
      <h1>Onboarding Page 3</h1>
      <button onClick={handleGetStarted}>Get Started</button>
    </div>
  )
}

export default OnboardingPage3Client
