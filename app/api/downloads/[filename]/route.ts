import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params
    
    // Whitelist allowed downloads
    const allowedFiles = ["ebook-anti-plateau.pdf", "protocolo-sos-fitgoal.pdf"]
    
    if (!allowedFiles.includes(filename)) {
      return NextResponse.json({ error: "Arquivo não permitido" }, { status: 403 })
    }

    // Get file path
    const filePath = path.join(process.cwd(), "public", filename)
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 })
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath)

    // Return file as download
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("[v0] Download error:", error)
    return NextResponse.json({ error: "Erro ao baixar arquivo" }, { status: 500 })
  }
}
