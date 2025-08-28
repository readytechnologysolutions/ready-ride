"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Check, FileText, Clock, Edit } from "lucide-react"
import StepIndicator from "@/components/step-indicator"
import Image from "next/image"
import { getParcelData, saveParcelData, calculateParcelPricingSync, calculateEstimatedTime } from "@/utils/parcel-utils"
import { useAppSettings } from "@/contexts/app-settings-context"

export default function SummaryPage() {
  const router = useRouter()
  const { appSettings } = useAppSettings()
  const [orderDetails, setOrderDetails] = useState(() => {
    const parcelData = getParcelData()

    if (!parcelData) {
      return {
        sender: {
          location: "Select pickup location",
          name: "",
          contact: "",
        },
        receiver: {
          location: "Select delivery location",
          name: "",
          contact: "",
        },
        estimatedDeliveryTime: "1-2hrs",
        package: {
          size: "Small",
          type: "box",
          collectTime: "Express",
          specialInstructions: "",
        },
        pricing: {
          packageCharge: 5,
          expressDeliveryCharge: 10,
          deliveryFee: 10,
          total: 25,
        },
        distance: {
          text: "Distance not available",
          duration: "Duration not available",
        },
      }
    }

    // Use pre-calculated data if available, otherwise calculate with current app settings
    const pricing =
      parcelData.deliveryFee && parcelData.totalAmount
        ? {
            basePrice: appSettings?.small_package_price || 5,
            expressCharge: parcelData.collectTime === "express" ? appSettings?.base_fare || 15 : 0,
            deliveryFee: parcelData.deliveryFee,
            totalAmount: parcelData.totalAmount,
          }
        : calculateParcelPricingSync(
            parcelData.collectTime || "express",
            parcelData.packageSize || "small",
            parcelData.distance || 0,
            appSettings,
          )

    const estimatedTime =
      parcelData.estimatedTime ||
      calculateEstimatedTime(parcelData.collectTime || "express", parcelData.duration, parcelData.durationText)

    return {
      sender: {
        location: parcelData.senderLocation || "Select pickup location",
        name: parcelData.senderName || "",
        contact: parcelData.senderContact || "",
      },
      receiver: {
        location: parcelData.receiverLocation || "Select delivery location",
        name: parcelData.receiverName || "",
        contact: parcelData.receiverContact || "",
      },
      estimatedDeliveryTime: estimatedTime,
      package: {
        size:
          (parcelData.packageSize || "small").charAt(0).toUpperCase() + (parcelData.packageSize || "small").slice(1),
        type: parcelData.packageType || "box",
        collectTime:
          (parcelData.collectTime || "express").charAt(0).toUpperCase() +
          (parcelData.collectTime || "express").slice(1),
        specialInstructions: parcelData.specialInstructions || "No special instructions",
      },
      pricing: {
        packageCharge: pricing.basePrice,
        expressDeliveryCharge: pricing.expressCharge,
        deliveryFee: pricing.deliveryFee,
        total: pricing.totalAmount,
      },
      distance: {
        text: parcelData.distanceText || "Distance not available",
        duration: parcelData.durationText || "Duration not available",
      },
    }
  })

  // Initialize data when app settings are available
  useEffect(() => {
    const parcelData = getParcelData()

    if (!parcelData || !appSettings) return

    const pricing = calculateParcelPricingSync(
      parcelData.collectTime || "express",
      parcelData.packageSize || "small",
      parcelData.distance || 0,
      appSettings,
    )

    const estimatedTime = calculateEstimatedTime(
      parcelData.collectTime || "express",
      parcelData.duration,
      parcelData.durationText,
    )

    setOrderDetails({
      sender: {
        location: parcelData.senderLocation || "Select pickup location",
        name: parcelData.senderName || "",
        contact: parcelData.senderContact || "",
      },
      receiver: {
        location: parcelData.receiverLocation || "Select delivery location",
        name: parcelData.receiverName || "",
        contact: parcelData.receiverContact || "",
      },
      estimatedDeliveryTime: estimatedTime,
      package: {
        size:
          (parcelData.packageSize || "small").charAt(0).toUpperCase() + (parcelData.packageSize || "small").slice(1),
        type: parcelData.packageType || "box",
        collectTime:
          (parcelData.collectTime || "express").charAt(0).toUpperCase() +
          (parcelData.collectTime || "express").slice(1),
        specialInstructions: parcelData.specialInstructions || "No special instructions",
      },
      pricing: {
        packageCharge: pricing.basePrice,
        expressDeliveryCharge: pricing.expressCharge,
        deliveryFee: pricing.deliveryFee,
        total: pricing.totalAmount,
      },
      distance: {
        text: parcelData.distanceText || "Distance not available",
        duration: parcelData.durationText || "Duration not available",
      },
    })
  }, [appSettings])

  const steps = [
    {
      id: 1,
      label: "Details",
      icon: <Check size={24} />,
    },
    {
      id: 2,
      label: "Delivery Options",
      icon: <Check size={24} />,
    },
    {
      id: 3,
      label: "Summary",
      icon: <FileText size={24} />,
    },
  ]

  const handleProceedToPayment = () => {
    // Save final order details before proceeding to payment
    const parcelData = getParcelData()
    if (parcelData) {
      saveParcelData({
        ...parcelData,
        totalAmount: orderDetails.pricing.total,
        deliveryFee: orderDetails.pricing.deliveryFee,
      })
    }
    router.push("/parcel/payment")
  }

  const handleEditDetails = (section: string) => {
    if (section === "sender" || section === "receiver") {
      router.push("/parcel")
    } else {
      router.push("/parcel/delivery-options")
    }
  }

  const handleBack = () => {
    router.push("/parcel/delivery-options")
  }

  return (
    <div className="pb-20">
      {/* Header with back button */}
      <div className="flex items-center p-4 bg-white border-b">
        <button onClick={handleBack} className="mr-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">Order Summary</h1>
      </div>

      <StepIndicator currentStep={3} steps={steps} />

      <div className="p-4 space-y-6 bg-gray-100">
        {/* Distance and Duration Info */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-500">Distance:</span>
            <span className="font-medium">{orderDetails.distance.text}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Travel Time:</span>
            <span className="font-medium">{orderDetails.distance.duration}</span>
          </div>
        </div>

        <div>
          <h2 className="text-xl text-gray-500 mb-4">Address details</h2>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center mr-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <h3 className="font-bold">Collect from</h3>
                </div>
                <button onClick={() => handleEditDetails("sender")} className="text-primary">
                  <Edit size={20} />
                </button>
              </div>
              <p className="text-gray-500 ml-8">Sender's details</p>
              <p className="ml-8">{orderDetails.sender.location}</p>
              <p className="ml-8">
                {orderDetails.sender.name} - {orderDetails.sender.contact}
              </p>
            </div>

            <div className="relative mb-6">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-primary"></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center mr-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <h3 className="font-bold">Deliver to</h3>
                </div>
                <button onClick={() => handleEditDetails("receiver")} className="text-primary">
                  <Edit size={20} />
                </button>
              </div>
              <p className="text-gray-500 ml-8">Receiver's details</p>
              <p className="ml-8">{orderDetails.receiver.location}</p>
              <p className="ml-8">
                {orderDetails.receiver.name} - {orderDetails.receiver.contact}
              </p>
            </div>

            <div className="mt-6 bg-yellow-50 p-4 rounded-lg flex items-center">
              <Clock className="text-primary mr-2" size={20} />
              <p className="font-medium">Estimated Delivery Time: {orderDetails.estimatedDeliveryTime}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl text-gray-500 mb-4">Package details</h2>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-500">Size</p>
              <p className="font-bold">{orderDetails.package.size}</p>
            </div>

            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-500">Type</p>
              <div>
                <Image src="/rectangular-cardboard-box.png" alt="Box" width={40} height={40} />
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-500">Collect time</p>
              <p className="font-bold">{orderDetails.package.collectTime}</p>
            </div>

            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-500">Special instructions</p>
              <div className="flex items-center">
                <p className="font-bold mr-2">{orderDetails.package.specialInstructions}</p>
                <button onClick={() => handleEditDetails("package")} className="text-primary">
                  <Edit size={20} />
                </button>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-gray-500">Package charge</p>
                <p className="font-bold">GHC {orderDetails.pricing.packageCharge}</p>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500">Delivery fee</p>
                  <p className="text-xs text-gray-400">{orderDetails.distance.text}</p>
                </div>
                <p className="font-bold">GHC {orderDetails.pricing.deliveryFee}</p>
              </div>

              {orderDetails.pricing.expressDeliveryCharge > 0 && (
                <div className="flex justify-between items-center">
                  <p className="text-gray-500">Express delivery charge</p>
                  <p className="font-bold">GHC {orderDetails.pricing.expressDeliveryCharge}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-between items-center">
        <div>
          <p className="text-gray-500">TOTAL</p>
          <p className="text-2xl font-bold">GHC {orderDetails.pricing.total}</p>
        </div>
        <button
          onClick={handleProceedToPayment}
          className="bg-primary text-white py-4 px-8 rounded-full text-center text-xl font-medium hover:bg-primary/90 transition-colors"
        >
          Proceed to Payment
        </button>
      </div>
    </div>
  )
}
