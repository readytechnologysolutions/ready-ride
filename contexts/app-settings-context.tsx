"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getAppSettings, type AppSettings } from "@/lib/firestore-service"

interface AppSettingsContextType {
  settings: AppSettings | null
  loading: boolean
  error: string | null
  refreshSettings: () => Promise<void>
}

const AppSettingsContext = createContext<AppSettingsContextType>({
  settings: null,
  loading: true,
  error: null,
  refreshSettings: async () => {},
})

export const useAppSettings = () => useContext(AppSettingsContext)

interface AppSettingsProviderProps {
  children: ReactNode
}

export const AppSettingsProvider = ({ children }: AppSettingsProviderProps) => {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = async () => {
    try {
      console.log("🔄 Fetching app settings...")
      setLoading(true)
      setError(null)
      const appSettings = await getAppSettings()
      //console.log("✅ App settings fetched:", appSettings)
      setSettings(appSettings)
    } catch (err) {
      console.error("❌ Error fetching app settings:", err)
      setError("Failed to load app settings")
    } finally {
      setLoading(false)
    }
  }

  const refreshSettings = async () => {
    console.log("🔄 Refreshing app settings...")
    await fetchSettings()
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  // Add debug logging for context value
  useEffect(() => {
    //console.log("📊 App Settings Context State:", { settings, loading, error })
  }, [settings, loading, error])

  return (
    <AppSettingsContext.Provider value={{ settings, loading, error, refreshSettings }}>
      {children}
    </AppSettingsContext.Provider>
  )
}
