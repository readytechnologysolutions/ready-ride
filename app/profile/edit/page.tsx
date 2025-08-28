"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft, Camera, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getUserProfile, updateUserProfile } from "@/lib/firestore-service"
import { deleteUser } from "firebase/auth"
import { doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"

export default function EditProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showSavedModal, setShowSavedModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [formData, setFormData] = useState({
    display_name: "",
    email: "",
    phone_number: "",
    address: {
      name: "",
      address: "",
      lat: 0,
      lon: 0,
    },
    photo_url: "",
    countryCode: "+233",
  })

  useEffect(() => {
    async function loadUserProfile() {
      if (!user) return

      try {
        setIsLoading(true)
        const profile = await getUserProfile(user.uid)

        if (profile) {
          setFormData({
            display_name: profile.display_name || "",
            email: profile.email || "",
            phone_number: profile.phone_number || "",
            address: profile.address || {
              name: "",
              address: "",
              lat: 0,
              lon: 0,
            },
            photo_url: profile.photo_url || "/placeholder.svg?height=128&width=128",
            countryCode: "+233", // Default country code
          })
        }
      } catch (err) {
        console.error("Error loading profile:", err)
        setError("Failed to load profile data")
      } finally {
        setIsLoading(false)
      }
    }

    loadUserProfile()
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handlePhotoClick = () => {
    setShowUploadModal(true)
  }

  const uploadImageToFirebase = async (file: File | Blob, fileType: string): Promise<string> => {
    if (!user) throw new Error("User not authenticated")

    try {
      setIsUploading(true)

      // Create a storage reference
      const storageRef = ref(storage, `users/${user.uid}/profile_picture`)

      // Upload the file
      await uploadBytes(storageRef, file, { contentType: fileType })

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef)

      return downloadURL
    } catch (error) {
      console.error("Error uploading image:", error)
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  const handleUploadFromGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
    setShowUploadModal(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Show local preview immediately
      const localPreviewUrl = URL.createObjectURL(file)
      setFormData({
        ...formData,
        photo_url: localPreviewUrl,
      })

      // Upload to Firebase Storage
      const downloadURL = await uploadImageToFirebase(file, file.type)

      // Update form data with the Firebase URL
      setFormData((prev) => ({
        ...prev,
        photo_url: downloadURL,
      }))

      // Revoke the local object URL to free memory
      URL.revokeObjectURL(localPreviewUrl)
    } catch (err) {
      console.error("Error handling file:", err)
      setError("Failed to upload image. Please try again.")
    }
  }

  const handleTakePhoto = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      })
      setStream(mediaStream)
      setShowCameraModal(true)
      setShowUploadModal(false)

      // Set video stream when modal opens
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      }, 100)
    } catch (err) {
      console.error("Error accessing camera:", err)
      alert("Unable to access camera. Please check permissions.")
    }
  }

  const handleCapturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      if (context) {
        context.drawImage(video, 0, 0)

        // Get the image as a blob
        canvas.toBlob(
          async (blob) => {
            if (blob) {
              try {
                // Show local preview immediately
                const localPreviewUrl = URL.createObjectURL(blob)
                setFormData({
                  ...formData,
                  photo_url: localPreviewUrl,
                })

                // Upload to Firebase Storage
                const downloadURL = await uploadImageToFirebase(blob, "image/jpeg")

                // Update form data with the Firebase URL
                setFormData((prev) => ({
                  ...prev,
                  photo_url: downloadURL,
                }))

                // Revoke the local object URL to free memory
                URL.revokeObjectURL(localPreviewUrl)
              } catch (err) {
                console.error("Error uploading captured photo:", err)
                setError("Failed to upload image. Please try again.")
              }
            }
          },
          "image/jpeg",
          0.8,
        )

        handleCloseCameraModal()
      }
    }
  }

  const handleCloseCameraModal = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setShowCameraModal(false)
  }

  const handleDeleteAccount = async () => {
    if (!user) return

    try {
      setIsDeleting(true)

      // Delete profile picture from storage if it exists
      if (formData.photo_url && !formData.photo_url.includes("placeholder.svg")) {
        try {
          const storageRef = ref(storage, `users/${user.uid}/profile_picture`)
          await deleteObject(storageRef)
        } catch (err) {
          console.error("Error deleting profile picture:", err)
          // Continue with account deletion even if image deletion fails
        }
      }

      // Delete user profile from Firestore
      await deleteDoc(doc(db, "users", user.uid))

      // Delete Firebase Auth account
      await deleteUser(user)

      // Clear local storage
      localStorage.clear()

      // Redirect to signup
      router.push("/auth/signup")
    } catch (err) {
      console.error("Error deleting account:", err)
      setError("Failed to delete account. Please try again.")
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    try {
      setIsSaving(true)
      setError(null)

      // Extract only the fields we want to update
      const updateData = {
        display_name: formData.display_name,
        email: formData.email,
        phone_number: formData.phone_number,
        photo_url: formData.photo_url,
        // Note: We're not updating the address as specified
      }

      const success = await updateUserProfile(user.uid, updateData)

      if (success) {
        // Also update the document directly to ensure consistency
        const userRef = doc(db, "users", user.uid)
        await updateDoc(userRef, {
          display_name: formData.display_name,
          email: formData.email,
          phone_number: formData.phone_number,
          photo_url: formData.photo_url,
          updateTime: new Date().toISOString(),
        })
        setShowSavedModal(true)
      } else {
        setError("Failed to update profile")
      }
    } catch (err) {
      console.error("Error saving profile:", err)
      setError("An error occurred while saving your profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavedClose = () => {
    setShowSavedModal(false)
    router.push("/profile")
  }

  // Split the display name into first and last name for the form
  const nameParts = formData.display_name.split(" ")
  const firstName = nameParts[0] || ""
  const lastName = nameParts.slice(1).join(" ") || ""

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fffbeb] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="mt-2 text-gray-600">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fffbeb]">
      {/* Header */}
      <div className="p-4 flex items-center bg-white">
        <button onClick={() => router.back()} className="mr-4" aria-label="Go back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
      </div>

      {/* Profile Picture */}
      <div className="flex justify-center my-6">
        <div className="relative">
          <div className="w-32 h-32 rounded-full overflow-hidden">
            {isUploading ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : (
              <Image
                src={formData.photo_url || "/placeholder.svg?height=128&width=128&query=profile"}
                alt="Profile"
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            )}
          </div>
          <button
            onClick={handlePhotoClick}
            className="absolute bottom-0 right-0 bg-primary rounded-full p-2"
            disabled={isUploading}
          >
            <Camera className="text-white" size={16} />
          </button>

          {/* Hidden file input */}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-gray-100 p-4">
        {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-gray-500 mb-1">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={firstName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  display_name: `${e.target.value} ${lastName}`.trim(),
                })
              }
              className="w-full p-3 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-gray-500 mb-1">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={lastName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  display_name: `${firstName} ${e.target.value}`.trim(),
                })
              }
              className="w-full p-3 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-gray-500 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-gray-500 mb-1">
              Address (Read Only)
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address.address}
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
              disabled
              readOnly
            />
          </div>

          <div className="flex space-x-2">

            <div className="flex-1">
              <label htmlFor="phone_number" className="block text-gray-500 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="Phone"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="w-full bg-primary text-white py-4 rounded-full text-center text-xl font-medium flex items-center justify-center"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
          <div className="pt-4">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="w-full bg-red-500 text-white py-4 rounded-full text-center text-xl font-medium"
              disabled={isDeleting}
            >
              Delete Account
            </button>
          </div>
        </form>
      </div>

      {/* Upload Photo Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[80%] max-w-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold">Upload Photo</h2>
              <button onClick={() => setShowUploadModal(false)} className="rounded-full border border-gray-500 p-1">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <button onClick={handleUploadFromGallery} className="flex items-center w-full p-3">
                <div className="w-10 h-10 mr-4 flex items-center justify-center text-gray-500 border border-gray-300 rounded-lg">
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
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                </div>
                <span className="text-lg">Upload from gallery</span>
              </button>

              <button onClick={handleTakePhoto} className="flex items-center w-full p-3">
                <div className="w-10 h-10 mr-4 flex items-center justify-center text-gray-500 border border-gray-300 rounded-lg">
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
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </div>
                <span className="text-lg">Take a photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Confirmation Modal */}
      {showSavedModal && (
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
              <h2 className="text-2xl font-bold text-primary mb-6">Saved</h2>
            </div>

            <div className="border-t border-gray-200">
              <button onClick={handleSavedClose} className="w-full p-4 text-gray-500 font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[90%] max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold">Take Photo</h2>
              <button onClick={handleCloseCameraModal} className="rounded-full border border-gray-500 p-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="p-4">
              <div className="relative">
                <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover rounded-lg bg-black" />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex justify-center mt-4">
                <button
                  onClick={handleCapturePhoto}
                  className="bg-primary text-white px-6 py-3 rounded-full flex items-center"
                >
                  <Camera className="mr-2" size={20} />
                  Capture Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[80%] max-w-sm overflow-hidden">
            <div className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <path d="M3 6h18l-2 13H5L3 6z"></path>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Account</h2>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete your account? This action cannot be undone and all your data will be
                  permanently removed.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 flex">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 p-4 text-gray-500 font-medium border-r border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 p-4 text-red-500 font-medium flex items-center justify-center"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
