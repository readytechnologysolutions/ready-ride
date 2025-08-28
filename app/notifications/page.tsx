"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Car, Package, Bell, Gift, Info } from "lucide-react"
import { GetNotifications, MarkNotificationAsRead, ClearAllNotifications, type Notification } from "@/utils/messaging"

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load notifications from localStorage on component mount
  useEffect(() => {
    const loadedNotifications = GetNotifications()
    console.log("Loaded notifications:", loadedNotifications)
    setNotifications(loadedNotifications)
    setIsLoading(false)
  }, [])

  const clearAll = () => {
    ClearAllNotifications()
    setNotifications([])
  }

  const markAsRead = (id: string) => {
    MarkNotificationAsRead(id)
    setNotifications(
      notifications.map((notification) => (notification.id === id ? { ...notification, isRead: true } : notification)),
    )
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "order":
        return <Car className="text-white" size={20} />
      case "parcel":
        return <Package className="text-white" size={20} />
      case "promo":
        return <Gift className="text-white" size={20} />
      case "news":
        return <Info className="text-white" size={20} />
      default:
        return <Bell className="text-white" size={20} />
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center">
          <button onClick={() => router.back()} className="mr-4" aria-label="Go back">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">Notification</h1>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-600">
            You have <span className="text-primary font-medium">{unreadCount} new</span> notifications
          </p>
          {notifications.length > 0 && (
            <button onClick={clearAll} className="text-primary">
              Clear All
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-gray-200 h-12 w-12"></div>
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-white rounded-full p-3 flex items-center shadow-sm cursor-pointer"
                onClick={() => markAsRead(notification.id)}
              >
                <div className="relative mr-3">
                  <div className="bg-primary rounded-full p-2">{getIcon(notification.type)}</div>
                  {!notification.isRead && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{String(notification.title)}</h3>
                  <p className="text-gray-500 text-sm">{String(notification.message)}</p>
                </div>
                <div className="text-gray-400 text-xs whitespace-nowrap ml-2">{String(notification.time)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
