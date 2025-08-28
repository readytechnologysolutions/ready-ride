import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, amount, phone, bank_code } = body

    const response = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: {
        Authorization: `Bearer sk_live_d99fad128655b9b0ca8335b11e3f295c1d0c325a`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Convert to kobo
        mobile_money: {
          phone,
          provider: bank_code,
        },
      }),
    })

    const data = await response.json()
    console.log("Paystack charge response:", data)

    return NextResponse.json(data)
  } catch (error) {
    console.error("Paystack charge error:", error)
    return NextResponse.json({ success: false, error: "Failed to initiate charge" }, { status: 500 })
  }
}
