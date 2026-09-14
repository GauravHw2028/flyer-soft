import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flyerly — Weekly flyer studio",
  description: "Your products, your prices, a fresh flyer every week.",
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
