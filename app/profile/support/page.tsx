"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Mail, Headphones, Clock, ChevronDown, X, Upload, Trash2 } from "lucide-react"
import { useAppSettings } from "@/contexts/app-settings-context"
import { useAuth } from "@/contexts/auth-context"
import { SendMail } from "@/utils/messaging"

type IssueType = "technical" | "general" | "other" | null

interface UploadedImage {
  file: File
  url: string // Local preview URL
  storageUrl?: string // Firebase Storage URL
}

export default function SupportPage() {
  const router = useRouter()
  const { settings } = useAppSettings()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [showMessageForm, setShowMessageForm] = useState(false)
  const [showSubmittedModal, setShowSubmittedModal] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<IssueType>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
  })

  // Check if business is currently open
  const isBusinessOpen = () => {
    if (!settings?.opens || !settings?.closes) return false

    const now = new Date()
    const currentTime = now.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    })

    // Convert 12-hour format to 24-hour for comparison
    const convertTo24Hour = (time12h: string) => {
      const [time, modifier] = time12h.split(" ")
      let [hours, minutes] = time.split(":")
      if (hours === "12") {
        hours = "00"
      }
      if (modifier === "PM") {
        hours = String(Number.parseInt(hours, 10) + 12)
      }
      return `${hours}:${minutes}`
    }

    const openTime = convertTo24Hour(settings.opens)
    const closeTime = convertTo24Hour(settings.closes)

    return currentTime >= openTime && currentTime <= closeTime
  }

  const getNextOpeningDay = () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return dayNames[tomorrow.getDay()]
  }

  const handleSendMessage = () => {
    setSubmitError(null)
    setUploadedImages([])
    setShowMessageModal(true)
  }

  const handleCallCustomerService = () => {
    if (settings?.support_contact) {
      window.location.href = `tel:${settings.support_contact}`
    }
  }

  const handleSelectIssue = (issueType: IssueType) => {
    setSelectedIssue(issueType)
    setShowMessageModal(false)
    setShowMessageForm(true)
  }

  const handleCloseModal = () => {
    setShowMessageModal(false)
    setShowMessageForm(false)
    setSubmitError(null)
    setUploadedImages([])
  }

  const handleBackToIssues = () => {
    setShowMessageForm(false)
    setShowMessageModal(true)
    setSubmitError(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
    // Clear error when user starts typing
    if (submitError) {
      setSubmitError(null)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setSubmitError("Please select an image file (PNG, JPG, GIF, etc.)")
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setSubmitError("Image size must be less than 5MB")
      return
    }

    // Check if we already have 3 images
    if (uploadedImages.length >= 3) {
      setSubmitError("You can upload a maximum of 3 images")
      return
    }

    setIsUploading(true)
    setSubmitError(null)

    try {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)

      // Upload to Firebase Storage via API
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-support-image", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setUploadedImages((prev) => [
          ...prev,
          {
            file,
            url: previewUrl,
            storageUrl: result.url,
          },
        ])
      } else {
        setSubmitError(result.message || "Failed to upload image")
        URL.revokeObjectURL(previewUrl)
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      setSubmitError("Failed to upload image. Please try again.")
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => {
      const newImages = [...prev]
      const removed = newImages.splice(index, 1)[0]
      // Revoke the object URL to free memory
      URL.revokeObjectURL(removed.url)
      return newImages
    })
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!user?.email) {
      setSubmitError("Please log in to send a support message.")
      return
    }

    if (!settings?.support_email) {
      setSubmitError("Support email not configured. Please try calling customer service.")
      return
    }

    setIsSubmitting(true)

    try {
      const issueTypeText =
        selectedIssue === "technical"
          ? "Technical Issue"
          : selectedIssue === "general"
            ? "General Enquiry"
            : "Other Enquiry"

      // Prepare attachments from uploaded images
      const attachments = uploadedImages.map((img, index) => ({
        filename: `screenshot_${index + 1}_${img.file.name}`,
        path: img.storageUrl, // Use Firebase Storage URL
        contentType: img.file.type,
      }))

      const result = await SendMail({
        from: user.email,
        to: settings.support_email,
        subject: `Support Request: ${formData.subject || issueTypeText}`,
        text: `
Issue Type: ${issueTypeText}
Subject: ${formData.subject}
Message: ${formData.message}

User Details:
- Email: ${user.email}
- User ID: ${user.uid}
- Timestamp: ${new Date().toISOString()}
- Attachments: ${attachments.length} image(s)
      `,
        attachments,
      })

      if (result.success) {
        // Clean up object URLs
        uploadedImages.forEach((img) => URL.revokeObjectURL(img.url))

        // Show submitted confirmation
        setShowMessageForm(false)
        setShowSubmittedModal(true)

        // Reset form
        setFormData({ subject: "", message: "" })
        setSelectedIssue(null)
        setSubmitError(null)
        setUploadedImages([])
      } else {
        console.error("Failed to send email:", result.message)
        setSubmitError(result.message || "Failed to send message. Please try again or call customer service.")
      }
    } catch (error) {
      console.error("Error sending support email:", error)
      setSubmitError("An unexpected error occurred. Please try again or call customer service.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmittedClose = () => {
    setShowSubmittedModal(false)
    router.push("/profile")
  }

  const businessOpen = isBusinessOpen()

  return (
    <div className="min-h-screen bg-[#fffbeb]">
      {/* Header */}
      <div className="p-4 flex items-center bg-white">
        <button onClick={() => router.back()} className="mr-4" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Ready Ride is here to help</h1>
      </div>

      {/* Business Hours */}
      <div className="bg-gray-200 p-4">
        <div className="flex items-center mb-1">
          <Clock className="text-gray-500 mr-2" size={20} />
          <span className="text-gray-700">Business working hours:</span>
        </div>
        <div className="flex items-center mb-1">
          {businessOpen ? (
            <>
              <span className="text-green-500 mr-1">Open.</span>
              <span className="text-gray-700">Closes at {settings?.closes || "9:00 PM"}</span>
            </>
          ) : (
            <>
              <span className="text-red-500 mr-1">Closed.</span>
              <span className="text-gray-700">
                Opens at {settings?.opens || "8:00 AM"} {getNextOpeningDay()}
              </span>
            </>
          )}
          <ChevronDown className="text-gray-500 ml-1" size={16} />
        </div>
        <p className="text-xs text-gray-500">*Business hours may be subject to change on holidays</p>
      </div>

      {/* Support Options */}
      <div className="p-4 space-y-4">
        <button className="w-full bg-white rounded-lg shadow-sm p-4" onClick={handleSendMessage}>
          <div className="flex justify-between items-center">
            <div className="text-left">
              <h2 className="text-xl font-bold mb-2">Send us a message</h2>
              <p className="text-gray-500">Submit a ticket and get assistance from our experts</p>
            </div>
            <div className="bg-primary bg-opacity-10 p-3 rounded-lg">
              <Mail className="text-primary" size={24} />
            </div>
          </div>
        </button>

        <button className="w-full bg-white rounded-lg shadow-sm p-4" onClick={handleCallCustomerService}>
          <div className="flex justify-between items-center">
            <div className="text-left">
              <h2 className="text-xl font-bold mb-2">Call customer service</h2>
              <p className="text-gray-500">Call us at: {settings?.support_contact || "0595454935"}</p>
            </div>
            <div className="bg-primary bg-opacity-10 p-3 rounded-lg">
              <Headphones className="text-primary" size={24} />
            </div>
          </div>
        </button>
      </div>

      {/* Issue Selection Modal - Slide in from bottom */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-xl animate-in slide-in-from-bottom duration-300">
            <div className="p-4 flex justify-between items-center border-b border-gray-200">
              <div className="flex items-center">
                <button onClick={handleCloseModal} className="mr-4" aria-label="Go back">
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-bold">Send us a message</h2>
              </div>
              <button onClick={handleCloseModal} aria-label="Close">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <h3 className="text-xl text-gray-500 mb-4">What's the issue?</h3>

              <div className="space-y-4">
                <button
                  onClick={() => handleSelectIssue("technical")}
                  className="w-full flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">Technical issue</span>
                  <div className="w-10 h-10 flex items-center justify-center">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectIssue("general")}
                  className="w-full flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">General enquiries</span>
                  <div className="w-10 h-10 flex items-center justify-center">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectIssue("other")}
                  className="w-full flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">Other enquiries</span>
                  <div className="w-10 h-10 flex items-center justify-center">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"></polygon>
                      <circle cx="12" cy="13" r="2"></circle>
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Form Modal - Slide in from bottom */}
      {showMessageForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-xl animate-in slide-in-from-bottom duration-300">
            <div className="p-4 flex justify-between items-center border-b border-gray-200">
              <div className="flex items-center">
                <button onClick={handleBackToIssues} className="mr-4" aria-label="Go back">
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-bold">Send us a message</h2>
              </div>
              <button onClick={handleCloseModal} aria-label="Close">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <h3 className="text-xl text-gray-500 mb-4">Give us more details</h3>

              {submitError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{submitError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="Subject"
                    className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Tell us about it"
                    className="w-full p-4 border border-gray-200 rounded-lg min-h-[150px] focus:ring-2 focus:ring-primary focus:border-primary"
                    maxLength={500}
                  ></textarea>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-primary">Optional</span>
                    <span className="text-gray-500">{formData.message.length}/500</span>
                  </div>
                </div>

                {/* Image Upload Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Screenshots (Optional)</span>
                    <span className="text-xs text-gray-500">{uploadedImages.length}/3 images</span>
                  </div>

                  {/* Upload Button */}
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={isUploading || uploadedImages.length >= 3}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                        <span className="text-sm text-gray-600">Uploading to Firebase...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">
                          {uploadedImages.length >= 3 ? "Maximum 3 images reached" : "Tap to upload screenshot"}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</span>
                      </>
                    )}
                  </button>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {/* Image Previews */}
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {uploadedImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image.url || "/placeholder.svg"}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="w-full bg-primary text-white py-4 rounded-full text-center text-xl font-medium mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Submitted Confirmation Modal */}
      {showSubmittedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[80%] max-w-sm overflow-hidden">
            <div className="flex flex-col items-center p-6">
              <div className="w-16 h-16 rounded-full bg-primary bg-opacity-20 flex items-center justify-center mb-4">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffa500"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-primary mb-6">Submitted</h2>
              {uploadedImages.length > 0 && (
                <p className="text-sm text-gray-600 text-center">
                  Your message with {uploadedImages.length} screenshot{uploadedImages.length > 1 ? "s" : ""} has been
                  sent successfully.
                </p>
              )}
            </div>

            <div className="border-t border-gray-200">
              <button onClick={handleSubmittedClose} className="w-full p-4 text-gray-500 font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
