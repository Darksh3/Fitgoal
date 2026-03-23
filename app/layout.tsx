import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "../styles/buttons.css"
import "../styles/neon-buttons.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { PixelTracker } from "@/components/pixel-tracker"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 0.8,
    maximumScale: 5,
    userScalable: true,
}

export const metadata: Metadata = {
    title: "FitGoal — Plano de Dieta e Treino 100% Personalizado para Você",
    description:
          "Como criar um plano de dieta e treino personalizado para perder peso ou ganhar massa? O FitGoal analisa seu perfil e gera um programa completo em minutos, com dieta, treino e acompanhamento.",
    keywords: [
          "plano de dieta personalizado",
          "treino personalizado para emagrecer",
          "como perder peso com dieta e treino",
          "plano alimentar para ganhar massa",
          "programa de fitness personalizado Brasil",
          "dieta para perder peso rápido",
          "fitgoal",
        ],
    authors: [{ name: "FitGoal" }],
    creator: "FitGoal",
    publisher: "FitGoal",
    robots: {
          index: true,
          follow: true,
          googleBot: {
                  index: true,
                  follow: true,
                  "max-image-preview": "large",
                  "max-snippet": -1,
                  "max-video-preview": -1,
          },
    },
    openGraph: {
          type: "website",
          locale: "pt_BR",
          url: "https://fitgoal.com.br",
          siteName: "FitGoal",
          title: "FitGoal — Plano de Dieta e Treino 100% Personalizado para Você",
          description:
                  "Descubra como o FitGoal cria um programa completo de dieta e treino baseado no seu perfil, objetivo e rotina. Resultados visíveis em 4 semanas.",
          images: [
            {
                      url: "https://fitgoal.com.br/og-image.jpg",
                      width: 1200,
                      height: 630,
                      alt: "FitGoal — Plano personalizado de dieta e treino",
            },
                ],
    },
    twitter: {
          card: "summary_large_image",
          title: "FitGoal — Plano de Dieta e Treino 100% Personalizado",
          description:
                  "Programa completo de dieta e treino criado para o seu corpo, objetivo e rotina. Faça o quiz e receba seu plano agora.",
          images: ["https://fitgoal.com.br/og-image.jpg"],
    },
    alternates: {
          canonical: "https://fitgoal.com.br",
    },
}

const schemaOrg = {
    "@context": "https://schema.org",
    "@graph": [
      {
              "@type": "Organization",
              "@id": "https://fitgoal.com.br/#organization",
              name: "FitGoal",
              url: "https://fitgoal.com.br",
              description:
                        "FitGoal cria planos personalizados de dieta e treino para ajudar pessoas a emagrecer, ganhar massa ou melhorar a saúde com base no perfil individual de cada usuário.",
              logo: {
                        "@type": "ImageObject",
                        url: "https://fitgoal.com.br/logo.png",
              },
              address: {
                        "@type": "PostalAddress",
                        addressLocality: "São Paulo",
                        addressRegion: "SP",
                        addressCountry: "BR",
              },
              sameAs: ["https://fitgoal.com.br"],
      },
      {
              "@type": "WebSite",
              "@id": "https://fitgoal.com.br/#website",
              url: "https://fitgoal.com.br",
              name: "FitGoal",
              description:
                        "Planos personalizados de dieta e treino gerados com base no seu perfil, objetivo e rotina.",
              publisher: { "@id": "https://fitgoal.com.br/#organization" },
              inLanguage: "pt-BR",
      },
      {
              "@type": "SoftwareApplication",
              "@id": "https://fitgoal.com.br/#app",
              name: "FitGoal",
              applicationCategory: "HealthApplication",
              operatingSystem: "Web, iOS, Android",
              url: "https://fitgoal.com.br",
              description:
                        "Aplicativo que gera planos personalizados de dieta e treino em minutos, com base em dados como peso, altura, objetivo, nível de treino e rotina do usuário.",
              offers: {
                        "@type": "Offer",
                        price: "59.90",
                        priceCurrency: "BRL",
                        availability: "https://schema.org/InStock",
              },
              aggregateRating: {
                        "@type": "AggregateRating",
                        ratingValue: "4.9",
                        reviewCount: "3000",
                        bestRating: "5",
              },
      },
        ],
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
          <html lang="pt-BR">
                <head>
                  {/* Schema.org structured data for AI and search engines */}
                        <script
                                    type="application/ld+json"
                                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
                                  />
                  {/* AI crawler permissions */}
                        <meta
                                    name="robots"
                                    content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
                                  />
                        <meta name="googlebot" content="index, follow" />
                        <meta name="bingbot" content="index, follow" />
                        <meta name="ai-content-type" content="commercial" />
                </head>head>
                <body className={inter.className}>
                        <PixelTracker>
                                  <ThemeProvider
                                                attribute="class"
                                                defaultTheme="dark"
                                                enableSystem
                                                disableTransitionOnChange
                                              >
                                    {children}
                                              <Toaster />
                                  </ThemeProvider>ThemeProvider>
                        </PixelTracker>PixelTracker>
                </body>body>
          </html>html>
        )
}</html>
