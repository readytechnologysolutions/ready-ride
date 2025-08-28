"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft, Phone, Mic, MicOff, Volume2 } from "lucide-react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getRiderById, type Rider } from "@/lib/firestore-service"
import DeliveryTrackingMap from "@/components/delivery-tracking-map"

type OrderStatus = "confirmed" | "preparation" | "delivery" | "delivered"

type OrderItem = {
  name: string
  variant?: string
  quantity: number
}

type Order = {
  id: string
  items: OrderItem[]
  status: OrderStatus
  rid?: string
  rider?: {
    name: string
    image: string
    phone: string
    estimatedDeliveryTime: string
  }
  locations?: Array<{
    name: string
    location: string
    lat: number
    lon: number
    eatery_id: string
  }>
  receiver?: {
    name: string
    location: string
    contact: string
    lat: number
    lon: number
  }
  total_amount?: number
  delivery_fee?: number
  promo?: number
  payment_method?: {
    account: string
  }
  created_date?: string
}

export default function OrderTrackingClientPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const orderId = params.id
  const [showCallModal, setShowCallModal] = useState(false)
  const [callActive, setCallActive] = useState(false)
  const [callDuration, setCallDuration] = useState("0:00")
  const [muteMicrophone, setMuteMicrophone] = useState(false)
  const [speakerActive, setSpeakerActive] = useState(false)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)

  const [order, setOrder] = useState<Order | null>(null)
  const [riderData, setRiderData] = useState<Rider | null>(null)
  const [loading, setLoading] = useState(true)
  const [riderLoading, setRiderLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clean up timer when component unmounts
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval)
      }
    }
  }, [timerInterval])

  useEffect(() => {
    async function loadOrderData() {
      if (!orderId) return

      try {
        const docRef = doc(db, "orders", orderId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()

          // Map Firestore data to component format
          const mappedOrder: Order = {
            id: data.tracking_id || orderId,
            items: data.order_details || [],
            status: mapFirestoreStatusToTrackingStatus(data.status),
            rid: data.rid,
            locations: data.locations || [],
            receiver: data.receiver,
            total_amount: data.total_amount || 0,
            delivery_fee: data.delivery_fee || 0,
            promo: data.promo || 0,
            payment_method: data.payment_method,
            created_date: data.created_date || "",
          }

          setOrder(mappedOrder)

          // Fetch rider data if rider is assigned
          if (data.rid) {
            await loadRiderData(data.rid)
          }
        } else {
          setError("Order not found")
        }
      } catch (err) {
        console.error("Error fetching order:", err)
        setError("Failed to load order details")
      } finally {
        setLoading(false)
      }
    }

    loadOrderData()
  }, [orderId])

  const loadRiderData = async (riderId: string) => {
    try {
      setRiderLoading(true)
      const rider = await getRiderById(riderId)
      if (rider) {
        setRiderData(rider)
      }
    } catch (error) {
      console.error("Error fetching rider data:", error)
    } finally {
      setRiderLoading(false)
    }
  }

  const mapFirestoreStatusToTrackingStatus = (status: string): OrderStatus => {
    switch (status?.toLowerCase()) {
      case "pending":
      case "confirmed":
        return "confirmed"
      case "preparing":
      case "preparation":
        return "preparation"
      case "ready":
      case "picked_up":
      case "delivery":
        return "delivery"
      case "delivered":
      case "completed":
        return "delivered"
      default:
        return "confirmed"
    }
  }

  const isOrderCompleted = (status: OrderStatus): boolean => {
    return status === "delivered"
  }

  const handleCallRider = () => {
    if (!riderData?.phone_number) return

    setShowCallModal(true)

    // Simulate connecting
    setTimeout(() => {
      setCallActive(true)

      // Start a timer to update call duration
      let seconds = 0
      const timer = setInterval(() => {
        seconds++
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        setCallDuration(`${minutes}:${remainingSeconds.toString().padStart(2, "0")}`)
      }, 1000)

      setTimerInterval(timer)
    }, 2000)
  }

  const handleEndCall = () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      setTimerInterval(null)
    }

    setShowCallModal(false)
    setCallActive(false)
    setCallDuration("0:00")
    setMuteMicrophone(false)
    setSpeakerActive(false)
  }

  const handleRateRider = () => {
    router.push("/order/rate")
  }

  const handleToggleMute = () => {
    setMuteMicrophone(!muteMicrophone)
  }

  const handleToggleSpeaker = () => {
    setSpeakerActive(!speakerActive)
  }

  // Convert order data to delivery format for the map component
  const getDeliveryDataForMap = () => {
    if (!order) return null

    return {
      id: order.id,
      tracking_id: order.id,
      order_type: "Food" as const,
      status: order.status,
      locations: order.locations || [],
      receiver: order.receiver || {
        name: "",
        location: "",
        contact: "",
        lat: 0,
        lon: 0,
      },
      total_amount: order.total_amount || 0,
      delivery_fee: order.delivery_fee || 0,
      promo: order.promo || 0,
      payment_method: order.payment_method || { account: "CASH" },
      created_date: order.created_date || "",
      rid: order.rid || null,
      // Don't track live coordinates if order is completed
      trackLiveLocation: !isOrderCompleted(order.status),
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffbeb] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#fffbeb] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "Order not found"}</p>
          <button onClick={() => router.back()} className="bg-primary text-white px-4 py-2 rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const deliveryData = getDeliveryDataForMap()

  return (
    <div className="min-h-screen bg-[#fffbeb]">
      {/* Header */}
      <div className="p-4 flex items-center bg-white">
        <button onClick={() => router.back()} className="mr-4" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Track Order</h1>
      </div>

      {/* Map */}
      {deliveryData && (
        <div className="relative h-64 w-full">
          <DeliveryTrackingMap delivery={deliveryData} />
        </div>
      )}

      {/* Order Details */}
      <div className="bg-white rounded-lg mx-4 -mt-6 relative z-10 p-4 shadow-sm">
        <h2 className="text-xl font-bold mb-2">Order #{order.id}</h2>
        {order.items.map((item, index) => (
          <div key={index} className="flex items-center">
            <p>
              {item.name} {item.variant && <span className="text-gray-500">{item.variant}</span>}{" "}
              <span className="text-primary">x{item.quantity}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Order Status */}
      <div className="bg-white rounded-lg m-4 p-4 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Order status</h2>

        <div className="relative">
          {/* Status Timeline */}
          <div className="absolute left-[14px] top-0 bottom-0 w-0.5 bg-gray-200 z-0"></div>

          {/* Order Confirmed */}
          <div className="flex items-start mb-6 relative z-10">
            <div className="mr-4">
              <div
                className={`w-7 h-7 rounded-md ${order.status === "confirmed" || order.status === "preparation" || order.status === "delivery" || order.status === "delivered" ? "bg-primary" : "bg-gray-200"}`}
              ></div>
            </div>
            <div>
              <h3 className="font-bold">Order confirmed</h3>
              <p className="text-gray-500">Your order has been received</p>
            </div>
          </div>

          {/* Order Preparation */}
          <div className="flex items-start mb-6 relative z-10">
            <div className="mr-4">
              <div
                className={`w-7 h-7 rounded-md ${order.status === "preparation" || order.status === "delivery" || order.status === "delivered" ? "bg-primary" : "bg-gray-200"}`}
              ></div>
            </div>
            <div>
              <h3 className="font-bold">Order preparation</h3>
              <p className="text-gray-500">Your order is being prepared by the restaurant</p>
            </div>
          </div>

          {/* Delivery in Progress */}
          <div className="flex items-start mb-6 relative z-10">
            <div className="mr-4">
              <div
                className={`w-7 h-7 rounded-md ${order.status === "delivery" || order.status === "delivered" ? "bg-primary" : "bg-gray-200"}`}
              ></div>
            </div>
            <div>
              <h3 className="font-bold">Delivery in Progress</h3>
              <p className="text-gray-500">A rider has picked up your order</p>
            </div>
          </div>

          {/* Delivered */}
          <div className="flex items-start relative z-10">
            <div className="mr-4">
              <div
                className={`w-7 h-7 rounded-md ${order.status === "delivered" ? "bg-primary" : "bg-gray-200"}`}
              ></div>
            </div>
            <div>
              <h3 className="font-bold">Delivered</h3>
              <p className="text-gray-500">
                Order has been successfully delivered. you can proceed to rate our services.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rider Info */}
      {order.rid && (
        <div className="bg-white rounded-lg m-4 p-4 shadow-sm flex items-center justify-between">
          {riderLoading ? (
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse mr-3"></div>
              <div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-48 animate-pulse"></div>
              </div>
            </div>
          ) : riderData ? (
            <>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full overflow-hidden mr-3">
                  <Image
                    src={riderData.photo_url || "/rider-image.png"}
                    alt={riderData.display_name}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div>
                  <h3 className="font-bold">
                    {riderData.display_name} <span className="font-normal text-gray-500">(rider)</span>
                  </h3>
                  <p className="text-gray-500">
                    {isOrderCompleted(order.status)
                      ? "Order delivered successfully"
                      : order.status === "delivery"
                        ? "On the way to you"
                        : "Preparing to pick up your order"}
                  </p>
                </div>
              </div>
              {riderData.phone_number && !isOrderCompleted(order.status) && (
                <button
                  onClick={handleCallRider}
                  className="w-10 h-10 bg-primary rounded-full flex items-center justify-center"
                >
                  <Phone className="text-white" size={20} />
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-gray-200 mr-3"></div>
              <div>
                <h3 className="font-bold text-gray-500">Rider assigned</h3>
                <p className="text-gray-400">Loading rider information...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Call Bottom Sheet */}
      {showCallModal && riderData && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleEndCall}></div>

          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 transform transition-transform duration-300 ease-in-out animate-slide-up">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>

            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4">
                <Image
                  src={riderData.photo_url || "/rider-image.png"}
                  alt={riderData.display_name}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              </div>
              <h2 className="text-xl font-bold mb-2">{riderData.display_name}</h2>
              <p className="text-gray-500">{callActive ? callDuration : "Connecting..."}</p>
            </div>

            <div className="flex justify-around">
              <button
                onClick={handleToggleMute}
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  muteMicrophone ? "bg-primary" : "bg-gray-200"
                }`}
              >
                {muteMicrophone ? (
                  <MicOff className={muteMicrophone ? "text-white" : "text-gray-700"} size={24} />
                ) : (
                  <Mic className={muteMicrophone ? "text-white" : "text-gray-700"} size={24} />
                )}
              </button>

              <button
                onClick={handleEndCall}
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center"
              >
                <Phone className="text-white" size={24} />
              </button>

              <button
                onClick={handleToggleSpeaker}
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  speakerActive ? "bg-primary" : "bg-gray-200"
                }`}
              >
                <Volume2 className={speakerActive ? "text-white" : "text-gray-700"} size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {order.status === "delivered" && (
        <div className="p-4">
          <button
            onClick={handleRateRider}
            className="w-full border border-primary text-primary py-3 rounded-full text-center font-medium"
          >
            Rate Rider
          </button>
        </div>
      )}
    </div>
  )
}
