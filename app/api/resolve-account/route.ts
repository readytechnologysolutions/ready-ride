import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { account_number, bank_code } = await request.json()

    if (!account_number || !bank_code) {
      return NextResponse.json({ success: false, error: "Account number and bank code are required" }, { status: 400 })
    }

    // Paystack API endpoint for resolving account numbers
    const url = `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer sk_live_d99fad128655b9b0ca8335b11e3f295c1d0c325a`,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    // Log the full response for debugging
    console.log("Paystack API response:", data)

    if (data.status) {
      return NextResponse.json({
        success: true,
        account_name: data.data.account_name,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: data.message || "Could not resolve account",
      })
    }
  } catch (error) {
    console.error("Error resolving account:", error)
    return NextResponse.json(
      { success: false, error: "An error occurred while resolving the account" },
      { status: 500 },
    )
  }
}
