"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Check, Loader2, X } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useAppSettings } from "@/contexts/app-settings-context"
import {
  getPaymentMethods,
  createDeliveryOrder,
  updateDeliveryOrderPayment,
  getUserProfile,
} from "@/lib/firestore-service"
import { getParcelData, clearParcelData } from "@/utils/parcel-utils"
import { SendMail, SendSMS } from "@/utils/messaging"

interface PaymentMethodData {
  id: string
  type: string
  account_name: string
  default: number
  account_number: string
  bank_code: string
}

export default function ParcelPaymentPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { settings } = useAppSettings()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showOtpDialog, setShowOtpDialog] = useState(false)
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [otp, setOtp] = useState("")
  const [currentReference, setCurrentReference] = useState("")
  const [orderId, setOrderId] = useState("")
  const [trackingId, setTrackingId] = useState("")
  const [parcelData, setParcelData] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [totalAmount, setTotalAmount] = useState(0)
  const [specialInstructions, setSpecialInstructions] = useState("")

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Check if we have parcel data
      const existingParcelData = getParcelData()
      if (!existingParcelData) {
        console.error("No parcel data found")
        router.push("/parcel")
        return
      }

      console.log("📦 Loading parcel data:", existingParcelData)
      setParcelData(existingParcelData)
      setTotalAmount(existingParcelData.totalAmount || 0)
      setSpecialInstructions(existingParcelData.specialInstructions || "")

      // Load payment methods
      const methods = await getPaymentMethods(user.uid)

      // Add cash option
      const cashOption = {
        id: "cash",
        type: "CASH",
        account_name: "Cash on Delivery",
        default: methods.length === 0 ? 1 : 0,
        account_number: "CASH",
        bank_code: "CASH",
      }

      const allMethods = [cashOption, ...methods]
      setPaymentMethods(allMethods)

      // Set default payment method
      const defaultMethod = allMethods.find((m) => m.default === 1) || allMethods[0]
      setSelectedPaymentMethod(defaultMethod)

      // Load user profile
      const profile = await getUserProfile(user.uid)
      setUserProfile(profile)
    } catch (error) {
      console.error("Error loading parcel payment data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPayment = (method: PaymentMethodData) => {
    setSelectedPaymentMethod(method)
  }

  const handleAddPayment = () => {
    router.push("/profile/payment-methods/add?returnTo=/parcel/payment")
  }

  const generateTrackingId = () => {
    return "PD" + Math.floor(100000 + Math.random() * 900000)
  }

  const getPackageTypeNumber = (packageType: string): number => {
    switch (packageType) {
      case "cube":
        return 1
      case "box":
        return 2
      case "flat":
        return 3
      default:
        return 2
    }
  }

  const sendParcelNotifications = async (orderData: any, trackingId: string) => {
    if (!settings || !userProfile) return

    try {
      // Email notification
      if (settings.support_email) {
        const emailSubject = `New Parcel Received - ${trackingId}`
        const emailBody = `
          <h2>New Parcel Notification</h2>
          <p><strong>Parcel ID:</strong> ${trackingId}</p>
          <p><strong>Customer:</strong> ${userProfile.display_name}</p>
          <p><strong>Customer Phone:</strong> ${userProfile.phone_number}</p>
          <p><strong>Customer Email:</strong> ${userProfile.email}</p>
          <p><strong>Total Amount:</strong> GH₵ ${totalAmount.toFixed(2)}</p>
          <p><strong>Delivery Fee:</strong> GH₵ ${(parcelData?.deliveryFee || 0).toFixed(2)}</p>
          <p><strong>Payment Method:</strong> ${selectedPaymentMethod?.type === "CASH" ? "Cash on Delivery" : "Mobile Money"}</p>
          <p><strong>Parcel Date:</strong> ${orderData.created_date}</p>
          
          <h3>Parcel Details:</h3>
          <p><strong>Package Size:</strong> ${parcelData?.packageSize}</p>
          <p><strong>Package Type:</strong> ${parcelData?.packageType}</p>
          <p><strong>Collect Time:</strong> ${parcelData?.collectTime}</p>
          <p><strong>From:</strong> ${parcelData?.senderLocation}</p>
          <p><strong>To:</strong> ${parcelData?.receiverLocation}</p>
          <p><strong>Sender:</strong> ${parcelData?.senderName} (${parcelData?.senderContact})</p>
          <p><strong>Receiver:</strong> ${parcelData?.receiverName} (${parcelData?.receiverContact})</p>
          ${specialInstructions ? `<p><strong>Special Instructions:</strong> ${specialInstructions}</p>` : ""}
          
          <p>Please process this parcel as soon as possible.</p>
        `

        const emailResult = await SendMail({
          from: settings.support_email,
          to: settings.support_email,
          subject: emailSubject,
          text: `New parcel received: ${trackingId}. Customer: ${userProfile.display_name}. Total: GH₵ ${totalAmount.toFixed(2)}`,
          html: emailBody,
        })

        console.log("Email notification result:", emailResult)
      }

      // SMS notification
      if (settings.support_contact) {
        const smsMessage = `New Parcel Alert! 
Parcel ID: ${trackingId}
Customer: ${userProfile.display_name}
Phone: ${userProfile.phone_number}
From: ${parcelData?.senderLocation}
To: ${parcelData?.receiverLocation}
Total: GH₵ ${totalAmount.toFixed(2)}
Payment: ${selectedPaymentMethod?.type === "CASH" ? "Cash" : "Mobile Money"}
Please process immediately.`

        const smsResult = await SendSMS(settings.support_contact, smsMessage)
        console.log("SMS notification result:", smsResult)
      }
    } catch (error) {
      console.error("Error sending parcel notifications:", error)
    }
  }

  const createParcelOrderData = async () => {
    const generatedTrackingId = generateTrackingId()
    setTrackingId(generatedTrackingId)

    const now = new Date()
    const createdDate =
      now.toLocaleDateString("en-GB") +
      " " +
      now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })

    return {
      tracking_id: generatedTrackingId,
      total_amount: totalAmount,
      created_date: createdDate,
      order_type: "Parcel",
      map_data: {
        distance: parcelData?.distance || 0,
        seconds: parcelData?.duration || 0,
        poly_lines: parcelData?.polyLines || "",
        duration: parcelData?.durationText || "Unknown",
        distance_text: parcelData?.distanceText || "Unknown",
      },
      package_size: parcelData?.packageSize?.charAt(0).toUpperCase() + parcelData?.packageSize?.slice(1) || "Small",
      package_type: getPackageTypeNumber(parcelData?.packageType || "box"),
      sender: {
        name: parcelData?.senderName || "",
        contact: parcelData?.senderContact || "",
        lat: parcelData?.senderLat || 0,
        lon: parcelData?.senderLon || 0,
        location: parcelData?.senderLocation || "",
      },
      receiver: {
        name: parcelData?.receiverName || "",
        contact: parcelData?.receiverContact || "",
        lat: parcelData?.receiverLat || 0,
        lon: parcelData?.receiverLon || 0,
        location: parcelData?.receiverLocation || "",
      },
      special_instructions: specialInstructions,
      payment_method: {
        account: selectedPaymentMethod?.type === "CASH" ? "CASH" : selectedPaymentMethod?.account_number || "",
      },
      paid: false,
      station:
        parcelData?.fromBusStation === "yes"
          ? {
              name: parcelData?.stationName || "",
              receipt: parcelData?.receiptUrl || "",
              driver_contact: parcelData?.driverContact || "",
              plate_number: parcelData?.plateNumber || "",
            }
          : null,
      uid: user?.uid || "",
      status: "Pending",
      delivery_fee: parcelData?.deliveryFee || 0,
      collect_time: parcelData?.collectTime?.charAt(0).toUpperCase() + parcelData?.collectTime?.slice(1) || "Standard",
      shown: false,
    }
  }

  const handleConfirm = async () => {
    if (!selectedPaymentMethod || !user) return

    try {
      setProcessing(true)

      // Create parcel order first
      const orderData = await createParcelOrderData()
      const newOrderId = await createDeliveryOrder(orderData)

      if (!newOrderId) {
        throw new Error("Failed to create parcel order")
      }

      setOrderId(newOrderId)

      // Send notifications to support team
      await sendParcelNotifications(orderData, orderData.tracking_id)

      // If cash payment, skip Paystack
      if (selectedPaymentMethod.type === "CASH") {
        setShowConfirmation(true)
        clearParcelData()
        return
      }

      // Initiate Paystack charge
      const chargeResponse = await fetch("/api/paystack/charge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: totalAmount,
          phone: selectedPaymentMethod.account_number,
          bank_code: selectedPaymentMethod.bank_code,
        }),
      })

      const chargeData = await chargeResponse.json()
      console.log("Charge response:", chargeData)

      if (chargeData.status && chargeData.data) {
        setCurrentReference(chargeData.data.reference)

        if (chargeData.data.status === "send_otp") {
          setShowOtpDialog(true)
        } else if (chargeData.data.status === "success" || chargeData.data.status === "pay_offline") {
          setShowVerificationDialog(true)
        }
      } else {
        throw new Error(chargeData.message || "Payment initiation failed")
      }
    } catch (error) {
      console.error("Payment error:", error)
      alert("Payment failed. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  const handleOtpSubmit = async () => {
    if (!otp || !currentReference) return

    try {
      setProcessing(true)
      setShowOtpDialog(false)
      setShowVerificationDialog(true)

      const otpResponse = await fetch("/api/paystack/submit-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          otp,
          reference: currentReference,
        }),
      })

      const otpData = await otpResponse.json()
      console.log("OTP response:", otpData)

      // Don't automatically verify - let user click the verify button
      setProcessing(false)
    } catch (error) {
      console.error("OTP submission error:", error)
      alert("OTP verification failed. Please try again.")
      setShowVerificationDialog(false)
      setProcessing(false)
    }
  }

  const verifyTransaction = async (reference: string, orderIdToUpdate: string) => {
    try {
      setProcessing(true)

      const verifyResponse = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference,
        }),
      })

      const verifyData = await verifyResponse.json()
      console.log("Verify response:", verifyData)

      if (verifyData.status && verifyData.data && verifyData.data.status === "success") {
        // Update order as paid
        await updateDeliveryOrderPayment(orderIdToUpdate, true)
        setShowVerificationDialog(false)
        setShowConfirmation(true)
        clearParcelData()
      } else {
        throw new Error("Transaction verification failed")
      }
    } catch (error) {
      console.error("Verification error:", error)
      alert("Transaction verification failed. Please contact support.")
    } finally {
      setProcessing(false)
    }
  }

  const handleTrack = () => {
    setShowConfirmation(false)
    router.push(`/track/parcel/${orderId}`)
  }

  const handleCancel = () => {
    setShowConfirmation(false)
    router.push("/home")
  }

  const getPaymentMethodIcon = (bankCode: string) => {
    switch (bankCode) {
      case "MTN":
        return "https://getreadyride.com/uploads/images/mtn.png"
      case "ATL":
        return "https://getreadyride.com/uploads/images/at.jpg"
      case "VOD":
        return "https://getreadyride.com/uploads/images/telecel.png"
      case "CASH":
        return "https://getreadyride.com/uploads/images/cash.png"
      default:
        return "https://getreadyride.com/uploads/images/mtn.png"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffbeb] flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fffbeb]">
      {/* Header */}
      <div className="p-4 flex items-center bg-white">
        <button onClick={() => router.back()} className="mr-4" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Payment Options</h1>
      </div>

      <div className="p-4 space-y-6">
        <h2 className="text-gray-500 text-lg">Select payment options</h2>

        {/* Payment Methods */}
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`radio-card ${selectedPaymentMethod?.id === method.id ? "selected" : ""}`}
              onClick={() => handleSelectPayment(method)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 mr-3 flex items-center justify-center">
                    <Image
                      src={getPaymentMethodIcon(method.bank_code) || "/placeholder.svg"}
                      alt={method.type}
                      width={32}
                      height={32}
                      className="rounded-md"
                    />
                  </div>
                  <div>
                    <span
                      className={`${selectedPaymentMethod?.id === method.id ? "text-primary font-medium" : "text-gray-500"}`}
                    >
                      {method.type === "CASH" ? "Cash on delivery" : method.account_name}
                    </span>
                    {method.type !== "CASH" && <p className="text-sm text-gray-400">{method.account_number}</p>}
                  </div>
                </div>
                <div className="custom-radio">
                  <input
                    type="radio"
                    checked={selectedPaymentMethod?.id === method.id}
                    onChange={() => handleSelectPayment(method)}
                    className="custom-radio-input"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Payment Method */}
          <div className="bg-white rounded-lg p-4 flex items-center justify-between" onClick={handleAddPayment}>
            <div className="flex items-center">
              <div className="w-8 h-8 mr-3 flex items-center justify-center">
                <div className="flex">
                  <Image src="https://getreadyride.com/uploads/images/telecel.png" alt="Telecel" width={24} height={24} className="mr-1" />
                  <span className="mx-1 text-gray-400">/</span>
                  <Image src="https://getreadyride.com/uploads/images/at.jpg" alt="AT" width={24} height={24} className="ml-1" />
                </div>
              </div>
            </div>
              <span className="text-gray-500">Add mobile money</span>
            <ChevronRight className="text-gray-400" size={20} />
          </div>
        </div>

        {/* Special Instructions */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-bold mb-2">Special Instructions (Optional)</h3>
          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any special instructions for your parcel..."
            className="w-full p-3 border rounded-lg resize-none"
            rows={3}
          />
        </div>

        {/* Parcel Summary */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-bold mb-2">Parcel Summary</h3>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Package Size:</span>
              <span className="font-medium">{parcelData?.packageSize}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Package Type:</span>
              <span className="font-medium">{parcelData?.packageType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Collect Time:</span>
              <span className="font-medium">{parcelData?.collectTime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>From:</span>
              <span className="font-medium text-right max-w-[60%]">{parcelData?.senderLocation}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>To:</span>
              <span className="font-medium text-right max-w-[60%]">{parcelData?.receiverLocation}</span>
            </div>
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Base Price:</span>
                <span>GH₵ {(parcelData?.basePrice || 0).toFixed(2)}</span>
              </div>
              {parcelData?.expressCharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Express Charge:</span>
                  <span>GH₵ {parcelData?.expressCharge.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Delivery Fee:</span>
                <span>GH₵ {(parcelData?.deliveryFee || 0).toFixed(2)}</span>
              </div>
              {parcelData?.distanceText && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Distance:</span>
                  <span>{parcelData?.distanceText}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total:</span>
                <span>GH₵ {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <button
          onClick={handleConfirm}
          disabled={processing || !selectedPaymentMethod}
          className="w-full bg-primary text-white py-4 rounded-full text-center text-xl font-medium disabled:opacity-50 flex items-center justify-center"
        >
          {processing ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
          {processing ? "Processing..." : "Confirm Payment"}
        </button>
      </div>

      {/* OTP Dialog */}
      {showOtpDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[90%] max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Enter OTP</h2>
              <button onClick={() => setShowOtpDialog(false)}>
                <X size={24} />
              </button>
            </div>
            <p className="text-gray-600 mb-4">Please enter the OTP sent to your mobile money number</p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              className="w-full p-3 border rounded-lg mb-4"
              maxLength={6}
            />
            <button
              onClick={handleOtpSubmit}
              disabled={!otp || processing}
              className="w-full bg-primary text-white py-3 rounded-lg disabled:opacity-50"
            >
              {processing ? "Verifying..." : "Submit OTP"}
            </button>
          </div>
        </div>
      )}

      {/* Verification Dialog */}
      {showVerificationDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[90%] max-w-md p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">Verify Transaction</h2>
              <p className="text-gray-600">
                After completing the payment on your mobile device, click the verify button below to confirm your
                transaction.
              </p>
            </div>

            {processing ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="animate-spin mb-4" size={40} />
                <p>Verifying your payment...</p>
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => verifyTransaction(currentReference, orderId)}
                  className="w-full bg-primary text-white py-3 rounded-lg font-medium"
                >
                  Verify Payment
                </button>
                <button
                  onClick={() => setShowVerificationDialog(false)}
                  className="w-full border border-gray-300 py-3 rounded-lg text-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Parcel Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[90%] max-w-md overflow-hidden animate-fade-in-up">
            <div className="flex flex-col items-center p-6">
              <div className="bg-primary/20 rounded-full p-8 mb-6">
                <Check size={48} className="text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-primary mb-4">Parcel Confirmed</h2>
              <p className="text-center text-lg mb-2">
                Parcel placed with <span className="font-bold">ID #{trackingId}</span>
              </p>
              <p className="text-center text-gray-500 mb-8">Track your delivery in real-time now.</p>
            </div>

            <div className="border-t border-gray-200 flex">
              <button onClick={handleCancel} className="flex-1 py-4 text-gray-500 font-medium border-r border-gray-200">
                Close
              </button>
              <button onClick={handleTrack} className="flex-1 py-4 text-primary font-medium">
                Track Parcel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
