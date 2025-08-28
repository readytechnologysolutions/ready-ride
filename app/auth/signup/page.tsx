"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})
  const [termsAccepted, setTermsAccepted] = useState(false)
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: "",
      })
    }
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      errors.name = "Please enter name"
    }

    if (!formData.phone.trim()) {
      errors.phone = "Please enter phone number"
    }

    if (!formData.email.trim()) {
      errors.email = "Please enter email"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email"
    }

    if (!formData.password.trim()) {
      errors.password = "Please enter password"
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters"
    }

    if (!termsAccepted) {
      errors.terms = "You must accept the Terms and Conditions"
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      await updateProfile(userCredential.user, {
        displayName: formData.name,
      })

      // Create user document in Firestore
      const now = new Date().toISOString()
      const userDoc = {
        device_id: "", // Will be empty by default
        photo_url: "", // Will be empty by default
        loggedin: true,
        online: true,
        address: {
          name: "",
          lat: 0,
          lon: 0,
          address: "",
        },
        verified: false, // Will be false by default until verified
        email: formData.email,
        phone_number: formData.phone,
        updateTime: now,
        device_os: "", // Will be empty by default
        display_name: formData.name,
        id: userCredential.user.uid,
        createTime: now,
      }

      await setDoc(doc(db, "users", userCredential.user.uid), userDoc)

      router.push("/home")
    } catch (error: any) {
      console.error("Signup error:", error)
      switch (error.code) {
        case "auth/email-already-in-use":
          setError("An account with this email already exists.")
          break
        case "auth/invalid-email":
          setError("Please enter a valid email address.")
          break
        case "auth/weak-password":
          setError("Password is too weak. Please choose a stronger password.")
          break
        default:
          setError("Signup failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError(null)

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)

      // Create user document in Firestore for Google signup
      const now = new Date().toISOString()
      const userDoc = {
        device_id: "", // Will be empty by default
        photo_url: result.user.photoURL || "",
        loggedin: true,
        online: true,
        address: {
          name: "",
          lat: 0,
          lon: 0,
          address: "",
        },
        verified: false, // Will be false by default until verified
        email: result.user.email || "",
        phone_number: "", // Will be empty for Google signup
        updateTime: now,
        device_os: "", // Will be empty by default
        display_name: result.user.displayName || "",
        id: result.user.uid,
        createTime: now,
      }

      await setDoc(doc(db, "users", result.user.uid), userDoc)

      router.push("/home")
    } catch (error: any) {
      console.error("Google signup error:", error)
      if (error.code === "auth/popup-closed-by-user") {
        setError("Sign-up was cancelled.")
      } else {
        setError("Google sign-up failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col p-5">
      <div className="mt-12">
        <h1 className="text-4xl font-bold mb-4">Create Account</h1>
        <p className="text-gray-500 mb-8">
          Please provide the requested information to register and gain access to Ready Ride.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleEmailSignup} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-gray-500 mb-2">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              required
              disabled={loading}
              className={`w-full p-4 border ${fieldErrors.name ? "border-red-500" : "border-gray-300"} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary`}
            />
            {fieldErrors.name && (
              <div className="flex items-center gap-1 mt-1 text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{fieldErrors.name}</span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-gray-500 mb-2">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="0243345678"
              required
              disabled={loading}
              className={`w-full p-4 border ${fieldErrors.phone ? "border-red-500" : "border-gray-300"} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary`}
            />
            {fieldErrors.phone && (
              <div className="flex items-center gap-1 mt-1 text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{fieldErrors.phone}</span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-gray-500 mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="jonayile3@gmail.com"
              required
              disabled={loading}
              className={`w-full p-4 border ${fieldErrors.email ? "border-red-500" : "border-gray-300"} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary`}
            />
            {fieldErrors.email && (
              <div className="flex items-center gap-1 mt-1 text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{fieldErrors.email}</span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-500 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••••••"
                required
                disabled={loading}
                className={`w-full p-4 border ${fieldErrors.password ? "border-red-500" : "border-gray-300"} rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-primary`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <div className="flex items-center gap-1 mt-1 text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{fieldErrors.password}</span>
              </div>
            )}
          </div>

          <div className="flex items-center">
            <div
              className={`w-6 h-6 flex items-center justify-center mr-2 cursor-pointer ${termsAccepted ? "bg-primary" : "border border-gray-300"} rounded`}
              onClick={() => setTermsAccepted(!termsAccepted)}
            >
              {termsAccepted && (
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div>
              <span className="text-gray-500">Agree with </span>
              <Link href="/terms" className="text-primary">
                Terms and Conditions
              </Link>
            </div>
          </div>
          {fieldErrors.terms && (
            <div className="flex items-center gap-1 mt-1 text-red-500">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{fieldErrors.terms}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-primary text-white py-4 px-6 rounded-full text-center text-xl font-medium disabled:opacity-50 hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        {/* <div className="my-8 flex items-center">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-gray-500">Or sign up with</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-16 h-16 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Image src="/google-logo.png" alt="Google" width={32} height={32} />
          </button>
        </div>*/}

        <div className="mt-8 text-center">
          <p className="text-gray-500">
            Already have an Account?{" "}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
