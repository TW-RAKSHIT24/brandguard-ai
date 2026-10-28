import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrandGuard AI — Create freely. Publish confidently.",
  description: "Review content against your brand guidance, with cited evidence and a human in control.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
