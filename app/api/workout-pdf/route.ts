import { NextResponse } from "next/server"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"

export async function POST(req: Request) {
  try {
    const { html } = await req.json()

    if (!html) {
      return NextResponse.json({ error: "HTML is required" }, { status: 400 })
    }

    let browser
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      })
    } catch (launchError) {
      console.error("[PDF] Puppeteer launch error:", launchError)
      throw new Error("Failed to launch browser")
    }

    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: "networkidle0" })

      const pdfBuffer = await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: { top: "6mm", right: "6mm", bottom: "6mm", left: "6mm" },
      })

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="plano-treino.pdf"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  } catch (error) {
    console.error("[PDF] Error generating PDF:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF" },
      { status: 500 }
    )
  }
}
