import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { html } = await req.json()

    if (!html) {
      return NextResponse.json({ error: "HTML is required" }, { status: 400 })
    }

    // Usar módulos dinâmicos para evitar problemas de importação
    const [html2canvasModule, jsPDFModule] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ])

    const html2canvas = html2canvasModule.default
    const { jsPDF } = jsPDFModule

    // Usar jsdom para renderizar o HTML no servidor
    const { JSDOM } = await import("jsdom")
    const dom = new JSDOM(html, {
      resources: "usable",
      runScripts: "outside-only",
    })

    const element = dom.window.document.documentElement

    // Capturar o HTML renderizado
    const canvas = await html2canvas(element as any, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    })

    // Converter canvas para imagem
    const imgData = canvas.toDataURL("image/jpeg", 0.98)

    // Criar PDF
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight)
    } else {
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        pdf.addPage()
        position = -(imgHeight - heightLeft)
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
    }

    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"))

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="plano-treino.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("[PDF] Error generating PDF:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF" },
      { status: 500 }
    )
  }
}
