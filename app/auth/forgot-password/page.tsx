"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setError("Please enter your email")
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      await sendPasswordResetEmail(auth, email)
      console.log("Password reset email sent to:", email)
      router.push("/auth/forgot-password/submitted")
    } catch (error: any) {
      console.error("Error sending password reset email:", error)

      // Handle specific Firebase Auth errors
      switch (error.code) {
        case "auth/user-not-found":
          setError("No account found with this email address")
          break
        case "auth/invalid-email":
          setError("Please enter a valid email address")
          break
        case "auth/too-many-requests":
          setError("Too many requests. Please try again later")
          break
        default:
          setError("Failed to send reset email. Please try again")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="flex items-center mb-6">
        <button onClick={() => router.back()} className="mr-2" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold">Confirm Email</h1>
      </div>

      <p className="text-secondary mb-8">Please enter your email used during registration to receive reset link.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError("")
            }}
            className={`w-full p-3 border rounded-lg ${error ? "border-red-500" : "border-primary"}`}
            autoFocus
          />
          {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white py-4 px-6 rounded-full text-center text-xl font-medium mt-auto disabled:opacity-50"
        >
          {isSubmitting ? "Sending..." : "Submit"}
        </button>
      </form>
    </div>
  )
}
