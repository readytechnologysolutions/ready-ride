"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { addPaymentMethod, fetchAccountName, getPaymentMethods } from "@/lib/firestore-service"

type PaymentType = "MOMO" | null
type BankCode = "MTN" | "ATL" | "VOD" | null

export default function AddPaymentMethodPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo")
  const { user } = useAuth()

  const [showSavedModal, setShowSavedModal] = useState(false)
  const [selectedType, setSelectedType] = useState<PaymentType>(null)
  const [selectedBankCode, setSelectedBankCode] = useState<BankCode>(null)
  const [loading, setLoading] = useState(false)
  const [fetchingName, setFetchingName] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchSuccess, setFetchSuccess] = useState(false)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    accountName: "",
    accountNumber: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    // Reset account name and status when account number changes
    if (name === "accountNumber") {
      setFormData({
        accountName: "",
        accountNumber: value,
      })
      setFetchError(null)
      setFetchSuccess(false)
      setDuplicateError(null)
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  const handleSelectType = (type: PaymentType, bankCode: BankCode) => {
    setSelectedType(type)
    setSelectedBankCode(bankCode)
    setFormData({
      accountName: "",
      accountNumber: "",
    })
    setFetchError(null)
    setFetchSuccess(false)
    setDuplicateError(null)
  }

  // Fetch account name when account number changes
  useEffect(() => {
    const fetchName = async () => {
      if (formData.accountNumber.length >= 10 && selectedBankCode) {
        setFetchingName(true)
        setFetchError(null)
        setFetchSuccess(false)
        setDuplicateError(null)

        try {
          const result = await fetchAccountName(formData.accountNumber, selectedBankCode)

          if (result.success && result.accountName) {
            setFormData((prev) => ({
              ...prev,
              accountName: result.accountName || "",
            }))
            setFetchSuccess(true)
          } else {
            setFetchError(result.error || "Could not fetch account name")
          }
        } catch (error) {
          console.error("Error fetching account name:", error)
          setFetchError("Network error occurred")
        } finally {
          setFetchingName(false)
        }
      } else {
        // Clear states if account number is too short
        setFormData((prev) => ({
          ...prev,
          accountName: "",
        }))
        setFetchError(null)
        setFetchSuccess(false)
      }
    }

    const timeoutId = setTimeout(fetchName, 1000) // Debounce API calls
    return () => clearTimeout(timeoutId)
  }, [formData.accountNumber, selectedBankCode])

  // Check if payment method already exists
  const checkDuplicatePaymentMethod = async (accountNumber: string): Promise<boolean> => {
    if (!user?.uid) return false

    try {
      const existingMethods = await getPaymentMethods(user.uid)
      return existingMethods.some((method) => method.account_number === accountNumber)
    } catch (error) {
      console.error("Error checking for duplicate payment methods:", error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedType || !selectedBankCode || !user?.uid) {
      alert("Please select a payment method type and ensure you're logged in")
      return
    }

    if (!formData.accountName) {
      alert("Account name could not be resolved. Please check the account number.")
      return
    }

    setLoading(true)
    setDuplicateError(null)

    try {
      // Check for duplicate payment method
      const isDuplicate = await checkDuplicatePaymentMethod(formData.accountNumber)

      if (isDuplicate) {
        setDuplicateError("This payment method already exists. Please add a different one.")
        setLoading(false)
        return
      }

      const success = await addPaymentMethod(user.uid, {
        type: selectedType,
        account_name: formData.accountName,
        account_number: formData.accountNumber,
        bank_code: selectedBankCode,
        default: 0, // New payment methods are not default by default
      })

      if (success) {
        setShowSavedModal(true)
      } else {
        alert("Failed to save payment method. Please try again.")
      }
    } catch (error) {
      console.error("Error saving payment method:", error)
      alert("Failed to save payment method. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSavedClose = () => {
    setShowSavedModal(false)

    // Navigate back to the payment page if that's where we came from
    if (returnTo === "payment") {
      router.push("/payment")
    } else {
      router.push("/profile/payment-methods")
    }
  }

  const getPaymentMethodName = (bankCode: BankCode) => {
    switch (bankCode) {
      case "MTN":
        return "MTN Mobile Money"
      case "ATL":
        return "AT Money"
      case "VOD":
        return "Telecel Cash"
      default:
        return "Select a payment method"
    }
  }

  const getPaymentMethodIcon = (bankCode: BankCode) => {
    switch (bankCode) {
      case "MTN":
        return "https://getreadyride.com/uploads/images/mtn.png"
      case "ATL":
        return "https://getreadyride.com/uploads/images/at.jpg"
      case "VOD":
        return "https://getreadyride.com/uploads/images/telecel.png"
      default:
        return "https://getreadyride.com/uploads/images/mtn.png"
    }
  }

  return (
    <div className="min-h-screen bg-[#fffbeb]">
      {/* Header */}
      <div className="p-4 flex items-center bg-white">
        <button onClick={() => router.back()} className="mr-4" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">New Payment Method</h1>
      </div>

      <div className="p-4">
        {/* Payment Method Type Selection */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3">Select Payment Method</h2>
          <div className="space-y-3">
            <div
              className={`flex items-center p-3 border rounded-lg cursor-pointer ${selectedBankCode === "MTN" ? "border-primary" : "border-gray-300"}`}
              onClick={() => handleSelectType("MOMO", "MTN")}
            >
              <Image
                src="https://getreadyride.com/uploads/images/mtn.png"
                alt="MTN Mobile Money"
                width={40}
                height={40}
                className="mr-3"
              />
              <span className="font-medium">MTN Mobile Money</span>
            </div>

            <div
              className={`flex items-center p-3 border rounded-lg cursor-pointer ${selectedBankCode === "ATL" ? "border-primary" : "border-gray-300"}`}
              onClick={() => handleSelectType("MOMO", "ATL")}
            >
              <Image
                src="https://getreadyride.com/uploads/images/at.jpg"
                alt="AT Money"
                width={40}
                height={40}
                className="mr-3"
              />
              <span className="font-medium">AT Money</span>
            </div>

            <div
              className={`flex items-center p-3 border rounded-lg cursor-pointer ${selectedBankCode === "VOD" ? "border-primary" : "border-gray-300"}`}
              onClick={() => handleSelectType("MOMO", "VOD")}
            >
              <Image
                src="https://getreadyride.com/uploads/images/telecel.png"
                alt="Telecel Cash"
                width={40}
                height={40}
                className="mr-3"
              />
              <span className="font-medium">Telecel Cash</span>
            </div>
          </div>
        </div>

        {/* Payment Method Preview */}
        {selectedType && selectedBankCode && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6 text-white">
            <div className="flex items-center mb-4">
              <Image
                src={getPaymentMethodIcon(selectedBankCode) || "/placeholder.svg"}
                alt={getPaymentMethodName(selectedBankCode)}
                width={40}
                height={40}
                className="mr-3"
              />
              <h3 className="text-lg font-bold">{getPaymentMethodName(selectedBankCode)}</h3>
            </div>
            <div className="text-gray-300 text-sm mb-2">Account Name</div>
            <div className="font-medium mb-4 flex items-center">
              {fetchingName ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>Fetching account name...</span>
                </div>
              ) : fetchSuccess ? (
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  <span>{formData.accountName}</span>
                </div>
              ) : fetchError ? (
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
                  <span className="text-red-400">Account not found</span>
                </div>
              ) : (
                "XXXX XXXX XXXX"
              )}
            </div>
            <div className="text-gray-300 text-sm mb-2">Phone Number</div>
            <div className="font-medium">{formData.accountNumber || "XXXX XXX XXXX"}</div>
          </div>
        )}

        {/* Duplicate Error Message */}
        {duplicateError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
            <div className="flex items-center text-red-700">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p>{duplicateError}</p>
            </div>
          </div>
        )}

        {/* Payment Method Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="accountNumber" className="block text-gray-500 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              id="accountNumber"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              placeholder="024 XXX XXXX"
              className="w-full p-3 border border-gray-300 rounded-lg"
              required
              disabled={loading}
            />
            {formData.accountNumber.length > 0 && formData.accountNumber.length < 10 && (
              <p className="text-sm text-gray-500 mt-1">Enter at least 10 digits</p>
            )}
          </div>

          <div>
            <label htmlFor="accountName" className="block text-gray-500 mb-1">
              Account Name (Auto-filled)
            </label>
            <div className="relative">
              <input
                type="text"
                id="accountName"
                name="accountName"
                value={formData.accountName}
                placeholder="Account name will be fetched automatically"
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                readOnly
              />
              {fetchingName && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
            </div>

            {fetchingName && (
              <div className="flex items-center mt-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary mr-2" />
                <p className="text-sm text-primary">Fetching account name from Paystack...</p>
              </div>
            )}

            {fetchSuccess && (
              <div className="flex items-center mt-2">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <p className="text-sm text-green-600">Account name verified successfully</p>
              </div>
            )}

            {fetchError && (
              <div className="flex items-center mt-2">
                <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                <p className="text-sm text-red-600">{fetchError}</p>
              </div>
            )}
          </div>

          <div className="pt-6">
            <button
              type="submit"
              className="w-full bg-primary text-white py-4 rounded-full text-center text-xl font-medium disabled:opacity-50 flex items-center justify-center"
              disabled={loading || !selectedType || !formData.accountName || fetchingName}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Saved Confirmation Modal */}
      {showSavedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[80%] max-w-sm overflow-hidden">
            <div className="flex flex-col items-center p-6">
              <div className="w-16 h-16 rounded-full bg-primary bg-opacity-20 flex items-center justify-center mb-4">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffa500"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-primary mb-6">Saved</h2>
            </div>

            <div className="border-t border-gray-200">
              <button onClick={handleSavedClose} className="w-full p-4 text-gray-500 font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
