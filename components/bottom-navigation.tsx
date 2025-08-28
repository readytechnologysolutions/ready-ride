import Link from "next/link"
import { Home, FileText, MapIcon, User } from "lucide-react"

type BottomNavProps = {
  activeRoute?: "home" | "orders" | "track" | "profile"
}

export default function BottomNavigation({ activeRoute = "home" }: BottomNavProps) {
  return (
    <div className="bottom-nav">
      <Link
        href="/home"
        className={`flex flex-col items-center ${activeRoute === "home" ? "text-primary" : "text-gray-500"}`}
      >
        <Home size={24} />
        <span className="text-xs mt-1">Home</span>
      </Link>
      <Link
        href="/orders"
        className={`flex flex-col items-center ${activeRoute === "orders" ? "text-primary" : "text-gray-500"}`}
      >
        <FileText size={24} />
        <span className="text-xs mt-1">Orders</span>
      </Link>
      <Link
        href="/track"
        className={`flex flex-col items-center ${activeRoute === "track" ? "text-primary" : "text-gray-500"}`}
      >
        <MapIcon size={24} />
        <span className="text-xs mt-1">Track</span>
      </Link>
      <Link
        href="/profile"
        className={`flex flex-col items-center ${activeRoute === "profile" ? "text-primary" : "text-gray-500"}`}
      >
        <User size={24} />
        <span className="text-xs mt-1">Profile</span>
      </Link>
    </div>
  )
}
