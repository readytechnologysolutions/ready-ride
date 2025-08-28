"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Eye, EyeOff } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams?.get("redirect") || "/home"

  const handleSuccessfulLogin = () => {
    const storedRedirect = typeof window !== "undefined" ? sessionStorage.getItem("redirectAfterLogin") : null
    const redirectTo = storedRedirect || redirectPath

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("redirectAfterLogin")
    }

    router.push(redirectTo)
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Simple login - no account linking
      await signInWithEmailAndPassword(auth, email, password)
      handleSuccessfulLogin()
    } catch (error: any) {
      console.error("Login error:", error)
      switch (error.code) {
        case "auth/user-not-found":
          setError("No account found with this email address.")
          break
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("Incorrect password. Please try again.")
          break
        case "auth/invalid-email":
          setError("Please enter a valid email address.")
          break
        case "auth/too-many-requests":
          setError("Too many failed attempts. Please try again later.")
          break
        default:
          setError("Login failed. Please check your credentials and try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError("")

    try {
      // Simple Google login - no account linking
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      handleSuccessfulLogin()
    } catch (error: any) {
      console.error("Google login error:", error)
      if (error.code === "auth/popup-closed-by-user") {
        setError("Sign-in was cancelled.")
      } else {
        setError("Google sign-in failed. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col p-5">
      <div className="mt-12">
        <h1 className="text-4xl font-bold mb-4">Welcome Back</h1>
        <p className="text-gray-500 mb-8">
          Please provide the requested information to register and gain access to Ready Ride.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-gray-500 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jonayile3@gmail.com"
              required
              disabled={loading}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-500 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                disabled={loading}
                className="w-full p-4 border border-gray-300 rounded-lg pr-12 focus:outline-none focus:ring-2 focus:ring-primary"
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
            <div className="flex justify-end mt-2">
              <Link href="/auth/forgot-password" className="text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-4 px-6 rounded-full text-center text-xl font-medium disabled:opacity-50 hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Log In"}
          </button>
        </form>

        {/*<div className="my-8 flex items-center">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-gray-500">or continue with</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-16 h-16 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Image src="/google-logo.png" alt="Google" width={32} height={32} />
          </button>
        </div>*/}

        <div className="mt-8 text-center">
          <p className="text-gray-500">
            Don't have an Account?{" "}
            <Link href="/auth/signup" className="text-primary hover:underline font-medium">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
