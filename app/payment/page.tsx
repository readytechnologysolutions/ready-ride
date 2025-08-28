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
  getUserPromos,
} from "@/lib/firestore-service"
import {
  getCartItems,
  clearCart,
  calculateDeliveryFee,
  groupCartByEatery,
  calculateMapData,
  applyPromoToDeliveryFee,
} from "@/utils/cart-utils"
import { SendMail, SendSMS } from "@/utils/messaging"

interface PaymentMethodData {
  id: string
  type: string
  account_name: string
  default: number
  account_number: string
  bank_code: string
}

export default function PaymentOptionsPage() {
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
  const [cartItems, setCartItems] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [deliveryInfo, setDeliveryInfo] = useState<{
    deliveryFee: number
    totalDistance: number
    exceedsMaxDistance: boolean
    maxDistance: number
  }>({
    deliveryFee: 0,
    totalDistance: 0,
    exceedsMaxDistance: false,
    maxDistance: 30000,
  })
  const [totalAmount, setTotalAmount] = useState(0)
  const [eateryGroups, setEateryGroups] = useState<any[]>([])
  const [mapData, setMapData] = useState<any>(null)
  const [specialInstructions, setSpecialInstructions] = useState("")

  const [appliedPromo, setAppliedPromo] = useState<any>(null)
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [subtotalBeforePromo, setSubtotalBeforePromo] = useState(0)
  const [originalDeliveryFee, setOriginalDeliveryFee] = useState(0)

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return

    try {
      setLoading(true)

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

      // Load cart items
      const items = getCartItems()
      setCartItems(items)

      // Load user profile
      const profile = await getUserProfile(user.uid)
      setUserProfile(profile)

      // Group cart items by eatery
      const groups = await groupCartByEatery()
      setEateryGroups(groups)

      // Calculate delivery fee and total
      if (items.length > 0 && profile && settings) {
        const deliveryCalculation = await calculateDeliveryFee(
          groups,
          profile.address,
          settings.base_fare || 10,
          settings.distance_rate || 2,
          settings.max_distance || 50000,
        )

        setDeliveryInfo(deliveryCalculation)
        setOriginalDeliveryFee(deliveryCalculation.deliveryFee)

        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
        setSubtotalBeforePromo(subtotal)

        // Check and apply user promos to delivery fee
        try {
          const userPromos = await getUserPromos(user.uid)
          let bestPromo = null
          let bestDiscount = 0
          let finalDeliveryFee = deliveryCalculation.deliveryFee

          // Find the best applicable promo for delivery fee
          for (const promo of userPromos) {
            const promoResult = applyPromoToDeliveryFee(deliveryCalculation.deliveryFee, promo)
            if (promoResult.canApply && promoResult.discountAmount > bestDiscount) {
              bestPromo = promo
              bestDiscount = promoResult.discountAmount
              finalDeliveryFee = promoResult.finalDeliveryFee
            }
          }

          if (bestPromo && bestDiscount > 0) {
            setAppliedPromo(bestPromo)
            setPromoDiscount(bestDiscount)
            setDeliveryInfo((prev) => ({ ...prev, deliveryFee: finalDeliveryFee }))
            setTotalAmount(subtotal + finalDeliveryFee)
          } else {
            setAppliedPromo(null)
            setPromoDiscount(0)
            setTotalAmount(subtotal + deliveryCalculation.deliveryFee)
          }
        } catch (error) {
          console.error("Error applying promos:", error)
          setTotalAmount(subtotal + deliveryCalculation.deliveryFee)
        }

        // Calculate map data
        const mapInfo = await calculateMapData(items, profile.address)
        setMapData(mapInfo)
      }
    } catch (error) {
      console.error("Error loading payment data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPayment = (method: PaymentMethodData) => {
    setSelectedPaymentMethod(method)
  }

  const handleAddPayment = () => {
    router.push("/profile/payment-methods/add?returnTo=payment")
  }

  const generateTrackingId = () => {
    return "OD" + Math.floor(Math.random() * 100000)
  }

  const sendOrderNotifications = async (orderData: any, trackingId: string) => {
    if (!settings || !userProfile) return

    try {
      // Prepare order summary for notifications
      const restaurantNames = eateryGroups.map((group) => group.eatery_name).join(", ")
      const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

      // Email notification to support
      if (settings.support_email) {
        const emailSubject = `New Order Received - ${trackingId}`
        const emailBody = `
          <h2>New Order Notification</h2>
          <p><strong>Order ID:</strong> ${trackingId}</p>
          <p><strong>Customer:</strong> ${userProfile.display_name}</p>
          <p><strong>Customer Phone:</strong> ${userProfile.phone_number}</p>
          <p><strong>Customer Email:</strong> ${userProfile.email}</p>
          <p><strong>Delivery Address:</strong> ${userProfile.address?.address || "Not specified"}</p>
          <p><strong>Restaurants:</strong> ${restaurantNames}</p>
          <p><strong>Total Items:</strong> ${itemCount}</p>
          <p><strong>Total Amount:</strong> GH₵ ${totalAmount.toFixed(2)}</p>
          <p><strong>Delivery Fee:</strong> GH₵ ${deliveryInfo.deliveryFee.toFixed(2)}</p>
          <p><strong>Payment Method:</strong> ${selectedPaymentMethod?.type === "CASH" ? "Cash on Delivery" : "Mobile Money"}</p>
          <p><strong>Order Date:</strong> ${orderData.created_date}</p>
          
          <h3>Order Details:</h3>
          ${eateryGroups
            .map(
              (group) => `
            <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 10px;">
              <h4>${group.eatery_name}</h4>
              <p><strong>Address:</strong> ${group.eatery_address}</p>
              <p><strong>Contact:</strong> ${group.eatery_contact}</p>
              <ul>
                ${group.items
                  .map(
                    (item: any) => `
                  <li>${item.quantity}x ${item.food_name} - ${item.name} (GH₵ ${(item.price * item.quantity).toFixed(2)})</li>
                `,
                  )
                  .join("")}
              </ul>
              <p><strong>Subtotal:</strong> GH₵ ${group.subtotal.toFixed(2)}</p>
            </div>
          `,
            )
            .join("")}
          
          ${specialInstructions ? `<p><strong>Special Instructions:</strong> ${specialInstructions}</p>` : ""}
          
          <p>Please process this order as soon as possible.</p>
        `

        const emailResult = await SendMail({
          from: "orders@readyride.com",
          to: settings.support_email,
          subject: emailSubject,
          text: `New order received: ${trackingId}. Customer: ${userProfile.display_name}. Total: GH₵ ${totalAmount.toFixed(2)}`,
          html: emailBody,
        })

        console.log("Email notification result:", emailResult)
      }

      // SMS notification to support
      if (settings.support_contact) {
        const smsMessage = `New Order Alert! 
Order ID: ${trackingId}
Customer: ${userProfile.display_name}
Phone: ${userProfile.phone_number}
Restaurants: ${restaurantNames}
Total: GH₵ ${totalAmount.toFixed(2)}
Payment: ${selectedPaymentMethod?.type === "CASH" ? "Cash" : "Mobile Money"}
Address: ${userProfile.address?.address || "Not specified"}
Please process immediately.`

        const smsResult = await SendSMS(settings.support_contact, smsMessage)
        console.log("SMS notification result:", smsResult)
      }

      // Send SMS to each eatery with their specific order details
      for (const group of eateryGroups) {
        if (group.eatery_contact) {
          const eateryItemsList = group.items
            .map((item: any) => `${item.quantity}x ${item.food_name} - ${item.name}`)
            .join(", ")

          const eaterySmsMessage = `New Order for ${group.eatery_name}!
Order ID: ${trackingId}
Customer: ${userProfile.display_name}
Phone: ${userProfile.phone_number}
Delivery Address: ${userProfile.address?.address || "Not specified"}

Items Ordered:
${eateryItemsList}

Subtotal: GH₵ ${group.subtotal.toFixed(2)}
Payment: ${selectedPaymentMethod?.type === "CASH" ? "Cash on Delivery" : "Mobile Money"}

${specialInstructions ? `Special Instructions: ${specialInstructions}` : ""}

Please prepare the order. Ready Ride rider will collect soon.`

          try {
            const eaterySmsResult = await SendSMS(group.eatery_contact, eaterySmsMessage)
            console.log(`SMS sent to ${group.eatery_name} (${group.eatery_contact}):`, eaterySmsResult)
          } catch (error) {
            console.error(`Failed to send SMS to ${group.eatery_name}:`, error)
          }
        } else {
          console.warn(`No contact number for eatery: ${group.eatery_name}`)
        }
      }
    } catch (error) {
      console.error("Error sending order notifications:", error)
      // Don't block the order process if notifications fail
    }
  }

  const createOrderData = async () => {
    const trackingId = generateTrackingId()
    const now = new Date()
    const createdDate =
      now.toLocaleDateString("en-GB") +
      " " +
      now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })

    // Create locations array from eatery groups
    const locations = eateryGroups.map((group) => ({
      eatery_id: group.eatery_id,
      name: group.eatery_name,
      location: group.eatery_address,
      contact: group.eatery_contact,
      lat: group.eatery_coordinates.lat,
      lon: group.eatery_coordinates.lon,
      note: "", // This could be provided by user in future
    }))

    return {
      special_instructions: specialInstructions,
      order_details: cartItems,
      delivery_fee: deliveryInfo.deliveryFee,
      total_amount: totalAmount,
      paid: false,
      uid: user?.uid || "",
      promo: promoDiscount,
      order_type: "Order",
      map_data: mapData || {
        total_distance: deliveryInfo.totalDistance,
        total_distance_text: `${Math.round(deliveryInfo.totalDistance / 1000)} km`,
        total_seconds: 0,
        total_duration: "0 minutes",
      },
      locations: locations,
      status: "Pending",
      created_date: createdDate,
      collect_time: "Standard",
      payment_method: {
        account: selectedPaymentMethod?.type === "CASH" ? "CASH" : selectedPaymentMethod?.account_number || "",
      },
      tracking_id: trackingId,
      receiver: {
        name: userProfile?.display_name || "",
        lat: userProfile?.address?.lat || 0,
        contact: userProfile?.phone_number || "",
        lon: userProfile?.address?.lon || 0,
        location: userProfile?.address?.address || "",
      },
      shown: false,
    }
  }

  const handleConfirm = async () => {
    if (!selectedPaymentMethod || !user) return

    try {
      setProcessing(true)

      // Create order first
      const orderData = await createOrderData()
      const newOrderId = await createDeliveryOrder(orderData)

      if (!newOrderId) {
        throw new Error("Failed to create order")
      }

      setOrderId(newOrderId)

      // Send notifications to support team and eateries
      await sendOrderNotifications(orderData, orderData.tracking_id)

      // If cash payment, skip Paystack
      if (selectedPaymentMethod.type === "CASH") {
        setShowConfirmation(true)
        clearCart()
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
          await verifyTransaction(chargeData.data.reference, newOrderId)
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
        clearCart()
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
    router.push(`/track/${orderId}`)
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
        return "https://getreadyride.com/uploads/images/cash.png"
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
                  <Image
                    src="https://getreadyride.com/uploads/images/telecel.png"
                    alt="Telecel"
                    width={24}
                    height={24}
                    className="mr-1"
                  />
                  <span className="mx-1 text-gray-400">/</span>
                  <Image
                    src="https://getreadyride.com/uploads/images/at.jpg"
                    alt="AT"
                    width={24}
                    height={24}
                    className="ml-1"
                  />
                </div>
              </div>
            </div>
            <span className="text-gray-500">Add mobile money</span>
            <ChevronRight className="text-gray-400" size={20} />
          </div>
        </div>

        {/* Delivery Warnings */}
        {eateryGroups.length > 1 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div>
              <p className="text-amber-800 font-medium">Multiple Restaurant Order</p>
              <p className="text-amber-700 text-sm">
                This may take longer to deliver as our rider will need to visit {eateryGroups.length} different
                locations.
              </p>
            </div>
          </div>
        )}

        {deliveryInfo.exceedsMaxDistance && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start space-x-3">
            <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div>
              <p className="text-orange-800 font-medium">Long Distance Delivery</p>
              <p className="text-orange-700 text-sm">
                This delivery may take significantly longer than usual. Distance:{" "}
                {Math.round(deliveryInfo.totalDistance / 1000)} km (Max: {Math.round(deliveryInfo.maxDistance / 1000)}{" "}
                km)
              </p>
            </div>
          </div>
        )}

        {appliedPromo && promoDiscount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <div>
              <p className="text-green-800 font-medium">Delivery Promo Applied!</p>
              <p className="text-green-700 text-sm">
                {appliedPromo.title}: You saved GH₵ {promoDiscount.toFixed(2)} on delivery fee!
              </p>
            </div>
          </div>
        )}

        {/* Special Instructions */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-bold mb-2">Special Instructions (Optional)</h3>
          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any special instructions for your order..."
            className="w-full p-3 border rounded-lg resize-none"
            rows={3}
          />
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-bold mb-2">Order Summary</h3>

          {/* Restaurant Groups */}
          {eateryGroups.map((group) => (
            <div key={group.eatery_id} className="mb-4 pb-4 border-b border-gray-100 last:border-b-0">
              <h4 className="font-medium text-primary mb-2">{group.eatery_name}</h4>
              <p className="text-sm text-gray-500 mb-2">{group.eatery_address}</p>
              {group.items.map((item: any) => (
                <div key={`${item.id}-${item.eatery_id}`} className="flex justify-between text-sm mb-1">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>GH₵ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-medium mt-2">
                <span>Subtotal</span>
                <span>GH₵ {group.subtotal.toFixed(2)}</span>
              </div>
            </div>
          ))}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Items</span>
              <span>GH₵ {subtotalBeforePromo.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>GH₵ {originalDeliveryFee.toFixed(2)}</span>
            </div>
            {appliedPromo && promoDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Delivery Discount ({appliedPromo.title})</span>
                <span>-GH₵ {promoDiscount.toFixed(2)}</span>
              </div>
            )}
            {mapData && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Distance: {mapData.total_distance_text}</span>
                <span>Est. Time: {mapData.total_duration}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span>GH₵ {totalAmount.toFixed(2)}</span>
            </div>
            <br></br>
            <br></br>
            <br></br>
            <br></br>
            <br></br>
            <br></br>
            <br></br>
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

      {/* Order Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[90%] max-w-md overflow-hidden animate-fade-in-up">
            <div className="flex flex-col items-center p-6">
              <div className="bg-primary/20 rounded-full p-8 mb-6">
                <Check size={48} className="text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-primary mb-4">Order Confirmed</h2>
              <p className="text-center text-lg mb-2">
                Order placed with <span className="font-bold">ID #{orderId.slice(-6)}</span>
              </p>
              <p className="text-center text-gray-500 mb-8">Track your delivery in real-time now.</p>
            </div>

            <div className="border-t border-gray-200 flex">
              <button onClick={handleCancel} className="flex-1 py-4 text-gray-500 font-medium border-r border-gray-200">
                Close
              </button>
              <button onClick={handleTrack} className="flex-1 py-4 text-primary font-medium">
                Track Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
