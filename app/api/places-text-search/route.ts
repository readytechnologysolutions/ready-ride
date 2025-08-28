import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyCvZ5bGmKRtw2RVXTpXeiQuL5U7VJommJ8"
    const apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}&components=country:gh`

    const response = await fetch(apiUrl)
    const data = await response.json()

    if (data.status === "OK" && data.predictions) {
      return NextResponse.json({
        success: true,
        predictions: data.predictions,
      })
    } else if (data.status === "ZERO_RESULTS") {
      return NextResponse.json({
        success: true,
        predictions: [],
        message: "No predictions found",
      })
    } else {
      return NextResponse.json({
        success: false,
        error: data.error_message || `API returned status: ${data.status}`,
      })
    }
  } catch (error) {
    console.error("Error in places autocomplete:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Add a new endpoint for place details
export async function POST(request: NextRequest) {
  try {
    const { place_id } = await request.json()

    if (!place_id) {
      return NextResponse.json({ error: "Place ID is required" }, { status: 400 })
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyCvZ5bGmKRtw2RVXTpXeiQuL5U7VJommJ8"
    const apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&key=${apiKey}&fields=formatted_address,geometry,name`

    const response = await fetch(apiUrl)
    const data = await response.json()

    if (data.status === "OK" && data.result) {
      return NextResponse.json({
        success: true,
        result: data.result,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: data.error_message || `API returned status: ${data.status}`,
      })
    }
  } catch (error) {
    console.error("Error in place details:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
