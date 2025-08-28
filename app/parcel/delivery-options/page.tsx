"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, Package, FileText } from "lucide-react"
import StepIndicator from "@/components/step-indicator"
import Image from "next/image"
import { getParcelData, saveParcelData, calculateParcelPricing } from "@/utils/parcel-utils"

export default function DeliveryOptionsPage() {
  const router = useRouter()

  const [formData, setFormData] = useState(() => {
    const existingData = getParcelData()
    return {
      collectTime: existingData?.collectTime || "express",
      packageType: existingData?.packageType || "box",
      packageSize: existingData?.packageSize || "small",
      specialInstructions: existingData?.specialInstructions || "",
    }
  })

  const searchParams = useSearchParams()
  const pickupLocation = searchParams.get("pickup") || "Unnamed road, Anaji. Takoradi"
  const deliveryLocation = searchParams.get("delivery") || "Hse 3, No. 9 Effiakuma"

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const newData = {
      ...formData,
      [name]: value,
    }
    setFormData(newData)
    saveParcelData(newData)
  }

  const handleSelectOption = (name: string, value: string) => {
    const newData = {
      ...formData,
      [name]: value,
    }
    setFormData(newData)
    saveParcelData(newData)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Calculate pricing
    const pricing = calculateParcelPricing(formData.collectTime, formData.packageSize)

    // Save all data including pricing
    saveParcelData({
      ...formData,
      ...pricing,
    })

    router.push("/parcel/summary")
  }

  const handleBack = () => {
    router.push("/parcel")
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
        <h1 className="text-lg font-semibold">Delivery Options</h1>
      </div>

      <StepIndicator currentStep={2} steps={steps} />

      <form onSubmit={handleSubmit} className="p-4 space-y-6 bg-gray-100">
        <div>
          <h2 className="text-sm text-gray-500 mb-4">Collect time</h2>
          <div className="grid grid-cols-2 gap-4">
            <div
              className={`p-4 rounded-lg text-xs ${
                formData.collectTime === "express"
                  ? "border-2 border-primary bg-white"
                  : "border border-gray-300 bg-white"
              }`}
              onClick={() => handleSelectOption("collectTime", "express")}
            >
              <div className="flex justify-between items-center mb-2 text-xs">
                <h3 className={`font-bold text-lg ${formData.collectTime === "express" ? "text-primary" : ""}`}>
                  Express
                </h3>
                <div
                  className={`w-6 h-6 rounded-full border-2 ${formData.collectTime === "express" ? "border-primary" : "border-gray-300"} flex items-center justify-center`}
                >
                  {formData.collectTime === "express" && <div className="w-3 h-3 bg-primary rounded-full"></div>}
                </div>
              </div>
              <p className="text-gray-500">
                Pick up time: <span className="font-medium">10 - 20mins</span>
              </p>
              <p className="text-gray-500">
                Delivery to receiver: <span className="font-medium">1 to 2hrs</span>
              </p>
            </div>

            <div
              className={`p-4 rounded-lg text-xs ${
                formData.collectTime === "standard"
                  ? "border-2 border-primary bg-white"
                  : "border border-gray-300 bg-white"
              }`}
              onClick={() => handleSelectOption("collectTime", "standard")}
            >
              <div className="flex justify-between items-center mb-2 text-xs">
                <h3 className={`font-bold text-lg ${formData.collectTime === "standard" ? "text-primary" : ""}`}>
                  Standard
                </h3>
                <div
                  className={`w-6 h-6 rounded-full border-2 ${formData.collectTime === "standard" ? "border-primary" : "border-gray-300"} flex items-center justify-center`}
                >
                  {formData.collectTime === "standard" && <div className="w-3 h-3 bg-primary rounded-full"></div>}
                </div>
              </div>
              <p className="text-gray-500">
                Pick up time: <span className="font-medium">30mins - 1hr</span>
              </p>
              <p className="text-gray-500">
                Delivery to receiver: <span className="font-medium">Within 24hrs</span>
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl text-gray-500 mb-4">Choose package type</h2>
          <div className="grid grid-cols-3 gap-4">
            <div
              className={`p-4 rounded-lg ${
                formData.packageType === "cube" ? "border-2 border-primary bg-white" : "border border-gray-300 bg-white"
              }`}
              onClick={() => handleSelectOption("packageType", "cube")}
            >
              <div className="flex justify-center mb-2">
                <Image src="https://getreadyride.com/uploads/images/parcel_type_1.png" alt="Cube Box" width={100} height={100} />
              </div>
              <div className="flex justify-center">
                <div
                  className={`w-6 h-6 rounded-full border-2 ${formData.packageType === "cube" ? "border-primary" : "border-gray-300"} flex items-center justify-center`}
                >
                  {formData.packageType === "cube" && <div className="w-3 h-3 bg-primary rounded-full"></div>}
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg ${
                formData.packageType === "box" ? "border-2 border-primary bg-white" : "border border-gray-300 bg-white"
              }`}
              onClick={() => handleSelectOption("packageType", "box")}
            >
              <div className="flex justify-center mb-2">
                <Image src="https://getreadyride.com/uploads/images/parcel_type_2.png" alt="Box" width={100} height={100} />
              </div>
              <div className="flex justify-center">
                <div
                  className={`w-6 h-6 rounded-full border-2 ${formData.packageType === "box" ? "border-primary" : "border-gray-300"} flex items-center justify-center`}
                >
                  {formData.packageType === "box" && <div className="w-3 h-3 bg-primary rounded-full"></div>}
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg ${
                formData.packageType === "flat" ? "border-2 border-primary bg-white" : "border border-gray-300 bg-white"
              }`}
              onClick={() => handleSelectOption("packageType", "flat")}
            >
              <div className="flex justify-center mb-2">
                <Image src="https://getreadyride.com/uploads/images/parcel_type_3.png" alt="Flat Box" width={100} height={100} />
              </div>
              <div className="flex justify-center">
                <div
                  className={`w-6 h-6 rounded-full border-2 ${formData.packageType === "flat" ? "border-primary" : "border-gray-300"} flex items-center justify-center`}
                >
                  {formData.packageType === "flat" && <div className="w-3 h-3 bg-primary rounded-full"></div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl text-gray-500 mb-4">Choose package Size</h2>
          <div className="grid grid-cols-3 gap-4">
            <div
              className={`p-4 rounded-lg ${
                formData.packageSize === "large"
                  ? "border-2 border-primary bg-white"
                  : "border border-gray-300 bg-white"
              }`}
              onClick={() => handleSelectOption("packageSize", "large")}
            >
              <div className="flex justify-between items-center">
                <h3 className={`font-bold text-xs ${formData.packageSize === "large" ? "text-primary" : ""}`}>Large</h3>
                <div
                  className={`w-6 h-6 rounded-full border-2 ${formData.packageSize === "large" ? "border-primary" : "border-gray-300"} flex items-center justify-center`}
                >
                  {formData.packageSize === "large" && <div className="w-3 h-3 bg-primary rounded-full"></div>}
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg ${
                formData.packageSize === "medium"
                  ? "border-2 border-primary bg-white"
                  : "border border-gray-300 bg-white"
              }`}
              onClick={() => handleSelectOption("packageSize", "medium")}
            >
              <div className="flex justify-between items-center">
                <h3 className={`font-bold text-xs ${formData.packageSize === "medium" ? "text-primary" : ""}`}>
                  Medium
                </h3>
                <div
                  className={`w-6 h-6 rounded-full border-2 ${formData.packageSize === "medium" ? "border-primary" : "border-gray-300"} flex items-center justify-center`}
                >
                  {formData.packageSize === "medium" && <div className="w-3 h-3 bg-primary rounded-full"></div>}
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg ${
                formData.packageSize === "small"
                  ? "border-2 border-primary bg-white"
                  : "border border-gray-300 bg-white"
              }`}
              onClick={() => handleSelectOption("packageSize", "small")}
            >
              <div className="flex justify-between items-center">
                <h3 className={`font-bold text-xs ${formData.packageSize === "small" ? "text-primary" : ""}`}>Small</h3>
                <div
                  className={`w-6 h-6 rounded-full border-2 ${formData.packageSize === "small" ? "border-primary" : "border-gray-300"} flex items-center justify-center`}
                >
                  {formData.packageSize === "small" && <div className="w-3 h-3 bg-primary rounded-full"></div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl text-gray-500 mb-4">Special instructions</h2>
          <textarea
            name="specialInstructions"
            value={formData.specialInstructions}
            onChange={handleChange}
            placeholder=""
            className="w-full p-4 border border-primary rounded-lg min-h-[100px] bg-white"
            maxLength={50}
          ></textarea>
          <div className="text-right text-gray-500">{formData.specialInstructions.length}/50</div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#fffcea]">
          <button
            type="submit"
            className="w-full bg-primary text-white py-4 rounded-full text-center text-xl font-medium"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  )
}
