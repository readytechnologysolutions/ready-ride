"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Check, Package, FileText, MapPin } from "lucide-react"
import StepIndicator from "@/components/step-indicator"
import AuthGuard from "@/components/auth-guard"
import { useAuth } from "@/contexts/auth-context"
import LocationPickerDialog from "@/components/location-picker-dialog"
import {
  getParcelData,
  saveParcelData,
  initializeParcelDataWithUser,
  calculateDistanceAndSave,
  calculateParcelPricing,
} from "@/utils/parcel-utils"
import { useAppSettings } from "@/contexts/app-settings-context"
import { getAppSettings, type AppSettings } from "@/lib/firestore-service"

interface LocationData {
  address: string
  lat: number
  lng: number
}

// Loading component for parcel page
const ParcelLoading = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#fffbeb]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    <p className="mt-4 text-gray-600">Loading delivery form...</p>
  </div>
)

export default function ParcelDeliveryPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [appSettings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false)

  // Location states
  const [senderLocation, setSenderLocation] = useState<LocationData | null>(null)
  const [receiverLocation, setReceiverLocation] = useState<LocationData | null>(null)
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [locationDialogType, setLocationDialogType] = useState<"sender" | "receiver">("sender")

  const [formData, setFormData] = useState({
    senderName: "",
    senderContact: "",
    fromBusStation: "no" as "yes" | "no",
    receiverName: "",
    receiverContact: "",
  })

  const steps = [
    {
      id: 1,
      label: "Details",
      icon: <Check size={24} />,
    },
    {
      id: 2,
      label: "Delivery Options",
      icon: <Package size={24} />,
    },
    {
      id: 3,
      label: "Summary",
      icon: <FileText size={24} />,
    },
  ]

  // Initialize form data on component mount
  useEffect(() => {
    const initializeData = async () => {
      try {
      
      const appSettings = await getAppSettings()
      setSettings(appSettings)
      
        // Get existing parcel data from localStorage
        const existingParcelData = getParcelData()

        // Initialize with user data if no existing data
        let initialData = {}
        if (user && !existingParcelData?.senderName) {
          initialData = await initializeParcelDataWithUser(user.uid)
        }

        // Merge all data sources
        const mergedData = {
          ...initialData,
          ...existingParcelData,
        }

        setFormData({
          senderName: mergedData.senderName || "",
          senderContact: mergedData.senderContact || "",
          fromBusStation: mergedData.fromBusStation || "no",
          receiverName: mergedData.receiverName || "",
          receiverContact: mergedData.receiverContact || "",
        })

        // Set locations if available
        if (mergedData.senderLocation && mergedData.senderLat && mergedData.senderLon) {
          setSenderLocation({
            address: mergedData.senderLocation,
            lat: mergedData.senderLat,
            lng: mergedData.senderLon,
          })
        }

        if (mergedData.receiverLocation && mergedData.receiverLat && mergedData.receiverLon) {
          setReceiverLocation({
            address: mergedData.receiverLocation,
            lat: mergedData.receiverLat,
            lng: mergedData.receiverLon,
          })
        }

        // Save the merged data
        if (Object.keys(mergedData).length > 0) {
          saveParcelData(mergedData)
        }
      } catch (error) {
        console.error("Error initializing parcel data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeData()
  }, [user])

  // Calculate distance when both locations are available
  useEffect(() => {
    console.log(appSettings)
    if (senderLocation && receiverLocation && appSettings) {
      calculateDistance()
    }
  }, [senderLocation, receiverLocation, appSettings])

  // Function to calculate distance and delivery fee
  const calculateDistance = async () => {
    if (!senderLocation || !receiverLocation || !appSettings) {
      console.log("Missing data for distance calculation:", {
        senderLocation: !!senderLocation,
        receiverLocation: !!receiverLocation,
        appSettings: !!appSettings,
      })
      return
    }

    try {
      setIsCalculatingDistance(true)
      console.log("🚀 Starting distance calculation between locations...")
      console.log("📍 Sender:", senderLocation)
      console.log("📍 Receiver:", receiverLocation)

      const result = await calculateDistanceAndSave(
        senderLocation.lat,
        senderLocation.lng,
        receiverLocation.lat,
        receiverLocation.lng,
      )

      if (result) {
        console.log("✅ Distance calculated successfully:", result)

        // Get current parcel data to preserve package settings
        const currentParcelData = getParcelData()

        // Calculate parcel pricing with current settings
        const parcelPricing = await calculateParcelPricing(
          currentParcelData?.collectTime || "standard",
          currentParcelData?.packageSize || "small",
          result.distance,
        )

        console.log("💰 Parcel pricing calculated:", parcelPricing)

        // Save all calculated data to localStorage
        const updatedParcelData = {
          ...currentParcelData,
          distance: result.distance,
          duration: result.duration,
          distanceText: result.distanceText,
          durationText: result.durationText,
          polyLines: result.polyLines,
          basePrice: parcelPricing.basePrice,
          expressCharge: parcelPricing.expressCharge,
          deliveryFee: parcelPricing.deliveryFee,
          totalAmount: parcelPricing.totalAmount,
          estimatedTime: parcelPricing.estimatedTime,
        }

        saveParcelData(updatedParcelData)

        console.log("💾 Complete parcel data saved to localStorage:", updatedParcelData)
        console.log("📊 Summary:", {
          distance: result.distanceText,
          travelTime: result.durationText,
          basePrice: `GHC ${parcelPricing.basePrice}`,
          deliveryFee: `GHC ${parcelPricing.deliveryFee}`,
          expressCharge: `GHC ${parcelPricing.expressCharge}`,
          totalAmount: `GHC ${parcelPricing.totalAmount}`,
          estimatedTime: parcelPricing.estimatedTime,
        })
      } else {
        console.error("❌ Failed to calculate distance")
      }
    } catch (error) {
      console.error("💥 Error calculating distance:", error)
    } finally {
      setIsCalculatingDistance(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target

    const newValue = type === "radio" ? value : value

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))

    // Save to localStorage immediately
    saveParcelData({ [name]: newValue })
  }

  const handleLocationClick = (type: "sender" | "receiver") => {
    setLocationDialogType(type)
    setLocationDialogOpen(true)
  }

  const handleLocationSelect = (location: LocationData) => {
    console.log("📍 Location selected:", location, "Type:", locationDialogType)

    if (locationDialogType === "sender") {
      setSenderLocation(location)
      saveParcelData({
        senderLocation: location.address,
        senderLat: location.lat,
        senderLon: location.lng,
      })
      console.log("✅ Sender location updated:", location)
    } else {
      setReceiverLocation(location)
      saveParcelData({
        receiverLocation: location.address,
        receiverLat: location.lat,
        receiverLon: location.lng,
      })
      console.log("✅ Receiver location updated:", location)
    }

    // Note: Distance calculation will be triggered automatically by useEffect
    console.log("🔄 Distance calculation will be triggered automatically...")
    calculateDistance()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Save form data before proceeding
    saveParcelData(formData)

    if (formData.fromBusStation === "yes") {
      router.push("/parcel/bus-station")
    } else {
      router.push("/parcel/delivery-options")
    }
  }

  if (isLoading) {
    return <ParcelLoading />
  }

  return (
    <AuthGuard fallback={<ParcelLoading />}>
      <div className="pb-20">
        <StepIndicator currentStep={1} steps={steps} />

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <h2 className="text-xl font-bold">Sender's Details</h2>

          <div>
            <label htmlFor="senderLocation" className="block text-gray-500 mb-2">
              Location
            </label>
            <div
              className="w-full p-4 border border-gray-300 rounded-lg flex items-center justify-between cursor-pointer"
              onClick={() => handleLocationClick("sender")}
            >
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-primary mr-2"></div>
                <span className="line-clamp-1">{senderLocation?.address || "Select pickup location"}</span>
              </div>
              <MapPin size={24} className="text-primary flex-shrink-0 ml-2" />
            </div>
          </div>

          <div>
            <label htmlFor="senderName" className="block text-gray-500 mb-2">
              Name
            </label>
            <input
              type="text"
              id="senderName"
              name="senderName"
              value={formData.senderName}
              onChange={handleChange}
              placeholder="Full name"
              className="w-full p-4 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label htmlFor="senderContact" className="block text-gray-500 mb-2">
              Contact
            </label>
            <input
              type="tel"
              id="senderContact"
              name="senderContact"
              value={formData.senderContact}
              onChange={handleChange}
              placeholder="055 XXX XXXX"
              className="w-full p-4 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <p className="text-gray-500 mb-2">Is your package been collected from a bus station?</p>
            <div className="flex space-x-4">
              <label
                className={`flex-1 border rounded-lg p-4 flex items-center justify-between cursor-pointer ${formData.fromBusStation === "yes" ? "border-primary" : "border-gray-300"}`}
              >
                <span>Yes</span>
                <input
                  type="radio"
                  name="fromBusStation"
                  value="yes"
                  checked={formData.fromBusStation === "yes"}
                  onChange={handleChange}
                  className="form-radio h-5 w-5 text-primary hidden"
                />
              </label>
              <label
                className={`flex-1 border rounded-lg p-4 flex items-center justify-between cursor-pointer ${formData.fromBusStation === "no" ? "border-primary" : "border-gray-300"}`}
              >
                <span>No</span>
                <input
                  type="radio"
                  name="fromBusStation"
                  value="no"
                  checked={formData.fromBusStation === "no"}
                  onChange={handleChange}
                  className="form-radio h-5 w-5 text-primary hidden"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-gray-300 my-4 pt-4">
            <h2 className="text-xl font-bold">Receiver's Details</h2>
          </div>

          <div>
            <label htmlFor="receiverLocation" className="block text-gray-500 mb-2">
              Location
            </label>
            <div
              className="w-full p-4 border border-gray-300 rounded-lg flex items-center justify-between cursor-pointer"
              onClick={() => handleLocationClick("receiver")}
            >
              <div className="flex items-center flex-1 mr-2">
                <div className="w-4 h-4 rounded-full border border-primary mr-2 flex-shrink-0"></div>
                <span className="line-clamp-1">{receiverLocation?.address || "Select delivery location"}</span>
              </div>
              <MapPin size={24} className="text-primary flex-shrink-0" />
            </div>
            {isCalculatingDistance && (
              <div className="mt-2 text-sm text-gray-500 flex items-center">
                <div className="animate-spin h-3 w-3 border border-gray-500 rounded-full mr-2"></div>
                Calculating delivery distance and fee...
              </div>
            )}
          </div>

          <div>
            <label htmlFor="receiverName" className="block text-gray-500 mb-2">
              Name
            </label>
            <input
              type="text"
              id="receiverName"
              name="receiverName"
              value={formData.receiverName}
              onChange={handleChange}
              placeholder="Full name"
              className="w-full p-4 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label htmlFor="receiverContact" className="block text-gray-500 mb-2">
              Contact
            </label>
            <input
              type="tel"
              id="receiverContact"
              name="receiverContact"
              value={formData.receiverContact}
              onChange={handleChange}
              placeholder="Receiver's contact"
              className="w-full p-4 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#fffcea] safe-area-inset-bottom">
            <button
              disabled = {isCalculatingDistance}
              type="submit"
              className="w-full bg-primary text-white py-4 rounded-full text-center text-xl font-medium hover:bg-primary/90 transition-colors"
            >
              Next
            </button>
          </div>
        </form>

        {/* Location Picker Dialog */}
        <LocationPickerDialog
          isOpen={locationDialogOpen}
          onClose={() => setLocationDialogOpen(false)}
          onLocationSelect={handleLocationSelect}
          title={locationDialogType === "sender" ? "Select Pickup Location" : "Select Delivery Location"}
          currentLocation={locationDialogType === "sender" ? senderLocation : receiverLocation}
        />
      </div>
    </AuthGuard>
  )
}
