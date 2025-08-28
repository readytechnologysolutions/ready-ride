"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Home, FileText, Map, User, Calendar, X, List } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getUserOrderDeliveries, type DeliveryOrder } from "@/lib/firestore-service"

type FilterPeriod = "today" | "this-week" | "this-month" | "select-month"

export default function OrdersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOrders = async () => {
      if (user?.uid) {
        try {
          const userOrders = await getUserOrderDeliveries(user.uid)
          setOrders(userOrders)
        } catch (error) {
          console.error("Error loading orders:", error)
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }

    loadOrders()
  }, [user])

  const [showFilterModal, setShowFilterModal] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<FilterPeriod>("this-week")
  const [appliedFilter, setAppliedFilter] = useState<FilterPeriod>("this-week")

  const handleFilterClick = () => {
    setShowFilterModal(true)
    setSelectedFilter(appliedFilter)
  }

  const handleFilterSelect = (filter: FilterPeriod) => {
    setSelectedFilter(filter)
  }

  const handleFilterApply = () => {
    setAppliedFilter(selectedFilter)
    setShowFilterModal(false)
  }

  const handleFilterReset = () => {
    setSelectedFilter("this-week")
  }

  const handleFilterClose = () => {
    setShowFilterModal(false)
  }

  const handleOrderClick = (orderId: string) => {
    router.push(`/orders/${orderId}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ongoing":
        return "text-primary"
      case "cancelled":
        return "text-red-500"
      case "delivered":
      case "completed":
        return "text-green-500"
      default:
        return "text-gray-500"
    }
  }

  return (
    <div className="min-h-screen bg-[#fffbeb] pb-20">
      {/* Header */}
      <div className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Orders</h1>
        {/*<button onClick={handleFilterClick} className="bg-primary text-white px-4 py-2 rounded-full flex items-center">
          <span>This week</span>
          <List className="ml-2" size={18} />
        </button>*/}
      </div>

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center px-6 py-12">
          <div className="mb-6">
            <Image src="https://getreadyride.com/uploads/images/order-page.png" alt="No orders" width={250} height={250} />
          </div>
          <h2 className="text-xl text-gray-500 mb-1">You have no orders</h2>
          <p className="text-gray-500 mb-8">But it doesn't have to be</p>
          <Link
            href="/home"
            className="w-full bg-primary text-white py-4 px-6 rounded-full text-center text-xl font-medium"
          >
            Order Now
          </Link>
        </div>
      )}

      {/* Orders List */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
      {!loading && orders.length > 0 && (
        <div className="bg-gray-100 min-h-[calc(100vh-8rem)] p-4">
          {orders.map((order, index) => (
            <div key={order.id} className="mb-4" onClick={() => handleOrderClick(order.id!)}>
              <div className="flex justify-between items-start mb-1 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                <div>
                  <h3 className="font-bold">Order #: {order.tracking_id}</h3>
                  <p className="text-gray-500 text-sm">
                    {new Date(order.createTime).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className={`font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </p>
                </div>
                <p className="font-bold">GHC {order.total_amount.toFixed(2)}</p>
              </div>
              {index < orders.length - 1 && <div className="border-b border-gray-300 my-4"></div>}
            </div>
          ))}
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
          <div className="bg-white rounded-lg w-[90%] max-w-md">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl text-gray-500">Filter by</h2>
              <button onClick={handleFilterClose} className="rounded-full border border-gray-500 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => handleFilterSelect("today")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl ${
                    selectedFilter === "today" ? "bg-yellow-200" : "bg-white"
                  } border border-gray-200`}
                >
                  <Calendar size={24} className="text-gray-500 mb-2" />
                  <span>Today</span>
                </button>

                {/*<button
                  onClick={() => handleFilterSelect("this-week")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl ${
                    selectedFilter === "this-week" ? "bg-yellow-200" : "bg-white"
                  } border border-gray-200`}
                >
                  <Calendar size={24} className="text-gray-500 mb-2" />
                  <span>This week</span>
                </button>*/}

                <button
                  onClick={() => handleFilterSelect("this-month")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl ${
                    selectedFilter === "this-month" ? "bg-yellow-200" : "bg-white"
                  } border border-gray-200`}
                >
                  <Calendar size={24} className="text-gray-500 mb-2" />
                  <span>This month</span>
                </button>

                <button
                  onClick={() => handleFilterSelect("select-month")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl ${
                    selectedFilter === "select-month" ? "bg-yellow-200" : "bg-white"
                  } border border-gray-200`}
                >
                  <Calendar size={24} className="text-gray-500 mb-2" />
                  <span>Select month</span>
                </button>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleFilterReset}
                  className="flex-1 py-3 border border-primary text-primary rounded-lg font-medium"
                >
                  Reset
                </button>
                <button
                  onClick={handleFilterApply}
                  className="flex-1 py-3 bg-primary text-white rounded-lg font-medium"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3">
        <Link href="/home" className="flex flex-col items-center text-gray-500">
          <Home size={24} />
          <span className="text-xs mt-1">Home</span>
        </Link>
        <Link href="/orders" className="flex flex-col items-center text-primary">
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
