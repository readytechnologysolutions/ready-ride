import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { otp, reference } = body

    const response = await fetch("https://api.paystack.co/charge/submit_otp", {
      method: "POST",
      headers: {
        Authorization: `Bearer sk_live_d99fad128655b9b0ca8335b11e3f295c1d0c325a`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        otp,
        reference,
      }),
    })

    const data = await response.json()
    console.log("Paystack OTP response:", data)

    return NextResponse.json(data)
  } catch (error) {
    console.error("Paystack OTP error:", error)
    return NextResponse.json({ success: false, error: "Failed to submit OTP" }, { status: 500 })
  }
}
