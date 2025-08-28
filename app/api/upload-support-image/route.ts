import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get("file") as unknown as File

    if (!file) {
      return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, message: "Only image files are allowed" }, { status: 400 })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, message: "File size must be less than 5MB" }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create unique filename
    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filename = `support_images/${timestamp}_${originalName}`

    try {
      // Upload to Firebase Storage
      const storageRef = ref(storage, filename)
      await uploadBytes(storageRef, buffer, {
        contentType: file.type,
      })

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef)

      return NextResponse.json({
        success: true,
        message: "File uploaded successfully",
        url: downloadURL,
        filename: filename,
      })
    } catch (uploadError) {
      console.error("Error uploading to Firebase Storage:", uploadError)
      return NextResponse.json({ success: false, message: "Failed to upload to storage" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in upload API:", error)
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 })
  }
}
