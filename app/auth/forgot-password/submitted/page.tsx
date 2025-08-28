"use client"

import { useRouter } from "next/navigation"
import { CheckCircle } from "lucide-react"

export default function SubmittedPage() {
  const router = useRouter()

  const handleClose = () => {
    router.push("/auth/login")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="bg-primary/20 rounded-full p-8 mb-6">
          <CheckCircle size={48} className="text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-primary mb-4">Submitted</h1>
      </div>

      <div className="border-t border-gray-200">
        <button onClick={handleClose} className="w-full py-4 text-gray-500 font-medium">
          Close
        </button>
      </div>
    </div>
  )
}
