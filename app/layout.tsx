import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Visit-My-Teachers - Madrasah Vali",
  description: "Book your Visit-My-Teachers appointment at Madrasah Vali",
  manifest: "/manifest.json",
  themeColor: "#007BCB",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Visit-My-Teachers",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }` }} />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-body antialiased surface-pattern">
        <div className="brand-stripe" />
        <div className="logo-watermark" aria-hidden="true" />
        <div className="relative z-10 flex flex-col min-h-full">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  );
}
