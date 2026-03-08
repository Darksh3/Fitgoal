import type React from "react"
import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Inter } from "next/font/google"

import "./globals.css"
import "../styles/buttons.css"
import "../styles/neon-buttons.css"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import FloatingChat from "@/components/floating-chat"
import { PixelTracker } from "@/components/pixel-tracker"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 0.8,
  maximumScale: 5,
  userScalable: true,
}

export const metadata: Metadata = {
  title: "Fitness Website",
  description: "Seu parceiro para uma vida mais saudável",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID

  return (
    <html lang="pt-BR">
      <head>
        {pixelId && (
          <>
            <Script
              id="meta-pixel-base"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;
                n.push=n;
                n.loaded=!0;
                n.version='2.0';
                n.queue=[];
                t=b.createElement(e);
                t.async=!0;
                t.src=v;
                s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}
                (window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${pixelId}');
                fbq('track', 'PageView');
              `,
              }}
            />
          </>
        )}
      </head>

      <body className={inter.className}>
        <PixelTracker>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <FloatingChat />
            <Toaster />
          </ThemeProvider>
        </PixelTracker>
      </body>
    </html>
  )
}