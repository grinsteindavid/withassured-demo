import type { Metadata } from "next";
import "./globals.css";
import { registerDbSync, reconcileAll } from "@/lib/temporal/lifecycle";

registerDbSync();
reconcileAll().catch(() => {});

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
