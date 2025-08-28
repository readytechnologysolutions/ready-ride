import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Distance Matrix API called")

    const body = await request.json()
    console.log("📝 Request body:", body)

    const { origins, destinations } = body

    if (!origins || !destinations || !Array.isArray(origins) || !Array.isArray(destinations)) {
      console.error("❌ Invalid request format:", { origins, destinations })
      return NextResponse.json({ success: false, error: "Invalid origins or destinations format" }, { status: 400 })
    }

    const apiKey = "AIzaSyCvZ5bGmKRtw2RVXTpXeiQuL5U7VJommJ8"
    if (!apiKey) {
      console.error("❌ Google Maps API key not found")
      return NextResponse.json({ success: false, error: "Google Maps API key not configured" }, { status: 500 })
    }

    console.log("🗝️ Using Google Maps API key:", apiKey.substring(0, 10) + "...")

    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json")
    url.searchParams.append("origins", origins.join("|"))
    url.searchParams.append("destinations", destinations.join("|"))
    url.searchParams.append("units", "metric")
    url.searchParams.append("mode", "driving")
    url.searchParams.append("key", apiKey)

    console.log("🌐 Calling Google Maps API:", url.toString().replace(apiKey, "API_KEY_HIDDEN"))

    const response = await fetch(url.toString())
    console.log("📡 Google Maps API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Google Maps API HTTP error:", response.status, errorText)
      return NextResponse.json(
        { success: false, error: `Google Maps API error: ${response.status}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("📊 Google Maps API response:", JSON.stringify(data, null, 2))

    if (data.status !== "OK") {
      console.error("❌ Google Maps API status error:", data.status, data.error_message)
      return NextResponse.json(
        { success: false, error: `Google Maps API status: ${data.status}`, details: data.error_message },
        { status: 400 },
      )
    }

    if (!data.rows || data.rows.length === 0 || !data.rows[0].elements || data.rows[0].elements.length === 0) {
      console.error("❌ No distance data returned from Google Maps API")
      return NextResponse.json({ success: false, error: "No distance data available" }, { status: 404 })
    }

    const element = data.rows[0].elements[0]
    console.log("🎯 Distance element:", element)

    if (element.status !== "OK") {
      console.error("❌ Distance element status error:", element.status)
      return NextResponse.json(
        { success: false, error: `Distance calculation failed: ${element.status}` },
        { status: 400 },
      )
    }

    const result = {
      distance: element.distance.value, // in meters
      duration: element.duration.value, // in seconds
      distance_text: element.distance.text,
      duration_text: element.duration.text,
    }

    console.log("✅ Distance calculation successful:", result)

    return NextResponse.json({
      success: true,
      results: [result],
    })
  } catch (error) {
    console.error("💥 Distance Matrix API internal error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
