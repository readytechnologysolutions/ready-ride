"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft, Phone, MapPin, User } from "lucide-react"
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getRiderById, type Rider } from "@/lib/firestore-service"
import DeliveryTrackingMap from "@/components/delivery-tracking-map"

type OrderStatus = "placed" | "scheduled" | "picked" | "delivered" | "confirmed"

type DeliveryStatus = {
  id: string
  status: string
  timestamp: string
  description: string
  location?: string
  created_date: string
}

type ParcelDetails = {
  id: string
  size: "Small" | "Medium" | "Large"
  collectTime: "Express" | "Standard"
  type: "box" | "document" | "fragile"
  status: OrderStatus
  deliveryStatuses: DeliveryStatus[]
  rid?: string // Rider ID
  rider?: {
    name: string
    image: string
    phone: string
    estimatedDeliveryTime: string
    lat?: number
    lon?: number
  }
  sender?: {
    name: string
    contact: string
    location: string
    lat: number
    lon: number
  }
  receiver?: {
    name: string
    contact: string
    location: string
    lat: number
    lon: number
  }
  mapData?: {
    distance: number
    duration: string
    distance_text: string
    poly_lines: string
  }
  specialInstructions?: string
  deliveryFee?: number
  totalAmount?: number
  promo?: number
  paymentMethod?: string
  createdDate?: string
}

export default function ParcelTrackingPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const parcelId = params.id
  const [showCallModal, setShowCallModal] = useState(false)

  const [parcelDetails, setParcelDetails] = useState<ParcelDetails | null>(null)
  const [riderData, setRiderData] = useState<Rider | null>(null)
  const [loading, setLoading] = useState(true)
  const [riderLoading, setRiderLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadParcelData() {
      if (!parcelId) return

      try {
        const docRef = doc(db, "deliveries", parcelId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()

          // Load delivery statuses from subcollection
          const statusesRef = collection(db, "deliveries", parcelId, "delivery_status")
          const statusesQuery = query(statusesRef, orderBy("created_date", "asc"))
          const statusesSnap = await getDocs(statusesQuery)

          const deliveryStatuses: DeliveryStatus[] = []
          statusesSnap.forEach((doc) => {
            const statusData = doc.data()
            deliveryStatuses.push({
              id: doc.id,
              status: statusData.status || "",
              timestamp: statusData.timestamp || statusData.created_date || "",
              description: statusData.description || statusData.success || "",
              location: statusData.location || "",
              created_date: statusData.created_date || "",
            })
          })

          // Get current status from the latest delivery status or fallback to main document
          const currentStatus =
            deliveryStatuses.length > 0
              ? mapFirestoreStatusToTrackingStatus(deliveryStatuses[deliveryStatuses.length - 1].status)
              : mapFirestoreStatusToTrackingStatus(data.status)

          // Map Firestore data to component format
          const mappedData: ParcelDetails = {
            id: data.tracking_id || parcelId,
            size: data.package_size || "Medium",
            collectTime: data.collect_time || "Standard",
            type: getPackageTypeFromNumber(data.package_type || 1),
            status: currentStatus,
            deliveryStatuses,
            rid: data.rid, // Store rider ID
            rider: data.rider
              ? {
                  name: data.rider.name,
                  image: data.rider.image || "/rider-image.png",
                  phone: data.rider.phone || "",
                  estimatedDeliveryTime: data.rider.estimatedDeliveryTime || "",
                  lat: data.rider.lat,
                  lon: data.rider.lon,
                }
              : undefined,
            sender: data.sender,
            receiver: data.receiver,
            mapData: data.map_data,
            specialInstructions: data.special_instructions || "",
            deliveryFee: data.delivery_fee || 0,
            totalAmount: data.total_amount || 0,
            promo: data.promo || 0,
            paymentMethod: data.payment_method?.account || "CASH",
            createdDate: data.created_date || "",
          }

          setParcelDetails(mappedData)

          // Fetch rider data if rider is assigned (regardless of status for display purposes)
          if (data.rid) {
            await loadRiderData(data.rid)
          }
        } else {
          setError("Parcel not found")
        }
      } catch (err) {
        console.error("Error fetching parcel:", err)
        setError("Failed to load parcel details")
      } finally {
        setLoading(false)
      }
    }

    loadParcelData()
  }, [parcelId])

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

  const isDeliveryOngoing = (status: OrderStatus): boolean => {
    // Consider delivery ongoing if it's scheduled, picked up, or in transit
    return status === "scheduled" || status === "picked"
  }

  const isDeliveryCompleted = (status: OrderStatus): boolean => {
    // Delivery is completed if delivered or confirmed
    return status === "delivered" || status === "confirmed"
  }

  const getPackageTypeFromNumber = (packageType: number): "box" | "document" | "fragile" => {
    switch (packageType) {
      case 1:
        return "document"
      case 2:
        return "box"
      case 3:
        return "fragile"
      default:
        return "box"
    }
  }

  const mapFirestoreStatusToTrackingStatus = (status: string): OrderStatus => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "placed"
      case "confirmed":
        return "scheduled"
      case "picked_up":
        return "picked"
      case "delivered":
        return "delivered"
      case "completed":
        return "confirmed"
      default:
        return "placed"
    }
  }

  const handleCallRider = () => {
    if (!riderData?.phone_number) return

    // In a real app, this would initiate a phone call
    setShowCallModal(true)
    setTimeout(() => {
      setShowCallModal(false)
    }, 2000)
  }

  // Convert parcel data to delivery format for the map component with custom markers
  const getDeliveryDataForMap = () => {
    if (!parcelDetails) return null

    return {
      id: parcelDetails.id,
      tracking_id: parcelDetails.id,
      order_type: "Parcel" as const,
      status: parcelDetails.status,
      locations: parcelDetails.sender
        ? [
            {
              name: "Sender",
              location: parcelDetails.sender.location,
              lat: parcelDetails.sender.lat,
              lon: parcelDetails.sender.lon,
              eatery_id: "sender",
            },
          ]
        : [],
      receiver: parcelDetails.receiver
        ? {
            name: "Receiver",
            location: parcelDetails.receiver.location,
            contact: parcelDetails.receiver.contact,
            lat: parcelDetails.receiver.lat,
            lon: parcelDetails.receiver.lon,
          }
        : {
            name: "",
            location: "",
            contact: "",
            lat: 0,
            lon: 0,
          },
      total_amount: parcelDetails.totalAmount || 0,
      delivery_fee: parcelDetails.deliveryFee || 0,
      promo: parcelDetails.promo,
      payment_method: {
        account: parcelDetails.paymentMethod || "CASH",
      },
      created_date: parcelDetails.createdDate || "",
      rid: parcelDetails.rid || null,
      // Don't track live coordinates if delivery is completed
      trackLiveLocation: !isDeliveryCompleted(parcelDetails.status),
    }
  }

  const getStatusIcon = (index: number) => {
    const isCompleted = index < parcelDetails!.deliveryStatuses.length
    return (
      <div
        className={`w-9 h-9 rounded-md flex items-center justify-center ${
          isCompleted ? "bg-primary" : "border border-gray-300"
        }`}
      >
        {isCompleted && <div className="w-3 h-3 bg-white rounded-full"></div>}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffcea] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading parcel details...</p>
        </div>
      </div>
    )
  }

  if (error || !parcelDetails) {
    return (
      <div className="min-h-screen bg-[#fffcea] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "Parcel not found"}</p>
          <button onClick={() => router.back()} className="bg-primary text-white px-4 py-2 rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const deliveryData = getDeliveryDataForMap()
  const shouldShowRider =
    parcelDetails.rid && (isDeliveryOngoing(parcelDetails.status) || isDeliveryCompleted(parcelDetails.status))

  return (
    <div className="min-h-screen bg-[#fffcea]">
      {/* Header */}
      <div className="p-4 flex items-center bg-[#fffcea]">
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

      {/* Parcel Details Card */}
      <div className="mx-4 -mt-6 relative z-10">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Parcel ID #{parcelDetails.id}</h2>

          <div className="grid grid-cols-2 gap-4 mb-2">
            <div>
              <p className="text-gray-500">Parcel size:</p>
              <p className="font-medium">{parcelDetails.size}</p>
            </div>
            <div>
              <p className="text-gray-500">Collect time:</p>
              <p className="font-medium">{parcelDetails.collectTime}</p>
            </div>
          </div>

          <div>
            <p className="text-gray-500">Parcel type:</p>
            <div className="mt-1">
              <Image src="/rectangular-cardboard-box.png" alt="Box" width={40} height={40} />
            </div>
          </div>
        </div>
      </div>

      {/* Sender and Receiver Details */}
      <div className="mx-4 mt-4 space-y-4">
        {/* Sender Card */}
        {parcelDetails.sender && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <User className="text-green-600" size={20} />
              </div>
              <h3 className="text-lg font-bold">Sender Details</h3>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-gray-500 text-sm">Name</p>
                <p className="font-medium">{parcelDetails.sender.name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Contact</p>
                <p className="font-medium">{parcelDetails.sender.contact}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Location</p>
                <div className="flex items-start">
                  <MapPin className="text-gray-400 mr-2 mt-1 flex-shrink-0" size={16} />
                  <p className="font-medium">{parcelDetails.sender.location}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Receiver Card */}
        {parcelDetails.receiver && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <User className="text-blue-600" size={20} />
              </div>
              <h3 className="text-lg font-bold">Receiver Details</h3>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-gray-500 text-sm">Name</p>
                <p className="font-medium">{parcelDetails.receiver.name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Contact</p>
                <p className="font-medium">{parcelDetails.receiver.contact}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Location</p>
                <div className="flex items-start">
                  <MapPin className="text-gray-400 mr-2 mt-1 flex-shrink-0" size={16} />
                  <p className="font-medium">{parcelDetails.receiver.location}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delivery Status */}
      <div className="mx-4 mt-4">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-6">Delivery status</h2>

          {parcelDetails.deliveryStatuses.length > 0 ? (
            <div className="relative">
              {/* Status Timeline */}
              <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-gray-200 z-0"></div>

              {parcelDetails.deliveryStatuses.map((status, index) => (
                <div key={status.id} className="flex items-start mb-6 relative z-10 last:mb-0">
                  <div className="mr-4">{getStatusIcon(index)}</div>
                  <div className="flex-1">
                    <h3 className="font-bold capitalize">{status.status.replace(/_/g, " ")}</h3>
                    <p className="text-gray-500">{status.description}</p>
                    {status.location && (
                      <div className="flex items-center mt-1">
                        <MapPin className="text-gray-400 mr-1" size={14} />
                        <p className="text-sm text-gray-400">{status.location}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(status.created_date || status.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No delivery status updates available</p>
            </div>
          )}
        </div>
      </div>

      {/* Rider Info - show if rider is assigned */}
      {shouldShowRider && (
        <div className="mx-4 mt-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                <User className="text-orange-600" size={20} />
              </div>
              <h3 className="text-lg font-bold">Rider Details</h3>
            </div>

            {riderLoading ? (
              <div className="flex items-center">
                <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse mr-3"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-48 animate-pulse"></div>
                </div>
              </div>
            ) : riderData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-14 h-14 rounded-full overflow-hidden mr-3">
                      <Image
                        src={riderData.photo_url || "/rider-image.png"}
                        alt={riderData.display_name}
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold">{riderData.display_name}</h4>
                      <p className="text-gray-500 text-sm">
                        {isDeliveryCompleted(parcelDetails.status)
                          ? "Delivery completed"
                          : parcelDetails.status === "picked"
                            ? "On the way to destination"
                            : "Preparing for pickup"}
                      </p>
                    </div>
                  </div>
                  {riderData.phone_number && !isDeliveryCompleted(parcelDetails.status) && (
                    <button
                      onClick={handleCallRider}
                      className="w-12 h-12 bg-primary rounded-full flex items-center justify-center"
                    >
                      <Phone className="text-white" size={24} />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-gray-500 text-sm">Phone Number</p>
                    <p className="font-medium">{riderData.phone_number || "Not available"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Email</p>
                    <p className="font-medium">{riderData.email || "Not available"}</p>
                  </div>
                  {riderData.vehicle_info && (
                    <div>
                      <p className="text-gray-500 text-sm">Vehicle</p>
                      <p className="font-medium">{riderData.vehicle_info}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="w-14 h-14 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                  <User className="text-gray-400" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-500">Rider assigned</h4>
                  <p className="text-gray-400">Unable to load rider information</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Call Modal */}
      {showCallModal && riderData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-xs w-full">
            <p className="text-center">Calling {riderData.display_name}...</p>
          </div>
        </div>
      )}
    </div>
  )
}
