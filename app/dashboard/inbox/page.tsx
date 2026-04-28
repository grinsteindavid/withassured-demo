import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAlerts, markAllAlertsAsRead } from "@/lib/alerts";
import { WorkflowHeartbeat } from "@/components/dashboard/workflow-heartbeat";
import { MarkAsReadButton } from "@/components/dashboard/inbox/mark-as-read-button";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: { severity?: "INFO" | "ERROR"; page?: string };
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const severity = searchParams.severity;
  const page = parseInt(searchParams.page || "1", 10);
  const limit = 50;
  const offset = (page - 1) * limit;

  const alerts = await getAlerts(user.orgId, { severity, limit, offset });

  const handleMarkAllAsRead = async () => {
    "use server";
    await markAllAlertsAsRead(user.orgId);
    redirect("/dashboard/inbox");
  };

  const getSeverityIcon = (severity: string) => {
    return severity === "ERROR" ? "❌" : "ℹ️";
  };

  return (
    <div className="space-y-6">
      <WorkflowHeartbeat />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inbox</h1>
        <form action={handleMarkAllAsRead}>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Mark All as Read
          </button>
        </form>
      </div>

      <div className="flex gap-2">
        <a
          href="/dashboard/inbox"
          className={!severity ? "px-4 py-2 bg-gray-200 rounded" : "px-4 py-2 hover:bg-gray-100 rounded"}
        >
          All
        </a>
        <a
          href="/dashboard/inbox?severity=INFO"
          className={severity === "INFO" ? "px-4 py-2 bg-gray-200 rounded" : "px-4 py-2 hover:bg-gray-100 rounded"}
        >
          Info
        </a>
        <a
          href="/dashboard/inbox?severity=ERROR"
          className={severity === "ERROR" ? "px-4 py-2 bg-gray-200 rounded" : "px-4 py-2 hover:bg-gray-100 rounded"}
        >
          Error
        </a>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Severity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Message
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No alerts found
                </td>
              </tr>
            ) : (
              alerts.map((alert: any) => (
                <tr key={alert.id} className={!alert.read ? "bg-blue-50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xl">{getSeverityIcon(alert.severity)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {alert.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{alert.message}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(alert.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {alert.read ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Read
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        Unread
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <MarkAsReadButton
                      alertId={alert.id}
                      entityType={alert.entityType}
                      entityId={alert.entityId}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {alerts.length === limit && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <a
              href={`/dashboard/inbox?severity=${severity || ""}&page=${page - 1}`}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Previous
            </a>
          )}
          <a
            href={`/dashboard/inbox?severity=${severity || ""}&page=${page + 1}`}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Next
          </a>
        </div>
      )}
    </div>
  );
}
