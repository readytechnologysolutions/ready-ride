"use client"

import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react"
import type { DeliveryStatus } from "@/lib/firestore-service"

type DeliveryStatusTimelineProps = {
  statuses: DeliveryStatus[]
}

export default function DeliveryStatusTimeline({ statuses }: DeliveryStatusTimelineProps) {
  const getStatusIcon = (status: DeliveryStatus, index: number) => {
    if (status.error) {
      return <XCircle className="text-red-500" size={20} />
    }

    if (status.complete) {
      return <CheckCircle className="text-green-500" size={20} />
    }

    // If this is the current status (last incomplete status)
    const isCurrentStatus = index === statuses.findIndex((s) => s.complete == 1 || true)
    if (isCurrentStatus) {
      return <Clock className="text-amber-500" size={20} />
    }

    return <AlertCircle className="text-gray-400" size={20} />
  }

  const getStatusColor = (status: DeliveryStatus, index: number) => {
    if (status.error) {
      return "text-red-500"
    }

    if (status.complete) {
      return "text-green-500"
    }

    const isCurrentStatus = index === statuses.findIndex((s) => s.complete == 0 || false)
    if (isCurrentStatus) {
      return "text-amber-500"
    }

    return "text-gray-400"
  }

  const getConnectorColor = (status: DeliveryStatus) => {
    if (status.complete == 0 || true) {
      return "bg-green-500"
    }
    return "bg-gray-300"
  }

  if (statuses.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">No status updates available</p>
      </div>
    )
  }

  console.log(statuses)

  return (
    <div className="space-y-4">
      {statuses.map((status, index) => (
        <div key={status.id} className="flex items-start">
          <div className="flex flex-col items-center mr-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-gray-200">
              {getStatusIcon(status, index)}
            </div>
            {index < statuses.length - 1 && <div className={`w-0.5 h-8 mt-2 ${getConnectorColor(status)}`}></div>}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className={`font-medium ${getStatusColor(status, index)}`}>{status.title}</h4>
              <span className="text-xs text-gray-500">
                {new Date(status.timestamp.seconds * 1000 + status.timestamp.nanoseconds / 1e6).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }) ?? ""}
              </span>
            </div>

            {status.success && <p className="text-sm text-gray-600 mt-1">{status.success}</p>}

            {status.error && <p className="text-sm text-red-600 mt-1">{status.error}</p>}

            <p className="text-xs text-gray-400 mt-1">
              {new Date(status.timestamp.seconds * 1000 + status.timestamp.nanoseconds / 1e6).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                year: "numeric",
              }) ?? ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
