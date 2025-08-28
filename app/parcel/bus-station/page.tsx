"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Check, Package, FileText, Upload, X } from "lucide-react"
import StepIndicator from "@/components/step-indicator"
import Image from "next/image"
import { getParcelData, saveParcelData } from "@/utils/parcel-utils"

export default function BusStationPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState(() => {
    const existingData = getParcelData()
    return {
      stationName: existingData?.stationName || "",
      vehicleNumber: existingData?.vehicleNumber || "",
      driverContact: existingData?.driverContact || "",
      receipt: existingData?.receipt || null,
    }
  })

  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const newData = {
      ...formData,
      [name]: value,
    }
    setFormData(newData)
    saveParcelData(newData)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const newData = {
        ...formData,
        receipt: file,
      }
      setFormData(newData)
      saveParcelData(newData)

      // Create preview for image files
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setReceiptPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setReceiptPreview(null)
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveFile = () => {
    const newData = {
      ...formData,
      receipt: null,
    }
    setFormData(newData)
    saveParcelData(newData)
    setReceiptPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveParcelData(formData)
    router.push("/parcel/delivery-options")
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
        <h1 className="text-lg font-semibold">Bus Station Details</h1>
      </div>

      <StepIndicator currentStep={1} steps={steps} />

      <form onSubmit={handleSubmit} className="p-4 space-y-6 bg-gray-100">
        <div>
          <label htmlFor="stationName" className="block text-gray-500 mb-2">
            Station name
          </label>
          <input
            type="text"
            id="stationName"
            name="stationName"
            value={formData.stationName}
            onChange={handleChange}
            placeholder="Pro-Toa, Tarkwa station"
            className="w-full p-4 border border-gray-300 rounded-lg bg-white"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="vehicleNumber" className="block text-gray-500 mb-2">
              Vehicle number
            </label>
            <input
              type="text"
              id="vehicleNumber"
              name="vehicleNumber"
              value={formData.vehicleNumber}
              onChange={handleChange}
              placeholder="GT-XXXX-XX"
              className="w-full p-4 border border-gray-300 rounded-lg bg-white"
              required
            />
          </div>
          <div>
            <label htmlFor="driverContact" className="block text-gray-500 mb-2">
              Driver contact
            </label>
            <input
              type="tel"
              id="driverContact"
              name="driverContact"
              value={formData.driverContact}
              onChange={handleChange}
              placeholder="054 XXX XXXX"
              className="w-full p-4 border border-gray-300 rounded-lg bg-white"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-500 mb-2">Receipt</label>
          {formData.receipt ? (
            <div className="bg-white rounded-lg p-4 border border-gray-300">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Upload className="text-green-500 mr-2" size={20} />
                  <span className="text-sm font-medium">{formData.receipt.name}</span>
                </div>
                <button type="button" onClick={handleRemoveFile} className="text-red-500 hover:text-red-700">
                  <X size={20} />
                </button>
              </div>
              {receiptPreview && (
                <div className="mt-2">
                  <Image
                    src={receiptPreview || "/placeholder.svg"}
                    alt="Receipt preview"
                    width={200}
                    height={150}
                    className="rounded border object-cover"
                  />
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Size: {(formData.receipt.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div
              onClick={handleUploadClick}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center bg-white cursor-pointer hover:border-primary transition-colors"
            >
              <div className="mb-4 text-primary">
                <Upload size={60} />
              </div>
              <p className="text-gray-500 text-center mb-1">Upload Receipt</p>
              <p className="text-gray-400 text-sm text-center">(png/jpeg/pdf formats)</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            id="receipt"
            name="receipt"
            onChange={handleFileChange}
            accept=".png,.jpg,.jpeg,.pdf"
            className="hidden"
          />
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
