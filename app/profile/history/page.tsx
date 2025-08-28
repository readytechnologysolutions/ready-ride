"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { collection, query, where, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { getUserOrderDeliveries } from "@/lib/firestore-service"

export default function HistoryPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [historyItems, setHistoryItems] = useState<[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    const fetchDeliveries = async () => {
      if (!user?.uid) return

      try {
        setLoading(true)
        const deliveries = await getUserOrderDeliveries(user.uid)

        setHistoryItems(deliveries)
        setShowHistory(deliveries.length > 0)
      } catch (error) {
        console.error("Error fetching deliveries:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDeliveries()
  }, [user?.uid])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase) {
      case "ongoing":
        return "text-primary"
      case "completed":
        return "text-green-500"
      case "cancelled":
        return "text-red-500"
      default:
        return "text-gray-500"
    }
  }

  const navigateToDetails = (id: string, type: string) => {
    if (type === "Parcel") {
      router.push(`/track/parcel/${id}`)
    } else {
      router.push(`/track/${id}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#fffbeb]">
      {/* Header */}
      <div className="p-4 flex items-center bg-white">
        <button onClick={() => router.back()} className="mr-4" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">History</h1>
      </div>

      {loading ? (
        // Loading State
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : !showHistory ? (
        // Empty State
        <div className="flex flex-col items-center justify-center px-6 py-12">
          <div className="mb-6 w-64 h-64">
            <Image src="/order-page.png" alt="No history" width={256} height={256} />
          </div>
          <h2 className="text-xl text-gray-500 text-center mb-1">you have no history at the moment</h2>
          <p className="text-gray-500 text-center mb-8">Let's make one!!</p>
          <Link
            href="/home"
            className="w-full bg-primary text-white py-4 px-6 rounded-full text-center text-xl font-medium"
          >
            Order Now
          </Link>
        </div>
      ) : (
        // History List
        <div className="bg-gray-100 min-h-[calc(100vh-5rem)]">
          {historyItems.map((item, index) => (
            <div key={item.id} className="p-4" onClick={() => navigateToDetails(item.id, item.type)}>
              <div className="flex justify-between items-start mb-1 cursor-pointer">
                <div>
                  <h2 className="font-bold">
                    {item.type === "Order" ? "Order" : "Parcel"} #: {item.order_id}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {new Date(item.createTime).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })} 
                  </p>
                  <p className={`font-medium ${getStatusColor(item.status)}`}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </p>
                </div>
                <p className="font-bold">{item.amount}</p>
              </div>
              {index < historyItems.length - 1 && <div className="border-b border-gray-300 mt-4"></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
