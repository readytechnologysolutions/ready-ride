import type React from "react"
import { cn } from "@/lib/utils"

type ContainerProps = {
  children: React.ReactNode
  className?: string
  size?: "sm" | "md" | "lg" | "xl" | "full"
}

export default function Container({ children, className, size = "md" }: ContainerProps) {
  const sizeClasses = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    full: "max-w-full",
  }

  return <div className={cn(`w-full mx-auto px-4 sm:px-6 ${sizeClasses[size]}`, className)}>{children}</div>
}
