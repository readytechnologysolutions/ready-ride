import { type NextRequest, NextResponse } from "next/server"

export type RiderLocation = {
  id: string
  city: string
  time: number
  speed: number
  longitude: number
  street_name: string
  latitude: number
  bearing: number
  created_time: string
  updated_time: string
  polylines: string
}

export async function GET(request: NextRequest, { params }: { params: { riderId: string } }) {
  try {
    const { riderId } = params

    if (!riderId) {
      return NextResponse.json({ error: "Rider ID is required" }, { status: 400 })
    }

    console.log(`Fetching rider location for ID: ${riderId}`)

    // Fetch from external API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(`https://socket.getreadyride.com/track.php?riderId=${riderId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`External API Error ${response.status}: ${response.statusText}`)

      if (response.status === 404) {
        return NextResponse.json({ error: `Rider ${riderId} not found` }, { status: 404 })
      }

      return NextResponse.json(
        { error: `External API error: ${response.status} ${response.statusText}` },
        { status: response.status },
      )
    }

    const data: RiderLocation = await response.json()
    console.log("Rider location fetched successfully:", data.street_name)

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching rider location:", error)

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return NextResponse.json({ error: "Request timeout - external service took too long" }, { status: 408 })
      }

      if (error.message.includes("fetch")) {
        return NextResponse.json({ error: "Unable to connect to tracking service" }, { status: 503 })
      }

      return NextResponse.json({ error: `Server error: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ error: "Unknown server error occurred" }, { status: 500 })
  }
}
