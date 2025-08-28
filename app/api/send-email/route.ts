import { NextResponse } from "next/server"

interface EmailAttachment {
  filename: string
  content?: string
  path?: string
  contentType?: string
}

interface EmailData {
  from: string
  to: string
  subject: string
  text: string
  html?: string
  attachments?: EmailAttachment[]
}

export async function POST(request: Request) {
  try {
    const emailData: EmailData = await request.json()

    console.log("Sending email via API route:", {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      textLength: emailData.text?.length || 0,
    })

    const response = await fetch("https://mailer.getreadyride.com/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(emailData),
    })

    console.log("Email API response status:", response.status)
    console.log("Email API response headers:", Object.fromEntries(response.headers.entries()))

    // Get response text first to handle both JSON and non-JSON responses
    const responseText = await response.text()
    console.log("Email API raw response:", responseText)

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error("Failed to parse response as JSON:", parseError)
      console.error("Response text:", responseText)

      // If it's not JSON, treat it as an error
      return NextResponse.json(
        {
          success: false,
          message: `Email service returned invalid response: ${responseText.substring(0, 100)}...`,
        },
        { status: 500 },
      )
    }

    if (response.ok) {
      return NextResponse.json({ success: true, message: data.message || "Email sent successfully" })
    } else {
      console.error("Email API error:", data)
      return NextResponse.json(
        { success: false, message: data.message || `Email service error: ${response.status}` },
        { status: response.status },
      )
    }
  } catch (error) {
    console.error("Error in email API route:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Network error occurred while sending email",
      },
      { status: 500 },
    )
  }
}
