"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Home, FileText, MapPin, User, CreditCard, HeadphonesIcon, ClipboardList, LogOut, Edit } from "lucide-react"
import AuthGuard from "@/components/auth-guard"
import { useAuth } from "@/contexts/auth-context"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getUserProfile, type UserProfile } from "@/lib/firestore-service"

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.uid) {
        try {
          const profile = await getUserProfile(user.uid)
          setUserProfile(profile)
        } catch (error) {
          console.error("Error fetching user profile:", error)
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [user?.uid])

  const handleEditProfile = () => {
    router.push("/profile/edit")
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const cancelLogout = () => {
    setShowLogoutConfirm(false)
  }

  // Loading state for profile
  const ProfileLoading = () => (
    <div className="min-h-screen bg-[#fffbeb] flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      <p className="mt-4 text-gray-600">Loading profile...</p>
    </div>
  )

  if (loading) {
    return <ProfileLoading />
  }

  // Fallback data if user profile is not found
  const displayName = userProfile?.display_name || user?.displayName || "User"
  const email = userProfile?.email || user?.email || ""
  const address = userProfile?.address?.address || "Address not set"
  const profileImage = userProfile?.photo_url || user?.photoURL || "/profile-image.jpg"
  const phoneNumber = userProfile?.phone_number || ""

  return (
    <AuthGuard fallback={<ProfileLoading />}>
      <div className="min-h-screen bg-[#fffbeb] pb-20">
        {/* Profile Header */}
        <div className="flex flex-col items-center pt-8 pb-6">
          <div className="relative mb-4">
            <div className="w-32 h-32 rounded-full overflow-hidden">
              <Image
                src={profileImage || "/placeholder.svg"}
                alt="Profile"
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            </div>
            <button onClick={handleEditProfile} className="absolute bottom-0 right-0 bg-primary rounded-full p-2">
              <Edit className="text-white" size={16} />
            </button>
          </div>

          <h1 className="text-2xl font-bold mb-1">{displayName}</h1>
          <p className="text-gray-500 mb-1">{email}</p>
          {phoneNumber && <p className="text-gray-500 mb-1">{phoneNumber}</p>}
          <p className="text-gray-500 text-center px-4">{address}</p>

          {/* Verification Badge */}
          {userProfile?.verified === 1 && (
            <div className="mt-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              ✓ Verified Account
            </div>
          )}
        </div>

        {/* Menu Options */}
        <div className="bg-gray-100 min-h-[calc(100vh-16rem)]">
          <div className="p-4 border-b border-gray-200">
            <Link href="/profile/payment-methods" className="flex items-center py-3">
              <div className="w-10 h-10 mr-4 flex items-center justify-center text-gray-500">
                <CreditCard size={24} />
              </div>
              <span className="text-lg font-medium">Payment Methods</span>
            </Link>
          </div>

          <div className="p-4 border-b border-gray-200">
            <Link href="/profile/support" className="flex items-center py-3">
              <div className="w-10 h-10 mr-4 flex items-center justify-center text-gray-500">
                <HeadphonesIcon size={24} />
              </div>
              <span className="text-lg font-medium">Contact Support</span>
            </Link>
          </div>

          <div className="p-4 border-b border-gray-200">
            <Link href="/profile/history" className="flex items-center py-3">
              <div className="w-10 h-10 mr-4 flex items-center justify-center text-gray-500">
                <ClipboardList size={24} />
              </div>
              <span className="text-lg font-medium">History</span>
            </Link>
          </div>

          <div className="p-4">
            <button onClick={handleLogout} className="flex items-center py-3 w-full text-left">
              <div className="w-10 h-10 mr-4 flex items-center justify-center text-gray-500">
                <LogOut size={24} />
              </div>
              <span className="text-lg font-medium">Logout</span>
            </button>
          </div>
        </div>

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-[80%] max-w-sm overflow-hidden">
              <div className="flex flex-col items-center p-6">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <LogOut className="text-red-500" size={24} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Logout</h2>
                <p className="text-gray-500 text-center mb-6">Are you sure you want to logout?</p>
              </div>

              <div className="flex border-t border-gray-200">
                <button
                  onClick={cancelLogout}
                  className="flex-1 p-4 text-gray-500 font-medium border-r border-gray-200"
                >
                  Cancel
                </button>
                <button onClick={confirmLogout} className="flex-1 p-4 text-red-500 font-medium">
                  Yes, Logout
                </button>
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
          <Link href="/orders" className="flex flex-col items-center text-gray-500">
            <FileText size={24} />
            <span className="text-xs mt-1">Orders</span>
          </Link>
          <Link href="/track" className="flex flex-col items-center text-gray-500">
            <MapPin size={24} />
            <span className="text-xs mt-1">Track</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center text-primary">
            <User size={24} />
            <span className="text-xs mt-1">Profile</span>
          </Link>
        </div>
      </div>
    </AuthGuard>
  )
}
