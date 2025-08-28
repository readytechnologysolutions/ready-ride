import {
  Utensils,
  Coffee,
  Pizza,
  Sandwich,
  IceCream,
  Wine,
  Apple,
  ChefHat,
  Cake,
  Fish,
  Beef,
  Salad,
} from "lucide-react"

// Map icon codes to Lucide React icons
export const getIconByCode = (iconCode: number) => {
  const iconMap: { [key: number]: any } = {
    61949: Cake, // Pastries
    61950: Utensils, // General food
    61951: Coffee, // Beverages
    61952: Pizza, // Pizza
    61953: Sandwich, // Fast food
    61954: IceCream, // Desserts
    61955: Wine, // Drinks
    61956: Apple, // Healthy/Fresh
    61957: ChefHat, // Restaurant
    61958: Fish, // Seafood
    61959: Beef, // Meat
    61960: Salad, // Salads/Vegetables
  }

  return iconMap[iconCode] || Utensils // Default to Utensils if icon not found
}

export const getCategoryIcon = (categoryName: string) => {
  // Fallback mapping based on category name if icon code is not available
  const nameMap: { [key: string]: any } = {
    pastries: Cake,
    "local dishes": ChefHat,
    groceries: Apple,
    "fast food": Sandwich,
    beverages: Coffee,
    drinks: Wine,
    pizza: Pizza,
    dessert: IceCream,
    seafood: Fish,
    meat: Beef,
    salad: Salad,
  }

  return nameMap[categoryName.toLowerCase()] || Utensils
}
