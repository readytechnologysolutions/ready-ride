"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getPaymentMethods, updatePaymentMethodDefault, type PaymentMethod } from "@/lib/firestore-service"

export default function PaymentMethodsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null)
  const [showSavedModal, setShowSavedModal] = useState(false)
  const [updatingDefault, setUpdatingDefault] = useState(false)

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      if (user?.uid) {
        try {
          const methods = await getPaymentMethods(user.uid)
          setPaymentMethods(methods)

          // Set default payment method as selected
          const defaultMethod = methods.find((method) => method.default === 1)
          if (defaultMethod) {
            setSelectedMethodId(defaultMethod.id)
          }
        } catch (error) {
          console.error("Error fetching payment methods:", error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchPaymentMethods()
  }, [user])

  const handleAddPayment = () => {
    router.push("/profile/payment-methods/add")
  }

  const handleSelectPaymentMethod = async (id: string) => {
    if (id === selectedMethodId || updatingDefault) return

    setUpdatingDefault(true)

    try {
      // Update the previously selected method to not be default
      if (selectedMethodId) {
        await updatePaymentMethodDefault(user!.uid, selectedMethodId, false)
      }

      // Update the newly selected method to be default
      await updatePaymentMethodDefault(user!.uid, id, true)

      // Update local state
      setSelectedMethodId(id)

      // Update the payment methods in state
      setPaymentMethods((prev) =>
        prev.map((method) => ({
          ...method,
          default: method.id === id ? 1 : 0,
        })),
      )

      // Show success modal
      setShowSavedModal(true)
    } catch (error) {
      console.error("Error updating default payment method:", error)
    } finally {
      setUpdatingDefault(false)
    }
  }

  const handleSavedClose = () => {
    setShowSavedModal(false)
  }

  const getPaymentMethodIcon = (type: string, bankCode: string) => {
    if (type === "MOMO") {
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
    return "https://getreadyride.com/uploads/images/mtn.png"
  }

  const getPaymentMethodName = (type: string, bankCode: string) => {
    if (type === "MOMO") {
      switch (bankCode) {
        case "MTN":
          return "MTN Mobile Money"
        case "ATL":
          return "AT Money"
        case "VOD":
          return "Telecel Cash"
        default:
          return "Mobile Money"
      }
    }
    return "Mobile Money"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffbeb] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading payment methods...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fffbeb]">
      {/* Header */}
      <div className="p-4 flex items-center bg-white">
        <button onClick={() => router.push("/profile")} className="mr-4" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Payment Methods</h1>
      </div>

      {paymentMethods.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center px-6 py-12">
          <div className="mb-6 w-64 h-64">
            <Image src="/payment-illustration.png" alt="Payment" width={256} height={256} />
          </div>
          <h2 className="text-xl text-gray-500 text-center mb-8">
            You have no Payment Methods Kindly add one to help in making payments
          </h2>
          <button
            onClick={handleAddPayment}
            className="w-full bg-primary text-white py-4 px-6 rounded-full text-center text-xl font-medium"
          >
            Add Payment
          </button>
        </div>
      ) : (
        // Payment Methods List
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">My payment methods</h2>

          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`bg-white rounded-lg p-4 flex items-center justify-between cursor-pointer ${updatingDefault ? "opacity-70" : ""}`}
                onClick={() => handleSelectPaymentMethod(method.id)}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 mr-4">
                    <Image
                      src={getPaymentMethodIcon(method.type, method.bank_code)}
                      alt={getPaymentMethodName(method.type, method.bank_code)}
                      width={48}
                      height={48}
                      className="rounded-md"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold">{getPaymentMethodName(method.type, method.bank_code)}</h3>
                    <p className="text-gray-500 text-sm">{method.account_number}</p>
                    <p className="text-gray-400 text-xs">{method.account_name}</p>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 ${
                    selectedMethodId === method.id ? "border-primary bg-primary" : "border-primary"
                  }`}
                >
                  {selectedMethodId === method.id && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="my-8 flex items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="mx-4 text-gray-500">You can always add another payment method</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <button
            onClick={handleAddPayment}
            className="w-full bg-primary text-white py-4 px-6 rounded-full text-center text-xl font-medium"
          >
            Add Payment
          </button>
        </div>
      )}

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
              <h2 className="text-2xl font-bold text-primary mb-6">Default Payment Updated</h2>
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
