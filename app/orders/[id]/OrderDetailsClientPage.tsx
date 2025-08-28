"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, MapPin, Clock, Star } from "lucide-react"
import RatingDialog from "@/components/rating-dialog"
import { useAuth } from "@/contexts/auth-context"
import {
  getDeliveryOrder,
  type DeliveryOrder,
  getUserFoodRating,
  addFoodRating,
  type FoodRating,
  getUserProfile,
} from "@/lib/firestore-service"
import { addToCart, type CartItem } from "@/utils/cart-utils"

type OrderItem = {
  name: string
  food_name: string
  description: string
  quantity: number
  price: number
  eatery_id: string
  food_id: string
  id: string
}

type DishGroup = {
  food_name: string
  food_id: string
  eatery_id: string
  userRating?: FoodRating
  items: OrderItem[]
  totalQuantity: number
  totalPrice: number
}

type GroupedOrderItems = {
  [eateryId: string]: {
    eateryName: string
    dishes: DishGroup[]
  }
}

export default function OrderDetailsClientPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const orderId = params.id

  // Add state for the rating dialog
  const [showRatingDialog, setShowRatingDialog] = useState(false)
  const [dishToRate, setDishToRate] = useState<DishGroup | null>(null)

  const { user } = useAuth()
  const [orderDetails, setOrderDetails] = useState<DeliveryOrder | null>(null)
  const [groupedItems, setGroupedItems] = useState<GroupedOrderItems>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const order = await getDeliveryOrder(orderId)
        if (order && user) {
          setOrderDetails(order)
          await loadGroupedItems(order)
        }
      } catch (error) {
        console.error("Error loading order:", error)
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [orderId, user])

  const loadGroupedItems = async (order: DeliveryOrder) => {
    if (!user) return

    const grouped: GroupedOrderItems = {}

    // Group items by eatery, then by dish
    for (const item of order.order_details) {
      if (!grouped[item.eatery_id]) {
        // Find eatery name from locations
        const eateryLocation = order.locations.find((loc) => loc.eatery_id === item.eatery_id)
        grouped[item.eatery_id] = {
          eateryName: eateryLocation?.name || "Unknown Restaurant",
          dishes: [],
        }
      }

      // Find existing dish group or create new one
      let dishGroup = grouped[item.eatery_id].dishes.find((dish) => dish.food_id === item.food_id)

      if (!dishGroup) {
        // Load user's rating for this dish
        const userRating = await getUserFoodRating(item.eatery_id, item.food_id, user.uid)

        dishGroup = {
          food_name: item.food_name,
          food_id: item.food_id,
          eatery_id: item.eatery_id,
          userRating,
          items: [],
          totalQuantity: 0,
          totalPrice: 0,
        }
        grouped[item.eatery_id].dishes.push(dishGroup)
      }

      // Add item to dish group
      dishGroup.items.push(item)
      dishGroup.totalQuantity += item.quantity
      dishGroup.totalPrice += item.price * item.quantity
    }

    setGroupedItems(grouped)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "delivered":
        return "text-green-500"
      case "ongoing":
        return "text-primary"
      case "cancelled":
        return "text-red-500"
      default:
        return "text-gray-500"
    }
  }

  const handleReorder = () => {
    if (!orderDetails?.order_details) return

    // Add all items from the order to cart
    orderDetails.order_details.forEach((item) => {
      const cartItem: CartItem = {
        name: item.name,
        required: item.required,
        price: item.price,
        description: item.description,
        id: item.id,
        food_id: item.food_id,
        food_name: item.food_name,
        eatery_id: item.eatery_id,
        quantity: item.quantity,
      }
      addToCart(cartItem)
    })

    // Navigate to cart
    router.push("/cart")
  }

  // Update the handleRateFood function to open the rating dialog
  const handleRateDish = (dish: DishGroup) => {
    setDishToRate(dish)
    setShowRatingDialog(true)
  }

  // Add a function to handle rating submission
  const handleRatingSubmit = async (rating: number, comment: string) => {
    if (!dishToRate || !user) return

    try {
      // Get user profile for name and photo
      const userProfile = await getUserProfile(user.uid)

      const success = await addFoodRating(dishToRate.eatery_id, dishToRate.food_id, {
        rate: rating,
        review: comment,
        name: userProfile?.display_name || user.displayName || "Anonymous",
        photo: userProfile?.photo_url || user.photoURL || "",
        uid: user.uid,
      })

      if (success) {
        console.log("Rating submitted successfully")
        // Reload the order to get updated ratings
        if (orderDetails) {
          await loadGroupedItems(orderDetails)
        }
      }
    } catch (error) {
      console.error("Error submitting rating:", error)
    }

    // Close the dialog after a short delay
    setTimeout(() => {
      setShowRatingDialog(false)
      setDishToRate(null)
    }, 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffbeb] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-[#fffbeb] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-gray-500 mb-4">Order not found</h2>
          <button onClick={() => router.back()} className="bg-primary text-white px-6 py-2 rounded-full">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fffbeb] pb-20">
      {/* Header */}
      <div className="p-4 flex items-center bg-white">
        <button onClick={() => router.back()} className="mr-4" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Order Details</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Order Info */}
        <div className="bg-white rounded-lg p-4">
          <h2 className="text-xl font-bold">Order #: {orderDetails.tracking_id}</h2>
          <p className="text-gray-500">
            {new Date(orderDetails.createTime).toLocaleDateString("en-GB", {
              weekday: "short",
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p className={`font-medium ${getStatusColor(orderDetails.status)}`}>
            {orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}
          </p>
        </div>

        {/* Delivery Location */}
        <div className="bg-white rounded-lg p-4">
          <h2 className="text-xl font-bold mb-3">Delivery Location</h2>
          <div className="flex items-start mb-2">
            <MapPin className="text-primary mr-2 mt-1 flex-shrink-0" size={20} />
            <p className="text-gray-500">{orderDetails.receiver.location}</p>
          </div>
          <div className="flex items-center">
            <Clock className="text-primary mr-2 flex-shrink-0" size={20} />
            <p className="text-gray-500">{orderDetails.map_data.total_duration}</p>
          </div>
        </div>

        {/* Order Items Grouped by Eatery and Dish */}
        {Object.entries(groupedItems).map(([eateryId, eateryData]) => (
          <div key={eateryId} className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-bold mb-4 text-primary">{eateryData.eateryName}</h3>

            {eateryData.dishes.map((dish, dishIndex) => (
              <div key={`${dish.food_id}-${dishIndex}`} className="mb-6">
                {/* Dish Header with Rating */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center">
                    <h4 className="font-bold text-lg mr-3">{dish.food_name}</h4>
                    {dish.userRating && (
                      <div className="flex items-center">
                        <Star className="text-yellow-400" size={16} fill="currentColor" />
                        <span className="ml-1 text-sm">{dish.userRating.rate}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    <p className="font-bold mr-4">GHC {dish.totalPrice.toFixed(2)}</p>
                    <button
                      onClick={() => handleRateDish(dish)}
                      className="text-primary text-sm font-medium whitespace-nowrap"
                    >
                      {dish.userRating ? "Update Rating" : "Rate Dish"}
                    </button>
                  </div>
                </div>

                {/* Items under this dish */}
                <div className="ml-4 space-y-2">
                  {dish.items.map((item, itemIndex) => (
                    <div key={`${item.id}-${itemIndex}`} className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="border border-primary text-primary rounded-md px-2 py-0.5 text-xs mr-2">
                            x{item.quantity}
                          </span>
                          <p className="text-gray-600 text-sm">{item.name}</p>
                        </div>
                        {item.description && <p className="text-gray-500 text-xs ml-8 mt-1">{item.description}</p>}
                      </div>
                      <p className="text-sm font-medium">GHC {(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                {dishIndex < eateryData.dishes.length - 1 && <div className="border-b border-gray-200 my-4"></div>}
              </div>
            ))}
          </div>
        ))}

        {/* Order Summary */}
        <div className="bg-white rounded-lg p-4">
          <div className="flex justify-between mb-2">
            <p className="font-bold">Sub-total</p>
            <p className="font-bold">GHC {(orderDetails.total_amount - orderDetails.delivery_fee).toFixed(2)}</p>
          </div>
          <div className="flex justify-between mb-2">
            <p className="text-gray-500">Delivery fee</p>
            <p className="text-gray-500">GHC {orderDetails.delivery_fee.toFixed(2)}</p>
          </div>
          {orderDetails.promo > 0 && (
            <div className="flex justify-between mb-4">
              <p className="text-gray-500">Promo applied</p>
              <p className="text-gray-500">-GHC {orderDetails.promo.toFixed(2)}</p>
            </div>
          )}
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between">
              <p className="font-bold">Total amount paid</p>
              <p className="font-bold">GHC {orderDetails.total_amount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Re-order Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <button
          onClick={handleReorder}
          className="w-full bg-primary text-white py-4 rounded-full text-center text-xl font-medium"
        >
          Re-order
        </button>
      </div>

      {/* Rating Dialog */}
      {dishToRate && (
        <RatingDialog
          isOpen={showRatingDialog}
          onClose={() => setShowRatingDialog(false)}
          onSubmit={handleRatingSubmit}
          itemName={dishToRate.food_name}
        />
      )}
    </div>
  )
}
