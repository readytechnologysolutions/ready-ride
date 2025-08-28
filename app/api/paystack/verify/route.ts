import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reference } = body

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer sk_live_d99fad128655b9b0ca8335b11e3f295c1d0c325a`,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()
    console.log("Paystack verify response:", data)

    return NextResponse.json(data)
  } catch (error) {
    console.error("Paystack verify error:", error)
    return NextResponse.json({ success: false, error: "Failed to verify transaction" }, { status: 500 })
  }
}
