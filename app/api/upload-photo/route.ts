import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    console.log("[v0] Upload API - Received file:", file ? file.name : "NO FILE")
    console.log("[v0] Upload API - File size:", file ? file.size : "N/A")
    console.log("[v0] Upload API - File type:", file ? file.type : "N/A")

    if (!file) {
      console.error("[v0] ❌ Upload API - No file provided in request")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("[v0] Uploading to Vercel Blob Storage...")
    const blob = await put(`progress-photos/${Date.now()}-${file.name}`, file, {
      access: "public",
    })

    console.log("[v0] ✅ Upload successful:", blob.url)
    return NextResponse.json({ photoUrl: blob.url })
  } catch (error) {
    console.error("[v0] ❌ Error uploading photo:", error)
    return NextResponse.json(
      {
        error: "Failed to upload photo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
