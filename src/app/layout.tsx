import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/manrope";
import "./globals.css";
export const metadata: Metadata = {
  title: "Yatra Sync — A better way to go together",
  description:
    "Find your route. Share your ride. Split your fare. Community passenger coordination before you book.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Yatra Sync — Better company. A fairer journey.",
    description: "Find people heading your way. Share a plan before you book.",
    images: [
      {
        url: "/art/jaipur-route-hero.webp",
        width: 1536,
        height: 1024,
        alt: "Original generated Jaipur shared journey",
      },
    ],
  },
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5146ff",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
