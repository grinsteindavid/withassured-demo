import { ReactNode } from "react";
import { LogoutButton } from "@/components/dashboard/logout-button";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r p-4">
        <nav className="flex-1 space-y-2">
          <a href="/dashboard" className="block p-2 hover:bg-gray-100 rounded">
            Overview
          </a>
          <a href="/dashboard/credentialing" className="block p-2 hover:bg-gray-100 rounded">
            Credentialing
          </a>
          <a href="/dashboard/licensing" className="block p-2 hover:bg-gray-100 rounded">
            Licensing
          </a>
          <a href="/dashboard/enrollment" className="block p-2 hover:bg-gray-100 rounded">
            Payer Enrollment
          </a>
          <a href="/dashboard/compliance" className="block p-2 hover:bg-gray-100 rounded">
            Compliance
          </a>
          <a href="/dashboard/roster" className="block p-2 hover:bg-gray-100 rounded">
            Roster
          </a>
          <a href="/dashboard/billing" className="block p-2 hover:bg-gray-100 rounded">
            Billing
          </a>
        </nav>
        <div className="pt-4">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
