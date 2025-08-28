"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, MapPin, Clock, Star, ChevronDown } from "lucide-react"
import RestaurantHeader from "./components/restaurant-header"
import ReviewItem from "./components/review-item"
import {
  getRestaurantById,
  getMenuItems,
  getFoodRatings,
  type Restaurant,
  type MenuItem,
  type FoodRating,
} from "@/lib/firestore-service"
import { isRestaurantOpen } from "@/utils/restaurant-utils"
import { useAuth } from "@/contexts/auth-context"

type GroupedRating = {
  dishName: string
  dishId: string
  ratings: FoodRating[]
  averageRating: number
  totalRatings: number
}

export default function RestaurantDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { signInAnonymouslyIfNeeded } = useAuth()
  const restaurantId = params.id

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [groupedRatings, setGroupedRatings] = useState<GroupedRating[]>([])
  const [loading, setLoading] = useState(true)
  const [menuLoading, setMenuLoading] = useState(true)
  const [ratingsLoading, setRatingsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"menu" | "reviews">("menu")
  const [reviewSort, setReviewSort] = useState<string>("recent")
  const [showSortModal, setShowSortModal] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      // Sign in anonymously for Firestore access
      await signInAnonymouslyIfNeeded()

      // Fetch restaurant data
      const restaurantData = await getRestaurantById(restaurantId)
      setRestaurant(restaurantData)
      setLoading(false)

      // Fetch menu items
      if (restaurantData) {
        const menuData = await getMenuItems(restaurantId)
        setMenuItems(menuData)
        setMenuLoading(false)

        // Fetch ratings for each menu item
        const ratingsPromises = menuData.map(async (item) => {
          const ratings = await getFoodRatings(restaurantId, item.id)
          return {
            dishName: item.name,
            dishId: item.id,
            ratings: ratings,
            averageRating: ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rate, 0) / ratings.length : 0,
            totalRatings: ratings.length,
          }
        })

        const allRatings = await Promise.all(ratingsPromises)
        // Filter out dishes with no ratings
        const ratingsWithData = allRatings.filter((group) => group.ratings.length > 0)
        setGroupedRatings(ratingsWithData)
        setRatingsLoading(false)
      }
    }

    fetchData()
  }, [restaurantId, signInAnonymouslyIfNeeded])

  const handleOrderItem = (itemId: string) => {
    router.push(`/restaurants/${restaurantId}/items/${itemId}`)
  }

  const handleSortReviews = (sortType: string) => {
    setReviewSort(sortType)
    setShowSortModal(false)
  }

  // Sort grouped ratings based on selected sort type
  const sortedGroupedRatings = [...groupedRatings].sort((a, b) => {
    switch (reviewSort) {
      case "most relevant":
        return b.totalRatings - a.totalRatings
      case "most critical":
        return a.averageRating - b.averageRating
      case "most favourable":
        return b.averageRating - a.averageRating
      case "recent":
      default:
        // Sort by most recent rating within each dish
        const aLatest = a.ratings.length > 0 ? new Date(a.ratings[0].created_date).getTime() : 0
        const bLatest = b.ratings.length > 0 ? new Date(b.ratings[0].created_date).getTime() : 0
        return bLatest - aLatest
    }
  })

  if (loading || !restaurant) {
    return (
      <div className="min-h-screen bg-[#fffbeb] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading restaurant...</p>
        </div>
      </div>
    )
  }

  const isOpen = isRestaurantOpen(restaurant.opens, restaurant.closes)

  // Calculate overall restaurant rating from all dish ratings
  const allRatings = groupedRatings.flatMap((group) => group.ratings)
  const overallRating = allRatings.length > 0 ? allRatings.reduce((sum, r) => sum + r.rate, 0) / allRatings.length : 0
  const totalReviews = allRatings.length

  return (
    <div className="min-h-screen bg-[#fffbeb] pb-20">
      {/* Header */}
      <div className="p-4 flex items-center bg-white">
        <button onClick={() => router.back()} className="mr-4" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xs font-bold">{restaurant.name}</h1>
      </div>

      {/* Restaurant Image */}
      <RestaurantHeader name={restaurant.name} type={restaurant.type} image={restaurant.picture} />


      {/* Restaurant Info */}
      <div className="bg-white rounded-lg mx-4 -mt-6 relative z-10 p-3 shadow-sm">
        <div className="flex justify-between items-center text-xs sm:text-sm overflow-hidden">
          <div className="flex items-center min-w-0 flex-shrink">
            <MapPin className="text-primary mr-1 flex-shrink-0" size={14} />
            <span className="text-gray-600 truncate">{restaurant.address}</span>
          </div>

          <div className="w-px h-4 bg-gray-200 mx-1 sm:mx-2 flex-shrink-0"></div>

          <div className="flex items-center flex-shrink-0">
            <div className={`w-2 h-2 rounded-full mr-1 ${isOpen ? "bg-green-500" : "bg-red-500"}`}></div>
            <span className={`${isOpen ? "text-green-600" : "text-red-600"} font-medium whitespace-nowrap`}>
              {isOpen ? "Open" : "Closed"}
            </span>
          </div>

          <div className="w-px h-4 bg-gray-200 mx-1 sm:mx-2 flex-shrink-0"></div>

          <div className="flex items-center flex-shrink-0">
            <Clock className="text-primary mr-1 flex-shrink-0" size={14} />
            <span className="text-gray-600 whitespace-nowrap text-xs">
              {restaurant.opens}-{restaurant.closes}
            </span>
          </div>

          <div className="w-px h-4 bg-gray-200 mx-1 sm:mx-2 flex-shrink-0"></div>

          <div className="flex items-center flex-shrink-0">
            <Star className="text-yellow-400 mr-1 flex-shrink-0" size={14} fill="currentColor" />
            <span className="text-gray-600 whitespace-nowrap">{overallRating.toFixed(1)}</span>
          </div>
        </div>
      </div>

        {/* Price Range 
        <div className="mt-2 text-sm text-gray-600">
          <span className="font-medium">Price Range: </span>
          <span className="text-primary font-medium">{restaurant.price_range}</span>
        </div>*/}

        {/* Categories 
        <div className="mt-2 flex flex-wrap gap-2">
          {restaurant.categories.map((category, index) => (
            <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              {category}
            </span>
          ))}
      </div>
        </div>*/}

      {/* Tabs */}
      <div className="border-b border-gray-200 mt-4">
        <div className="flex">
          <button
            className={`flex-1 py-3 font-medium ${
              activeTab === "menu" ? "text-primary border-b-2 border-primary" : "text-gray-500"
            }`}
            onClick={() => setActiveTab("menu")}
          >
            Menu Items
          </button>
          <button
            className={`flex-1 py-3 font-medium ${
              activeTab === "reviews" ? "text-primary border-b-2 border-primary" : "text-gray-500"
            }`}
            onClick={() => setActiveTab("reviews")}
          >
            Reviews and Ratings
          </button>
        </div>
      </div>

      {/* Menu Items */}
      {activeTab === "menu" && (
        <div className="p-4">
          {menuLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          ) : menuItems.length > 0 ? (
            <div className="space-y-4">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="py-4 border-b border-gray-200 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors"
                  onClick={() => handleOrderItem(item.id)}
                >
                  <h3 className="text-lg font-bold">{item.name}</h3>
                  <p className="text-gray-500 mb-2">{item.description}</p>
                  <p className="font-medium">
                    Starts from <span className="text-primary">GH₵{item.price}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No menu items available</p>
            </div>
          )}
        </div>
      )}

      {/* Reviews */}
      {activeTab === "reviews" && (
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="text-5xl font-bold text-sm">{overallRating.toFixed(1)}</div>
              <div className="text-gray-500  text-sm">out of 5</div>
            </div>
            <div>
              <div className="flex mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className="text-yellow-400"
                    size={28}
                    fill={i <= Math.round(overallRating) ? "currentColor" : "none"}
                    stroke="currentColor"
                  />
                ))}
              </div>
              <div className="text-center text-gray-500">({totalReviews} Reviews)</div>
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <button className="flex items-center text-primary" onClick={() => setShowSortModal(true)}>
              {reviewSort.charAt(0).toUpperCase() + reviewSort.slice(1)} <ChevronDown className="ml-1" size={16} />
            </button>
          </div>

          {ratingsLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : sortedGroupedRatings.length > 0 ? (
            <div className="space-y-8">
              {sortedGroupedRatings.map((group) => (
                <div key={group.dishId} className="border-b border-gray-100 pb-6 last:border-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 text-xs">{group.dishName}</h3>
                    <div className="flex items-center">
                      <Star className="text-yellow-400 mr-1" size={16} fill="currentColor" />
                      <span className="text-sm font-medium text-sm">{group.averageRating.toFixed(1)}</span>
                      <span className="text-gray-400 text-xs ml-1">({group.totalRatings} reviews)</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {group.ratings.map((rating) => (
                      <ReviewItem
                        key={rating.id}
                        userName={rating.name}
                        userImage={rating.photo}
                        rating={rating.rate}
                        comment={rating.review}
                        time={rating.created_date}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No reviews available yet</p>
            </div>
          )}
        </div>
      )}

      {showSortModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl">
            <div className="divide-y divide-gray-200">
              <button
                className="w-full py-4 text-center text-gray-500 font-medium"
                onClick={() => handleSortReviews("recent")}
              >
                Recent
              </button>
              <button
                className="w-full py-4 text-center text-gray-500 font-medium"
                onClick={() => handleSortReviews("most relevant")}
              >
                Most Relevant
              </button>
              <button
                className="w-full py-4 text-center text-gray-500 font-medium"
                onClick={() => handleSortReviews("most critical")}
              >
                Most Critical
              </button>
              <button
                className="w-full py-4 text-center text-gray-500 font-medium"
                onClick={() => handleSortReviews("most favourable")}
              >
                Most Favourable
              </button>
              <button
                className="w-full py-4 text-center text-red-500 font-medium"
                onClick={() => setShowSortModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
