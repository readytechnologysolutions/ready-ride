import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { query } = await request.json()

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ success: false, error: "Search query must be at least 2 characters" }, { status: 400 })
    }

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query,
    )}&key=AIzaSyCvZ5bGmKRtw2RVXTpXeiQuL5U7VJommJ8`

    const response = await fetch(url)
    const data = await response.json()

    // Log the response status for debugging
    console.log("Google Places API status:", data.status)

    if (data.status === "OK") {
      // Format the results to match our needs
      const places = data.results.map((place: any) => ({
        name: place.name,
        address: place.formatted_address,
        lat: place.geometry.location.lat,
        lon: place.geometry.location.lng,
      }))

      return NextResponse.json({ success: true, places })
    } else if (data.status === "ZERO_RESULTS") {
      // Return empty array for zero results (not an error)
      return NextResponse.json({ success: true, places: [] })
    } else {
      // Handle other error statuses
      const errorMessages: Record<string, string> = {
        OVER_QUERY_LIMIT: "API query limit exceeded",
        REQUEST_DENIED: "API request was denied",
        INVALID_REQUEST: "Invalid request parameters",
        UNKNOWN_ERROR: "Unknown error occurred",
      }

      const errorMessage = errorMessages[data.status] || `Google Places API error: ${data.status}`
      console.error(errorMessage, data.error_message)

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: data.status === "REQUEST_DENIED" ? 403 : 500 },
      )
    }
  } catch (error) {
    console.error("Error searching places:", error)
    return NextResponse.json({ success: false, error: "An error occurred while searching places" }, { status: 500 })
  }
}
