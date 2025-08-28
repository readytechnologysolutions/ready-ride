"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { type User, onAuthStateChanged, signInAnonymously, linkWithCredential, EmailAuthProvider } from "firebase/auth"
import { auth } from "@/lib/firebase"

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean // true only for non-anonymous users
  isAnonymous: boolean
  signInAnonymouslyIfNeeded: () => Promise<void>
  linkWithGoogle: (googleCredential: any) => Promise<void>
  linkWithEmail: (email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  isAnonymous: false,
  signInAnonymouslyIfNeeded: async () => {},
  linkWithGoogle: async () => {},
  linkWithEmail: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Global variables to track authentication state
  const isAuthenticated = user && !user.isAnonymous
  const isAnonymous = user?.isAnonymous || false

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInAnonymouslyIfNeeded = async () => {
    if (!user) {
      try {
        await signInAnonymously(auth)
      } catch (error) {
        console.error("Anonymous sign-in error:", error)
      }
    }
  }

  const linkWithGoogle = async (googleCredential: any) => {
    if (user && user.isAnonymous) {
      try {
        await linkWithCredential(user, googleCredential)
      } catch (error) {
        console.error("Error linking Google account:", error)
        throw error
      }
    }
  }

  const linkWithEmail = async (email: string, password: string) => {
    if (user && user.isAnonymous) {
      try {
        const credential = EmailAuthProvider.credential(email, password)
        await linkWithCredential(user, credential)
      } catch (error) {
        console.error("Error linking email account:", error)
        throw error
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(isAuthenticated),
        isAnonymous,
        signInAnonymouslyIfNeeded,
        linkWithGoogle,
        linkWithEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
