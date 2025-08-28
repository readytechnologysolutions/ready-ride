import type React from "react"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

export default function ParcelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fffbeb]">
      <div className="p-4 flex items-center bg-[#fffcea]">
        <Link href="/home" className="mr-4" aria-label="Go back">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold">Parcel Delivery</h1>
      </div>
      {children}
    </div>
  )
}
