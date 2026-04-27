import type { Metadata } from "next";
import "./globals.css";
import { registerDbSync, reconcileAll, startComplianceScheduler } from "@/lib/temporal/lifecycle";
import { syncStripeMockFromDB } from "@/lib/stripe-mock";

registerDbSync();
reconcileAll().catch(() => {});
startComplianceScheduler();
syncStripeMockFromDB().catch(() => {});

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
