import { ReactNode } from "react";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { enforcePageRateLimit } from "@/lib/rate-limit-guard";
import { getSessionUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/alerts";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Throttle dashboard navigation to 15 renders/min per user (or per IP
  // when unauthenticated). Throws RateLimitExceededError → 500 page when
  // exceeded, RateLimitUnavailableError → 500 when Redis is down.
  await enforcePageRateLimit({ bucket: "dashboard" });

  const user = await getSessionUser();
  const unreadCount = user ? await getUnreadCount(user.orgId) : 0;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r p-4">
        <nav className="flex-1 space-y-2">
          <a href="/dashboard/inbox" className="block p-2 hover:bg-gray-100 rounded flex items-center justify-between">
            Inbox
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </a>
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
