import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import config from "./config";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});
const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: config.siteName,
  description: config.siteName,
  manifest: "/site.webmanifest",
  icons: {
    icon: "https://i.ibb.co/dwPMhSQz/unnamed.jpg",
    apple: "https://i.ibb.co/dwPMhSQz/unnamed.jpg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: config.siteName,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${inter.variable} ${playfair.variable} font-sans antialiased relative`}
      >
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
