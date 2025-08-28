interface EmailAttachment {
  filename: string
  content?: string
  path?: string
  contentType?: string
}

interface EmailData {
  from: string
  to: string
  subject: string
  text: string
  html?: string
  attachments?: EmailAttachment[]
}

export interface Notification {
  id: string
  title: string
  message: string
  time: string
  isRead: boolean
  type: "order" | "promo" | "news" | "parcel"
  timestamp: number // For sorting
}

export async function SendMail(emailData: EmailData): Promise<{ success: boolean; message?: string }> {
  try {
    console.log("Sending email via internal API:", {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      textLength: emailData.text?.length || 0,
    })

    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(emailData),
    })

    console.log("Internal API response status:", response.status)

    // Get response text first to handle both JSON and non-JSON responses
    const responseText = await response.text()
    console.log("Internal API raw response:", responseText)

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Failed to parse internal API response as JSON:", parseError)
      console.error("Response text:", responseText)

      return {
        success: false,
        message: `Invalid response from email service: ${responseText.substring(0, 100)}...`,
      }
    }

    if (response.ok && data.success) {
      return { success: true, message: data.message || "Email sent successfully" }
    } else {
      return { success: false, message: data.message || "Failed to send email" }
    }
  } catch (error) {
    console.error("Error sending email:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error occurred while sending email",
    }
  }
}

export async function SendSMS(phoneNumber: string, message: string): Promise<{ success: boolean; message?: string }> {
  const url = "https://sms.smsnotifygh.com/smsapi"
  const apiKey = "1bbc25e4-d7f4-4152-be53-4b2081fc69ab"
  const senderId = "Ready Ride"

  // Construct query parameters
  const params = new URLSearchParams({
    key: apiKey,
    to: phoneNumber,
    msg: message,
    sender_id: senderId,
  })

  const fullUrl = `${url}?${params.toString()}`
  console.log("Sending SMS via GET request:", fullUrl)

  try {
    const response = await fetch(fullUrl)

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const resultText = await response.text() // read as plain text
    console.log("SMS API Response:", resultText)

    // Optionally: simple success check (customize this to match actual API response format)
    const success = resultText.toLowerCase().includes("success")

    return {
      success,
      message: resultText,
    }
  } catch (error: any) {
    console.error("SMS send failed:", error.message)
    return {
      success: false,
      message: `Failed to send SMS: ${error.message}`,
    }
  }
}

// Maximum number of notifications to store
const MAX_NOTIFICATIONS = 50

// Function to save a notification to localStorage
export function SaveNotification({
  title,
  message,
  type,
}: {
  title: string
  message: string
  type: "order" | "promo" | "news" | "parcel"
}): Notification {
  // Generate a unique ID
  const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  const timestamp = Date.now()

  // Format the time (e.g., "2 mins ago", "just now", etc.)
  const formattedTime = getRelativeTimeString(timestamp)

  // Create the notification object
  const notification: Notification = {
    id,
    title,
    message,
    time: formattedTime,
    isRead: false,
    type,
    timestamp,
  }

  // Get existing notifications from localStorage
  const existingNotifications = GetNotifications()

  // Add the new notification at the beginning
  const updatedNotifications = [notification, ...existingNotifications]

  // Limit the number of notifications
  const limitedNotifications = updatedNotifications.slice(0, MAX_NOTIFICATIONS)

  // Save back to localStorage
  localStorage.setItem("readyRideNotifications", JSON.stringify(limitedNotifications))

  return notification
}

// Function to get all notifications from localStorage
export function GetNotifications(): Notification[] {
  if (typeof window === "undefined") return []

  const storedNotifications = localStorage.getItem("readyRideNotifications")
  if (!storedNotifications) return []

  try {
    const notifications = JSON.parse(storedNotifications) as Notification[]

    // Update relative times for all notifications
    return notifications.map((notification) => ({
      ...notification,
      time: getRelativeTimeString(notification.timestamp),
    }))
  } catch (error) {
    console.error("Error parsing notifications from localStorage:", error)
    return []
  }
}

// Function to mark a notification as read
export function MarkNotificationAsRead(id: string): void {
  if (typeof window === "undefined") return

  const notifications = GetNotifications()
  const updatedNotifications = notifications.map((notification) =>
    notification.id === id ? { ...notification, isRead: true } : notification,
  )

  localStorage.setItem("readyRideNotifications", JSON.stringify(updatedNotifications))
}

// Function to mark all notifications as read
export function MarkAllNotificationsAsRead(): void {
  if (typeof window === "undefined") return

  const notifications = GetNotifications()
  const updatedNotifications = notifications.map((notification) => ({ ...notification, isRead: true }))

  localStorage.setItem("readyRideNotifications", JSON.stringify(updatedNotifications))
}

// Function to clear all notifications
export function ClearAllNotifications(): void {
  if (typeof window === "undefined") return
  localStorage.setItem("readyRideNotifications", JSON.stringify([]))
}

// Helper function to format relative time
function getRelativeTimeString(timestamp: number): string {
  const now = Date.now()
  const diffInSeconds = Math.floor((now - timestamp) / 1000)

  if (diffInSeconds < 60) {
    return "just now"
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} min${minutes > 1 ? "s" : ""} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? "s" : ""} ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? "s" : ""} ago`
  }
}
