import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://carenexa.cloud"),
  title: "CareNexa",
  description: "Hospital records, departments, and recruitment — one system.",
};

// This is a desktop-first clinical workstation app: the layout itself (fixed
// sidebars, multi-column panels, dense tables) assumes real desktop width
// rather than reflowing into a mobile column. That's a CSS/layout decision,
// not a viewport one — the viewport must stay device-width, or the browser
// renders the whole page inside an artificial fixed-width canvas and scales
// it to fit, which is what made everything look shrunken/tablet-sized.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
