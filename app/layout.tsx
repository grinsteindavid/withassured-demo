import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Assured Dashboard",
  description: "Healthcare provider credentialing and compliance dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
