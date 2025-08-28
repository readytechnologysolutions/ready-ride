"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, MapPin, Phone, User, Download, AlertCircle } from "lucide-react"
import Image from "next/image"
import { getDeliveryOrder, getRiderById, type DeliveryOrder, type Rider } from "@/lib/firestore-service"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import DeliveryStatusTimeline from "@/components/delivery-status-timeline"
import { formatCurrency } from "@/utils/format-utils"

type RiderLocation = {
  id: string
  city: string
  time: number
  speed: number
  longitude: number
  street_name: string
  latitude: number
  bearing: number
  created_time: string
  updated_time: string
  polylines: string
}

type DeliveryStatus = {
  status: string
  timestamp: string
  description: string
  location?: string
}

export default function TrackingDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const trackingId = params.id
  const [isLoading, setIsLoading] = useState(true)
  const [order, setOrder] = useState<DeliveryOrder | null>(null)
  const [statuses, setStatuses] = useState<DeliveryStatus[]>([])
  const [rider, setRider] = useState<Rider | null>(null)
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trackingError, setTrackingError] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [generatingReceipt, setGeneratingReceipt] = useState(false)
  const [isTrackingActive, setIsTrackingActive] = useState(false)

  const mapRef = useRef<google.maps.Map | null>(null)
  const riderMarkerRef = useRef<google.maps.Marker | null>(null)
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const restaurantMarkersRef = useRef<google.maps.Marker[]>([])
  const deliveryMarkerRef = useRef<google.maps.Marker | null>(null)
  const polylinesRef = useRef<google.maps.Polyline | null>(null)

  useEffect(() => {
    const loadOrderDetails = async () => {
      try {
        setIsLoading(true)
        const orderData = await getDeliveryOrder(trackingId)

        if (!orderData) {
          setError("Order not found")
          setIsLoading(false)
          return
        }

        setOrder(orderData)

        // Load delivery statuses from subcollection
        const statusesRef = collection(db, "deliveries", orderData.id, "delivery_status")
        const statusesQuery = query(statusesRef, orderBy("timestamp", "desc"))
        const statusesSnap = await getDocs(statusesQuery)

        const deliveryStatuses: DeliveryStatus[] = []
        statusesSnap.forEach((doc) => {
          const statusData = doc.data()
          console.log(statusData)
          deliveryStatuses.push(statusData)
        })

        setStatuses(deliveryStatuses)

        // Load rider details if available
        if (orderData.rid) {
          const riderData = await getRiderById(orderData.rid)
          setRider(riderData)
        }

        setIsLoading(false)
      } catch (err) {
        console.error("Error loading order details:", err)
        setError("Failed to load order details")
        setIsLoading(false)
      }
    }

    loadOrderDetails()
  }, [trackingId])

  // Fetch rider location from our API
  const fetchRiderLocation = async (riderId: string): Promise<RiderLocation | null> => {
    try {
      const response = await fetch(`https://socket.getreadyride.com/track.php?riderId=${riderId}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("API Error:", errorData.error)

        if (response.status === 404) {
          setTrackingError(`Rider ${riderId} not found`)
        } else if (response.status === 408) {
          setTrackingError("Tracking service timeout - please check your connection")
        } else if (response.status === 503) {
          setTrackingError("Tracking service temporarily unavailable")
        } else {
          setTrackingError(`Tracking error: ${errorData.error}`)
        }

        return null
      }

      const data: RiderLocation = await response.json()
      console.log("Rider Data: ",data)
      console.log("Rider location updated:", data.street_name, "Bearing:", data.bearing)

      // Clear error on successful fetch
      setTrackingError(null)
      return data
    } catch (error) {
      console.error("Error fetching rider location:", error)
      setTrackingError("Failed to fetch rider location")
      return null
    }
  }

  // Start rider tracking when rider is available
  useEffect(() => {
    if (rider?.id && order?.order_type === "Order") {
      console.log(`Starting rider tracking for rider: ${rider.id}`)

      // Fetch immediately
      fetchRiderLocation(rider.id).then((location) => {
        if (location) {
          setRiderLocation(location)
          setIsTrackingActive(true)
        }
      })

      // Then fetch every 5 seconds
      trackingIntervalRef.current = setInterval(async () => {
        const location = await fetchRiderLocation(rider.id)
        if (location) {
          setRiderLocation(location)
          setIsTrackingActive(true)
        } else {
          setIsTrackingActive(false)
        }
      }, 5000)

      // Cleanup on unmount
      return () => {
        if (trackingIntervalRef.current) {
          console.log("Cleaning up rider tracking interval")
          clearInterval(trackingIntervalRef.current)
          setIsTrackingActive(false)
        }
      }
    }
  }, [rider?.id, order?.order_type])

  // Update rider marker and polylines when location changes
  useEffect(() => {
    if (riderLocation && mapRef.current) {
      console.log("Updating rider marker position:", riderLocation.street_name)

      const newPosition = { lat: riderLocation.latitude, lng: riderLocation.longitude }

      // Create or update rider marker
      if (!riderMarkerRef.current) {
        // Create new marker if it doesn't exist
        const riderMarker = new google.maps.Marker({
          position: newPosition,
          map: mapRef.current,
          title: `Rider - ${riderLocation.street_name}`,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: "#10b981",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            rotation: riderLocation.bearing || 0,
          },
          zIndex: 10, // Make rider marker appear above other markers
        })
        riderMarkerRef.current = riderMarker
      } else {
        // Update existing marker
        riderMarkerRef.current.setPosition(newPosition)
        riderMarkerRef.current.setTitle(`Rider - ${riderLocation.street_name}`)

        // Update marker rotation based on bearing
        const icon = riderMarkerRef.current.getIcon() as google.maps.Symbol
        if (icon && typeof icon !== "string") {
          icon.rotation = riderLocation.bearing || 0
          riderMarkerRef.current.setIcon(icon)
        }
      }

      // Handle polylines
      if (riderLocation.polylines && riderLocation.polylines.trim() !== "") {
        try {
          // Clear existing polylines
          if (polylinesRef.current) {
            polylinesRef.current.setMap(null)
            polylinesRef.current = null
          }

          // Decode and draw new polylines
          const decodedPath = google.maps.geometry.encoding.decodePath(riderLocation.polylines)

          if (decodedPath && decodedPath.length > 0) {
            const polyline = new google.maps.Polyline({
              path: decodedPath,
              geodesic: true,
              strokeColor: "#f59e0b", // Theme color (primary amber)
              strokeOpacity: 0.8,
              strokeWeight: 4,
              map: mapRef.current,
            })

            polylinesRef.current = polyline
            console.log("Polylines updated with", decodedPath.length, "points")
          }
        } catch (error) {
          console.error("Error decoding polylines:", error)
        }
      } else {
        // Clear polylines if no data
        if (polylinesRef.current) {
          polylinesRef.current.setMap(null)
          polylinesRef.current = null
        }
      }

      // Center map on rider's position
      mapRef.current.panTo(newPosition)

      // Keep zoom level reasonable
      if (mapRef.current.getZoom() < 14) {
        mapRef.current.setZoom(15)
      }
    }
  }, [riderLocation])

  // Load Google Maps
  useEffect(() => {
    if (typeof window !== "undefined" && !window.google) {
      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`
      script.async = true
      script.defer = true
      script.onload = () => {
        setMapLoaded(true)
      }
      document.head.appendChild(script)
    } else if (window.google) {
      setMapLoaded(true)
    }
  }, [])

  // Initialize map when both order and Google Maps are loaded
  useEffect(() => {
    if (mapLoaded && order && order.order_type === "Order" && order.rid && rider) {
      initializeMap()
    }
  }, [mapLoaded, order, rider])

  const initializeMap = () => {
    const mapElement = document.getElementById("tracking-map")
    if (!mapElement || !window.google || !order) return

    console.log("Initializing map")

    // Calculate center point from all locations
    const allLocations = []

    // Add restaurant locations
    if (order.locations) {
      order.locations.forEach((location) => {
        if (location.lat && location.lon) {
          allLocations.push({ lat: location.lat, lng: location.lon })
        }
      })
    }

    // Add delivery location
    if (order.receiver && order.receiver.lat && order.receiver.lon) {
      allLocations.push({ lat: order.receiver.lat, lng: order.receiver.lon })
    }

    if (allLocations.length === 0) return

    // Calculate center - use rider location if available, otherwise use center of all locations
    let centerLat, centerLng

    if (riderLocation) {
      centerLat = riderLocation.latitude
      centerLng = riderLocation.longitude
    } else {
      centerLat = allLocations.reduce((sum, loc) => sum + loc.lat, 0) / allLocations.length
      centerLng = allLocations.reduce((sum, loc) => sum + loc.lng, 0) / allLocations.length
    }

    // Create map
    const map = new window.google.maps.Map(mapElement, {
      center: { lat: centerLat, lng: centerLng },
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      gestureHandling: "none",
      disableDefaultUI: true,
    })

    mapRef.current = map

    // Clear any existing markers
    restaurantMarkersRef.current.forEach((marker) => marker.setMap(null))
    restaurantMarkersRef.current = []

    if (deliveryMarkerRef.current) {
      deliveryMarkerRef.current.setMap(null)
      deliveryMarkerRef.current = null
    }

    if (riderMarkerRef.current) {
      riderMarkerRef.current.setMap(null)
      riderMarkerRef.current = null
    }

    // Clear existing polylines
    if (polylinesRef.current) {
      polylinesRef.current.setMap(null)
      polylinesRef.current = null
    }

    // Add restaurant markers
    if (order.locations) {
      order.locations.forEach((location) => {
        if (location.lat && location.lon) {
          const marker = new window.google.maps.Marker({
            position: { lat: location.lat, lng: location.lon },
            map: map,
            title: location.name,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#f59e0b",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          })
          restaurantMarkersRef.current.push(marker)
        }
      })
    }

    // Add delivery location marker
    if (order.receiver && order.receiver.lat && order.receiver.lon) {
      const deliveryMarker = new window.google.maps.Marker({
        position: { lat: order.receiver.lat, lng: order.receiver.lon },
        map: map,
        title: "Delivery Location",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      })
      deliveryMarkerRef.current = deliveryMarker
    }

    // Add rider marker if we have location data
    if (riderLocation) {
      const riderMarker = new window.google.maps.Marker({
        position: { lat: riderLocation.latitude, lng: riderLocation.longitude },
        map: map,
        title: `Rider - ${riderLocation.street_name}`,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: "#10b981",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          rotation: riderLocation.bearing || 0,
        },
        zIndex: 10, // Make rider marker appear above other markers
      })
      riderMarkerRef.current = riderMarker

      // Center map on rider
      map.setCenter({ lat: riderLocation.latitude, lng: riderLocation.longitude })
    } else {
      // If no rider location yet, fit bounds to show all markers
      const bounds = new window.google.maps.LatLngBounds()
      allLocations.forEach((location) => {
        bounds.extend(location)
      })
      map.fitBounds(bounds)

      // Ensure minimum zoom level
      const listener = window.google.maps.event.addListener(map, "idle", () => {
        if (map.getZoom() > 16) {
          map.setZoom(16)
        }
        window.google.maps.event.removeListener(listener)
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "ongoing":
      case "in progress":
      case "processing":
        return "text-amber-500"
      case "completed":
      case "delivered":
        return "text-green-500"
      case "cancelled":
        return "text-red-500"
      default:
        return "text-gray-500"
    }
  }

  const generateReceipt = () => {
    if (!order) return

    setGeneratingReceipt(true)

    // Create HTML receipt
    const receiptHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ready Ride Receipt - ${order.tracking_id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #f59e0b;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #f59e0b;
            margin-bottom: 10px;
          }
          .receipt-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #f59e0b;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            font-weight: bold;
            border-top: 2px solid #f59e0b;
            margin-top: 10px;
          }
          .location-item {
            margin-bottom: 15px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
          }
          .location-title {
            font-weight: bold;
            margin-bottom: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
          }
          @media print {
            body { margin: 0; padding: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Ready Ride</div>
          <div>Delivery Receipt</div>
        </div>

        <div class="receipt-info">
          <div><strong>${order.order_type} ID:</strong> ${order.tracking_id}</div>
          <div><strong>Date:</strong> ${new Date(order.created_date).toLocaleDateString()}</div>
          <div><strong>Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</div>
          ${rider ? `<div><strong>Delivery Agent:</strong> ${rider.display_name}</div>` : ""}
        </div>

        <div class="section">
          <div class="section-title">Delivery Route</div>
          ${
            order.locations
              ?.map(
                (location, index) => `
            <div class="location-item">
              <div class="location-title">Pickup ${order.locations!.length > 1 ? `${index + 1}` : ""}: ${location.name}</div>
              <div>${location.location}</div>
              <div><small>Collect time: ${order.collect_time}</small></div>
            </div>
          `,
              )
              .join("") || ""
          }
          
          <div class="location-item">
            <div class="location-title">Deliver to:</div>
            <div><strong>${order.receiver?.name}</strong></div>
            <div>${order.receiver?.location}</div>
            <div><small>Contact: ${order.receiver?.contact}</small></div>
          </div>
        </div>

        ${
          order.order_type === "Order" && order.order_details
            ? `
        <div class="section">
          <div class="section-title">Order Details</div>
          ${Object.entries(
            order.order_details.reduce(
              (acc, item) => {
                if (!acc[item.eatery_id]) acc[item.eatery_id] = []
                acc[item.eatery_id].push(item)
                return acc
              },
              {} as Record<string, typeof order.order_details>,
            ),
          )
            .map(([eateryId, items]) => {
              const eatery = order.locations?.find((loc) => loc.eatery_id === eateryId)
              return `
              <div style="margin-bottom: 20px;">
                ${eatery ? `<div style="font-weight: bold; margin-bottom: 10px;">${eatery.name}</div>` : ""}
                ${items
                  .map(
                    (item) => `
                  <div class="item-row">
                    <div>${item.quantity}x ${item.name}</div>
                    <div>${formatCurrency(item.price * item.quantity)}</div>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            `
            })
            .join("")}
        </div>
        `
            : ""
        }

        <div class="section">
          <div class="section-title">Payment Summary</div>
          <div class="item-row">
            <div>${order.order_type === "Order" ? "Order total" : "Package fee"}</div>
            <div>${formatCurrency(order.total_amount - order.delivery_fee)}</div>
          </div>
          <div class="item-row">
            <div>Delivery fee</div>
            <div>${formatCurrency(order.delivery_fee)}</div>
          </div>
          ${
            order.promo > 0
              ? `
          <div class="item-row">
            <div>Promo discount</div>
            <div style="color: green;">-${formatCurrency(order.promo)}</div>
          </div>
          `
              : ""
          }
          <div class="total-row">
            <div>Total</div>
            <div>${formatCurrency(order.total_amount - order.promo)}</div>
          </div>
          <div style="margin-top: 10px; font-size: 14px; color: #666;">
            Paid via ${order.payment_method.account}
          </div>
        </div>

        <div class="footer">
          <div>Thank you for using Ready Ride!</div>
          <div>Generated on ${new Date().toLocaleString()}</div>
        </div>
      </body>
      </html>
    `

    // Create and download the receipt
    const blob = new Blob([receiptHTML], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Ready-Ride-Receipt-${order.tracking_id}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setGeneratingReceipt(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fffbeb] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tracking details...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#fffbeb] p-4">
        <div className="p-4 flex items-center bg-white rounded-lg mb-4">
          <button onClick={() => router.push("/track")} className="mr-4" aria-label="Go back">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">Tracking Details</h1>
        </div>

        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-red-500 mb-4">{error || "Order not found"}</p>
          <button onClick={() => router.push("/track")} className="px-6 py-2 bg-primary text-white rounded-full">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Only show map for Order type with rider assigned
  const showMap = order.order_type === "Order" && order.rid && rider

  return (
    <div className="min-h-screen bg-[#fffbeb] pb-20">
      {/* Header */}
      <div className="p-4 flex items-center bg-white">
        <button onClick={() => router.push("/track")} className="mr-4" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Tracking Details</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Tracking Info */}
        <div className="bg-white rounded-lg p-4">
          <h2 className="text-xl font-bold">
            {order.order_type} ID: {order.tracking_id}
          </h2>
          <p className="text-gray-500">{new Date(order.createTime).toLocaleDateString()}</p>
          <p className={`font-medium ${getStatusColor(order.status)}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </p>
        </div>

        {/* Tracking Error Alert */}
        {trackingError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="text-yellow-600 mr-2" size={20} />
              <div>
                <p className="text-yellow-800 font-medium">Live Tracking Unavailable</p>
                {/*<p className="text-yellow-700 text-sm">{trackingError}</p>*/}
              </div>
            </div>
          </div>
        )}

        {/* Rider Info (if available) */}
        {rider && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">
              Delivery Agent
              {isTrackingActive && <span className="ml-2 text-sm font-normal text-green-600">● Live Tracking</span>}
            </h3>
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full overflow-hidden mr-3">
                {rider.photo_url ? (
                  <Image
                    src={rider.photo_url || "/placeholder.svg"}
                    alt={rider.display_name}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <User className="text-gray-500" size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{rider.display_name}</p>
                <div className="flex items-center text-gray-500">
                  <Phone size={14} className="mr-1" />
                  <p className="text-sm">{rider.phone_number}</p>
                </div>
                {/*<div className="flex items-center text-gray-500">
                  <div className={`w-2 h-2 rounded-full mr-2 ${rider.online ? "bg-green-500" : "bg-gray-400"}`}></div>
                  <p className="text-sm">{rider.online ? "Online" : "Offline"}</p>
                </div>*/}
              </div>
              {riderLocation && (
                <div className="text-right text-sm text-gray-500">
                  <p>Current location:</p>
                  <p className="font-medium">{riderLocation.street_name}</p>
                  <p>Speed: {riderLocation.speed.toFixed(2)} km/h</p>
                  <p className="text-xs">Updated: {new Date(riderLocation.updated_time).toLocaleTimeString()}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Map */}
        {showMap && (
          <div className="bg-white rounded-lg overflow-hidden">
            <div id="tracking-map" className="h-48 w-full bg-gray-100"></div>
            <div className="p-2 flex items-center justify-center text-xs text-gray-500">
              <div className="flex items-center mr-4">
                <div className="w-3 h-3 bg-amber-500 rounded-full mr-1"></div>
                <span>Restaurant</span>
              </div>
              <div className="flex items-center mr-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                <span>Delivery Location</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                <span>Rider {riderLocation ? "(Live)" : "(Offline)"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Status Timeline */}
        {statuses.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">Delivery Status</h3>
            <DeliveryStatusTimeline statuses={statuses} />
          </div>
        )}

        {/* Delivery Timeline */}
        <div className="bg-white rounded-lg p-4">
          {/* Multiple Pickup Locations */}
          {order.locations &&
            order.locations.map((location, index) => (
              <div key={index} className="flex items-start mb-6">
                <div className="mr-3 flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <MapPin className="text-white" size={14} />
                  </div>
                  {index < order.locations!.length - 1 && <div className="w-0.5 h-16 bg-primary mt-1"></div>}
                </div>
                <div>
                  <p className="font-bold">
                    Pickup {order.locations.length > 1 ? `${index + 1}` : ""}: {location.name}
                  </p>
                  <p className="text-gray-800">{location.location}</p>
                  <p className="text-gray-500 text-sm">{order.collect_time}</p>
                </div>
              </div>
            ))}

          {/* Delivery Location */}
          <div className="flex items-start">
            <div className="mr-3">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <MapPin className="text-white" size={14} />
              </div>
            </div>
            <div>
              <p className="font-bold">Deliver to</p>
              {order.receiver && (
                <>
                  <p className="text-gray-800">{order.receiver.name}</p>
                  <p className="text-gray-500 text-sm">{order.receiver.location}</p>
                  <p className="text-gray-500 text-sm">{order.receiver.contact}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Order Details (for Order type) */}
        {order.order_type === "Order" && order.order_details && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">Order details</h3>

            {/* Group items by eatery_id */}
            {Object.entries(
              order.order_details.reduce(
                (acc, item) => {
                  if (!acc[item.eatery_id]) {
                    acc[item.eatery_id] = []
                  }
                  acc[item.eatery_id].push(item)
                  return acc
                },
                {} as Record<string, typeof order.order_details>,
              ),
            ).map(([eateryId, items], index) => {
              // Find eatery name from locations
              const eatery = order.locations?.find((loc) => loc.eatery_id === eateryId)

              return (
                <div key={eateryId} className={index > 0 ? "mt-4 pt-4 border-t border-gray-200" : ""}>
                  {eatery && <p className="font-bold mb-2">{eatery.name}</p>}

                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-gray-800">
                          {item.quantity}x {item.name}
                        </p>
                        {item.description && <p className="text-gray-500 text-sm">{item.description}</p>}
                      </div>
                      <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Package Details (for Parcel type) */}
        {order.order_type === "Parcel" && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">Package details</h3>
            <p className="text-gray-500">Package tracking details will be implemented later.</p>
          </div>
        )}

        {/* Payment */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3">Payment</h3>

          <div className="flex justify-between items-center mb-3">
            <p className="text-gray-500">{order.order_type === "Order" ? "Order total" : "Package fee"}</p>
            <p className="font-medium">{formatCurrency(order.total_amount - order.delivery_fee)}</p>
          </div>

          <div className="flex justify-between items-center mb-3">
            <p className="text-gray-500">Delivery fee</p>
            <p className="font-medium">{formatCurrency(order.delivery_fee)}</p>
          </div>

          {order.promo > 0 && (
            <div className="flex justify-between items-center mb-3">
              <p className="text-gray-500">Promo discount</p>
              <p className="font-medium text-green-500">-{formatCurrency(order.promo)}</p>
            </div>
          )}

          <div className="border-t border-gray-200 mt-3 pt-3">
            <div className="flex justify-between items-center">
              <p className="font-bold">Total</p>
              <p className="font-bold">{formatCurrency(order.total_amount)}</p>
            </div>
            <p className="text-gray-500 text-sm mt-1">Paid via {order.payment_method.account}</p>
          </div>
        </div>
      </div>

      {/* Get Receipt Button */}
      <div className="p-4">
        <button
          onClick={generateReceipt}
          disabled={generatingReceipt}
          className="w-full border border-gray-300 text-gray-500 py-3 rounded-full text-center font-medium flex items-center justify-center disabled:opacity-50"
        >
          {generatingReceipt ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
              Generating receipt...
            </>
          ) : (
            <>
              <Download size={16} className="mr-2" />
              Get receipt
            </>
          )}
        </button>
      </div>
    </div>
  )
}
