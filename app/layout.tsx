import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Analyst Trading Dashboard",
  description: "Advanced trading dashboard with live market data and AI analysis"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
