"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Home, FileText, MapIcon, User, MapPin, MoreVertical, ChevronDown, ChevronUp } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getUserDeliveryOrders, type DeliveryOrder } from "@/lib/firestore-service"
import DeliveryTrackingMap from "@/components/delivery-tracking-map"

export default function TrackPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [trackItems, setTrackItems] = useState<DeliveryOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDeliveries = async () => {
      if (user?.uid) {
        try {
          const userDeliveries = await getUserDeliveryOrders(user.uid)
          setTrackItems(userDeliveries.map((delivery) => ({ ...delivery, expanded: false })))
        } catch (error) {
          console.error("Error loading deliveries:", error)
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }

    loadDeliveries()
  }, [user])

  const toggleExpand = (id: string) => {
    setTrackItems(
      trackItems.map((item) => {
        if (item.id === id) {
          return { ...item, expanded: !item.expanded }
        } else {
          return { ...item, expanded: false }
        }
      }),
    )
  }

  const navigateToDetails = (id: string, type: string) => {
    if (type === "Parcel") {
      router.push(`/track/parcel/${id}`)
    } else {
      router.push(`/track/${id}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase) {
      case "ongoing":
        return "text-primary"
      case "completed":
        return "text-green-500"
      case "cancelled":
        return "text-red-500"
      default:
        return "text-gray-500"
    }
  }

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const hasRiderInfo = (item: DeliveryOrder) => {
    return item.rid && item.rider
  }

  return (
    <div className="min-h-screen bg-[#fffbeb] pb-20">
      {/* Header */}
      <div className="p-4">
        <h1 className="text-2xl font-bold">Track</h1>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && trackItems.length === 0 && (
        <div className="flex flex-col items-center justify-center px-6 py-12">
          <div className="mb-6">
            <MapIcon size={64} className="text-gray-400" />
          </div>
          <h2 className="text-xl text-gray-500 mb-1">No deliveries to track</h2>
          <p className="text-gray-500 mb-8">Your deliveries will appear here</p>
          <Link
            href="/home"
            className="w-full bg-primary text-white py-4 px-6 rounded-full text-center text-xl font-medium"
          >
            Start Ordering
          </Link>
        </div>
      )}

      {/* Track Items */}
      {!loading && trackItems.length > 0 && (
        <div className="px-4 space-y-4">
          {trackItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg overflow-hidden shadow-sm">
              <div
                className="p-4 flex justify-between items-start cursor-pointer"
                onClick={() =>
                  item.status === "ongoing" ? toggleExpand(item.id!) : navigateToDetails(item.id!, item.order_type)
                }
              >
                <div>
                  <h2 className="font-bold">
                    {getTypeLabel(item.order_type)} ID #: {item.tracking_id}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {new Date(item.createTime).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className="text-gray-500 mr-2">{getTypeLabel(item.order_type)}</span>
                    <span className={`font-medium ${getStatusColor(item.status)}`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </div>
                  {hasRiderInfo(item) && (
                    <p className="text-sm text-blue-600 mt-1">
                      Rider: {item.rider!.name} • {item.rider!.contact}
                    </p>
                  )}
                </div>
                <div className="flex items-center">
                  {item.status === "ongoing" ? (
                    item.expanded ? (
                      <ChevronUp className="text-gray-500" size={20} />
                    ) : (
                      <ChevronDown className="text-gray-500" size={20} />
                    )
                  ) : (
                    <MoreVertical className="text-gray-500" size={20} />
                  )}
                </div>
              </div>

              {/* Expanded View for Ongoing Items */}
              {item.expanded && item.status === "ongoing" && (
                <div className="px-4 pb-4">
                  {/* Show map if rider info is available */}
                  {hasRiderInfo(item) && (
                    <div className="mb-4">
                      <DeliveryTrackingMap delivery={item} />
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Pickup Locations */}
                    {item.locations.map((location, index) => (
                      <div key={index} className="flex items-start">
                        <div className="mr-3 flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                            <MapPin className="text-white" size={14} />
                          </div>
                          {index < item.locations.length - 1 && <div className="w-0.5 h-12 bg-amber-500 mt-1"></div>}
                        </div>
                        <div>
                          <p className="font-bold">{location.name}</p>
                          <p className="text-gray-500">{location.location}</p>
                        </div>
                      </div>
                    ))}

                    {/* Delivery Location */}
                    <div className="flex items-start">
                      <div className="mr-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <MapPin className="text-white" size={14} />
                        </div>
                      </div>
                      <div>
                        <p className="font-bold">Delivering to</p>
                        <p className="text-gray-500">{item.receiver.location}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3">
        <Link href="/home" className="flex flex-col items-center text-gray-500">
          <Home size={24} />
          <span className="text-xs mt-1">Home</span>
        </Link>
        <Link href="/orders" className="flex flex-col items-center text-gray-500">
          <FileText size={24} />
          <span className="text-xs mt-1">Orders</span>
        </Link>
        <Link href="/track" className="flex flex-col items-center text-primary">
          <MapIcon size={24} />
          <span className="text-xs mt-1">Track</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center text-gray-500">
          <User size={24} />
          <span className="text-xs mt-1">Profile</span>
        </Link>
      </div>
    </div>
  )
}
