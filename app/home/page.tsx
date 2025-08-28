"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Bell, Search, MapPin, ChevronDown, Star, Home, FileText, Map, User } from "lucide-react"
import LocationDialog from "@/components/location-dialog"
import ClosedRestaurantDialog from "@/components/closed-restaurant-dialog"
import { useAuth } from "@/contexts/auth-context"
import {
  getPopularRestaurants,
  getActivePromos,
  getUserProfile,
  checkUserHasPromo,
  claimPromo,
  getMostOrderedFoods,
  type Restaurant,
  type Promo,
  type MostOrderedFood,
} from "@/lib/firestore-service"
import { isRestaurantOpen, getEstimatedDeliveryTime, getDeliveryFee } from "@/utils/restaurant-utils"
import { GetNotifications, SaveNotification } from "@/utils/messaging"

export default function HomePage() {
  const router = useRouter()
  const [location, setLocation] = useState("Loading...")
  const [showLocationDialog, setShowLocationDialog] = useState(false)
  const [popularRestaurants, setPopularRestaurants] = useState<Restaurant[]>([])
  const [activePromos, setActivePromos] = useState<Promo[]>([])
  const [mostOrderedFoods, setMostOrderedFoods] = useState<MostOrderedFood[]>([])
  const [loading, setLoading] = useState(true)
  const [promosLoading, setPromosLoading] = useState(true)
  const [mostOrderedLoading, setMostOrderedLoading] = useState(true)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [claimingPromo, setClaimingPromo] = useState<string | null>(null)
  const { signInAnonymouslyIfNeeded, isAuthenticated, loading: authLoading, user } = useAuth()

  // Closed restaurant dialog state
  const [showClosedDialog, setShowClosedDialog] = useState(false)
  const [selectedClosedRestaurant, setSelectedClosedRestaurant] = useState<Restaurant | null>(null)

  // Sign in anonymously when the page loads to enable Firestore access
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      signInAnonymouslyIfNeeded()
    }
  }, [authLoading, isAuthenticated, signInAnonymouslyIfNeeded])

  // Load notification count
  useEffect(() => {
    const notifications = GetNotifications()
    const unreadCount = notifications.filter((n) => !n.read).length
    setUnreadNotificationCount(unreadCount)
  }, [])

  // Fetch popular restaurants from Firestore
  useEffect(() => {
    async function fetchPopularRestaurants() {
      try {
        const restaurants = await getPopularRestaurants()
        setPopularRestaurants(restaurants)
      } catch (error) {
        console.error("Error fetching popular restaurants:", error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchPopularRestaurants()
    }
  }, [authLoading])

  // Fetch active promos from Firestore
  useEffect(() => {
    async function fetchActivePromos() {
      try {
        const promos = await getActivePromos()
        setActivePromos(promos)
      } catch (error) {
        console.error("Error fetching active promos:", error)
      } finally {
        setPromosLoading(false)
      }
    }

    if (!authLoading) {
      fetchActivePromos()
    }
  }, [authLoading])

  // Fetch most ordered foods from Firestore
  useEffect(() => {
    async function fetchMostOrderedFoods() {
      try {
        const foods = await getMostOrderedFoods(10) // Get top 10 most ordered foods with 3+ orders
        setMostOrderedFoods(foods)
      } catch (error) {
        console.error("Error fetching most ordered foods:", error)
      } finally {
        setMostOrderedLoading(false)
      }
    }

    if (!authLoading) {
      fetchMostOrderedFoods()
    }
  }, [authLoading])

  // Load user's address
  useEffect(() => {
    async function loadUserAddress() {
      if (user) {
        try {
          const userDoc = await getUserProfile(user.uid)
          if (userDoc?.address?.name) {
            setLocation(userDoc.address.name)
          } else {
            setLocation("Set your location")
          }
        } catch (error) {
          console.error("Error loading user address:", error)
          setLocation("Set your location")
        }
      }
    }

    if (!authLoading && user) {
      loadUserAddress()
    }
  }, [authLoading, user])

  const handleLocationClick = () => {
    setShowLocationDialog(true)
  }

  const handleSelectLocation = (selectedLocation: string) => {
    setLocation(selectedLocation)
    setShowLocationDialog(false)
  }

  const handlePromoClick = async (promo: Promo) => {
    if (!user) {
      // Redirect to login if not authenticated
      router.push("/auth/login")
      return
    }

    try {
      setClaimingPromo(promo.id)

      // Check if user already has this promo
      const hasPromo = await checkUserHasPromo(user.uid, promo.id)

      if (hasPromo) {
        // User already has this promo, navigate to restaurants
        SaveNotification({
          title: "Promo Already Claimed",
          message: `You have already claimed the "${promo.title}" promo. You can use it when placing orders.`,
          type: "promo",
        })
        router.push("/restaurants")
      } else {
        // Claim the promo for the user
        const success = await claimPromo(user.uid, promo)

        if (success) {
          SaveNotification({
            title: "Promo Claimed Successfully!",
            message: `You have successfully claimed the "${promo.title}" promo. Get ${promo.discount}% off on orders above GHC${promo.min_price}.`,
            type: "promo",
          })
          router.push("/restaurants")
        } else {
          SaveNotification({
            title: "Failed to Claim Promo",
            message: "There was an error claiming the promo. Please try again later.",
            type: "news",
          })
        }
      }
    } catch (error) {
      console.error("Error handling promo click:", error)
      SaveNotification({
        title: "Error",
        message: "An unexpected error occurred. Please try again.",
        type: "news",
      })
    } finally {
      setClaimingPromo(null)
    }
  }

  const handleRestaurantClick = (restaurant: Restaurant) => {
    const isOpen = isRestaurantOpen(restaurant.opens, restaurant.closes)

    if (!isOpen) {
      // Show closed restaurant dialog
      setSelectedClosedRestaurant(restaurant)
      setShowClosedDialog(true)
    } else {
      // Navigate to restaurant page
      router.push(`/restaurants/${restaurant.id}`)
    }
  }

  const handleFoodClick = (food: MostOrderedFood) => {
    router.push(`/restaurants/${food.eatery_id}/items/${food.food_id}`)
  }

  const handleSearchClick = () => {
    router.push("/restaurants")
  }

  return (
    <div className="min-h-screen bg-[#fffbeb] pb-20">
      {/* Header */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div onClick={handleLocationClick}>
            <p className="text-gray-500 text-sm">Current location</p>
            <div className="flex items-center">
              <MapPin className="text-primary mr-1" size={20} />
              <span className="font-bold text-lg">{location}</span>
              <ChevronDown className="text-primary ml-1" size={20} />
            </div>
          </div>
          <div className="relative">
            <Link href="/notifications">
              <div className="bg-primary rounded-lg p-3">
                <Bell className="text-white" size={20} />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <div
            className="flex items-center bg-white rounded-full border border-gray-200 px-4 py-3 cursor-pointer"
            onClick={handleSearchClick}
          >
            <Search className="text-primary mr-2" size={24} />
            <span className="text-gray-500">search ready ride...</span>
          </div>
        </div>
      </div>

      {/* Main Categories */}
      <div className="px-4 flex space-x-4 mb-6">
        <Link href="/restaurants" className="flex-1">
          <div className="bg-[#fff9c4] rounded-xl p-4 h-32 relative overflow-hidden">
            <h2 className="text-xl font-bold mb-2">Eateries</h2>
            <div className="absolute bottom-0 right-0 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32">
              <Image src="/restaurant-food-icon.png" alt="Food" fill className="object-contain rounded-tl-xl" />
            </div>
          </div>
        </Link>
        <Link href="/parcel" className="flex-1">
          <div className="bg-[#e3f2fd] rounded-xl p-4 h-32 relative overflow-hidden">
            <h2 className="text-xl font-bold mb-2">Parcel delivery</h2>
            <div className="absolute bottom-0 right-0 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32">
              <Image src="/parcel-delivery-icon.png" alt="Parcel" fill className="object-contain rounded-tl-xl" />
            </div>
          </div>
        </Link>
      </div>

      {/* Popular Eateries */}
      <div className="px-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Popular Eateries</h2>
          <Link href="/restaurants" className="text-gray-500">
            view all
          </Link>
        </div>

        {loading ? (
          <div className="flex space-x-4 overflow-x-auto pb-2 -mx-4 px-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm min-w-[280px] overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-200"></div>
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2 w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex space-x-4 overflow-x-auto pb-2 -mx-4 px-4">
            {popularRestaurants.map((restaurant) => {
              const isOpen = isRestaurantOpen(restaurant.opens, restaurant.closes)
              const deliveryTime = getEstimatedDeliveryTime()
              const deliveryFee = getDeliveryFee()

              return (
                <div
                  key={restaurant.id}
                  onClick={() => handleRestaurantClick(restaurant)}
                  className="bg-white rounded-xl shadow-sm min-w-[280px] overflow-hidden cursor-pointer"
                >
                  <div className="relative h-40">
                    <Image
                      src={restaurant.picture || "/placeholder.svg"}
                      alt={restaurant.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-4 left-4 bg-gray-200 bg-opacity-80 rounded-full px-3 py-1">
                      <span className="text-sm">{restaurant.type}</span>
                    </div>
                    {!isOpen && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white font-medium">Closed</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-lg">{restaurant.name}</h3>
                      <div className="flex items-center">
                        <Star className="text-yellow-400 mr-1" size={16} fill="currentColor" />
                        <span className="text-sm">4.{Math.floor(Math.random() * 5) + 1}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-500 mb-2">
                      <MapPin size={14} className="mr-1" />
                      <span className="text-sm">{restaurant.address}</span>
                    </div>
                    <div className="flex items-center text-gray-500 mb-2">
                      <span className="text-xs">{restaurant.categories.join(", ")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600">Meals from {restaurant.price_range}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dynamic Promo Banner */}
      {promosLoading ? (
        <div className="px-4 mb-6">
          <div className="bg-gray-200 rounded-xl p-4 relative overflow-hidden animate-pulse">
            <div className="w-3/5">
              <div className="h-6 bg-gray-300 rounded mb-2 w-24"></div>
              <div className="h-4 bg-gray-300 rounded mb-1 w-32"></div>
              <div className="h-8 bg-gray-300 rounded mb-1 w-16"></div>
              <div className="h-4 bg-gray-300 rounded mb-3 w-40"></div>
              <div className="h-10 bg-gray-300 rounded w-24"></div>
            </div>
          </div>
        </div>
      ) : activePromos.length > 0 ? (
        <div className="px-4 mb-6">
          {activePromos.map((promo) => (
            <div key={promo.id} className="bg-gray-200 rounded-xl p-4 relative overflow-hidden mb-4">
              <div className="absolute -right-4 bottom-0">
                <div className="relative w-full aspect-square">
                  <Image
                    src={promo.image || "/promo-person.jpg"}
                    alt="Promo"
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              </div>
              <div className="w-3/5">
                <div className="bg-yellow-100 inline-block px-3 py-1 rounded-full text-sm font-medium mb-2">
                  {promo.title}
                </div>
                <p className="text-gray-600 mb-1">Get special offer up to</p>
                <p className="text-primary text-3xl font-bold mb-1">{promo.discount}%</p>
                <p className="text-gray-600 mb-3">
                  on all orders above <span className="font-bold">GHC{promo.min_price}</span>
                </p>
                <button
                  onClick={() => handlePromoClick(promo)}
                  disabled={claimingPromo === promo.id}
                  className="bg-primary text-white px-6 py-2 rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {claimingPromo === promo.id ? "Claiming..." : promo.button_text}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Most Ordered Foods */}
      <div className="px-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Most Ordered Food</h2>
          <Link href="/restaurants" className="text-gray-500">
            view all
          </Link>
        </div>

        {mostOrderedLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
                <div className="h-32 bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : mostOrderedFoods.length > 0 ? (
          <div className="space-y-3">
            {mostOrderedFoods.map((food) => (
              <div
                key={`${food.eatery_id}_${food.food_id}`}
                onClick={() => handleFoodClick(food)}
                className="bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                {/* Eatery Image */}
                <div className="relative h-32">
                  <Image
                    src={food.eatery_picture || "/placeholder.svg"}
                    alt={food.eatery_name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                  <div className="absolute bottom-3 left-3">
                    <h4 className="font-bold text-sm text-white">{food.eatery_name}</h4>
                  </div>
                  <div className="absolute top-3 right-3">
                    <div className="bg-white bg-opacity-90 rounded-full px-2 py-1 flex items-center">
                      <Star className="text-yellow-400 mr-1" size={12} fill="currentColor" />
                      <span className="text-xs font-medium">4.{Math.floor(Math.random() * 5) + 1}</span>
                    </div>
                  </div>
                </div>

                {/* Food Details */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg flex-1">{food.food_name}</h3>
                    <p className="text-primary font-bold text-lg ml-2">GH₵ {food.price.toFixed(2)}</p>
                  </div>
                  {food.name && <p className="text-gray-500 text-sm mb-2">{food.name}</p>}
                  <div className="flex justify-between items-center">
                    <p className="text-gray-500 text-sm">{food.order_count} orders</p>
                    <div className="bg-primary bg-opacity-10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                      Popular
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No popular foods found</p>
            <p className="text-gray-400 text-sm mt-1">Foods need at least 3 orders to appear here</p>
          </div>
        )}
      </div>

      {/* Location Dialog */}
      <LocationDialog
        isOpen={showLocationDialog}
        onClose={() => setShowLocationDialog(false)}
        onSelectLocation={handleSelectLocation}
      />

      {/* Closed Restaurant Dialog */}
      {selectedClosedRestaurant && (
        <ClosedRestaurantDialog
          isOpen={showClosedDialog}
          onClose={() => setShowClosedDialog(false)}
          restaurantName={selectedClosedRestaurant.name}
          opensAt={selectedClosedRestaurant.opens}
        />
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3">
        <Link href="/home" className="flex flex-col items-center text-primary">
          <Home size={24} />
          <span className="text-xs mt-1">Home</span>
        </Link>
        <Link href="/orders" className="flex flex-col items-center text-gray-500">
          <FileText size={24} />
          <span className="text-xs mt-1">Orders</span>
        </Link>
        <Link href="/track" className="flex flex-col items-center text-gray-500">
          <Map size={24} />
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
