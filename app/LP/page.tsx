import { Metadata } from 'next'
import fs from 'fs'
import path from 'path'

export const metadata: Metadata = {
  title: 'FitGoal - Transformação Física com IA',
  description: 'Sistema Corpo Responsivo™ — Análise Visual Inteligente. Perca 8-15kg em 90 dias com o método validado que se adapta ao seu corpo.',
}

export default function LandingPage() {
  const cssPath = path.join(process.cwd(), 'public', 'lp-styles.css')
  const htmlPath = path.join(process.cwd(), 'public', 'lp-content.html')
  
  let cssContent = ''
  let htmlContent = ''
  
  try {
    cssContent = fs.readFileSync(cssPath, 'utf-8')
  } catch (error) {
    console.error('Error reading CSS:', error)
  }
  
  try {
    htmlContent = fs.readFileSync(htmlPath, 'utf-8')
  } catch (error) {
    console.error('Error reading HTML:', error)
  }

  return (
    <html lang="pt-BR">
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssContent }} />
      </head>
      <body>
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </body>
    </html>
  )
}
