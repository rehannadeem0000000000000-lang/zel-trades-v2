import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zel Signals",
  description: "Multi-strategy trading signals with TP/SL levels and an AI trade reviewer.",
  applicationName: "Zel Signals",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#070b14",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#070b14] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
