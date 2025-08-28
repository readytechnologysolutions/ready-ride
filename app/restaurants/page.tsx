"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft, Search, MapPin, Star, ChevronDown, Clock } from "lucide-react"
import LocationDialog from "@/components/location-dialog"
import ClosedRestaurantDialog from "@/components/closed-restaurant-dialog"
import { useAuth } from "@/contexts/auth-context"
import {
  getRestaurants,
  getRestaurantsByCategory,
  getCategories,
  getUserProfile,
  type Restaurant,
  type Category,
} from "@/lib/firestore-service"
import { isRestaurantOpen, getEstimatedDeliveryTime, getDeliveryFee } from "@/utils/restaurant-utils"
import { getIconByCode } from "@/utils/icon-utils"

export default function RestaurantsPage() {
  const router = useRouter()
  const [location, setLocation] = useState("Loading...")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showLocationDialog, setShowLocationDialog] = useState(false)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
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

  // Fetch categories from Firestore
  useEffect(() => {
    async function fetchCategories() {
      try {
        setCategoriesLoading(true)
        const categoryData = await getCategories()
        setCategories(categoryData)
      } catch (error) {
        console.error("Error fetching categories:", error)
      } finally {
        setCategoriesLoading(false)
      }
    }

    if (!authLoading) {
      fetchCategories()
    }
  }, [authLoading])

  // Fetch restaurants from Firestore
  useEffect(() => {
    async function fetchRestaurants() {
      try {
        setLoading(true)
        let restaurantData: Restaurant[]

        if (selectedCategory === "all") {
          restaurantData = await getRestaurants()
        } else {
          restaurantData = await getRestaurantsByCategory(selectedCategory)
        }

        setRestaurants(restaurantData)
      } catch (error) {
        console.error("Error fetching restaurants:", error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchRestaurants()
    }
  }, [authLoading, selectedCategory])

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

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category)
  }

  const handleLocationClick = () => {
    setShowLocationDialog(true)
  }

  const handleSelectLocation = (selectedLocation: string) => {
    setLocation(selectedLocation)
    setShowLocationDialog(false)
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

  const filteredRestaurants = restaurants.filter((restaurant) => {
    if (searchQuery) {
      return (
        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.categories.some((cat) => cat.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    return true
  })

  return (
    <div className="min-h-screen bg-[#fffbeb]">
      {/* Header */}
      <div className="p-4 flex items-center">
        <button onClick={() => router.back()} className="mr-2" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center" onClick={handleLocationClick}>
          <MapPin className="text-primary mr-1" size={20} />
          <span className="font-medium">{location}</span>
          <ChevronDown className="text-primary ml-1" size={16} />
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="text-gray-400" size={20} />
          </div>
          <input
            type="text"
            placeholder="search restaurants"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-full focus:outline-none"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 mb-6">
        <div className="flex space-x-3 overflow-x-auto pb-2 -mx-1 px-1">
          {/* All Category */}
          <button
            onClick={() => handleCategorySelect("all")}
            className={`flex-shrink-0 px-4 py-3 rounded-lg ${
              selectedCategory === "all" ? "bg-primary text-white" : "bg-white"
            }`}
          >
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium">All</span>
            </div>
          </button>

          {/* Dynamic Categories from Firestore */}
          {categoriesLoading
            ? // Loading skeleton for categories
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 px-4 py-3 rounded-lg bg-white animate-pulse">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 bg-gray-200 rounded mb-1"></div>
                    <div className="w-12 h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))
            : categories.map((category) => {
                const IconComponent = getIconByCode(category.icon)
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.name)}
                    className={`flex-shrink-0 px-4 py-3 rounded-lg ${
                      selectedCategory === category.name ? "bg-primary text-white" : "bg-white"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <IconComponent size={20} className="mb-1" />
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                  </button>
                )
              })}
        </div>
      </div>

      {/* Restaurant List */}
      <div className="px-4 space-y-4 pb-20">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm animate-pulse">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-3">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-2 w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))
        ) : filteredRestaurants.length > 0 ? (
          filteredRestaurants.map((restaurant) => {
            const isOpen = isRestaurantOpen(restaurant.opens, restaurant.closes)

            return (
              <div
                key={restaurant.id}
                className="bg-white rounded-lg overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleRestaurantClick(restaurant)}
              >
                <div className="relative h-48">
                  <Image
                    src={restaurant.picture || "/placeholder.svg"}
                    alt={restaurant.name}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-white bg-opacity-80 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium">{restaurant.type}</span>
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
                      {/*<Star className="text-yellow-400 mr-1" size={16} fill="currentColor" />
                      <span className="text-sm">4.{Math.floor(Math.random() * 5) + 1}</span>
                      <span className="text-gray-400 text-xs ml-1">
                        {Math.floor(Math.random() * 500) + 100} reviews
                      </span>*/}
                    </div>
                  </div>
                  <div className="flex items-center text-gray-500 mb-1">
                    <MapPin size={14} className="mr-1" />
                    <span className="text-sm">{restaurant.address}</span>
                  </div>
                  <div className="flex items-center text-gray-500 mb-2">
                    <span className="text-xs">{restaurant.categories.join(", ")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">Meals from {restaurant.price_range}</p>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {isOpen ? (
                      <span className="text-green-600">Open • Closes {restaurant.closes}</span>
                    ) : (
                      <span className="text-red-600">Closed • Opens {restaurant.opens}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 relative">
              <Image src="/no-orders.png" alt="No restaurants found" fill className="object-contain opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-500">Try adjusting your search or category filter</p>
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
    </div>
  )
}
