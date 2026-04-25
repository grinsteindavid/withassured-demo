interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    INACTIVE: "bg-gray-100 text-gray-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    RUNNING: "bg-blue-100 text-blue-800",
    APPROVED: "bg-green-100 text-green-800",
    DENIED: "bg-red-100 text-red-800",
    EXPIRED: "bg-red-100 text-red-800",
    REVOKED: "bg-red-100 text-red-800",
    OPEN: "bg-blue-100 text-blue-800",
    PAID: "bg-green-100 text-green-800",
    VOID: "bg-gray-100 text-gray-800",
  };

  const colorClass = colors[status] || "bg-gray-100 text-gray-800";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  );
}
