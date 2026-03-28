import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SpaceLift — AI Room Stylist",
  description:
    "Upload a photo of your room, get an AI design roast, and instantly shop curated products to transform your space.",
  keywords: ["interior design", "AI", "room stylist", "home decor", "multimodal"],
  openGraph: {
    title: "SpaceLift — AI Room Stylist",
    description: "Upload a photo, get roasted, shop the fix.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="mesh-gradient min-h-screen">{children}</body>
    </html>
  );
}
