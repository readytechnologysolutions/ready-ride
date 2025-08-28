"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Minus, Plus } from "lucide-react"
import {
  getRestaurantById,
  getMenuItems,
  getFoodItems,
  type Restaurant,
  type MenuItem,
  type FoodItem,
} from "@/lib/firestore-service"
import { useAuth } from "@/contexts/auth-context"
import { addToCart, type CartItem } from "@/utils/cart-utils"

type FoodItemWithQuantity = FoodItem & {
  quantity: number
}

export default function ItemCustomizationPage({
  params,
}: {
  params: { id: string; itemId: string }
}) {
  const router = useRouter()
  const { signInAnonymouslyIfNeeded } = useAuth()
  const restaurantId = params.id
  const itemId = params.itemId

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [menuItem, setMenuItem] = useState<MenuItem | null>(null)
  const [foodItems, setFoodItems] = useState<FoodItemWithQuantity[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Sign in anonymously for Firestore access
        await signInAnonymouslyIfNeeded()

        // Fetch restaurant data
        const restaurantData = await getRestaurantById(restaurantId)
        setRestaurant(restaurantData)

        // Fetch menu items to get the specific item
        const menuItems = await getMenuItems(restaurantId)
        const currentMenuItem = menuItems.find((item) => item.id === itemId)
        setMenuItem(currentMenuItem || null)

        // Fetch food items for this menu item
        const foodItemsData = await getFoodItems(restaurantId, itemId)
        const foodItemsWithQuantity = foodItemsData.map((item) => ({
          ...item,
          price: typeof item.price === "string" ? Number.parseFloat(item.price) || 0 : item.price,
          quantity: 0, // Set all items to 0 by default
        }))
        setFoodItems(foodItemsWithQuantity)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [restaurantId, itemId, signInAnonymouslyIfNeeded])

  const handleQuantityChange = (id: string, action: "increase" | "decrease") => {
    setFoodItems(
      foodItems.map((item) => {
        if (item.id === id) {
          const newQuantity = action === "increase" ? item.quantity + 1 : item.quantity - 1
          return {
            ...item,
            quantity: Math.max(0, newQuantity), // All items can go to 0
          }
        }
        return item
      }),
    )
  }

  const calculateSubtotal = () => {
    return foodItems.reduce((sum, item) => {
      const price = typeof item.price === "number" ? item.price : Number.parseFloat(item.price) || 0
      return sum + price * item.quantity
    }, 0)
  }

  const hasRequiredItemSelected = () => {
    const requiredItems = foodItems.filter((item) => item.required)
    if (requiredItems.length === 0) return true // No required items means we can proceed
    return requiredItems.some((item) => item.quantity > 0) // At least one required item selected
  }

  const handleOrder = () => {
    // Check if at least one required item is selected
    if (!hasRequiredItemSelected()) {
      alert("Please select at least one required item")
      return
    }

    // Check if any items are selected at all
    const hasAnyItemSelected = foodItems.some((item) => item.quantity > 0)
    if (!hasAnyItemSelected) {
      alert("Please select at least one item")
      return
    }

    // Add selected items to cart
    const selectedItems = foodItems.filter((item) => item.quantity > 0)

    selectedItems.forEach((item) => {
      const cartItem: CartItem = {
        name: item.name,
        required: item.required ? 1 : 0,
        price: typeof item.price === "number" ? item.price : Number.parseFloat(item.price) || 0,
        description: item.description,
        id: item.id,
        food_id: itemId, // The menu item ID
        food_name: menuItem?.name || "",
        eatery_id: restaurantId,
        quantity: item.quantity,
        notes: notes,
      }

      addToCart(cartItem)
    })

    // Navigate to cart
    router.push("/cart")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffbeb] pb-20">
        <div className="p-4 flex items-center bg-white">
          <button onClick={() => router.back()} className="mr-4" aria-label="Go back">
            <ChevronLeft size={24} />
          </button>
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="p-4">
          <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mb-6 animate-pulse"></div>

          {/* Loading skeleton for food items */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-gray-200">
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
              </div>
              <div className="flex items-center">
                <div className="h-5 bg-gray-200 rounded w-16 mr-4 animate-pulse"></div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="mx-3 w-4 h-5 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!restaurant || !menuItem) {
    return (
      <div className="min-h-screen bg-[#fffbeb] pb-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Item not found</h2>
          <p className="text-gray-500 mb-4">The requested item could not be found.</p>
          <button onClick={() => router.back()} className="bg-primary text-white px-6 py-2 rounded-full">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Separate required and optional items
  const requiredItems = foodItems.filter((item) => item.required)
  const optionalItems = foodItems.filter((item) => !item.required)

  return (
    <div className="min-h-screen bg-[#fffbeb] pb-20">
      {/* Header */}
      <div className="p-4 flex items-center bg-white">
        <button onClick={() => router.back()} className="mr-4" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl text-sm font-bold">{restaurant.name}</h1>
      </div>

      <div className="p-4">
        {/* Item Name */}
        <div className="mb-4">
          <h2 className="text-xl text-sm font-bold">{menuItem.name}</h2>
          <p className="text-gray-500 text-sm">{menuItem.description}</p>
        </div>

{/* Required Items */}
{requiredItems.length > 0 && (
  <div className="mb-6">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-lg text-gray-500">Required Items (select at least one)</h3>
      <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full">required</span>
    </div>

    {requiredItems.map((item) => (
      <div key={item.id} className="flex justify-between items-center py-3 border-b border-gray-200">
        <div>
          <h4 className="font-bold text-xs">{item.name}</h4>
          <p className="text-gray-500 text-xs">{item.description}</p>
        </div>

        {/* Price above quantity buttons */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-bold mb-1">
            ₵ {(typeof item.price === "number"
              ? item.price
              : Number.parseFloat(item.price) || 0
            ).toFixed(2)}
          </div>
          <div className="flex items-center">
            <button
              onClick={() => handleQuantityChange(item.id, "decrease")}
              className="w-8 h-8 flex items-center justify-center border border-primary rounded-full text-primary"
              disabled={item.quantity === 0}
            >
              <Minus size={16} />
            </button>
            <span className="mx-3 w-4 text-center">{item.quantity}</span>
            <button
              onClick={() => handleQuantityChange(item.id, "increase")}
              className="w-8 h-8 flex items-center justify-center border border-primary rounded-full text-primary"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    ))}
  </div>
)}


        {/* Optional Items */}
{optionalItems.length > 0 && (
  <div className="mb-6">
    <h3 className="text-lg text-gray-500 mb-2">Add-Ons & Extras</h3>

    {optionalItems.map((item) => (
      <div
        key={item.id}
        className="flex justify-between items-center py-3 border-b border-gray-200"
      >
        <div>
          <h4 className="font-bold text-xs">{item.name}</h4>
          <p className="text-gray-500 text-xs">{item.description}</p>
        </div>

        {/* Price above quantity buttons */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-bold mb-1">
            ₵ {(typeof item.price === "number"
              ? item.price
              : Number.parseFloat(item.price) || 0
            ).toFixed(2)}
          </div>
          <div className="flex items-center">
            <button
              onClick={() => handleQuantityChange(item.id, "decrease")}
              className="w-8 h-8 flex items-center justify-center border border-primary rounded-full text-primary"
              disabled={item.quantity === 0}
            >
              <Minus size={16} />
            </button>
            <span className="mx-3 w-4 text-center">{item.quantity}</span>
            <button
              onClick={() => handleQuantityChange(item.id, "increase")}
              className="w-8 h-8 flex items-center justify-center border border-primary rounded-full text-primary"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    ))}
  </div>
)}


        {/* Notes */}
        <div className="mb-6">
          <h3 className="text-lg text-gray-500 mb-2">Notes</h3>
          <textarea
            placeholder="Any additional comments for the restaurant"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg min-h-[100px]"
            maxLength={200}
          ></textarea>
          <div className="text-right text-gray-500 text-xs">{notes.length}/200</div>
        </div>
      </div>

      {/* Order Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-between items-center">
        <div>
          <p className="text-gray-500">Subtotal</p>
          <p className="text-xl font-bold">GH₵ {calculateSubtotal().toFixed(2)}</p>
        </div>
        <button
          onClick={handleOrder}
          className={`px-12 py-3 rounded-full text-lg font-medium transition-colors ${
            hasRequiredItemSelected() && foodItems.some((item) => item.quantity > 0)
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          disabled={!hasRequiredItemSelected() || !foodItems.some((item) => item.quantity > 0)}
        >
          Add to Cart
        </button>
      </div>
    </div>
  )
}
