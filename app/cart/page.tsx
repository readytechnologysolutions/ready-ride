"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Edit, Trash2, MapPin, Clock } from "lucide-react"
import AuthGuard from "@/components/auth-guard"
import { useAuth } from "@/contexts/auth-context"
import { useAppSettings } from "@/contexts/app-settings-context"
import {
  groupCartByEatery,
  removeFromCart,
  calculateDeliveryFee,
  type CartGroup,
  type DeliveryCalculation,
} from "@/utils/cart-utils"
import { getUserProfile, type UserProfile, getUserPromos, type UserPromo } from "@/lib/firestore-service"
import LocationDialog from "@/components/location-dialog"

// Loading component for cart
const CartLoading = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#fffbeb]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    <p className="mt-4 text-gray-600">Loading your cart...</p>
  </div>
)

export default function CartPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { settings } = useAppSettings()
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showLocationDialog, setShowLocationDialog] = useState(false)
  const [itemToRemove, setItemToRemove] = useState<{ itemId: string; eateryId: string } | null>(null)
  const [cartGroups, setCartGroups] = useState<CartGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [calculatingFee, setCalculatingFee] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryCalculation>({
    totalDistance: 0,
    deliveryFee: 0,
    exceedsMaxDistance: false,
    maxDistance: 50000,
  })

  const [userPromos, setUserPromos] = useState<UserPromo[]>([])
  const [appliedPromo, setAppliedPromo] = useState<UserPromo | null>(null)
  const [promoDiscount, setPromoDiscount] = useState(0)

  useEffect(() => {
    const loadCartData = async () => {
      try {
        setLoading(true)

        // Load cart groups
        const groups = await groupCartByEatery()
        setCartGroups(groups)

        // Load user profile for address
        if (user?.uid) {
          const profile = await getUserProfile(user.uid)
          setUserProfile(profile)

          // Load user promos
          const promos = await getUserPromos(user.uid)
          setUserPromos(promos)

          // Calculate delivery fee if we have settings, cart items, and user address
          if (settings && groups.length > 0 && profile?.address) {
            const delivery = await calculateDeliveryFee(
              groups,
              { lat: profile.address.lat, lon: profile.address.lon },
              settings.base_fare,
              settings.distance_rate,
              settings.max_distance,
            )
            setDeliveryInfo(delivery)
          }
        }
      } catch (error) {
        console.error("Error loading cart data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadCartData()
  }, [user, settings])

  // Apply best available promo when cart or promos change
  useEffect(() => {
    if (userPromos.length > 0 && cartGroups.length > 0) {
      const subtotal = getCartSubtotal()
      let bestPromo: UserPromo | null = null
      let bestDiscount = 0

      // Find the best applicable promo
      for (const promo of userPromos) {
        const minPrice = typeof promo.min_price === "string" ? Number.parseFloat(promo.min_price) : promo.min_price
        const discountPercent = typeof promo.discount === "string" ? Number.parseFloat(promo.discount) : promo.discount

        if (subtotal >= minPrice) {
          const discount = (subtotal * discountPercent) / 100
          if (discount > bestDiscount) {
            bestPromo = promo
            bestDiscount = discount
          }
        }
      }

      setAppliedPromo(bestPromo)
      setPromoDiscount(bestDiscount)
    } else {
      setAppliedPromo(null)
      setPromoDiscount(0)
    }
  }, [userPromos, cartGroups])

  const recalculateDeliveryFee = async () => {
    if (!settings || cartGroups.length === 0 || !userProfile?.address) return

    try {
      setCalculatingFee(true)
      const delivery = await calculateDeliveryFee(
        cartGroups,
        { lat: userProfile.address.lat, lon: userProfile.address.lon },
        settings.base_fare,
        settings.distance_rate,
        settings.max_distance,
      )
      setDeliveryInfo(delivery)
    } catch (error) {
      console.error("Error recalculating delivery fee:", error)
    } finally {
      setCalculatingFee(false)
    }
  }

  const handleLocationChange = async (newLocation: string) => {
    // Reload user profile to get updated address
    if (user?.uid) {
      try {
        setCalculatingFee(true)
        const updatedProfile = await getUserProfile(user.uid)
        setUserProfile(updatedProfile)

        // Recalculate delivery fee with new address
        if (updatedProfile?.address && settings && cartGroups.length > 0) {
          const delivery = await calculateDeliveryFee(
            cartGroups,
            { lat: updatedProfile.address.lat, lon: updatedProfile.address.lon },
            settings.base_fare,
            settings.distance_rate,
            settings.max_distance,
          )
          setDeliveryInfo(delivery)
        }
      } catch (error) {
        console.error("Error updating location and recalculating fee:", error)
      } finally {
        setCalculatingFee(false)
      }
    }
  }

  const handleEditItem = (eateryId: string, itemId: string) => {
    // Find the item to get food_id for navigation
    const group = cartGroups.find((g) => g.eatery_id === eateryId)
    const item = group?.items.find((i) => i.id === itemId)
    if (item) {
      router.push(`/restaurants/${eateryId}/items/${item.food_id}`)
    }
  }

  const handleRemoveItem = (itemId: string, eateryId: string) => {
    setItemToRemove({ itemId, eateryId })
    setShowRemoveModal(true)
  }

  const confirmRemoveItem = async () => {
    if (itemToRemove) {
      removeFromCart(itemToRemove.itemId, itemToRemove.eateryId)

      // Reload cart data
      const groups = await groupCartByEatery()
      setCartGroups(groups)

      // Recalculate delivery fee
      if (settings && groups.length > 0 && userProfile?.address) {
        const delivery = await calculateDeliveryFee(
          groups,
          { lat: userProfile.address.lat, lon: userProfile.address.lon },
          settings.base_fare,
          settings.distance_rate,
          settings.max_distance,
        )
        setDeliveryInfo(delivery)
      }

      setShowRemoveModal(false)
      setItemToRemove(null)
    }
  }

  const cancelRemoveItem = () => {
    setShowRemoveModal(false)
    setItemToRemove(null)
  }

  const handleAddAnotherOrder = () => {
    router.push("/restaurants")
  }

  const handleConfirmOrder = () => {
    // Navigate to payment page
    router.push("/payment")
  }

  const calculateCartTotal = () => {
    const subtotal = cartGroups.reduce((sum, group) => sum + group.subtotal, 0)
    const deliveryFee = deliveryInfo?.deliveryFee || 0
    return subtotal + deliveryFee - promoDiscount
  }

  const getCartSubtotal = () => {
    return cartGroups.reduce((sum, group) => sum + group.subtotal, 0)
  }

  const hasValidAddress = () => {
    if (!userProfile?.address) return false
    const { lat, lon } = userProfile.address
    return lat !== undefined && lat !== 0 && lon !== undefined && lon !== 0
  }

  if (loading) {
    return <CartLoading />
  }

  if (cartGroups.length === 0) {
    return (
      <AuthGuard fallback={<CartLoading />}>
        <div className="min-h-screen bg-[#fffbeb] pb-32">
          {/* Header */}
          <div className="p-4 flex items-center bg-white">
            <button onClick={() => router.back()} className="mr-4" aria-label="Go back">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold">My Order</h1>
          </div>

          {/* Empty cart state */}
          <div className="flex flex-col items-center justify-center h-96">
            <div className="text-gray-400 mb-4">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-4">Add some delicious items to get started</p>
            <button
              onClick={() => router.push("/restaurants")}
              className="bg-primary text-white px-6 py-3 rounded-full font-medium"
            >
              Browse Restaurants
            </button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard fallback={<CartLoading />}>
      <div className="min-h-screen bg-[#fffbeb] pb-32">
        {/* Header */}
        <div className="p-4 flex items-center bg-white">
          <button onClick={() => router.back()} className="mr-4" aria-label="Go back">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">My Order</h1>
        </div>

        {/* Delivery Address */}
        {userProfile?.address && (
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <MapPin className="text-primary mr-2" size={16} />
                <div className="flex-1">
                  <p className="font-medium">{userProfile.address.name}</p>
                  <p className="text-sm text-gray-500">{userProfile.address.address}</p>
                </div>
              </div>
              <button
                onClick={() => setShowLocationDialog(true)}
                className="ml-4 px-3 py-1 text-sm text-primary border border-primary rounded-full hover:bg-primary hover:text-white transition-colors"
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* Cart Items by Restaurant */}
        <div className="bg-gray-100 min-h-[calc(100vh-20rem)]">
          {cartGroups.map((group) => (
            <div key={group.eatery_id} className="mb-4">
              <div className="p-4 bg-white">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-bold">{group.eatery_name}</h2>
                  <p className="text-sm text-gray-500">Subtotal: GH₵ {group.subtotal.toFixed(2)}</p>
                </div>
                <p className="text-sm text-gray-500 mb-4">{group.eatery_address}</p>

                {group.items.map((item) => (
                  <div
                    key={`${item.id}-${item.eatery_id}`}
                    className="flex justify-between items-start py-2 border-b border-gray-200 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-bold">
                        {item.name}
                        {item.food_name && <span className="text-gray-500"> ({item.food_name})</span>}
                        <span className="text-primary ml-2">x{item.quantity}</span>
                      </p>
                      {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                      <p className="text-sm font-medium">GH₵ {item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center ml-4">
                      <p className="font-bold mr-4">GH₵ {(item.price * item.quantity).toFixed(2)}</p>
                      <button
                        onClick={() => handleEditItem(item.eatery_id, item.id)}
                        className="text-primary mr-2"
                        aria-label="Edit item"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.id, item.eatery_id)}
                        className="text-red-500"
                        aria-label="Remove item"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Add Another Order */}
          <div className="p-4 border-t border-b border-gray-200 bg-white">
            <button onClick={handleAddAnotherOrder} className="w-full text-primary font-medium py-2">
              Add another order
            </button>
          </div>

          {/* Order Summary */}
          <div className="p-4 bg-white">
            <div className="flex justify-between items-center mb-2">
              <p className="text-gray-500">Subtotal:</p>
              <p className="font-bold">GH₵ {getCartSubtotal().toFixed(2)}</p>
            </div>

            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="text-gray-500">Delivery fee:</p>
                {deliveryInfo.totalDistance > 0 && (
                  <p className="text-xs text-gray-400">Distance: {(deliveryInfo.totalDistance / 1000).toFixed(1)}km</p>
                )}
              </div>
              <div className="flex items-center">
                {calculatingFee ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary mr-2"></div>
                    <p className="text-sm text-gray-500">Calculating...</p>
                  </div>
                ) : (
                  <p className="font-bold">GH₵ {(deliveryInfo?.deliveryFee || 0).toFixed(2)}</p>
                )}
              </div>
            </div>

            {/* Promo Discount */}
            {appliedPromo && promoDiscount > 0 && (
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="text-green-600 font-medium">Promo Applied:</p>
                </div>
                <p className="font-bold text-green-600">-GH₵ {promoDiscount.toFixed(2)}</p>
              </div>
            )}

            {/* Multiple Restaurant Warning */}
            {cartGroups.length > 1 && (
              <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-amber-800 font-medium">Multiple Restaurant Order</p>
                    <p className="text-sm text-amber-700">
                      Your order includes items from {cartGroups.length} restaurants. This may take longer to deliver as
                      our rider will need to visit multiple locations.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Long Distance Warning */}
            {deliveryInfo.exceedsMaxDistance && (
              <div className="mb-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Clock className="w-5 h-5 text-orange-400 mt-0.5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-orange-800 font-medium">Long Distance Delivery</p>
                    <p className="text-sm text-orange-700">
                      Your delivery distance ({(deliveryInfo.totalDistance / 1000).toFixed(1)}km) exceeds our standard
                      range ({(deliveryInfo.maxDistance / 1000).toFixed(1)}km). This delivery may take significantly
                      longer than usual.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <p className="font-bold text-lg">TOTAL</p>
              <p className="font-bold text-lg">GH₵ {(calculateCartTotal() || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Confirm Order Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          {!hasValidAddress() && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <MapPin className="w-5 h-5 text-red-400 mt-0.5" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800 font-medium">Delivery Address Required</p>
                  <p className="text-sm text-red-700">Please set your delivery address before confirming your order.</p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleConfirmOrder}
            disabled={calculatingFee || !hasValidAddress()}
            className={`w-full py-4 rounded-full text-center text-xl font-medium transition-colors ${
              calculatingFee || !hasValidAddress()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-primary text-white hover:bg-primary/90"
            }`}
          >
            {calculatingFee ? "Calculating..." : !hasValidAddress() ? "Set Delivery Address" : "Confirm Order"}
          </button>
        </div>

        {/* Location Dialog */}
        <LocationDialog
          isOpen={showLocationDialog}
          onClose={() => setShowLocationDialog(false)}
          onSelectLocation={handleLocationChange}
        />

        {/* Remove Item Modal */}
        {showRemoveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-[80%] max-w-sm overflow-hidden">
              <div className="flex flex-col items-center p-6">
                <div className="w-16 h-16 rounded-full bg-primary bg-opacity-20 flex items-center justify-center mb-4">
                  <Trash2 className="text-primary" size={32} />
                </div>
                <h2 className="text-xl font-bold mb-4">Are you sure you want to remove this item?</h2>
              </div>

              <div className="flex border-t border-gray-200">
                <button
                  onClick={cancelRemoveItem}
                  className="flex-1 p-4 text-gray-500 font-medium border-r border-gray-200"
                >
                  Cancel
                </button>
                <button onClick={confirmRemoveItem} className="flex-1 p-4 text-red-500 font-medium">
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
