"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Mail, CheckCircle } from "lucide-react"
import { sendEmailVerification, onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

export default function VerifyPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResendDisabled, setIsResendDisabled] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [message, setMessage] = useState("")
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    // Set email from current user
    if (user?.email) {
      setEmail(user.email)
      setIsVerified(user.emailVerified)
    }

    // Listen for auth state changes to detect verification
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setEmail(currentUser.email || "")
        setIsVerified(currentUser.emailVerified)

        // If email is verified, redirect to home
        if (currentUser.emailVerified) {
          setTimeout(() => {
            router.push("/home")
          }, 2000)
        }
      }
    })

    return () => unsubscribe()
  }, [user, router])

  useEffect(() => {
    // Timer for resend button
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setIsResendDisabled(false)
    }
  }, [resendTimer])

  const handleSendVerification = async () => {
    if (!auth.currentUser) {
      setMessage("No user logged in")
      return
    }

    setIsLoading(true)
    setMessage("")

    try {
      await sendEmailVerification(auth.currentUser)
      setMessage("Verification email sent successfully!")
      setIsResendDisabled(true)
      setResendTimer(30)
    } catch (error: any) {
      console.error("Error sending verification email:", error)
      setMessage(error.message || "Failed to send verification email")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (isResendDisabled) return
    await handleSendVerification()
  }

  const handleCheckVerification = async () => {
    if (!auth.currentUser) return

    setIsLoading(true)
    try {
      // Reload user to get latest verification status
      await auth.currentUser.reload()
      const updatedUser = auth.currentUser

      if (updatedUser.emailVerified) {
        setIsVerified(true)
        setMessage("Email verified successfully!")
        setTimeout(() => {
          router.push("/home")
        }, 2000)
      } else {
        setMessage("Email not yet verified. Please check your email and click the verification link.")
      }
    } catch (error: any) {
      console.error("Error checking verification:", error)
      setMessage("Error checking verification status")
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerified) {
    return (
      <div className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-600 mb-2">Email Verified!</h1>
          <p className="text-gray-600">Redirecting to home...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="flex items-center mb-6">
        <button onClick={() => router.back()} className="mr-2" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold">Verify Email</h1>
      </div>

      <div className="flex justify-center mb-6">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
          <Mail className="w-12 h-12 text-blue-600" />
        </div>
      </div>

      <div className="text-center mb-8">
        <p className="text-gray-600 mb-2">We've sent a verification link to:</p>
        <p className="text-primary font-medium text-lg mb-4">{email}</p>
        <p className="text-sm text-gray-500">
          Click the link in your email to verify your account, then return here to continue.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg text-center ${
            message.includes("success") || message.includes("sent")
              ? "bg-green-100 text-green-700"
              : message.includes("verified")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="space-y-4 mb-8">
        <button
          onClick={handleCheckVerification}
          disabled={isLoading}
          className="w-full bg-primary text-white py-4 px-6 rounded-full text-center text-xl font-medium disabled:opacity-70"
        >
          {isLoading ? "Checking..." : "Verify Email"}
        </button>

        <div className="text-center">
          <button
            onClick={handleResendEmail}
            disabled={isResendDisabled}
            className={`text-primary ${isResendDisabled ? "opacity-50 cursor-not-allowed" : "hover:underline"}`}
          >
            Didn't receive email?{" "}
            <span className="underline">{isResendDisabled ? `Resend Email (${resendTimer}s)` : "Resend Email"}</span>
          </button>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500">
        <p>Check your spam folder if you don't see the email.</p>
      </div>
    </div>
  )
}
