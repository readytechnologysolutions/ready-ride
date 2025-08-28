"use client"

import type React from "react"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

type HeaderProps = {
  title: string
  onBack?: () => void
  rightContent?: React.ReactNode
  className?: string
  titleClassName?: string
}

export default function ResponsiveHeader({ title, onBack, rightContent, className, titleClassName }: HeaderProps) {
  return (
    <div className={cn("p-4 flex items-center bg-white safe-area-inset-top sticky top-0 z-10", className)}>
      {onBack && (
        <button onClick={onBack} className="mr-4" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
      )}
      <h1 className={cn("text-xl sm:text-2xl font-bold flex-1", titleClassName)}>{title}</h1>
      {rightContent && <div className="flex items-center">{rightContent}</div>}
    </div>
  )
}
