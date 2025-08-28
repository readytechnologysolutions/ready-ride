import { collection, getDocs, query, limit, where, doc, getDoc, updateDoc, addDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface Restaurant {
  id: string
  name: string
  picture: string
  address: string
  categories: string[]
  type: string
  price_range: string
  opens: string
  closes: string
  contact: string
  gps: {
    lat: number
    lon: number
  }
  createTime: string
  updateTime: string
}

export interface Category {
  id: string
  name: string
  icon: number
  createTime: string
  updateTime: string
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: string
  createTime: string
  updateTime: string
}

export interface FoodItem {
  id: string
  name: string
  description: string
  price: number
  required: boolean
}

export interface Promo {
  id: string
  title: string
  description: string
  button_text: string
  discount: number
  min_price: number
  start: string
  end: string
  image: string
  active: number
  type: string
  createTime: string
  updateTime: string
}

export interface UserPromo {
  id: string
  title: string
  description: string
  button_text: string
  discount: string
  min_price: string
  start: string
  end: string
  image: string
  active: number
  type: string
  createTime: string
  updateTime: string
}

export interface MostOrderedFood {
  food_id: string
  food_name: string
  name: string // Additional name/description field
  eatery_id: string
  eatery_name: string
  eatery_picture: string // Added eatery picture field
  price: number
  order_count: number
}

export async function getMostOrderedFoods(limitCount = 10): Promise<MostOrderedFood[]> {
  try {
    const deliveriesRef = collection(db, "deliveries")
    const q = query(deliveriesRef, where("order_type", "==", "Order"))
    const querySnapshot = await getDocs(q)

    // Map to store food items and their order counts
    const foodOrderCounts = new Map<string, MostOrderedFood>()

    querySnapshot.forEach((doc) => {
      const orderData = doc.data()
      const orderDetails = orderData.order_details || []

      orderDetails.forEach((item: any) => {
        const key = `${item.eatery_id}_${item.food_id}`

        if (foodOrderCounts.has(key)) {
          const existing = foodOrderCounts.get(key)!
          existing.order_count += item.quantity || 1
        } else {
          foodOrderCounts.set(key, {
            food_id: item.food_id,
            food_name: item.food_name,
            name: item.name || item.description || "", // Use name field or fallback to description
            eatery_id: item.eatery_id,
            eatery_name: "", // Will be populated below
            eatery_picture: "", // Will be populated below
            price: item.price || 0,
            order_count: item.quantity || 1,
          })
        }
      })
    })

    // Get unique eatery IDs to fetch restaurant names and pictures
    const eateryIds = Array.from(new Set(Array.from(foodOrderCounts.values()).map((food) => food.eatery_id)))

    // Fetch restaurant names and pictures
    const restaurantData = new Map<string, { name: string; picture: string }>()

    for (const eateryId of eateryIds) {
      try {
        const restaurantDoc = await getDoc(doc(db, "eateries", eateryId))
        if (restaurantDoc.exists()) {
          const data = restaurantDoc.data()
          restaurantData.set(eateryId, {
            name: data.name || "Unknown Restaurant",
            picture: data.picture || "/placeholder.svg?height=120&width=200",
          })
        } else {
          restaurantData.set(eateryId, {
            name: "Unknown Restaurant",
            picture: "/placeholder.svg?height=120&width=200",
          })
        }
      } catch (error) {
        console.error(`Error fetching restaurant ${eateryId}:`, error)
        restaurantData.set(eateryId, {
          name: "Unknown Restaurant",
          picture: "/placeholder.svg?height=120&width=200",
        })
      }
    }

    // Update food items with restaurant names and pictures
    foodOrderCounts.forEach((food, key) => {
      const restaurant = restaurantData.get(food.eatery_id)
      food.eatery_name = restaurant?.name || "Unknown Restaurant"
      food.eatery_picture = restaurant?.picture || "/placeholder.svg?height=120&width=200"
    })

    // Convert to array, filter by minimum order count, and sort by order count
    const sortedFoods = Array.from(foodOrderCounts.values())
      .filter((food) => food.order_count >= 3) // Only show foods with 3+ orders
      .sort((a, b) => b.order_count - a.order_count)
      .slice(0, limitCount)

    return sortedFoods
  } catch (error) {
    console.error("Error fetching most ordered foods:", error)
    return []
  }
}

export async function getActivePromos(): Promise<Promo[]> {
  try {
    const promosRef = collection(db, "users_promo")
    const q = query(promosRef, where("active", "==", true))
    const querySnapshot = await getDocs(q)
    const promos: Promo[] = []

    querySnapshot.forEach((doc) => {
      const promoData = {
        id: doc.id,
        ...doc.data(),
      } as Promo

      // Check if promo is within date range
      const now = new Date()
      const startDate = new Date(promoData.start)
      const endDate = new Date(promoData.end)

      if (now >= startDate && now <= endDate) {
        promos.push(promoData)
      }
    })

    return promos
  } catch (error) {
    console.error("Error fetching active promos:", error)
    return []
  }
}

export async function getUserPromos(userId: string): Promise<UserPromo[]> {
  try {
    const userPromosRef = collection(db, "users", userId, "promos")
    const q = query(userPromosRef, where("active", "==", 1))
    const querySnapshot = await getDocs(q)
    const userPromos: UserPromo[] = []

    querySnapshot.forEach((doc) => {
      const promoData = {
        id: doc.id,
        ...doc.data(),
      } as UserPromo

      // Check if promo is within date range
      const now = new Date()
      const startDate = new Date(promoData.start)
      const endDate = new Date(promoData.end)

      if (now >= startDate && now <= endDate) {
        userPromos.push(promoData)
      }
    })

    return userPromos
  } catch (error) {
    console.error("Error fetching user promos:", error)
    return []
  }
}

export async function claimPromo(userId: string, promoData: Promo): Promise<boolean> {
  try {
    const userPromoRef = doc(db, "users", userId, "promos", promoData.id)
    const now = new Date().toISOString()

    await setDoc(userPromoRef, {
      title: promoData.title,
      description: promoData.description,
      button_text: promoData.button_text,
      discount: promoData.discount.toString(),
      min_price: promoData.min_price.toString(),
      start: promoData.start,
      end: promoData.end,
      image: promoData.image,
      active: 1,
      type: promoData.type,
      createTime: now,
      updateTime: now,
    })

    return true
  } catch (error) {
    console.error("Error claiming promo:", error)
    return false
  }
}

export async function checkUserHasPromo(userId: string, promoId: string): Promise<boolean> {
  try {
    const userPromoDoc = await getDoc(doc(db, "users", userId, "promos", promoId))
    return userPromoDoc.exists()
  } catch (error) {
    console.error("Error checking user promo:", error)
    return false
  }
}

export async function getFoodItems(restaurantId: string, menuItemId: string): Promise<FoodItem[]> {
  try {
    const foodItemsRef = collection(db, "eateries", restaurantId, "menu_items", menuItemId, "food_items")
    const querySnapshot = await getDocs(foodItemsRef)
    const foodItems: FoodItem[] = []

    querySnapshot.forEach((doc) => {
      foodItems.push({
        id: doc.id,
        ...doc.data(),
      } as FoodItem)
    })

    return foodItems
  } catch (error) {
    console.error("Error fetching food items:", error)
    return []
  }
}

export async function getRestaurants(limitCount?: number): Promise<Restaurant[]> {
  try {
    const restaurantsRef = collection(db, "eateries")
    let q = query(restaurantsRef)

    if (limitCount) {
      q = query(restaurantsRef, limit(limitCount))
    }

    const querySnapshot = await getDocs(q)
    const restaurants: Restaurant[] = []

    querySnapshot.forEach((doc) => {
      restaurants.push({
        id: doc.id,
        ...doc.data(),
      } as Restaurant)
    })

    return restaurants
  } catch (error) {
    console.error("Error fetching restaurants:", error)
    return []
  }
}

export async function getPopularRestaurants(): Promise<Restaurant[]> {
  try {
    // Get a limited number of restaurants for the popular section
    return await getRestaurants(10)
  } catch (error) {
    console.error("Error fetching popular restaurants:", error)
    return []
  }
}

export async function getRestaurantsByCategory(category: string): Promise<Restaurant[]> {
  try {
    const restaurantsRef = collection(db, "eateries")
    const q = query(restaurantsRef, where("categories", "array-contains", category))

    const querySnapshot = await getDocs(q)
    const restaurants: Restaurant[] = []

    querySnapshot.forEach((doc) => {
      restaurants.push({
        id: doc.id,
        ...doc.data(),
      } as Restaurant)
    })

    return restaurants
  } catch (error) {
    console.error("Error fetching restaurants by category:", error)
    return []
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const categoriesRef = collection(db, "categories")
    const querySnapshot = await getDocs(categoriesRef)
    const categories: Category[] = []

    querySnapshot.forEach((doc) => {
      categories.push({
        id: doc.id,
        ...doc.data(),
      } as Category)
    })

    return categories
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
}

export async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  try {
    const menuItemsRef = collection(db, "eateries", restaurantId, "menu_items")
    const querySnapshot = await getDocs(menuItemsRef)
    const menuItems: MenuItem[] = []

    querySnapshot.forEach((doc) => {
      menuItems.push({
        id: doc.id,
        ...doc.data(),
      } as MenuItem)
    })

    return menuItems
  } catch (error) {
    console.error("Error fetching menu items:", error)
    return []
  }
}

export async function getRestaurantById(restaurantId: string): Promise<Restaurant | null> {
  try {
    const restaurantsRef = collection(db, "eateries")
    const q = query(restaurantsRef, where("__name__", "==", restaurantId))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data(),
      } as Restaurant
    }

    return null
  } catch (error) {
    console.error("Error fetching restaurant by ID:", error)
    return null
  }
}

export interface UserProfile {
  id: string
  email: string
  verified: number
  phone_number: string
  address: {
    name: string
    lat: number
    lon: number
    address: string
  }
  display_name: string
  loggedin: boolean
  device_os: string
  device_id: string
  photo_url: string
  createTime: string
  updateTime: string
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId))

    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        ...userDoc.data(),
      } as UserProfile
    }

    return null
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return null
  }
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<boolean> {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      ...data,
      updateTime: new Date().toISOString(),
    })
    return true
  } catch (error) {
    console.error("Error updating user profile:", error)
    return false
  }
}

export async function updateUserAddress(
  userId: string,
  address: {
    name: string
    address: string
    lat: number
    lon: number
  },
): Promise<boolean> {
  try {
    const userRef = doc(db, "users", userId)
    const now = new Date().toISOString()

    // Check if user document exists
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      // Update existing document
      await updateDoc(userRef, {
        address: address,
        updateTime: now,
      })
    } else {
      // Create new user document with required fields
      await setDoc(userRef, {
        id: userId,
        address: address,
        display_name: "",
        email: "",
        phone_number: "",
        photo_url: "",
        device_id: "",
        device_os: "",
        loggedin: true,
        online: true,
        verified: false,
        createTime: now,
        updateTime: now,
      })
    }

    return true
  } catch (error) {
    console.error("Error updating user address:", error)
    return false
  }
}

export interface PaymentMethod {
  id: string
  type: string
  account_name: string
  default: number
  account_number: string
  bank_code: string
  createTime: string
  updateTime: string
}

export async function getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  try {
    const paymentMethodsRef = collection(db, "users", userId, "payment_methods")
    const querySnapshot = await getDocs(paymentMethodsRef)
    const paymentMethods: PaymentMethod[] = []

    querySnapshot.forEach((doc) => {
      paymentMethods.push({
        id: doc.id,
        ...doc.data(),
      } as PaymentMethod)
    })

    return paymentMethods
  } catch (error) {
    console.error("Error fetching payment methods:", error)
    return []
  }
}

export async function addPaymentMethod(
  userId: string,
  paymentMethod: Omit<PaymentMethod, "id" | "createTime" | "updateTime">,
): Promise<boolean> {
  try {
    const paymentMethodsRef = collection(db, "users", userId, "payment_methods")
    const now = new Date().toISOString()

    await addDoc(paymentMethodsRef, {
      ...paymentMethod,
      createTime: now,
      updateTime: now,
    })

    return true
  } catch (error) {
    console.error("Error adding payment method:", error)
    return false
  }
}

export async function updatePaymentMethodDefault(
  userId: string,
  methodId: string,
  isDefault: boolean,
): Promise<boolean> {
  try {
    const methodRef = doc(db, "users", userId, "payment_methods", methodId)
    await updateDoc(methodRef, {
      default: isDefault ? 1 : 0,
      updateTime: new Date().toISOString(),
    })
    return true
  } catch (error) {
    console.error("Error updating payment method default status:", error)
    return false
  }
}

export async function checkDuplicatePaymentMethod(userId: string, accountNumber: string): Promise<boolean> {
  try {
    const paymentMethodsRef = collection(db, "users", userId, "payment_methods")
    const querySnapshot = await getDocs(paymentMethodsRef)

    let isDuplicate = false
    querySnapshot.forEach((doc) => {
      const method = doc.data() as PaymentMethod
      if (method.account_number === accountNumber) {
        isDuplicate = true
      }
    })

    return isDuplicate
  } catch (error) {
    console.error("Error checking for duplicate payment method:", error)
    return false
  }
}

export async function fetchAccountName(
  accountNumber: string,
  bankCode: string,
): Promise<{ success: boolean; accountName?: string; error?: string }> {
  try {
    const response = await fetch("/api/resolve-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_number: accountNumber,
        bank_code: bankCode,
      }),
    })

    const data = await response.json()

    if (data.success && data.account_name) {
      return {
        success: true,
        accountName: data.account_name,
      }
    }

    return {
      success: false,
      error: data.error || "Account not found",
    }
  } catch (error) {
    console.error("Error fetching account name:", error)
    return {
      success: false,
      error: "Network error occurred",
    }
  }
}

export interface AppSettings {
  id: string
  account_api: string
  sms_api: string
  closes: string
  small_package_price: number
  whatsapp_api: string
  large_package_price: number
  support_email: string
  card_payment_available: number
  support_contact: string
  base_fare: number
  medium_package_price: number
  sender_id: string
  max_distance: number
  distance_rate: number
  express_delivery_charge: number
  opens: string
  createTime: string
  updateTime: string
}

export async function getAppSettings(): Promise<AppSettings | null> {
  try {
    console.log("🔍 Attempting to fetch app settings document...")
    const settingsDoc = await getDoc(doc(db, "app_settings", "qAe9qZ8sC4YhxsEIXwBh"))

    console.log("📄 Document exists:", settingsDoc.exists())

    if (settingsDoc.exists()) {
      const data = settingsDoc.data()
      console.log("📋 Raw document data:", data)

      const settings = {
        id: settingsDoc.id,
        ...data,
      } as AppSettings

      console.log("✅ Processed app settings:", settings)
      return settings
    } else {
      console.warn("⚠️ App settings document does not exist")
      return null
    }
  } catch (error) {
    console.error("❌ Error fetching app settings:", error)
    return null
  }
}

export interface DeliveryOrder {
  id?: string
  special_instructions: string
  order_details: Array<{
    name: string
    required: number
    price: number
    description: string
    id: string
    food_id: string
    food_name: string
    eatery_id: string
    quantity: number
  }>
  delivery_fee: number
  total_amount: number
  paid: boolean
  uid: string
  promo: number
  order_type: string
  map_data: {
    total_distance: number
    total_distance_text: string
    total_seconds: number
    total_duration: string
  }
  locations: Array<{
    eatery_id: string
    name: string
    location: string
    contact: string
    lat: number
    lon: number
    note: string
  }>
  status: string
  created_date: string
  collect_time: string
  payment_method: {
    account: string
  }
  tracking_id: string
  receiver: {
    name: string
    lat: number
    contact: string
    lon: number
    location: string
  }
  shown: boolean
  createTime: string
  updateTime: string
  // Rider fields (available when rider picks up delivery)
  rid?: string
  rider?: {
    rid: string
    name: string
    contact: string
  }
}

export interface DeliveryStatus {
  id: string
  complete: number | boolean
  title: string
  success?: string
  error?: string
  timestamp?: string
  createTime: string
  updateTime: string
}

export interface Rider {
  id: string
  phone_number: string
  email: string
  other_image: string
  photo_url: string
  licesne_number: string
  device_os: string
  device_id: string
  id_image: string
  approved: number
  license_expiry: string
  display_name: string
  online: number
  license_image: string
  documents_submited: number
  ghana_card: string
  loggedin: number
  createTime: string
  updateTime: string
}

export async function getRiderById(riderId: string): Promise<Rider | null> {
  try {
    const riderDoc = await getDoc(doc(db, "riders", riderId))

    if (riderDoc.exists()) {
      return {
        id: riderDoc.id,
        ...riderDoc.data(),
      } as Rider
    }

    return null
  } catch (error) {
    console.error("Error fetching rider:", error)
    return null
  }
}

export async function getDeliveryStatuses(deliveryId: string): Promise<DeliveryStatus[]> {
  try {
    const statusesRef = collection(db, "deliveries", deliveryId, "delivery_status")
    const querySnapshot = await getDocs(statusesRef)

    const statuses: DeliveryStatus[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      const createTime = doc.createTime
      const updateTime = doc.updateTime

      console.log("Status:", data)

      statuses.push({
        id: doc.id,
        ...doc.data(),
        createTime: createTime || "",
        updateTime: updateTime || "",
      } as DeliveryStatus)
    })

    console.log("Statuses:", statuses)
    return statuses
  } catch (error) {
    console.error("Error fetching delivery statuses:", error)
    return []
  }
}

export async function createDeliveryOrder(
  orderData: Omit<DeliveryOrder, "id" | "createTime" | "updateTime">,
): Promise<string | null> {
  try {
    const deliveriesRef = collection(db, "deliveries")
    const now = new Date().toISOString()

    const docRef = await addDoc(deliveriesRef, {
      ...orderData,
      createTime: now,
      updateTime: now,
    })

    return docRef.id
  } catch (error) {
    console.error("Error creating delivery order:", error)
    return null
  }
}

export async function updateDeliveryOrderPayment(orderId: string, paid: boolean): Promise<boolean> {
  try {
    const orderRef = doc(db, "deliveries", orderId)
    await updateDoc(orderRef, {
      paid: paid,
      updateTime: new Date().toISOString(),
    })
    return true
  } catch (error) {
    console.error("Error updating delivery order payment:", error)
    return false
  }
}

export async function getDeliveryOrder(orderId: string): Promise<DeliveryOrder | null> {
  try {
    const orderDoc = await getDoc(doc(db, "deliveries", orderId))

    if (orderDoc.exists()) {
      return {
        id: orderDoc.id,
        ...orderDoc.data(),
      } as DeliveryOrder
    }

    return null
  } catch (error) {
    console.error("Error fetching delivery order:", error)
    return null
  }
}

export async function getUserDeliveryOrders(userId: string): Promise<DeliveryOrder[]> {
  try {
    const deliveriesRef = collection(db, "deliveries")
    const q = query(deliveriesRef, where("uid", "==", userId))
    const querySnapshot = await getDocs(q)
    const orders: DeliveryOrder[] = []

    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data(),
      } as DeliveryOrder)
    })

    return orders.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
  } catch (error) {
    console.error("Error fetching user delivery orders:", error)
    return []
  }
}

export async function getUserOrderDeliveries(userId: string): Promise<DeliveryOrder[]> {
  try {
    const deliveriesRef = collection(db, "deliveries")
    const q = query(deliveriesRef, where("uid", "==", userId), where("order_type", "==", "Order"))
    const querySnapshot = await getDocs(q)
    const orders: DeliveryOrder[] = []

    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data(),
      } as DeliveryOrder)
    })

    return orders.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
  } catch (error) {
    console.error("Error fetching user order deliveries:", error)
    return []
  }
}

export interface FoodRating {
  id: string // This will be the user ID
  created_date: string
  name: string
  photo: string
  rate: number
  review: string
  uid: string
}

export async function getFoodRatings(eateryId: string, foodId: string): Promise<FoodRating[]> {
  try {
    const ratingsRef = collection(db, "eateries", eateryId, "menu_items", foodId, "ratings")
    const querySnapshot = await getDocs(ratingsRef)
    const ratings: FoodRating[] = []

    querySnapshot.forEach((doc) => {
      ratings.push({
        id: doc.id,
        ...doc.data(),
      } as FoodRating)
    })

    return ratings
  } catch (error) {
    console.error("Error fetching food ratings:", error)
    return []
  }
}

export async function addFoodRating(
  eateryId: string,
  foodId: string,
  rating: {
    rate: number
    review: string
    name: string
    photo: string
    uid: string
  },
): Promise<boolean> {
  try {
    const ratingsRef = collection(db, "eateries", eateryId, "menu_items", foodId, "ratings")
    const now = new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

    // Use setDoc with user ID as document ID instead of addDoc
    await setDoc(doc(ratingsRef, rating.uid), {
      ...rating,
      created_date: now,
    })

    return true
  } catch (error) {
    console.error("Error adding food rating:", error)
    return false
  }
}

export async function getUserFoodRating(eateryId: string, foodId: string, userId: string): Promise<FoodRating | null> {
  try {
    const ratingDoc = await getDoc(doc(db, "eateries", eateryId, "menu_items", foodId, "ratings", userId))

    if (ratingDoc.exists()) {
      return {
        id: ratingDoc.id,
        ...ratingDoc.data(),
      } as FoodRating
    }

    return null
  } catch (error) {
    console.error("Error fetching user food rating:", error)
    return null
  }
}
