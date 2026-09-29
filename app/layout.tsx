import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OrderGuard | Price-verified orders",
  description: "Import Excel orders, verify exact prices, and test COD and prepaid checkout.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
