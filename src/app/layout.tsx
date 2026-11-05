import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chùa Online — Virtual Pagoda",
  description:
    "A peaceful, cozy 2D pixel-art multiplayer virtual Buddhist temple. Enter, choose a role, and share quiet activities with other visitors.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2b2119",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="font-pixel text-temple-ink antialiased">{children}</body>
    </html>
  );
}
